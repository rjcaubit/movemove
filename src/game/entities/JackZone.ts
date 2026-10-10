import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

const F = GAME_CONFIG.falling;
const W = GAME_CONFIG.width;

export class JackZone {
  readonly graphics: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  y: number;
  alive = true;
  count = 0;
  required: number;
  private startedAtMs: number | null = null;
  private windowMs: number;

  constructor(scene: Phaser.Scene, required = 5, windowMs = 4000) {
    this.required = required;
    this.windowMs = windowMs;
    this.y = F.spawnY;
    this.graphics = scene.add.graphics().setDepth(4);
    this.label = scene.add.text(W / 2, F.groundY - 140, '', {
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

  isInPlayerZone(): boolean { return this.y >= F.collisionTop && this.y <= F.despawnY; }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.graphics.destroy(); this.label.destroy(); return; }
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
    if (this.y < 0 || this.y > F.despawnY) return;
    this.graphics.lineStyle(6, 0xffd60a, 0.8);
    this.graphics.strokeEllipse(W / 2, this.y, 600, 150);
  }

  destroy(): void { if (this.alive) { this.graphics.destroy(); this.label.destroy(); this.alive = false; } }
}
