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
    const body = scene.add.circle(0, 0, 36, COLOR_HEX[color], 1).setStrokeStyle(3, 0x000000, 0.6);
    const eyeL = scene.add.circle(-10, -8, 5, 0xffffff).setStrokeStyle(1, 0x000000);
    const eyeR = scene.add.circle(10, -8, 5, 0xffffff).setStrokeStyle(1, 0x000000);
    const pupL = scene.add.circle(-10, -8, 2, 0x000000);
    const pupR = scene.add.circle(10, -8, 2, 0x000000);
    this.sprite = scene.add.container(screenX, screenY, [body, eyeL, eyeR, pupL, pupR]).setDepth(20);
    scene.tweens.add({ targets: this.sprite, scale: { from: 0.8, to: 1.1 }, duration: 600, yoyo: true, repeat: -1 });
  }

  isExpired(): boolean { return performance.now() - this.bornAtMs > this.lifetimeMs; }

  catch(scene: Phaser.Scene, onComplete: () => void): void {
    this.alive = false;
    scene.tweens.add({
      targets: this.sprite, scale: 1.6, alpha: 0, duration: 250,
      onComplete: () => { this.sprite.destroy(); onComplete(); },
    });
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
