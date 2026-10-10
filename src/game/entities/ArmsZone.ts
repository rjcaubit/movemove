import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

const F = GAME_CONFIG.falling;
const W = GAME_CONFIG.width;

export class ArmsZone {
  readonly graphics: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  y: number;
  alive = true;
  startedAtMs: number | null = null;
  armsUpDurationMs = 0;
  private windowMs: number;

  constructor(scene: Phaser.Scene, windowMs = 3000) {
    this.windowMs = windowMs;
    this.y = F.spawnY;
    this.graphics = scene.add.graphics().setDepth(4);
    this.label = scene.add.text(W / 2, F.groundY - 200, 'BRAÇOS!', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '28px', color: '#bf5af2',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(120).setVisible(false);
  }

  isInPlayerZone(): boolean { return this.y >= F.collisionTop && this.y <= F.despawnY; }

  registerArmsUp(dtMs: number): void {
    if (this.startedAtMs === null) this.startedAtMs = performance.now();
    this.armsUpDurationMs += dtMs;
  }

  isCompleted(): boolean { return this.armsUpDurationMs >= this.windowMs * 0.7; }

  update(speedMps: number, dtSec: number): void {
    this.y += speedMps * F.pxPerMeter * dtSec;
    if (this.y > F.despawnY) { this.alive = false; this.graphics.destroy(); this.label.destroy(); return; }
    this.draw();
    this.label.setVisible(this.isInPlayerZone());
  }

  private draw(): void {
    this.graphics.clear();
    if (this.y < 0 || this.y > F.despawnY) return;
    const drawY = this.y - 80;
    this.graphics.fillStyle(0xbf5af2, 0.7);
    this.graphics.fillRect(W / 2 - 200, drawY - 15, 400, 30);
    this.graphics.lineStyle(3, 0xbf5af2, 1);
    this.graphics.strokeRect(W / 2 - 200, drawY - 15, 400, 30);
  }

  destroy(): void { if (this.alive) { this.graphics.destroy(); this.label.destroy(); this.alive = false; } }
}
