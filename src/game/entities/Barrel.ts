import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class Barrel {
  readonly sprite: Phaser.GameObjects.Sprite;
  y:    number;
  readonly lane: Lane;
  alive = true;
  readonly kind = 'barrel' as const;
  private rollAngle = 0;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.y    = F.spawnY;
    ensureTexture(scene, 'barrel', 52, 68, 0xaa5500, 'barrel');
    this.sprite = scene.add.sprite(laneX(lane), this.y, 'barrel')
      .setOrigin(0.5, 1).setDepth(5).setDisplaySize(52, 68);
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec * 0.85;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.rollAngle += speedMps * dtSec * 2;
    this.sprite.setY(this.y).setAngle(this.rollAngle);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
