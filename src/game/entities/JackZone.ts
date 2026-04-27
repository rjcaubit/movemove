import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { zToY, zToScale } from '../systems/pseudo3d.ts';

export class JackZone {
  readonly graphics: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  z: number;
  alive = true;
  count = 0;
  required: number;
  private startedAtMs: number | null = null;
  private windowMs: number;

  constructor(scene: Phaser.Scene, required = 5, windowMs = 4000) {
    this.required = required;
    this.windowMs = windowMs;
    this.z = GAME_CONFIG.zMax;
    this.graphics = scene.add.graphics().setDepth(4);
    this.label = scene.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.playerY - 140, '', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', color: '#ffd60a',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(120).setVisible(false);
  }

  startWindow(): void {
    if (this.startedAtMs === null) this.startedAtMs = performance.now();
  }

  tickJack(): boolean {
    if (this.startedAtMs === null) return false;
    if (performance.now() - this.startedAtMs > this.windowMs) return false;
    this.count += 1;
    return this.count >= this.required;
  }

  isInPlayerZone(): boolean { return this.z < 0.2 && this.z > -0.05; }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.graphics.destroy(); this.label.destroy(); return; }
    this.draw();
    if (this.isInPlayerZone()) {
      this.startWindow();
      this.label.setVisible(true).setText(`POLI ${this.count}/${this.required}`);
    } else {
      this.label.setVisible(false);
    }
  }

  private draw(): void {
    this.graphics.clear();
    const z = Math.max(0, this.z);
    const cx = GAME_CONFIG.width / 2;
    const y = zToY(z);
    const scale = zToScale(z);
    const w = 600 * scale;
    this.graphics.lineStyle(6, 0xffd60a, 0.8);
    this.graphics.strokeEllipse(cx, y, w, w * 0.25);
  }

  destroy(): void { if (this.alive) { this.graphics.destroy(); this.label.destroy(); this.alive = false; } }
}
