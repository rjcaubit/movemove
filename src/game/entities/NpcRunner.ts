import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class NpcRunner {
  readonly sprite: Phaser.GameObjects.Sprite;
  y:    number;
  readonly lane: Lane;
  alive = true;
  readonly kind  = 'npc_runner' as const;
  private speedMult: number;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane      = lane;
    this.y         = F.spawnY;
    this.speedMult = 0.8 + Math.random() * 0.4;
    ensureTexture(scene, 'npc_runner', 50, 80, 0xcc4444);
    const key = scene.textures.exists('npc_runner_kenney') ? 'npc_runner_kenney' : 'npc_runner';
    this.sprite = scene.add.sprite(laneX(lane), this.y, key)
      .setOrigin(0.5, 1).setDepth(5).setDisplaySize(50, 80);
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec * this.speedMult;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.sprite.setY(this.y);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
