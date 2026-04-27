import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

const C = GAME_CONFIG;

/** Estrada pseudo-3D: segmentos alternados + paleta Pixel Arcade + neblina. */
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
    const P = C.palette;
    g.clear();

    const cx     = C.width / 2;
    const nearHW = C.laneXOffsetAtNear * 1.7;
    const numSeg  = 20;

    // Céu com gradiente
    g.fillGradientStyle(P.sky, P.sky, P.skyHorizon, P.skyHorizon, 1);
    g.fillRect(0, 0, C.width, C.horizonY);

    // Segmentos de pista + grama (do mais distante ao mais próximo)
    for (let i = numSeg; i >= 0; i--) {
      const t  = i / numSeg;
      const t1 = (i + 1) / numSeg;
      const y  = C.horizonY + (C.height - C.horizonY) * Math.pow(t,  1.3);
      const y1 = C.horizonY + (C.height - C.horizonY) * Math.pow(t1, 1.3);
      const hw  = nearHW * Math.pow(t,  1.1);
      const hw1 = nearHW * Math.pow(t1, 1.1);

      const fogAlpha = C.fog.enabled ? Math.max(0, 1 - t * (1 - C.fog.density) * 2) : 1;

      // Grama
      const grassCol = i % 2 === 0 ? P.grassA : P.grassB;
      g.fillStyle(grassCol, fogAlpha);
      g.fillRect(0, y, C.width, Math.max(1, y1 - y));

      // Pista
      const roadCol = i % 2 === 0 ? P.roadA : P.roadB;
      g.fillStyle(roadCol, fogAlpha);
      g.beginPath();
      g.moveTo(cx - hw,  y);  g.lineTo(cx + hw,  y);
      g.lineTo(cx + hw1, y1); g.lineTo(cx - hw1, y1);
      g.closePath();
      g.fillPath();

      // Stripes laterais amarelas
      const sw = hw * 0.10;
      g.fillStyle(P.stripe, fogAlpha);
      g.beginPath();
      g.moveTo(cx - hw,       y);  g.lineTo(cx - hw  + sw, y);
      g.lineTo(cx - hw1 + sw, y1); g.lineTo(cx - hw1,      y1);
      g.closePath(); g.fillPath();
      g.beginPath();
      g.moveTo(cx + hw,       y);  g.lineTo(cx + hw  - sw, y);
      g.lineTo(cx + hw1 - sw, y1); g.lineTo(cx + hw1,      y1);
      g.closePath(); g.fillPath();

      // Linha central tracejada
      if (i % 3 === 0) {
        g.fillStyle(P.line, fogAlpha * 0.7);
        g.fillRect(cx - 2, y, 4, (y1 - y) * 0.6);
      }
    }
  }
}
