import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

export type FruitKind = 'fruit' | 'bomb';

const FRUIT_EMOJIS = ['🍉', '🍎', '🍌', '🍊', '🍇', '🥝', '🍑'];
const BOMB_EMOJIS = ['💣', '🧨'];

const GRAVITY_NORM = 1.2;    // normalized/s²
const SPAWN_VY_MIN = -1.6;   // velocidade inicial pra cima
const SPAWN_VY_MAX = -2.1;
const SPAWN_VX_RANGE = 0.4;  // ± lateral

export class Fruit {
  readonly kind: FruitKind;
  x: number;
  y: number;
  private vx: number;
  private vy: number;
  alive = true;
  private accounted = false;
  private body: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, kind: FruitKind, normX: number) {
    this.kind = kind;
    this.x = normX;
    this.y = 1.05;
    this.vy = SPAWN_VY_MIN + Math.random() * (SPAWN_VY_MAX - SPAWN_VY_MIN);
    const towardCenter = (0.5 - normX) * 1.4;
    this.vx = towardCenter + (Math.random() - 0.5) * SPAWN_VX_RANGE;

    const emoji = kind === 'fruit'
      ? FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)]
      : BOMB_EMOJIS[Math.floor(Math.random() * BOMB_EMOJIS.length)];

    this.body = scene.add.text(
      this.x * GAME_CONFIG.width,
      this.y * GAME_CONFIG.height,
      emoji, { fontSize: '64px' },
    ).setOrigin(0.5).setDepth(20);

    if (kind === 'bomb') {
      scene.tweens.add({
        targets: this.body,
        scale: { from: 1.0, to: 1.15 },
        duration: 280,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.vy += GRAVITY_NORM * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.body.setX(this.x * GAME_CONFIG.width);
    this.body.setY(this.y * GAME_CONFIG.height);
    this.body.setRotation(this.body.rotation + dt * 1.6);
  }

  isOffscreen(): boolean {
    return this.y > 1.15 || this.x < -0.1 || this.x > 1.1;
  }

  markAccounted(): void { this.accounted = true; }
  wasAccounted(): boolean { return this.accounted; }

  slice(scene: Phaser.Scene): void {
    this.alive = false;
    const px = this.x * GAME_CONFIG.width;
    const py = this.y * GAME_CONFIG.height;
    const half1 = scene.add.text(px, py, this.body.text, { fontSize: '64px' })
      .setOrigin(0.5).setDepth(21).setAlpha(0.9);
    const half2 = scene.add.text(px, py, this.body.text, { fontSize: '64px' })
      .setOrigin(0.5).setDepth(21).setAlpha(0.9);
    this.body.destroy();
    scene.tweens.add({ targets: half1, x: px - 60, y: py + 80, rotation: -1.2, alpha: 0, duration: 600, onComplete: () => half1.destroy() });
    scene.tweens.add({ targets: half2, x: px + 60, y: py + 80, rotation: 1.2, alpha: 0, duration: 600, onComplete: () => half2.destroy() });
  }

  explode(scene: Phaser.Scene): void {
    this.alive = false;
    const px = this.x * GAME_CONFIG.width;
    const py = this.y * GAME_CONFIG.height;
    const flash = scene.add.text(px, py, '💥', { fontSize: '120px' })
      .setOrigin(0.5).setDepth(22);
    this.body.destroy();
    scene.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
  }

  destroy(): void {
    if (this.body && this.body.active) this.body.destroy();
    this.alive = false;
  }
}
