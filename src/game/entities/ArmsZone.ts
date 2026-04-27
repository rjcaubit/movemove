import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { zToY, zToScale } from '../systems/pseudo3d.ts';

export class ArmsZone {
  readonly graphics: Phaser.GameObjects.Graphics;
  z: number;
  alive = true;
  startedAtMs: number | null = null;
  armsUpDurationMs = 0;
  private windowMs: number;

  constructor(scene: Phaser.Scene, windowMs = 3000) {
    this.windowMs = windowMs;
    this.z = GAME_CONFIG.zMax;
    this.graphics = scene.add.graphics().setDepth(4);
  }

  isInPlayerZone(): boolean { return this.z < 0.25 && this.z > -0.05; }

  registerArmsUp(dtMs: number): void {
    if (this.startedAtMs === null) this.startedAtMs = performance.now();
    this.armsUpDurationMs += dtMs;
  }

  isCompleted(): boolean { return this.armsUpDurationMs >= this.windowMs * 0.7; }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.graphics.destroy(); return; }
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    const z = Math.max(0, this.z);
    const cx = GAME_CONFIG.width / 2;
    const y = zToY(z) - 80 * zToScale(z);
    const scale = zToScale(z);
    const w = 400 * scale;
    const h = 30 * scale;
    this.graphics.fillStyle(0xbf5af2, 0.7);
    this.graphics.fillRect(cx - w / 2, y - h / 2, w, h);
    this.graphics.lineStyle(3, 0xbf5af2, 1);
    this.graphics.strokeRect(cx - w / 2, y - h / 2, w, h);
  }

  destroy(): void { if (this.alive) { this.graphics.destroy(); this.alive = false; } }
}
