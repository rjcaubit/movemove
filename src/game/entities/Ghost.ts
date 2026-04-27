import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Ghost {
  readonly sprite: Phaser.GameObjects.Sprite;
  z:    number;
  readonly lane: Lane;
  alive = true;
  readonly kind  = 'ghost' as const;
  private bobTimer = 0;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.z    = GAME_CONFIG.zMax;
    ensureTexture(scene, 'ghost', 50, 70, 0xddfff8);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'ghost')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5).setAlpha(0.75);
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    this.bobTimer += dtSec;
    const z    = Math.max(0, this.z);
    const bobY = Math.sin(this.bobTimer * 3) * 8 * zToScale(z);
    this.sprite.setX(laneToX(this.lane, z)).setY(zToY(z) + bobY)
      .setScale(zToScale(z)).setDepth(5 + (1 - this.z) * 10);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
