import * as Phaser from 'phaser';
import { getRefs } from '../orchestrator.ts';
import { RowingDetector, type PunchSide } from '../systems/rowingDetector.ts';
import { KeypointOverlay } from '../../ui/keypointOverlay.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import { KeyboardDebug } from '../../debug/keyboard.ts';
import { strings } from '../../i18n/strings.ts';
import {
  CANOE_DURATION_MS, CANOE_SPEED_PER_STROKE, CANOE_SPEED_DECAY,
  CANOE_MAX_SPEED, CANOE_STEER_AMOUNT, CANOE_LERP,
  CANOE_COLLISION_BRAKE, CANOE_ROCK_BASE_SPEED, CANOE_ROCK_SPAWN_MS,
  CANOE_METERS_PER_UNIT,
  ROWING_STROKE_THRESHOLD, ROWING_MIN_DISPLACEMENT, ROWING_REFRACTORY_MS,
} from '../../tuning.ts';
import { GAME_CONFIG } from '../config.ts';

interface Rock { x: number; y: number; rx: number; ry: number } // normalized 0–1

export class CanoeGame extends Phaser.Scene {
  private unsub: (() => void) | null = null;
  private detector!: RowingDetector;
  private narrator!: Narrator;
  private pipDiv: HTMLDivElement | null = null;
  private pipOverlay: KeypointOverlay | null = null;
  private pipCanvas: HTMLCanvasElement | null = null;
  private pipVideo: HTMLVideoElement | null = null;

  private bgGfx!: Phaser.GameObjects.Graphics;
  private canoeGfx!: Phaser.GameObjects.Graphics;
  private wakeGfx!: Phaser.GameObjects.Graphics;
  private rockGfx!: Phaser.GameObjects.Graphics;
  private indicL!: Phaser.GameObjects.Graphics;
  private indicR!: Phaser.GameObjects.Graphics;
  private indicLabelL!: Phaser.GameObjects.Text;
  private indicLabelR!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private debugBg: Phaser.GameObjects.Graphics | null = null;
  private debugText: Phaser.GameObjects.Text | null = null;

  private canoeX = 0.5;
  private canoeTargetX = 0.5;
  private speed = 0;
  private distanceM = 0;
  private timeLeftMs = CANOE_DURATION_MS;
  private rocks: Rock[] = [];
  private lastRockSpawn = 0;
  private riverScrollY = 0; // 0–1, loop visual
  private lastStrokeAt = 0;
  private strokeFlash: Record<'L' | 'R', number> = { L: 0, R: 0 };
  private ended = false;

  constructor() { super('CanoeGame'); }

  create(): void {
    this.resetState();
    const W = GAME_CONFIG.width;

    this.bgGfx    = this.add.graphics().setDepth(0);
    this.wakeGfx  = this.add.graphics().setDepth(1);
    this.rockGfx  = this.add.graphics().setDepth(2);
    this.canoeGfx = this.add.graphics().setDepth(3);
    this.indicL   = this.add.graphics().setDepth(5);
    this.indicR   = this.add.graphics().setDepth(5);

    const indicY = GAME_CONFIG.height - 52;
    this.indicLabelL = this.add.text(W * 0.22, indicY, 'L', {
      fontFamily: 'VT323, ui-monospace', fontSize: '32px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);
    this.indicLabelR = this.add.text(W * 0.78, indicY, 'R', {
      fontFamily: 'VT323, ui-monospace', fontSize: '32px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);

    this.hudText = this.add.text(W / 2, 28, '0 m', {
      fontFamily: 'VT323, ui-monospace', fontSize: '32px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(10);

    this.timerText = this.add.text(W - 16, 28, '1:00', {
      fontFamily: 'VT323, ui-monospace', fontSize: '28px', color: '#ffae0a',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(10);

    // Botão de saída no canto superior-esquerdo (PIP ocupa bottom-right)
    this.add.text(16, 16, '✕', {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4,
    }).setDepth(20).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.endGame());

    this.narrator = new Narrator(null, true);
    this.narrator.speak(narratorLines.canoeStart(), 1);

    this.createPip();
    this.setupDetector();
    this.setupDebugKeys();
    this.setupDebugPanel();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private resetState(): void {
    this.canoeX = 0.5;
    this.canoeTargetX = 0.5;
    this.speed = 0;
    this.distanceM = 0;
    this.timeLeftMs = CANOE_DURATION_MS;
    this.rocks = [];
    this.lastRockSpawn = 0;
    this.riverScrollY = 0;
    this.lastStrokeAt = 0;
    this.strokeFlash = { L: 0, R: 0 };
    this.ended = false;
  }

  // ─────────────────────────────────────
  // Render — rio, canoa, wake, pedras, indicadores
  // ─────────────────────────────────────

  private drawRiver(): void {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const g = this.bgGfx;
    g.clear();

    g.fillStyle(0x1a8fc1, 1);
    g.fillRect(0, 0, W, H);

    const riverW = W * 0.55;
    const riverLeft  = (W - riverW) / 2;
    const riverRight = riverLeft + riverW;

    const segH = H / 4;
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const ys = ((i + this.riverScrollY) % segments) * segH - segH;
      const irregLeft  = riverLeft  - 8 * Math.sin((i + this.riverScrollY) * 2.3);
      const irregRight = riverRight + 8 * Math.sin((i + this.riverScrollY) * 1.7 + 1);

      g.fillStyle(0x7a7a8a, 1);
      g.fillRect(0, ys, irregLeft, segH + 2);
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(irregLeft - 4, ys, 4, segH + 2);

      g.fillStyle(0x7a7a8a, 1);
      g.fillRect(irregRight, ys, W - irregRight, segH + 2);
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(irregRight, ys, 4, segH + 2);
    }
  }

  private drawCanoe(): void {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const g = this.canoeGfx;
    g.clear();

    const cx = this.canoeX * W;
    const cy = H * 0.72;
    const bw = 28; const bh = 52;

    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx + 3, cy + 4, bw * 2, bh * 2);

    g.fillStyle(0xe8740a, 1);
    g.fillEllipse(cx, cy, bw * 2, bh * 2);

    g.fillStyle(0x8b3a00, 1);
    g.fillEllipse(cx, cy, bw * 1.2, bh * 1.4);

    g.fillStyle(0xf0d090, 1);
    g.fillCircle(cx, cy - 8, 9);
    g.fillStyle(0x3080e0, 1);
    g.fillRect(cx - 6, cy - 2, 12, 16);

    this.drawPaddle(g, cx, cy, 'L');
    this.drawPaddle(g, cx, cy, 'R');
  }

  private drawPaddle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, side: 'L' | 'R'): void {
    const dir = side === 'L' ? -1 : 1;
    const flash = this.strokeFlash[side] > 0;
    const alpha = flash ? 1.0 : 0.6;

    const angle = flash ? Math.PI * 0.18 : Math.PI * 0.08;
    const shaftLen = 36;
    const bladeW = 10; const bladeH = 18;

    const ox = cx + dir * 12;
    const oy = cy;
    const ex = ox + Math.cos(angle) * shaftLen * dir;
    const ey = oy + Math.sin(angle) * shaftLen * -0.3;

    g.lineStyle(4, 0xf0f0e0, alpha);
    g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.strokePath();

    g.fillStyle(0xd4c090, alpha);
    g.fillEllipse(ex, ey, bladeW, bladeH);
  }

  private updateWake(): void {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const g = this.wakeGfx;
    g.clear();

    if (this.speed < 0.02) return;
    const cx = this.canoeX * W;
    const cy = H * 0.72;

    const wakeLen = 60 + this.speed * 120;
    const wakeW   = 14 * (this.speed / CANOE_MAX_SPEED) + 4;

    g.fillStyle(0xffffff, 0.55);
    g.fillTriangle(
      cx - wakeW, cy + 30,
      cx + wakeW, cy + 30,
      cx, cy + 30 + wakeLen,
    );
  }

  private spawnRock(now: number): void {
    if (now - this.lastRockSpawn < CANOE_ROCK_SPAWN_MS) return;
    this.lastRockSpawn = now;

    const riverLeft  = 0.5 - 0.275;
    const riverRight = 0.5 + 0.275;
    const rx = 0.025 + Math.random() * 0.015;
    const ry = rx * 0.7;
    const x = riverLeft + rx + Math.random() * (riverRight - riverLeft - rx * 2);
    this.rocks.push({ x, y: -0.06, rx, ry });
  }

  private updateRocks(dt: number): void {
    const rockSpeed = CANOE_ROCK_BASE_SPEED + this.speed * 0.0003;
    for (const r of this.rocks) {
      r.y += rockSpeed * dt;
    }
    this.rocks = this.rocks.filter((r) => r.y < 1.1);
  }

  private drawRocks(): void {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const g = this.rockGfx;
    g.clear();
    for (const r of this.rocks) {
      const px = r.x * W;
      const py = r.y * H;
      g.fillStyle(0x888898, 1);
      g.fillEllipse(px, py, r.rx * W * 2, r.ry * H * 2);
      g.fillStyle(0xffffff, 0.3);
      g.fillEllipse(px - r.rx * W * 0.2, py - r.ry * H * 0.3, r.rx * W * 0.6, r.ry * H * 0.4);
    }
  }

  private drawIndicators(): void {
    const W = GAME_CONFIG.width;
    const baseY = GAME_CONFIG.height - 52;

    this.drawHex(this.indicL, W * 0.22, baseY, this.strokeFlash.L > 0);
    this.drawHex(this.indicR, W * 0.78, baseY, this.strokeFlash.R > 0);

    // Re-stack labels (always on top of hex)
    this.indicLabelL.setColor(this.strokeFlash.L > 0 ? '#1a0b2a' : '#ffffff');
    this.indicLabelR.setColor(this.strokeFlash.R > 0 ? '#1a0b2a' : '#ffffff');
  }

  private drawHex(g: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean): void {
    g.clear();
    const r = 30;
    const alpha = lit ? 0.9 : 0.3;
    const color = lit ? 0xffd60a : 0x4cd9ff;

    g.fillStyle(color, alpha);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      if (i === 0) g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
      else g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    g.closePath(); g.fillPath();
  }

  // ─────────────────────────────────────
  // PIP camera (Fase C)
  // ─────────────────────────────────────

  private createPip(): void {
    const refs = getRefs(this);
    const stream = refs.video.srcObject as MediaStream | null;
    if (!stream) {
      console.warn('[CanoeGame] PIP skipped — refs.video.srcObject is null');
      return;
    }

    const pip = document.createElement('div');
    pip.id = 'canoe-pip';
    pip.style.cssText = [
      'position:fixed',
      'bottom:16px',
      'right:16px',
      'width:22vw',
      'min-width:80px',
      'max-width:140px',
      'aspect-ratio:3/4',
      'border-radius:10px',
      'overflow:hidden',
      'z-index:200',
      'border:2px solid rgba(255,255,255,0.45)',
      'box-shadow:0 2px 12px rgba(0,0,0,0.5)',
    ].join(';');

    const vid = document.createElement('video');
    vid.srcObject = stream;
    vid.autoplay = true;
    vid.playsInline = true;
    vid.muted = true;
    vid.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block;';

    const cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;transform:scaleX(-1);';

    pip.appendChild(vid);
    pip.appendChild(cvs);
    document.body.appendChild(pip);

    this.pipDiv    = pip;
    this.pipVideo  = vid;
    this.pipCanvas = cvs;
    this.pipOverlay = new KeypointOverlay(cvs);

    void vid.play();
  }

  // ─────────────────────────────────────
  // Pose + stroke handling (Fase C)
  // ─────────────────────────────────────

  private setupDetector(): void {
    const refs = getRefs(this);

    this.detector = new RowingDetector(
      ROWING_STROKE_THRESHOLD,
      ROWING_MIN_DISPLACEMENT,
      ROWING_REFRACTORY_MS,
      (side) => this.onPunch(side),
    );

    this.unsub = refs.onSmoothedFrame((frame) => {
      this.detector.push(frame);

      if (this.pipOverlay && this.pipCanvas && this.pipVideo) {
        const w = this.pipVideo.videoWidth || 320;
        const h = this.pipVideo.videoHeight || 240;
        if (this.pipCanvas.width !== w)  this.pipCanvas.width  = w;
        if (this.pipCanvas.height !== h) this.pipCanvas.height = h;
        this.pipOverlay.draw(frame.keypoints, frame.confidence, undefined, { dots: 'wrists' });
      }
    });
  }

  // Mecânica de remada (física real):
  //   Soco com mão DIREITA → empurra água do lado direito → barco vira pra ESQUERDA
  //   Soco com mão ESQUERDA → barco vira pra DIREITA
  //   Soco com AMBAS → impulso forte pra frente + barco volta pro centro
  private onPunch(side: PunchSide): void {
    this.lastStrokeAt = performance.now();

    if (side === 'BOTH') {
      this.strokeFlash.L = 300;
      this.strokeFlash.R = 300;
      // Puxa rapidamente pro centro
      this.canoeTargetX = Phaser.Math.Linear(this.canoeTargetX, 0.5, 0.6);
      // Impulso forte pra frente (2x stroke normal)
      this.speed = Math.min(this.speed + CANOE_SPEED_PER_STROKE * 2, CANOE_MAX_SPEED);
      return;
    }

    this.strokeFlash[side] = 300;

    // INVERTIDO: L → +1 (direita), R → -1 (esquerda)
    const dir = side === 'L' ? 1 : -1;
    this.canoeTargetX = Phaser.Math.Clamp(
      this.canoeTargetX + dir * CANOE_STEER_AMOUNT,
      0.27, 0.73,
    );

    this.speed = Math.min(this.speed + CANOE_SPEED_PER_STROKE, CANOE_MAX_SPEED);
  }

  // ─────────────────────────────────────
  // Game loop (Fase D)
  // ─────────────────────────────────────

  update(_time: number, delta: number): void {
    if (this.ended) return;

    const dt = delta;

    // Timer
    this.timeLeftMs -= dt;
    if (this.timeLeftMs <= 0) {
      this.timeLeftMs = 0;
      this.endGame();
      return;
    }

    // Decair velocidade (exponencial após 600ms sem stroke)
    const timeSinceStroke = performance.now() - this.lastStrokeAt;
    if (timeSinceStroke > 600) {
      this.speed *= Math.pow(CANOE_SPEED_DECAY, dt / 1000);
      if (this.speed < 0.005) this.speed = 0;
    }

    // Scroll do rio
    const scrollDt = (CANOE_ROCK_BASE_SPEED + this.speed * 0.0003) * dt;
    this.riverScrollY = (this.riverScrollY + scrollDt * 4) % 1;

    // Lerp posição X da canoa
    this.canoeX = Phaser.Math.Linear(this.canoeX, this.canoeTargetX, CANOE_LERP);

    // Distância
    this.distanceM += this.speed * dt * CANOE_METERS_PER_UNIT / 1000;

    // Flash timers
    if (this.strokeFlash.L > 0) this.strokeFlash.L -= dt;
    if (this.strokeFlash.R > 0) this.strokeFlash.R -= dt;

    // Spawn + update rocks
    this.spawnRock(this.time.now);
    this.updateRocks(dt);
    this.checkCollisions();

    // Render
    this.drawRiver();
    this.updateWake();
    this.drawRocks();
    this.drawCanoe();
    this.drawIndicators();
    this.updateHud();
    this.renderDebugPanel();
  }

  private checkCollisions(): void {
    const cx = this.canoeX;
    const cy = 0.72;
    // Half-extents normalizados batendo com sprite (bw=28, bh=52 sobre W~720, H~1280)
    const cw = 0.04; const ch = 0.045;

    for (const r of this.rocks) {
      const dx = Math.abs(r.x - cx) / (cw + r.rx);
      const dy = Math.abs(r.y - cy) / (ch + r.ry);
      if (dx < 1 && dy < 1) {
        this.speed *= CANOE_COLLISION_BRAKE;
        this.cameras.main.shake(200, 0.006);
        this.cameras.main.flash(150, 255, 60, 60, false);
        this.narrator.speak(narratorLines.canoeRockHit(), 2);
        this.rocks = this.rocks.filter((k) => k !== r);
        break; // uma colisão por frame
      }
    }
  }

  private updateHud(): void {
    this.hudText.setText(`${Math.floor(this.distanceM)} m`);

    const totalSec = Math.ceil(this.timeLeftMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.timerText.setText(`${min}:${sec.toString().padStart(2, '0')}`);
  }

  private setupDebugKeys(): void {
    if (!KeyboardDebug.isEnabledByQuery()) return;

    this.input.keyboard?.on('keydown-A', () => this.onPunch('L'));
    this.input.keyboard?.on('keydown-D', () => this.onPunch('R'));
    this.input.keyboard?.on('keydown-S', () => this.onPunch('BOTH'));
  }

  // ─────────────────────────────────────
  // Debug panel — só com ?debug=1
  // Mostra speed/dy/cooldown por braço + razão de rejeição em tempo real,
  // pra usuário entender qual movimento o detector espera.
  // ─────────────────────────────────────

  private setupDebugPanel(): void {
    if (!KeyboardDebug.isEnabledByQuery()) return;

    const W = GAME_CONFIG.width;
    const panelW = Math.min(W - 24, 360);
    const panelH = 162;
    const panelX = 12;
    const panelY = 70;

    this.debugBg = this.add.graphics().setDepth(50);
    this.debugBg.fillStyle(0x000000, 0.78);
    this.debugBg.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    this.debugBg.lineStyle(2, 0x4cd964, 0.9);
    this.debugBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);

    this.debugText = this.add.text(panelX + 10, panelY + 8, '', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px',
      color: '#ffffff', lineSpacing: 2,
    }).setDepth(51);

    this.add.text(panelX + 10, panelY + panelH + 6,
      'Soquinhos rápidos! Mão E → barco vai DIREITA · Mão D → ESQUERDA · Ambas → CENTRO + impulso',
      {
        fontFamily: 'VT323, ui-monospace', fontSize: '16px',
        color: '#ffd60a', stroke: '#000', strokeThickness: 3,
        wordWrap: { width: panelW },
      }).setDepth(51);
  }

  private renderDebugPanel(): void {
    if (!this.debugText || !this.detector) return;

    const d = this.detector.getDebug();
    const fmt = (n: number, digits = 3): string => n.toFixed(digits).padStart(7);
    const reasonLabel = (r: string | null): string => {
      if (!r) return '✓ pronto';
      switch (r) {
        case 'cooldown':     return '⏳ cooldown';
        case 'speed':        return '🐢 lento';
        case 'displacement': return '📏 pouco mov';
        default:             return r;
      }
    };

    const now = performance.now();
    const sincePunch = d.lastPunchAt > 0 ? Math.floor(now - d.lastPunchAt) : -1;
    const lastSide = d.lastPunch ?? '–';

    const lines = [
      `speed≥${ROWING_STROKE_THRESHOLD.toFixed(2)}  disp≥${ROWING_MIN_DISPLACEMENT.toFixed(2)}  cool≥${ROWING_REFRACTORY_MS}ms`,
      ``,
      `L  spd=${fmt(d.L.speed)}  disp=${fmt(d.L.displacement)}  ${reasonLabel(d.L.lastReject)}`,
      `R  spd=${fmt(d.R.speed)}  disp=${fmt(d.R.displacement)}  ${reasonLabel(d.R.lastReject)}`,
      ``,
      `Último soco: ${lastSide}  (${sincePunch >= 0 ? sincePunch + 'ms atrás' : '—'})`,
      `E→DIREITA · D→ESQUERDA · ambas→CENTRO`,
    ];
    this.debugText.setText(lines);
  }

  private endGame(): void {
    if (this.ended) return;
    this.ended = true;
    this.scene.start('MiniGameResult', {
      score:      Math.floor(this.distanceM),
      scoreLabel: strings.miniGames.canoeMeters,
      gameKey:    'CanoeGame',
    });
  }

  private cleanup(): void {
    this.unsub?.();
    this.unsub = null;
    this.detector?.reset();

    if (this.pipDiv) {
      this.pipDiv.remove();
      this.pipDiv = null;
      this.pipOverlay = null;
      this.pipCanvas = null;
      this.pipVideo = null;
    }

    this.debugBg = null;
    this.debugText = null;
  }
}
