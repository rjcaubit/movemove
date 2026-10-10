import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

const C = GAME_CONFIG;
const F = C.falling;

const BG_KEYS = ['bg_purple_a', 'bg_purple_b', 'bg_purple_c'];
const TILE_PX  = 160;
const COLS     = Math.ceil(C.width  / TILE_PX) + 1;
const ROWS     = Math.ceil(C.height / TILE_PX) + 2;
const SCROLL_PX_S = 50; // pixels/sec — fixed slow scroll independent of game speed

function randKey() { return BG_KEYS[Math.floor(Math.random() * BG_KEYS.length)]; }

export class Road {
  private bgRows: Phaser.GameObjects.Image[][] = [];
  private rowY: number[] = [];
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    // Solid dark base
    scene.add.graphics().setDepth(0)
      .fillStyle(0x0d0a1a, 1).fillRect(0, 0, C.width, C.height);

    const allLoaded = BG_KEYS.every(k => scene.textures.exists(k));
    if (allLoaded) {
      for (let r = 0; r < ROWS; r++) {
        const y = (r - 1) * TILE_PX;
        this.rowY.push(y);
        const row: Phaser.GameObjects.Image[] = [];
        for (let col = 0; col < COLS; col++) {
          row.push(
            scene.add.image(col * TILE_PX, y, randKey())
              .setOrigin(0, 0)
              .setDisplaySize(TILE_PX, TILE_PX)
              .setAlpha(0.65)
              .setDepth(1),
          );
        }
        this.bgRows.push(row);
      }
    }

    // Top gradient overlay
    const topFade = scene.add.graphics().setDepth(2);
    topFade.fillStyle(0x000000, 0.6);
    topFade.fillRect(0, 0, C.width, 100);
    topFade.fillStyle(0x000000, 0.25);
    topFade.fillRect(0, 100, C.width, 150);

    // Lane lines and ground marker (drawn once, static)
    this.gfx = scene.add.graphics().setDepth(3);
    this.drawLines();
  }

  drawNow(): void { /* no-op */ }

  update(_speedMps: number, dt: number): void {
    for (let r = 0; r < this.bgRows.length; r++) {
      this.rowY[r] += SCROLL_PX_S * dt;

      if (this.rowY[r] >= C.height + TILE_PX) {
        // Wrap row back to top and re-randomise its tiles
        this.rowY[r] -= ROWS * TILE_PX;
        for (const img of this.bgRows[r]) img.setTexture(randKey());
      }

      for (const img of this.bgRows[r]) img.setY(this.rowY[r]);
    }
  }

  destroy(): void {
    for (const row of this.bgRows) for (const img of row) img.destroy();
    this.gfx.destroy();
  }

  private drawLines(): void {
    const g = this.gfx;
    g.clear();

    g.fillStyle(0x3d2200, 0.18);
    g.fillRect(0, F.collisionTop, C.width, C.height - F.collisionTop);

    g.lineStyle(3, 0xffaa00, 0.8);
    for (let i = 0; i < F.laneXs.length - 1; i++) {
      const lx = (F.laneXs[i] + F.laneXs[i + 1]) / 2;
      g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, C.height); g.strokePath();
    }

    g.lineStyle(4, 0xffcc00, 1);
    g.beginPath(); g.moveTo(0, F.groundY); g.lineTo(C.width, F.groundY); g.strokePath();

    g.lineStyle(2, 0xffcc44, 0.4);
    g.beginPath(); g.moveTo(0, F.collisionTop); g.lineTo(C.width, F.collisionTop); g.strokePath();

    g.lineStyle(2, 0xffaa00, 0.55);
    for (const lx of F.laneXs) {
      g.beginPath(); g.moveTo(lx, F.groundY - 24); g.lineTo(lx, F.groundY); g.strokePath();
    }
  }
}
