import { WristVelocityTracker } from './wristVelocity.ts';
import { KP, type PoseFrame } from '../../pose/types.ts';

const Y_HISTORY = 5;
const MIN_DY = 0.015; // descida mínima em coords normalizadas para contar como stroke

export class RowingDetector {
  private tracker = new WristVelocityTracker();
  private lastStroke: 'L' | 'R' | null = null;
  private refractoryUntil: Record<'L' | 'R', number> = { L: 0, R: 0 };
  private yHist: Record<'L' | 'R', number[]> = { L: [], R: [] };

  constructor(
    private readonly speedThreshold: number,
    private readonly refractoryMs: number,
    private readonly onStroke: (side: 'L' | 'R') => void,
  ) {}

  push(frame: PoseFrame): void {
    this.tracker.push(frame);
    const now = performance.now();

    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];

    if (lw) {
      this.yHist.L.push(lw.y);
      if (this.yHist.L.length > Y_HISTORY) this.yHist.L.shift();
    }
    if (rw) {
      this.yHist.R.push(rw.y);
      if (this.yHist.R.length > Y_HISTORY) this.yHist.R.shift();
    }

    this.checkSide('L', now);
    this.checkSide('R', now);
  }

  private checkSide(side: 'L' | 'R', now: number): void {
    if (now < this.refractoryUntil[side]) return;

    const speed = this.tracker.speedNorm(side);
    if (speed < this.speedThreshold) return;

    const hist = this.yHist[side];
    if (hist.length < Y_HISTORY) return;
    const dy = hist[hist.length - 1] - hist[0]; // positivo = descida (Y aumenta pra baixo)
    if (dy < MIN_DY) return;

    if (this.lastStroke === side) return; // alternância obrigatória

    this.lastStroke = side;
    this.refractoryUntil[side] = now + this.refractoryMs;
    this.onStroke(side);
  }

  reset(): void {
    this.tracker.reset();
    this.lastStroke = null;
    this.refractoryUntil = { L: 0, R: 0 };
    this.yHist = { L: [], R: [] };
  }
}
