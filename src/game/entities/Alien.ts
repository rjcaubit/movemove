import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class Alien {
  readonly sprite: Phaser.GameObjects.Sprite;
  y:    number;
  readonly lane: Lane;
  alive = true;
  readonly kind = 'alien' as const;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.y    = F.spawnY;
    ensureTexture(scene, 'alien', 55, 75, 0x44cc66);
    const key = scene.textures.exists('robot_kenney') ? 'robot_kenney' : 'alien';
    this.sprite = scene.add.sprite(laneX(lane), this.y, key)
      .setOrigin(0.5, 1).setDepth(5).setDisplaySize(55, 75).setTint(0x44cc66);
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec * 1.5;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.sprite.setY(this.y);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
