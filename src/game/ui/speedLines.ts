import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { FX_SPEED_LINE_COUNT } from '../../tuning.ts';

export class SpeedLines {
  private gfx:      Phaser.GameObjects.Graphics;
  private visible_  = false;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(180).setScrollFactor(0);
  }

  setVisible(v: boolean): void {
    if (this.visible_ === v) return;
    this.visible_ = v;
    if (!v) this.gfx.clear();
  }

  update(alpha: number): void {
    if (!this.visible_) return;
    const g   = this.gfx;
    const C   = GAME_CONFIG;
    const vpX = C.width  / 2;
    const vpY = C.horizonY;
    g.clear();
    g.lineStyle(1.5, 0xffffff, alpha * 0.35);
    for (let i = 0; i < FX_SPEED_LINE_COUNT; i++) {
      const angle = (i / FX_SPEED_LINE_COUNT) * Math.PI * 2;
      const len   = 80 + Math.random() * 60;
      g.beginPath();
      g.moveTo(vpX + Math.cos(angle) * 20,        vpY + Math.sin(angle) * 20);
      g.lineTo(vpX + Math.cos(angle) * (20 + len), vpY + Math.sin(angle) * (20 + len));
      g.strokePath();
    }
  }

  destroy(): void { this.gfx.destroy(); }
}
