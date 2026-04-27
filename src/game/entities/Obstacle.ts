import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import type { Lane } from '../../pose/types.ts';

export type ObstacleKind = 'barrier' | 'low_barrier' | 'wall_lane';

const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  barrier: 'obs_barrier',
  low_barrier: 'obs_low',
  wall_lane: 'obs_wall',
};

export class Obstacle {
  readonly sprite: Phaser.GameObjects.Sprite;
  z: number;
  readonly lane: Lane;
  readonly kind: ObstacleKind;
  alive = true;

  constructor(scene: Phaser.Scene, kind: ObstacleKind, lane: Lane) {
    this.kind = kind;
    this.lane = lane;
    this.z = GAME_CONFIG.zMax;
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), TEXTURE_BY_KIND[kind])
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z));
    this.sprite.setY(zToY(z));
    this.sprite.setScale(zToScale(z));
    this.sprite.setDepth(5 + (1 - this.z) * 10);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
