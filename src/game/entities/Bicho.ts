import * as Phaser from 'phaser';

export type BichoColor = 'red' | 'blue' | 'green' | 'yellow';

const COLOR_HEX: Record<BichoColor, number> = {
  red: 0xff453a,
  blue: 0x0a84ff,
  green: 0x4cd964,
  yellow: 0xffd60a,
};

export class Bicho {
  readonly sprite: Phaser.GameObjects.Container;
  readonly normX: number;
  readonly normY: number;
  readonly color: BichoColor;
  readonly bornAtMs: number;
  readonly lifetimeMs: number;
  alive = true;

  constructor(scene: Phaser.Scene, normX: number, normY: number, color: BichoColor, lifetimeMs = 3000) {
    this.normX = normX;
    this.normY = normY;
    this.color = color;
    this.lifetimeMs = lifetimeMs;
    this.bornAtMs = performance.now();
    const screenX = normX * scene.scale.width;
    const screenY = normY * scene.scale.height;
    const halo = scene.add.circle(0, 0, 46, COLOR_HEX[color], 0.25).setStrokeStyle(3, COLOR_HEX[color], 0.7);
    const body = scene.add.text(0, 0, '🪰', { fontSize: '64px' }).setOrigin(0.5);
    this.sprite = scene.add.container(screenX, screenY, [halo, body]).setDepth(20);
    // Voa zigue-zague
    scene.tweens.add({ targets: this.sprite, scale: { from: 0.9, to: 1.1 }, duration: 250, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: this.sprite, y: screenY - 6, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: body, angle: { from: -10, to: 10 }, duration: 180, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  isExpired(): boolean { return performance.now() - this.bornAtMs > this.lifetimeMs; }

  catch(scene: Phaser.Scene, onComplete: () => void): void {
    this.alive = false;
    // Splat: cresce e some
    scene.tweens.add({
      targets: this.sprite, scale: 1.8, alpha: 0, duration: 220,
      onComplete: () => { this.sprite.destroy(); onComplete(); },
    });
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
