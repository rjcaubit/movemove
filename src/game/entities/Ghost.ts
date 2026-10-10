import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class Ghost {
  readonly sprite: Phaser.GameObjects.Sprite;
  y:    number;
  readonly lane: Lane;
  alive = true;
  readonly kind  = 'ghost' as const;
  private bobTimer  = 0;
  private animAccum = 0;
  private animFrame = 0;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.y    = F.spawnY;
    const useKenney = scene.textures.exists('ghost_0');
    const key = useKenney ? 'ghost_0' : (() => {
      ensureTexture(scene, 'ghost', 50, 70, 0xddfff8);
      return 'ghost';
    })();
    const sprite = scene.add.sprite(laneX(lane), this.y, key)
      .setOrigin(0.5, 1).setDepth(5).setDisplaySize(50, 70);
    if (!useKenney) sprite.setAlpha(0.75).setTint(0xaaddff);
    this.sprite = sprite;
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.sprite.destroy(); return; }
    this.bobTimer += dtSec;
    const bobY = Math.sin(this.bobTimer * 3) * 8;
    this.animAccum += dtSec;
    if (this.animAccum >= 0.16 && this.sprite.scene.textures.exists('ghost_0')) {
      this.animAccum = 0;
      this.animFrame = (this.animFrame + 1) % 4;
      this.sprite.setTexture(`ghost_${this.animFrame}`);
    }
    this.sprite.setY(this.y + bobY);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
