import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

const C = GAME_CONFIG;

/** Estrada pseudo-3D: trapézio + linhas convergentes + faixas pulsando. */
export class Road {
  private gfx: Phaser.GameObjects.Graphics;
  private offset = 0;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(1);
  }

  update(speedMps: number, dtSec: number): void {
    this.offset = (this.offset + speedMps * dtSec * 80) % 80;
    this.draw();
  }

  destroy(): void { this.gfx.destroy(); }

  private draw(): void {
    const g = this.gfx;
    g.clear();

    const cx = C.width / 2;
    const horizonHalfWidth = C.laneXOffsetAtHorizon * 1.5;
    const nearHalfWidth = C.laneXOffsetAtNear * 1.5;
    g.fillStyle(0x2c2f36, 1);
    g.beginPath();
    g.moveTo(cx - horizonHalfWidth, C.horizonY);
    g.lineTo(cx + horizonHalfWidth, C.horizonY);
    g.lineTo(cx + nearHalfWidth, C.height);
    g.lineTo(cx - nearHalfWidth, C.height);
    g.closePath();
    g.fillPath();

    g.lineStyle(2, 0x4a4d52, 1);
    for (const offsetSign of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + offsetSign * C.laneXOffsetAtHorizon * 0.5, C.horizonY);
      g.lineTo(cx + offsetSign * C.laneXOffsetAtNear * 0.5, C.height);
      g.strokePath();
    }

    g.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 12; i++) {
      const stripeY = C.horizonY + (i * 80 + this.offset);
      if (stripeY > C.height) break;
      const tFromHorizon = (stripeY - C.horizonY) / (C.height - C.horizonY);
      const x = cx;
      const w = 4 + 8 * tFromHorizon;
      const h = 12 + 12 * tFromHorizon;
      g.fillRect(x - w / 2, stripeY, w, h);
    }
  }
}
