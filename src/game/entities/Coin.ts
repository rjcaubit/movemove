import * as Phaser from 'phaser';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import type { Lane } from '../../pose/types.ts';

export class Coin {
  readonly sprite: Phaser.GameObjects.Sprite;
  z: number;
  readonly lane: Lane;
  alive = true;

  constructor(scene: Phaser.Scene, lane: Lane, zStart: number) {
    this.lane = lane;
    this.z = zStart;
    const texKey = scene.textures.exists('coin_kenney') ? 'coin_kenney' : 'coin';
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), texKey)
      .setOrigin(0.5, 1).setScale(zToScale(this.z) * 0.7).setDepth(5);
    if (!scene.textures.exists('coin_kenney')) this.sprite.setTint(0xffd60a);

    scene.tweens.add({
      targets: this.sprite,
      angle: 360,
      duration: 800,
      repeat: -1,
    });
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z));
    this.sprite.setY(zToY(z) - 30);
    this.sprite.setScale(zToScale(z) * 0.7);
  }

  collect(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
