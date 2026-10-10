import * as Phaser from 'phaser';
import type { Player } from '../entities/Player.ts';

export class ShieldEffect {
  private charges = 0;
  private aura: Phaser.GameObjects.Arc | null = null;
  private scene: Phaser.Scene;
  private player: Player;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  activate(): void {
    if (this.charges >= 1) return;
    this.charges = 1;
    this.aura = this.scene.add.circle(this.player.sprite.x, this.player.sprite.y - 40, 50, 0x0a84ff, 0.3)
      .setDepth(11).setStrokeStyle(3, 0x0a84ff, 0.8);
  }

  /** Returns true se consumiu carga (player evitou colisão). */
  consume(): boolean {
    if (this.charges <= 0) return false;
    this.charges = 0;
    if (this.aura) {
      const a = this.aura;
      this.scene.tweens.add({
        targets: a, alpha: 0, scale: 1.5, duration: 200,
        onComplete: () => a.destroy(),
      });
      this.aura = null;
    }
    return true;
  }

  update(): void {
    if (this.aura) {
      this.aura.setX(this.player.sprite.x);
      this.aura.setY(this.player.sprite.y - 40);
    }
  }

  hasCharge(): boolean { return this.charges > 0; }
  reset(): void { this.charges = 0; if (this.aura) { this.aura.destroy(); this.aura = null; } }
}
