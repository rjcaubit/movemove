import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export type ObstacleKind =
  | 'barrier'    | 'low_barrier' | 'wall_lane'
  | 'jump_brick' | 'jump_column'
  | 'duck_log'   | 'duck_banner';

const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  barrier:      'obs_barrier',
  low_barrier:  'obs_low',
  wall_lane:    'obs_wall',
  jump_brick:   'obs_jump_brick',
  jump_column:  'obs_jump_column',
  duck_log:     'obs_duck_log',
  duck_banner:  'obs_duck_banner',
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
    this.z    = GAME_CONFIG.zMax;

    const texKey = TEXTURE_BY_KIND[kind];
    const isDuck = kind === 'duck_log' || kind === 'duck_banner';
    ensureTexture(scene, texKey, 80, 100, isDuck ? 0x8b4513 : 0xc0622a);

    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), texKey)
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
