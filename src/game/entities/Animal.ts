import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Animal {
  readonly sprite:  Phaser.GameObjects.Sprite;
  z:    number;
  lane: Lane;
  alive = true;
  readonly kind   = 'animal' as const;
  private targetLane: Lane;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane       = lane;
    this.targetLane = (lane === 0 ? 1 : 0) as Lane;
    this.z          = GAME_CONFIG.zMax;
    ensureTexture(scene, 'animal_fox', 50, 60, 0xe85d04);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'animal_fox')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    if (this.z < 0.6 && this.lane !== this.targetLane) this.lane = this.targetLane;
    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z)).setY(zToY(z))
      .setScale(zToScale(z)).setDepth(5 + (1 - this.z) * 10);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
