import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class Robot {
  readonly sprite:  Phaser.GameObjects.Sprite;
  y:    number;
  lane: Lane;
  alive = true;
  readonly kind = 'robot' as const;
  private patrolTimer = 0;
  private patrolCount = 0;
  private animAccum   = 0;
  private animFrame   = 0;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.y    = F.spawnY;
    const key = scene.textures.exists('robot_0') ? 'robot_0' : (() => {
      ensureTexture(scene, 'robot', 60, 90, 0x888899);
      return 'robot';
    })();
    this.sprite = scene.add.sprite(laneX(lane), this.y, key)
      .setOrigin(0.5, 1).setDepth(5).setDisplaySize(60, 90);
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.patrolTimer += dtSec;
    if (this.patrolTimer >= 1.5 && this.patrolCount < 3) {
      const lanes: Lane[] = [-1, 0, 1];
      const others = lanes.filter(l => l !== this.lane);
      this.lane = others[Math.floor(Math.random() * others.length)];
      this.patrolTimer = 0;
      this.patrolCount++;
      this.sprite.scene.tweens.add({
        targets: this.sprite, x: laneX(this.lane), duration: 200, ease: 'Sine.easeOut',
      });
    }
    this.animAccum += dtSec;
    if (this.animAccum >= 0.15 && this.sprite.scene.textures.exists('robot_0')) {
      this.animAccum = 0;
      this.animFrame = (this.animFrame + 1) % 4;
      this.sprite.setTexture(`robot_${this.animFrame}`);
    }
    this.sprite.setY(this.y);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
