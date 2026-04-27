import * as Phaser from 'phaser';

export class TrunkTarget {
  readonly sprite: Phaser.GameObjects.Container;
  readonly side: 'L' | 'R';
  alive = true;

  constructor(scene: Phaser.Scene, side: 'L' | 'R') {
    this.side = side;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const x = side === 'L' ? 80 : W - 80;
    const y = H / 2 - 60;
    const ring = scene.add.circle(0, 0, 50, 0xffd60a, 0.2).setStrokeStyle(6, 0xffd60a, 1);
    const arrow = scene.add.text(0, 0, side === 'L' ? '←' : '→', {
      fontFamily: 'system-ui', fontSize: '40px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.sprite = scene.add.container(x, y, [ring, arrow]).setDepth(20);
    scene.tweens.add({ targets: ring, scale: { from: 1, to: 1.2 }, duration: 500, yoyo: true, repeat: -1 });
  }

  hit(scene: Phaser.Scene, onComplete: () => void): void {
    this.alive = false;
    scene.tweens.add({
      targets: this.sprite, scale: 1.5, alpha: 0, duration: 200,
      onComplete: () => { this.sprite.destroy(); onComplete(); },
    });
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
