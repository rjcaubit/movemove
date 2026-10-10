import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

/** Overlay estático de pós-processamento: scanlines + vignette. */
export class PostFxOverlay {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(200).setScrollFactor(0);
    this.drawStatic();
  }

  private drawStatic(): void {
    const g = this.gfx;
    const { width: W, height: H, fx } = GAME_CONFIG;
    g.clear();

    if (fx.vignette) {
      const vAlpha = 0.45;
      const vSize  = 80;
      g.fillStyle(0x000000, vAlpha);
      g.fillRect(0,         0,         W, vSize);
      g.fillRect(0,         H - vSize, W, vSize);
      g.fillRect(0,         0,         vSize, H);
      g.fillRect(W - vSize, 0,         vSize, H);
    }

    if (fx.scanlines) {
      g.lineStyle(1, 0x000000, 0.08);
      for (let y = 0; y < H; y += 3) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath();
      }
    }
  }

  destroy(): void { this.gfx.destroy(); }
}
