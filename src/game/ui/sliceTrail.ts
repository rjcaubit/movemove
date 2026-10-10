import * as Phaser from 'phaser';

const MAX_POINTS = 12;
const FADE_MS = 250;

interface Point { x: number; y: number; t: number }

export class SliceTrail {
  private points: Point[] = [];
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(40);
  }

  push(xPx: number, yPx: number): void {
    this.points.push({ x: xPx, y: yPx, t: performance.now() });
    while (this.points.length > MAX_POINTS) this.points.shift();
  }

  render(): void {
    this.gfx.clear();
    const now = performance.now();
    this.points = this.points.filter((p) => now - p.t < FADE_MS);
    if (this.points.length < 2) return;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      const age = (now - b.t) / FADE_MS;
      const alpha = Math.max(0, 1 - age);
      const width = Math.max(1, 8 * (1 - age));
      this.gfx.lineStyle(width, 0xff453a, alpha);
      this.gfx.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.points = [];
  }
}
