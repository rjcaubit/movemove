import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export type ObstacleKind =
  | 'barrier'      | 'low_barrier' | 'wall_lane'
  | 'jump_brick'   | 'jump_column'
  | 'duck_log'     | 'duck_banner' | 'laser_beam';

type ObstacleSpec = { w: number; h: number; color: number; shape: Parameters<typeof ensureTexture>[5] };

const SPEC_BY_KIND: Record<ObstacleKind, ObstacleSpec> = {
  barrier:     { w: 80,  h: 28,  color: 0xff453a, shape: 'rect'   },
  low_barrier: { w: 72,  h: 64,  color: 0xff9f0a, shape: 'rect'   },
  wall_lane:   { w: 64,  h: 96,  color: 0xbf5af2, shape: 'rect'   },
  jump_brick:  { w: 90,  h: 60,  color: 0xc0622a, shape: 'brick'  },
  jump_column: { w: 50,  h: 110, color: 0x9a9a9a, shape: 'column' },
  duck_log:    { w: 100, h: 36,  color: 0x8b4513, shape: 'log'    },
  duck_banner: { w: 110, h: 80,  color: 0xff2255, shape: 'banner' },
  laser_beam:  { w: 120, h: 40,  color: 0xff0044, shape: 'laser'  },
};

const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  barrier:     'obs_barrier',
  low_barrier: 'obs_low',
  wall_lane:   'obs_wall',
  jump_brick:  'obs_jump_brick',
  jump_column: 'obs_jump_column',
  duck_log:    'obs_duck_log',
  duck_banner: 'obs_duck_banner',
  laser_beam:  'obs_laser_beam',
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

    const spec   = SPEC_BY_KIND[kind];
    const texKey = TEXTURE_BY_KIND[kind];
    ensureTexture(scene, texKey, spec.w, spec.h, spec.color, spec.shape);

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
