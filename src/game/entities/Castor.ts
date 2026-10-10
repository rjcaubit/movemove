import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

export type CastorKind = 'good' | 'bad';

const BAD_EMOJIS = ['🦊', '🐺', '🦉'];

export class Castor {
  readonly normX: number;
  readonly normY: number;
  readonly bornAtMs: number;
  readonly windowMs: number;
  readonly kind: CastorKind;
  alive = true;
  private body: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, normX: number, normY: number, windowMs: number, kind: CastorKind = 'good') {
    this.normX = normX;
    this.normY = normY;
    this.windowMs = windowMs;
    this.kind = kind;
    this.bornAtMs = performance.now();
    this.scene = scene;

    const { width, height } = GAME_CONFIG;
    const px = normX * width;
    const pyHidden = normY * height + 70;
    const pyVisible = normY * height - 14;

    const emoji = kind === 'good'
      ? '🦫'
      : BAD_EMOJIS[Math.floor(Math.random() * BAD_EMOJIS.length)];

    this.body = scene.add.text(px, pyHidden, emoji, { fontSize: '60px' })
      .setOrigin(0.5, 1)
      .setDepth(15);

    scene.tweens.add({
      targets: this.body,
      y: pyVisible,
      duration: 220,
      ease: 'Back.Out',
    });
  }

  isExpired(): boolean {
    return performance.now() - this.bornAtMs > this.windowMs;
  }

  whack(onComplete: () => void): void {
    this.alive = false;
    const pyHole = this.normY * GAME_CONFIG.height + 50;
    this.scene.tweens.add({
      targets: this.body,
      scaleX: 1.6,
      scaleY: 0.4,
      y: pyHole,
      alpha: 0,
      duration: 180,
      ease: 'Power2',
      onComplete: () => { this.body.destroy(); onComplete(); },
    });
  }

  retreat(onComplete: () => void): void {
    this.alive = false;
    const pyHole = this.normY * GAME_CONFIG.height + 70;
    this.scene.tweens.add({
      targets: this.body,
      y: pyHole,
      alpha: 0,
      duration: 260,
      ease: 'Power2',
      onComplete: () => { this.body.destroy(); onComplete(); },
    });
  }

  destroy(): void {
    if (this.alive) {
      this.body.destroy();
      this.alive = false;
    }
  }
}
