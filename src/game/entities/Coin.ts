import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class Coin {
  readonly sprite: Phaser.GameObjects.Sprite;
  y: number;
  readonly lane: Lane;
  alive = true;

  constructor(scene: Phaser.Scene, lane: Lane, yStart: number = F.spawnY) {
    this.lane = lane;
    this.y    = yStart;
    const texKey = scene.textures.exists('coin_k')
      ? 'coin_k'
      : (scene.textures.exists('coin_kenney') ? 'coin_kenney' : 'coin');
    this.sprite = scene.add.sprite(laneX(lane), this.y, texKey)
      .setOrigin(0.5, 0.5).setDepth(5).setDisplaySize(28, 28);
    if (texKey === 'coin') this.sprite.setTint(0xffd60a);
    scene.tweens.add({ targets: this.sprite, angle: 360, duration: 800, repeat: -1 });
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.sprite.setY(this.y);
  }

  collect(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
