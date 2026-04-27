import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Puncher {
  readonly sprite:  Phaser.GameObjects.Sprite;
  private label:    Phaser.GameObjects.Text;
  z:    number;
  readonly lane:    Lane;
  alive = true;
  readonly kind = 'puncher' as const;
  private defeated = false;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.z    = GAME_CONFIG.zMax;
    ensureTexture(scene, 'puncher', 60, 90, 0xdd4400, 'rect');
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'puncher')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5).setTint(0xdd4400);

    // Ícone de soco sobre o personagem
    this.label = scene.add.text(0, 0, '🥊', { fontSize: '18px' })
      .setOrigin(0.5, 1).setDepth(6);
  }

  /** Chamado quando o jogador dá um jumping_jack. Retorna true se derrotou. */
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
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.destroy(); return; }
    const z  = Math.max(0, this.z);
    const sc = zToScale(z);
    const sx = laneToX(this.lane, z);
    const sy = zToY(z);
    this.sprite.setX(sx).setY(sy).setScale(sc).setDepth(5 + (1 - this.z) * 10);
    this.label.setX(sx).setY(sy - 90 * sc).setScale(sc);
  }

  destroy(): void {
    if (!this.alive && !this.defeated) return;
    this.alive = false;
    this.sprite.destroy();
    this.label.destroy();
  }
}
