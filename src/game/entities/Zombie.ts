import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class Zombie {
  readonly sprite: Phaser.GameObjects.Sprite;
  y:    number;
  readonly lane: Lane;
  alive = true;
  readonly kind = 'zombie' as const;
  private animAccum = 0;
  private animFrame = 0;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.y    = F.spawnY;
    const key = scene.textures.exists('zombie_0') ? 'zombie_0' : (() => {
      ensureTexture(scene, 'zombie', 60, 90, 0x7ab88a);
      return 'zombie';
    })();
    this.sprite = scene.add.sprite(laneX(lane), this.y, key)
      .setOrigin(0.5, 1).setDepth(5).setDisplaySize(60, 90);
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec * 0.7;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.animAccum += dtSec;
    if (this.animAccum >= 0.18 && this.sprite.scene.textures.exists('zombie_0')) {
      this.animAccum = 0;
      this.animFrame = (this.animFrame + 1) % 4;
      this.sprite.setTexture(`zombie_${this.animFrame}`);
    }
    this.sprite.setY(this.y);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
