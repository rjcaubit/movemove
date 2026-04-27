import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const MAX_HP = 3;

export class Boss {
  readonly sprite: Phaser.GameObjects.Sprite;
  private hpBar:   Phaser.GameObjects.Rectangle;
  private hpFill:  Phaser.GameObjects.Rectangle;
  private hpLabel: Phaser.GameObjects.Text;
  z: number;
  readonly lane: Lane = 0;
  alive = true;
  readonly kind = 'boss' as const;
  private hp = MAX_HP;

  constructor(scene: Phaser.Scene) {
    this.z = GAME_CONFIG.zMax;
    ensureTexture(scene, 'boss', 100, 130, 0x440022);
    this.sprite = scene.add.sprite(laneToX(0, this.z), zToY(this.z), 'boss')
      .setOrigin(0.5, 1).setScale(zToScale(this.z) * 2).setDepth(5);

    const barW = 80, barH = 8;
    this.hpBar  = scene.add.rectangle(0, 0, barW, barH, 0x333333).setDepth(50).setOrigin(0.5, 1);
    this.hpFill = scene.add.rectangle(0, 0, barW, barH, 0xff2222).setDepth(51).setOrigin(0, 1);
    this.hpLabel = scene.add.text(0, 0, 'BOSS', {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#ffffff', stroke: '#000', strokeThickness: 2,
    }).setDepth(52).setOrigin(0.5, 1);
  }

  /** Toma 1 hit. Retorna true se boss foi derrotado. */
  hit(): boolean {
    this.hp = Math.max(0, this.hp - 1);
    this.sprite.scene.tweens.add({
      targets: this.sprite, alpha: { from: 1, to: 0.3 }, yoyo: true, duration: 100,
    });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07 * 0.5;
    if (this.z < -0.05) { this.alive = false; this.destroy(); return; }
    const z  = Math.max(0, this.z);
    const sc = zToScale(z) * 2;
    const sx = laneToX(0, z);
    const sy = zToY(z);
    this.sprite.setX(sx).setY(sy).setScale(sc).setDepth(5 + (1 - this.z) * 10);
    const barW = 80 * sc;
    this.hpBar.setX(sx).setY(sy - 130 * sc - 10).setDisplaySize(barW, 8);
    this.hpFill.setX(sx - barW / 2).setY(sy - 130 * sc - 10).setDisplaySize(barW * (this.hp / MAX_HP), 8);
    this.hpLabel.setX(sx).setY(sy - 130 * sc - 20);
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
    this.hpBar.destroy();
    this.hpFill.destroy();
    this.hpLabel.destroy();
  }
}
