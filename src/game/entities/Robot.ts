import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Robot {
  readonly sprite:  Phaser.GameObjects.Sprite;
  z:    number;
  lane: Lane;
  alive = true;
  readonly kind = 'robot' as const;
  private patrolTimer = 0;
  private patrolCount = 0;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.z    = GAME_CONFIG.zMax;
    ensureTexture(scene, 'robot', 60, 90, 0x888899);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'robot')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    this.patrolTimer += dtSec;
    if (this.patrolTimer >= 1.5 && this.patrolCount < 3) {
      const lanes: Lane[] = [-1, 0, 1];
      const others = lanes.filter(l => l !== this.lane);
      this.lane = others[Math.floor(Math.random() * others.length)];
      this.patrolTimer = 0;
      this.patrolCount++;
    }
    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z)).setY(zToY(z))
      .setScale(zToScale(z)).setDepth(5 + (1 - this.z) * 10);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
