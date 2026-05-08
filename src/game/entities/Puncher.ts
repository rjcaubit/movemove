import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;
function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

export class Puncher {
  readonly sprite:  Phaser.GameObjects.Sprite;
  private label:    Phaser.GameObjects.Text;
  y:    number;
  readonly lane:    Lane;
  alive = true;
  readonly kind = 'puncher' as const;
  private defeated = false;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.y    = F.spawnY;
    ensureTexture(scene, 'puncher', 60, 90, 0xdd4400, 'rect');
    const key = scene.textures.exists('puncher_kenney') ? 'puncher_kenney' : 'puncher';
    this.sprite = scene.add.sprite(laneX(lane), this.y, key)
      .setOrigin(0.5, 1).setDepth(5).setDisplaySize(60, 90).setTint(0xdd4400);
    this.label = scene.add.text(laneX(lane), this.y - 100, '🥊', { fontSize: '18px' })
      .setOrigin(0.5, 1).setDepth(6);
  }

  punch(): boolean {
    if (this.defeated) return false;
    this.defeated = true;
    this.sprite.setTint(0xffffff);
    this.sprite.scene.tweens.add({
      targets: [this.sprite, this.label],
      y: '-=40', alpha: 0, duration: 300,
      onComplete: () => this.destroy(),
    });
    return true;
  }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.destroy(); return; }
    this.sprite.setY(this.y);
    this.label.setX(laneX(this.lane)).setY(this.y - 100);
  }

  destroy(): void {
    if (!this.alive && !this.defeated) return;
    this.alive = false;
    this.sprite.destroy();
    this.label.destroy();
  }
}
