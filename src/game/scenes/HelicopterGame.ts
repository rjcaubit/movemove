import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import { KP, type GameEvent, type PoseFrame } from '../../pose/types.ts';
import { POSE_CONFIG } from '../../pose/config.ts';
import { JumpDebugOverlay } from '../ui/jumpDebugOverlay.ts';

const DURATION_MS = 60_000;
// Gravidade progressiva — começa BEM suave e cresce devagar até o teto em 12s.
const GRAVITY_INITIAL = 0.08;  // normalized/s² (queda inicial bem leve)
const GRAVITY_MAX = 0.32;       // queda no fim ainda controlável
const GRAVITY_RAMP_MS = 12_000;
const MAX_FALL_VY = 0.55;       // velocidade terminal de queda (era 0.85)
// Pulo
const JUMP_VY = -0.55;          // impulso base pra cima
const JUMP_STACK_FACTOR = 0.8;  // pulo enquanto já sobe adiciona 80% do impulso base
const JUMP_VY_CAP = -1.40;      // teto de velocidade ascendente (mais alto = sobe mais quando pumping)
// Frequência de pulos — quanto mais rápido o jogador pula, maior o multiplicador
// no impulso. Janela observa pulos nos últimos JUMP_RATE_WINDOW_MS.
const JUMP_RATE_WINDOW_MS = 1500;
const JUMP_RATE_STEP = 0.33;    // cada pulo prévio dentro da janela soma 33% no multiplicador
const JUMP_RATE_MAX_BONUS = 1.0; // teto: bônus máximo de +100% (multiplicador chega a 2×)
// Hover — após um pulo, gravidade fica reduzida por 1.8s (rotor ainda segurando)
const HOVER_DURATION_MS = 1800;
const HOVER_GRAVITY_FLOOR = 0.10; // logo após pulo, gravidade vira 10% da normal
// Posição
const FLOOR_Y = 0.84;
const CEIL_Y = 0.06;
const START_Y = 0.10;
const LIVES = 3;
const HIT_INVINCIBILITY_MS = 1500;
const FLASH_INTERVAL_MS = 120;

interface HelicopterData {
  session?: string[];
}

export class HelicopterGame extends Phaser.Scene {
  private heliY = START_Y;
  private heliVY = 0.0;
  private lives = LIVES;
  private score = 0; // seconds survived
  private startedAt = 0;
  private lastHitAt = -Infinity;
  private done = false;

  private heli!: Phaser.GameObjects.Text;
  private ground!: Phaser.GameObjects.Graphics;
  private livesText!: Phaser.GameObjects.Text;
  private timePill!: Pill;
  /** Indicador "J" que pisca quando o pulo é detectado — feedback visual. */
  private indicJ!: Phaser.GameObjects.Graphics;
  private indicJLabel!: Phaser.GameObjects.Text;
  private jumpFlashMs = 0;
  /** Overlay de debug ao lado do J — mostra shoulderY × threshold ao vivo. */
  private debugReadout!: Phaser.GameObjects.Text;
  private unsubFrame: (() => void) | null = null;
  /** Overlay com as 7 estratégias do JumpTester — pra comparar contra o J real. */
  private jumpDebug: JumpDebugOverlay | null = null;

  private backdrop: CameraBackdrop | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private eventListener: ((e: Event) => void) | null = null;
  private flashTimer = 0;
  private lastJumpAt = -Infinity;
  /** Timestamps dos pulos recentes — usados para calcular o multiplicador por frequência. */
  private recentJumps: number[] = [];

  constructor() { super('HelicopterGame'); }

  create(data: HelicopterData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a1a2a);
    this.session = data?.session ?? [];
    this.heliY = START_Y;
    this.heliVY = 0;
    this.lives = LIVES;
    this.score = 0;
    this.done = false;
    this.startedAt = performance.now();
    this.lastHitAt = -Infinity;
    this.flashTimer = 0;
    this.lastJumpAt = -Infinity;
    this.recentJumps = [];
    this.jumpFlashMs = 0;

    addThemedFrame(this, 'helicopter');
    addTitleBanner(this, width / 2, 50, strings.miniGames.helicopterTitle, 0x4cd964, 0xffffff);

    this.timePill = new Pill(this, width - 130, 50, '60s', {
      width: 180, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
    });

    this.livesText = this.add.text(width / 2, 50, this.livesStr(), {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px',
    }).setOrigin(0.5).setDepth(50);

    // Ground strip
    this.ground = this.add.graphics().setDepth(12);
    this.drawGround();

    // Helicopter
    this.heli = this.add.text(width * 0.35, this.heliY * height, '🚁', {
      fontSize: '56px',
    }).setOrigin(0.5).setDepth(20);

    // Indicador "J" — pisca quando o pulo é detectado (igual L/R do CanoeGame)
    const indicY = height - 52;
    this.indicJ = this.add.graphics().setDepth(15);
    this.indicJLabel = this.add.text(width / 2, indicY, 'J', {
      fontFamily: 'VT323, ui-monospace', fontSize: '32px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(16);
    this.drawJumpIndicator();

    // Readout ao vivo do detector de pulo — fica do lado do J
    this.debugReadout = this.add.text(width / 2 + 60, indicY, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '16px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(16);


    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.6);
    this.backdrop.handGlows = [
      { idx: 15, color: '#4cd964', alpha: 0.55 },
      { idx: 16, color: '#4cd964', alpha: 0.55 },
    ];

    this.narrator = new Narrator(null, true);
    this.narrator.speak(narratorLines.helicopterStart(), 2);

    this.eventListener = (e: Event) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      if (ev.type === 'jump') this.onJump();
    };
    refs.eventDetector.addEventListener('event', this.eventListener);

    // Subscreve no stream de frames pra mostrar shoulderY × threshold ao vivo
    // Overlay de diagnóstico (7 estratégias). Colado no canto direito, abaixo do timer.
    this.jumpDebug = new JumpDebugOverlay(this, width - 40, 90);

    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => {
      this.updateDebugReadout(frame);
      this.jumpDebug?.ingestFrame(frame);
    });

    // SPACE como fallback de teclado
    this.input.keyboard?.on('keydown-SPACE', () => this.onJump());

    addBackButton(this);
  }

  private onJump(): void {
    if (this.done) return;
    const now = performance.now();
    // Conta quantos pulos prévios estão dentro da janela ativa.
    this.recentJumps = this.recentJumps.filter((t) => now - t < JUMP_RATE_WINDOW_MS);
    const prevInWindow = this.recentJumps.length;
    // Multiplicador: 1× pulo isolado, +33%/pulo prévio até cap de 2×.
    const rateMul = 1 + Math.min(JUMP_RATE_MAX_BONUS, prevInWindow * JUMP_RATE_STEP);
    this.recentJumps.push(now);

    const impulse = JUMP_VY * rateMul;
    if (this.heliVY < 0) {
      // Já estava subindo — empilha impulso (pumping up), respeitando cap.
      this.heliVY = Math.max(JUMP_VY_CAP, this.heliVY + impulse * JUMP_STACK_FACTOR);
    } else {
      // Estava caindo / parado — impulso completo modulado pelo rate.
      this.heliVY = Math.max(JUMP_VY_CAP, impulse);
    }
    this.lastJumpAt = now;
    this.jumpFlashMs = 300;
    // Pulso do rotor — squash visual no eixo Y
    this.tweens.add({
      targets: this.heli,
      scaleY: 0.8,
      duration: 80,
      yoyo: true,
    });
  }

  private currentGravity(elapsed: number, now: number): number {
    const ramp = Math.min(1, elapsed / GRAVITY_RAMP_MS);
    const base = GRAVITY_INITIAL + (GRAVITY_MAX - GRAVITY_INITIAL) * ramp;
    // Hover phase: logo após o pulo a gravidade vira HOVER_GRAVITY_FLOOR×base
    // e cresce linearmente de volta a 1× ao longo de HOVER_DURATION_MS.
    const sinceJump = now - this.lastJumpAt;
    if (sinceJump < HOVER_DURATION_MS) {
      const k = sinceJump / HOVER_DURATION_MS; // 0 → 1
      const factor = HOVER_GRAVITY_FLOOR + (1 - HOVER_GRAVITY_FLOOR) * k;
      return base * factor;
    }
    return base;
  }

  update(_time: number, delta: number): void {
    if (this.done) return;
    const now = performance.now();
    const elapsed = now - this.startedAt;
    const dt = delta / 1000;

    // Timer
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timePill.setText(`${remaining}s`);

    if (elapsed >= DURATION_MS) { this.finish(true); return; }

    // Física com gravidade progressiva + hover após pulo
    const g = this.currentGravity(elapsed, now);
    this.heliVY = Math.min(MAX_FALL_VY, this.heliVY + g * dt);
    this.heliY += this.heliVY * dt;

    // Teto
    if (this.heliY < CEIL_Y) { this.heliY = CEIL_Y; this.heliVY = 0; }

    // Inclina pra frente quando sobe, pra trás quando cai (helicóptero pousando)
    this.heli.setRotation(Phaser.Math.Clamp(this.heliVY * 0.6, -0.30, 0.85));
    this.heli.setY(this.heliY * GAME_CONFIG.height);

    // Decay e re-render do indicador "J"
    if (this.jumpFlashMs > 0) this.jumpFlashMs = Math.max(0, this.jumpFlashMs - delta);
    this.drawJumpIndicator();

    // Piscada de invencibilidade
    const inInvincibility = now - this.lastHitAt < HIT_INVINCIBILITY_MS;
    if (inInvincibility) {
      this.flashTimer += delta;
      this.heli.setAlpha(Math.floor(this.flashTimer / FLASH_INTERVAL_MS) % 2 === 0 ? 1 : 0.15);
    } else {
      this.heli.setAlpha(1);
      this.flashTimer = 0;
    }

    // Colisão com chão
    if (this.heliY >= FLOOR_Y && !inInvincibility) {
      this.heliY = FLOOR_Y - 0.01;
      this.heliVY = JUMP_VY * 0.5; // bouncezinho
      this.lastHitAt = now;
      this.lives -= 1;
      this.livesText.setText(this.livesStr());

      if (this.lives <= 0) {
        this.finish(false);
      } else {
        this.cameras.main.shake(200, 0.012);
        this.narrator.speak(narratorLines.helicopterHitGround(this.lives), 1);
      }
    }
  }

  private livesStr(): string {
    return '❤️'.repeat(this.lives) + '🖤'.repeat(LIVES - this.lives);
  }

  private updateDebugReadout(frame: PoseFrame): void {
    const refs = getRefs(this);
    const baseline = refs.eventDetector.getBaseline();
    if (!baseline) {
      this.debugReadout.setText('no baseline');
      this.debugReadout.setColor('#ff6b6b');
      return;
    }
    const kp = frame.keypoints;
    const yShoulder = (kp[KP.LEFT_SHOULDER].y + kp[KP.RIGHT_SHOULDER].y) / 2;
    const threshold = baseline.yOmbrosBase - POSE_CONFIG.shoulderJumpThresholdFracHCorpo * baseline.hCorpo;
    const delta = yShoulder - threshold; // negativo = acima do threshold (pulou)
    const wouldDetect = yShoulder < threshold;
    this.debugReadout.setText(
      `shY ${yShoulder.toFixed(3)}\nthr ${threshold.toFixed(3)}\nΔ ${delta.toFixed(3)} conf ${frame.confidence.toFixed(2)}`
    );
    this.debugReadout.setColor(wouldDetect ? '#4cd964' : '#ffffff');
  }

  private drawJumpIndicator(): void {
    const lit = this.jumpFlashMs > 0;
    const x = GAME_CONFIG.width / 2;
    const y = GAME_CONFIG.height - 52;
    const r = 30;
    const color = lit ? 0xffd60a : 0x4cd964;
    const alpha = lit ? 0.9 : 0.3;

    const g = this.indicJ;
    g.clear();
    g.fillStyle(color, alpha);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fillPath();

    this.indicJLabel.setColor(lit ? '#0a1a2a' : '#ffffff');
  }

  private drawGround(): void {
    const { width, height } = GAME_CONFIG;
    const gy = FLOOR_Y * height;
    this.ground.clear();
    // Asfalto/terra
    this.ground.fillStyle(0x5c3317, 1);
    this.ground.fillRect(0, gy, width, height - gy);
    // Faixa de grama
    this.ground.fillStyle(0x3a7d1e, 1);
    this.ground.fillRect(0, gy, width, 14);
  }

  private finish(survived: boolean): void {
    if (this.done) return;
    this.done = true;

    if (this.eventListener) {
      const refs = getRefs(this);
      refs.eventDetector.removeEventListener('event', this.eventListener);
      this.eventListener = null;
    }

    const elapsed = performance.now() - this.startedAt;
    this.score = Math.round(Math.min(DURATION_MS, elapsed) / 1000);

    if (survived) this.narrator.speak(narratorLines.helicopterSurvived(), 2);

    const refs = getRefs(this);
    void refs.missions.tick({ helicopterSeconds: this.score });
    this.scene.start('MiniGameResult', {
      gameKey: 'HelicopterGame',
      score: this.score,
      scoreLabel: strings.miniGames.helicopterSeconds,
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.jumpDebug) { this.jumpDebug.destroy(); this.jumpDebug = null; }
    if (this.eventListener) {
      try {
        const refs = getRefs(this);
        refs.eventDetector.removeEventListener('event', this.eventListener);
      } catch { /* scene may have been destroyed */ }
      this.eventListener = null;
    }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
  }
}
