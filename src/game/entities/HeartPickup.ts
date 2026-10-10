import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class HeartPickup {
  readonly sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
  y: number;
  readonly lane: Lane;
  alive = true;

  constructor(scene: Phaser.Scene, lane: Lane, yStart: number = F.spawnY) {
    this.lane = lane;
    this.y    = yStart;
    if (scene.textures.exists('heart_k')) {
      this.sprite = scene.add.sprite(laneX(lane), this.y, 'heart_k')
        .setOrigin(0.5, 0.5).setDepth(6).setDisplaySize(32, 32);
    } else {
      this.sprite = scene.add.text(laneX(lane), this.y, '❤️', { fontSize: '32px' })
        .setOrigin(0.5, 0.5).setDepth(6);
    }
    scene.tweens.add({ targets: this.sprite, y: `-=8`, duration: 600, yoyo: true, repeat: -1 });
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.sprite.setX(laneX(this.lane)).setY(this.y);
  }

  collect(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
