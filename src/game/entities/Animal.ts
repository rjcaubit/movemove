import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class Animal {
  readonly sprite: Phaser.GameObjects.Sprite;
  y:    number;
  lane: Lane;
  alive = true;
  readonly kind   = 'animal' as const;
  private targetLane: Lane;
  private switched = false;
  private animAccum = 0;
  private animFrame = 0;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane       = lane;
    this.targetLane = (lane === 0 ? 1 : 0) as Lane;
    this.y          = F.spawnY;
    const key = scene.textures.exists('animal_0') ? 'animal_0' : (() => {
      ensureTexture(scene, 'animal_fox', 50, 60, 0xe85d04);
      return 'animal_fox';
    })();
    this.sprite = scene.add.sprite(laneX(lane), this.y, key)
      .setOrigin(0.5, 1).setDepth(5).setDisplaySize(50, 60);
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    if (!this.switched && this.y > 200) {
      this.switched = true;
      this.lane = this.targetLane;
      this.sprite.scene.tweens.add({
        targets: this.sprite, x: laneX(this.targetLane), duration: 200, ease: 'Sine.easeOut',
      });
    }
    this.animAccum += dtSec;
    if (this.animAccum >= 0.15 && this.sprite.scene.textures.exists('animal_0')) {
      this.animAccum = 0;
      this.animFrame = (this.animFrame + 1) % 4;
      this.sprite.setTexture(`animal_${this.animFrame}`);
    }
    this.sprite.setY(this.y);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
