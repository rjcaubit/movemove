import * as Phaser from 'phaser';

export class Bell {
  readonly sprite: Phaser.GameObjects.Container;
  readonly normX: number;
  readonly normY: number;
  readonly hand: 'L' | 'R';
  readonly bornAtMs: number;
  readonly windowMs: number;
  alive = true;

  constructor(scene: Phaser.Scene, normX: number, normY: number, hand: 'L' | 'R', windowMs = 800) {
    this.normX = normX;
    this.normY = normY;
    this.hand = hand;
    this.windowMs = windowMs;
    this.bornAtMs = performance.now();
    const x = normX * scene.scale.width;
    const y = normY * scene.scale.height;
    const color = hand === 'L' ? 0x0a84ff : 0xff453a;
    const ring = scene.add.circle(0, 0, 44, color, 0.3).setStrokeStyle(5, color, 1);
    const txt = scene.add.text(0, 0, '🔔', { fontSize: '32px' }).setOrigin(0.5);
    this.sprite = scene.add.container(x, y, [ring, txt]).setDepth(20);
    scene.tweens.add({ targets: ring, scale: { from: 1, to: 1.25 }, duration: windowMs / 2, yoyo: true, repeat: 0 });
  }

  isExpired(): boolean { return performance.now() - this.bornAtMs > this.windowMs; }

  ring(scene: Phaser.Scene, onComplete: () => void): void {
    this.alive = false;
    scene.tweens.add({
      targets: this.sprite, scale: 1.6, alpha: 0, duration: 200,
      onComplete: () => { this.sprite.destroy(); onComplete(); },
    });
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
