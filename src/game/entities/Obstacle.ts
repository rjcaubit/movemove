import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

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

// Kinds ativos usam PNG Kenney; demais (desligados no spawner) só existem
// para tipagem/fallback procedural caso sejam invocados manualmente.
const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  barrier:     'obs_barrier',
  low_barrier: 'obs_low_barrier_proc',
  wall_lane:   'obs_wall_lane',
  jump_brick:  'obs_jump_brick',
  jump_column: 'obs_jump_column',
  duck_log:    'obs_duck_log_proc',
  duck_banner: 'obs_duck_banner_proc',
  laser_beam:  'obs_laser_beam_proc',
};

export class Obstacle {
  readonly sprite: Phaser.GameObjects.Sprite;
  y: number;
  readonly lane: Lane;
  readonly kind: ObstacleKind;
  alive = true;

  constructor(scene: Phaser.Scene, kind: ObstacleKind, lane: Lane) {
    this.kind = kind;
    this.lane = lane;
    this.y    = F.spawnY;

    const texKey = TEXTURE_BY_KIND[kind];
    const spec   = SPEC_BY_KIND[kind];
    // PNG Kenney precarregado em Boot.ts — só gera textura procedural se faltar.
    if (!scene.textures.exists(texKey)) {
      ensureTexture(scene, texKey, spec.w, spec.h, spec.color, spec.shape);
    }

    this.sprite = scene.add.sprite(laneX(lane), this.y, texKey)
      .setOrigin(0.5, 1).setDepth(5)
      .setDisplaySize(spec.w, spec.h);
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.sprite.setY(this.y);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
