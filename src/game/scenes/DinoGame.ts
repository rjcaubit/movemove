import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { getRefs } from '../orchestrator.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import type { GameEvent } from '../../pose/types.ts';

interface DinoData {
  session?: string[];
}

const DURATION_MS = 60_000;
const LIVES = 5;
const GROUND_Y_RATIO = 0.86;
const GRASS_TOP_RATIO = 0.72;
// Pulo alto e com bastante tempo no ar: ~210 px de altura, ~0,95 s.
const JUMP_VY = -900;
const GRAVITY = 1900;
const HIT_INVINCIBILITY_MS = 1200;
const FLASH_INTERVAL_MS = 100;
const INITIAL_SPEED = 320;
const MAX_SPEED = 640;
const SPEED_RAMP_MS = 40_000;
const DINO_X = 200;
/** Tamanho de um "pixel" dos sprites na tela. */
const PX = 5;
const CLOUD_PX = 7;

type Palette = Record<string, string>;

const DINO_PALETTE: Palette = {
  G: '#5aa86a', D: '#3f8456', O: '#e8843c', C: '#ead9a8', W: '#ffffff', K: '#1c1c22', R: '#c8404a',
};

const DINO_BODY = [
  '............GGGGG',
  '...........GGGGGGG',
  '...........GWKGGGGG',
  '...........GGGGGGGG',
  '...........GGGGRRRR',
  '...........GGGGG',
  '....O.O....GGGG',
  '...OGOGO..GGGGG',
  '..DGGGGGGGGGGGGGG',
  '.DGGGGGGGGGGCCG.G',
  'DDGGGGGGGGGCCCG',
  '.DDGGGGGGGGCCC',
  '..DDGGGGGGGCC',
  '....GGGGGGGG',
];

const DINO_LEGS: Record<string, string[]> = {
  dino_run0: ['....GGG..GGG', '....GG....GG', '...DDD....GG', '..........DDD'],
  dino_run1: ['....GGG..GGG', '....GG....GG', '....GG...DDD', '....DDD'],
  dino_jump: ['....GGG..GGG', '...DDD..DDD', '', ''],
};

interface ObstacleKind { key: string; rows: string[]; palette: Palette }

const WOOD: Palette = { B: '#7a4a32', b: '#5f3826', T: '#c9a077', t: '#a9825c' };
const STONE: Palette = { S: '#8a7a78', s: '#6f615f', L: '#b3a5a2' };

const OBSTACLES: ObstacleKind[] = [
  {
    key: 'dino_log', palette: WOOD, rows: [
      '.BBBBBBBBBBBBBB.',
      'TTBBBBBBBBBBBBBB',
      'TTBbBBBBBbBBBBBB',
      'TTBBBBBBBBBBBbBB',
      'TTBBBbBBBBBBBBBB',
      'TTBBBBBBBBBBBBBB',
      '.bbbbbbbbbbbbbb.',
    ],
  },
  {
    key: 'dino_rock', palette: STONE, rows: [
      '...SSSSS...',
      '..SLLSSSS..',
      '.SSLSSSSSS.',
      'SSSSSSSSSSs',
      'SSSSSSSSSss',
      'SSSSSSSSSss',
      'SSSSSSSSsss',
      'SSSSSSSssss',
      '.ssssssssss',
    ],
  },
  {
    key: 'dino_stump', palette: WOOD, rows: [
      '.TTTTTTT.',
      'TTTtTTTTT',
      '.TTTTTTT.',
      '.BBBBBBB.',
      '.BBbBBBB.',
      '.BBBBBBB.',
      '.BBBBbBB.',
      '.BBBBBBB.',
      '.BbBBBBB.',
      '.BBBBBBB.',
      'BBBBBBBBB',
      'bbBbbBbbb',
    ],
  },
];

const CLOUD_ROWS = [
  '....PP....PPP...',
  '..PPPPP..PPPPPP.',
  '.PPPPPPPPPPPPPPP',
  'PPPPPPPPPPPPPPPP',
  'PPPPPPPPPPPPPPPP',
  'pPPPPPpppPPPPPpp',
  '.ppp.pp...ppppp.',
];
const CLOUD_PALETTE: Palette = { P: '#e6c4bb', p: '#b59aa8' };

const PLANT: Palette = { F: '#5c9440', f: '#4f8238', B: '#7a4a32', g: '#7c9a3e', d: '#5f7f30' };
const DECOR: Array<{ key: string; rows: string[]; lane: 'back' | 'front' }> = [
  { key: 'dino_tree', lane: 'back', rows: ['...F...', '.FFFFF.', 'FFFFFFF', 'FFfFFFF', '.FFFfF.', '..FFF..', '...B...', '...B...', '...B...', '...B...'] },
  { key: 'dino_bush', lane: 'back', rows: ['..F..', '.FFF.', 'FFFFF', 'FfFFF', '.FFF.'] },
  { key: 'dino_tuft', lane: 'back', rows: ['..g...g', 'g.g.g.g', 'g.g.g.g'] },
  { key: 'dino_weed', lane: 'front', rows: ['..d.d.', '.dddd.', 'dddddd', 'dddddd'] },
  { key: 'dino_speck', lane: 'front', rows: ['gg..g'] },
];

interface Obstacle {
  img: Phaser.GameObjects.Image;
  x: number;
  w: number;
  h: number;
  scored: boolean;
}

interface Scroller {
  img: Phaser.GameObjects.Image;
  x: number;
  /** Fração da velocidade do chão (nuvens andam bem mais devagar). */
  factor: number;
}

function lerpColor(a: number, b: number, t: number): string {
  const ch = (shift: number): number => {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export class DinoGame extends Phaser.Scene {
  private dinoY = 0;
  private dinoVY = 0;
  private isGrounded = true;
  private dodged = 0;
  private score = 0;
  private lives = LIVES;
  private startedAt = 0;
  private done = false;
  private lastHitAt = -Infinity;
  private flashTimer = 0;
  private flashOn = false;
  private nextSpawnAt = 0;
  private legFrame = 0;
  private legTimer = 0;
  private groundY = 0;

  private obstacles: Obstacle[] = [];
  private scrollers: Scroller[] = [];
  private dino!: Phaser.GameObjects.Image;

  private scorePill!: Pill;
  private timePill!: Pill;
  private livesEl!: Phaser.GameObjects.Text;

  private narrator!: Narrator;
  private eventListener: ((e: Event) => void) | null = null;
  private session: string[] = [];

  constructor() { super('DinoGame'); }

  create(data: DinoData): void {
    const { width, height } = GAME_CONFIG;
    this.session = data?.session ?? [];
    this.score = 0;
    this.dodged = 0;
    this.lives = LIVES;
    this.done = false;
    this.startedAt = performance.now();
    this.groundY = Math.round(height * GROUND_Y_RATIO);
    this.dinoY = this.groundY;
    this.dinoVY = 0;
    this.isGrounded = true;
    this.lastHitAt = -Infinity;
    this.obstacles = [];
    this.scrollers = [];
    this.legFrame = 0;
    this.legTimer = 0;
    this.nextSpawnAt = performance.now() + 2200;

    this.cameras.main.setBackgroundColor('#4f3572');
    this.buildTextures();

    this.add.image(0, 0, this.backgroundKey()).setOrigin(0, 0).setDepth(-10);

    for (let i = 0; i < 3; i++) {
      const x = (width / 3) * i + Math.random() * (width / 4);
      const y = height * (0.12 + Math.random() * 0.22);
      const img = this.add.image(x, y, 'dino_cloud').setOrigin(0.5).setDepth(-8);
      this.scrollers.push({ img, x, factor: 0.05 + Math.random() * 0.03 });
    }

    const decorCount = Math.ceil(width / 110);
    for (let i = 0; i < decorCount; i++) {
      const d = DECOR[i % DECOR.length];
      const x = Math.random() * (width + 200);
      const y = d.lane === 'back'
        ? this.groundY - 14 - Math.random() * (this.groundY - height * GRASS_TOP_RATIO - 70)
        : this.groundY + 26 + Math.random() * Math.max(10, height - this.groundY - 40);
      const img = this.add.image(x, y, d.key).setOrigin(0.5, 1).setDepth(d.lane === 'back' ? 2 : 6);
      this.scrollers.push({ img, x, factor: 1 });
    }

    this.dino = this.add.image(DINO_X, this.dinoY, 'dino_run0').setOrigin(0.5, 1).setDepth(20);

    this.scorePill = new Pill(this, 140, 44, '0', {
      width: 210, fill: 0xe8843c, stroke: 0xffffff,
      textColor: '#fff8d8', fontSize: 28, icon: '⭐', origin: [0.5, 0.5],
    });
    this.timePill = new Pill(this, width - 130, 44, '60s', {
      width: 180, fill: 0x4f3572, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
    });
    this.livesEl = this.add.text(width / 2, 100, this.livesStr(), {
      fontFamily: 'VT323, ui-monospace', fontSize: '32px',
    }).setOrigin(0.5).setDepth(50);

    const refs = getRefs(this);
    this.narrator = new Narrator(null, true);
    this.narrator.speak('Pula os troncos e as pedras!', 2);

    this.eventListener = (e: Event) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      if (ev.type === 'jump') this.onJump();
    };
    refs.eventDetector.addEventListener('event', this.eventListener);
    this.input.keyboard?.on('keydown-SPACE', () => this.onJump());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    addBackButton(this);
  }

  private livesStr(): string {
    return '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, LIVES - this.lives));
  }

  private backgroundKey(): string {
    return `dino_bg_${GAME_CONFIG.width}x${GAME_CONFIG.height}`;
  }

  private pixelTexture(key: string, rows: string[], palette: Palette, px: number): void {
    if (this.textures.exists(key)) return;
    const cols = Math.max(...rows.map((r) => r.length));
    const tex = this.textures.createCanvas(key, cols * px, rows.length * px);
    if (!tex) return;
    const ctx = tex.context;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = palette[row[x]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * px, y * px, px, px);
      }
    });
    tex.refresh();
  }

  private buildTextures(): void {
    for (const [key, legs] of Object.entries(DINO_LEGS)) this.pixelTexture(key, [...DINO_BODY, ...legs], DINO_PALETTE, PX);
    for (const o of OBSTACLES) this.pixelTexture(o.key, o.rows, o.palette, PX);
    for (const d of DECOR) this.pixelTexture(d.key, d.rows, PLANT, PX);
    this.pixelTexture('dino_cloud', CLOUD_ROWS, CLOUD_PALETTE, CLOUD_PX);
    this.buildBackground();
  }

  /** Céu de pôr do sol em faixas pontilhadas, morros em degraus e gramado. */
  private buildBackground(): void {
    const key = this.backgroundKey();
    if (this.textures.exists(key)) return;
    const { width, height } = GAME_CONFIG;
    const tex = this.textures.createCanvas(key, width, height);
    if (!tex) return;
    const ctx = tex.context;
    const grassTop = Math.round(height * GRASS_TOP_RATIO);
    const cell = 6;

    const stops = [0x4f3572, 0x6a4070, 0x8a4d6c, 0xa85a66, 0xc0655e, 0xcf7458];
    const bands = 12;
    const bandH = Math.ceil(grassTop / bands);
    const colorAt = (i: number): string => {
      const t = (i / (bands - 1)) * (stops.length - 1);
      const k = Math.min(stops.length - 2, Math.floor(t));
      return lerpColor(stops[k], stops[k + 1], t - k);
    };
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = colorAt(i);
      ctx.fillRect(0, i * bandH, width, bandH);
      if (i === 0) continue;
      // Transição pontilhada entre uma faixa e a seguinte.
      ctx.fillStyle = colorAt(i - 1);
      for (let row = 0; row < 2; row++) {
        for (let x = (row % 2) * cell; x < width; x += cell * 2) ctx.fillRect(x, i * bandH + row * cell, cell, cell);
      }
    }

    ctx.fillStyle = 'rgba(255,235,225,0.35)';
    for (let i = 0; i < 70; i++) {
      const s = Math.random() < 0.2 ? cell : cell / 2;
      ctx.fillRect(Math.floor(Math.random() * width), Math.floor(Math.random() * grassTop * 0.85), s, s);
    }

    // Silhueta em degraus: pontos [x, altura] em frações da largura / pixels acima do gramado.
    const ridge = (color: string, pts: Array<[number, number]>): void => {
      ctx.fillStyle = color;
      const step = cell * 2;
      for (let x = 0; x < width; x += step) {
        const fx = x / width;
        let hgt = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, h0] = pts[i];
          const [x1, h1] = pts[i + 1];
          if (fx >= x0 && fx <= x1) { hgt = h0 + (h1 - h0) * ((fx - x0) / (x1 - x0 || 1)); break; }
        }
        const q = Math.round(hgt / cell) * cell;
        if (q > 0) ctx.fillRect(x, grassTop - q, step, q);
      }
    };
    const u = height / 720;
    ridge('#c8744f', [[0.14, 0], [0.2, 95 * u], [0.3, 100 * u], [0.35, 55 * u], [0.4, 100 * u], [0.5, 95 * u], [0.58, 30 * u], [0.62, 0]]);
    ridge('#a88c6c', [[0.55, 0], [0.62, 50 * u], [0.7, 58 * u], [0.88, 62 * u], [1, 70 * u]]);
    ridge('#d4915a', [[0.6, 0], [0.7, 22 * u], [0.85, 30 * u], [1, 28 * u]]);
    ridge('#77804c', [[0, 34 * u], [0.1, 44 * u], [0.2, 30 * u], [0.3, 22 * u], [0.38, 34 * u], [0.5, 26 * u], [0.6, 18 * u], [0.66, 0]]);

    ctx.fillStyle = '#8ba846';
    ctx.fillRect(0, grassTop, width, height - grassTop);
    ctx.fillStyle = '#7c9a3e';
    ctx.fillRect(0, Math.round(height * GROUND_Y_RATIO), width, cell * 2);
    tex.refresh();
  }

  private spawnObstacle(): void {
    const { width } = GAME_CONFIG;
    const kind = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
    const x = width + 80;
    const img = this.add.image(x, this.groundY + PX, kind.key).setOrigin(0.5, 1).setDepth(15);
    this.obstacles.push({ img, x, w: img.width, h: img.height, scored: false });
  }

  private currentSpeed(): number {
    const elapsed = Math.min(performance.now() - this.startedAt, SPEED_RAMP_MS);
    return INITIAL_SPEED + (MAX_SPEED - INITIAL_SPEED) * (elapsed / SPEED_RAMP_MS);
  }

  private onJump(): void {
    if (!this.isGrounded || this.done) return;
    this.dinoVY = JUMP_VY;
    this.isGrounded = false;
  }

  /** Caixa do corpo (sem focinho nem rabo) contra a caixa do obstáculo, com folga. */
  private checkCollision(obs: Obstacle): boolean {
    const dLeft = DINO_X - 6 * PX;
    const dRight = DINO_X + 4 * PX;
    const oLeft = obs.x - obs.w / 2 + PX;
    const oRight = obs.x + obs.w / 2 - PX;
    const oTop = this.groundY - obs.h + 2 * PX;
    return dRight > oLeft && dLeft < oRight && this.dinoY > oTop;
  }

  update(_time: number, delta: number): void {
    if (this.done) return;
    const dt = Math.min(delta, 50) / 1000;
    const now = performance.now();
    const { width } = GAME_CONFIG;

    const elapsed = now - this.startedAt;
    this.timePill.setText(`${Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000))}s`);
    this.score = Math.floor(elapsed / 1000) + this.dodged * 5;
    this.scorePill.setText(String(this.score));

    if (!this.isGrounded) {
      this.dinoVY += GRAVITY * dt;
      this.dinoY += this.dinoVY * dt;
      if (this.dinoY >= this.groundY) {
        this.dinoY = this.groundY;
        this.dinoVY = 0;
        this.isGrounded = true;
      }
    }
    this.dino.setY(this.dinoY);

    if (this.isGrounded) {
      this.legTimer += delta;
      if (this.legTimer >= 130) {
        this.legTimer = 0;
        this.legFrame = this.legFrame === 0 ? 1 : 0;
      }
      this.dino.setTexture(this.legFrame === 0 ? 'dino_run0' : 'dino_run1');
    } else {
      this.dino.setTexture('dino_jump');
    }

    const flashing = now - this.lastHitAt < HIT_INVINCIBILITY_MS;
    if (flashing) {
      this.flashTimer += delta;
      if (this.flashTimer >= FLASH_INTERVAL_MS) {
        this.flashTimer = 0;
        this.flashOn = !this.flashOn;
      }
      this.dino.setAlpha(this.flashOn ? 0.35 : 1);
    } else {
      this.dino.setAlpha(1);
    }

    const speed = this.currentSpeed();

    for (const s of this.scrollers) {
      s.x -= speed * s.factor * dt;
      if (s.x < -120) s.x = width + 80 + Math.random() * 160;
      s.img.setX(s.x);
    }

    for (const obs of this.obstacles) {
      obs.x -= speed * dt;
      obs.img.setX(obs.x);
      if (!obs.scored && obs.x + obs.w / 2 < DINO_X - 6 * PX) {
        obs.scored = true;
        this.dodged += 1;
      }
    }

    if (now >= this.nextSpawnAt) {
      this.spawnObstacle();
      const interval = Math.max(1100, 2200 - (elapsed / SPEED_RAMP_MS) * 900);
      this.nextSpawnAt = now + interval + Math.random() * 600;
    }

    this.obstacles = this.obstacles.filter((obs) => {
      if (obs.x < -140) { obs.img.destroy(); return false; }
      return true;
    });

    if (!flashing) {
      for (const obs of this.obstacles) {
        if (!this.checkCollision(obs)) continue;
        this.lives -= 1;
        this.lastHitAt = now;
        this.flashTimer = 0;
        this.flashOn = true;
        this.livesEl.setText(this.livesStr());
        if (this.lives <= 0) { this.finish(); return; }
        break;
      }
    }

    if (elapsed >= DURATION_MS) this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.scene.start('MiniGameResult', {
      gameKey: 'DinoGame',
      score: this.score,
      scoreLabel: 'pontos',
      session: this.session,
    });
  }

  private cleanup(): void {
    if (this.eventListener) {
      try { getRefs(this).eventDetector.removeEventListener('event', this.eventListener); } catch { /* jogo já destruído */ }
      this.eventListener = null;
    }
    this.obstacles = [];
    this.scrollers = [];
  }
}
