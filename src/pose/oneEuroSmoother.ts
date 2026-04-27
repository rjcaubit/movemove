import type { Keypoint } from './types.ts';

/**
 * One Euro Filter — adaptive low-pass.
 * Reference: Casiez et al. 2012.
 *
 * Cutoff aumenta com velocidade (menos lag em mov rápido), reduz parado (menos jitter).
 * Use só se EMA mostrar jitter empírico em cadência rápida (ADR-5).
 */
export class OneEuroSmoother {
  private prev: Keypoint[] | null = null;
  private prevDx: number[] | null = null;
  private prevT = 0;

  constructor(
    private readonly minCutoff: number = 1.0,
    private readonly beta: number = 0.007,
    private readonly dCutoff: number = 1.0,
  ) {}

  smooth(raw: Keypoint[], tMs: number): Keypoint[] {
    const tSec = tMs / 1000;
    if (this.prev === null || this.prev.length !== raw.length) {
      this.prev = raw.map((k) => ({ ...k }));
      this.prevDx = new Array(raw.length * 2).fill(0);
      this.prevT = tSec;
      return this.prev;
    }
    const dt = Math.max(1e-3, tSec - this.prevT);
    const out: Keypoint[] = new Array(raw.length);
    const newDx: number[] = new Array(raw.length * 2);
    for (let i = 0; i < raw.length; i++) {
      const dxX = (raw[i].x - this.prev[i].x) / dt;
      const dxY = (raw[i].y - this.prev[i].y) / dt;
      const aD = this.alpha(dt, this.dCutoff);
      const sdxX = aD * dxX + (1 - aD) * (this.prevDx?.[i * 2] ?? 0);
      const sdxY = aD * dxY + (1 - aD) * (this.prevDx?.[i * 2 + 1] ?? 0);
      const cutoffX = this.minCutoff + this.beta * Math.abs(sdxX);
      const cutoffY = this.minCutoff + this.beta * Math.abs(sdxY);
      const aX = this.alpha(dt, cutoffX);
      const aY = this.alpha(dt, cutoffY);
      out[i] = {
        x: aX * raw[i].x + (1 - aX) * this.prev[i].x,
        y: aY * raw[i].y + (1 - aY) * this.prev[i].y,
        z: raw[i].z,
        visibility: raw[i].visibility,
      };
      newDx[i * 2] = sdxX;
      newDx[i * 2 + 1] = sdxY;
    }
    this.prev = out;
    this.prevDx = newDx;
    this.prevT = tSec;
    return out;
  }

  reset(): void { this.prev = null; this.prevDx = null; this.prevT = 0; }

  private alpha(dt: number, cutoff: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
}
