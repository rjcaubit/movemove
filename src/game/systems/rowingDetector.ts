import { WristVelocityTracker } from './wristVelocity.ts';
import { KP, type PoseFrame } from '../../pose/types.ts';

const Y_HISTORY = 5;
const MIN_DY = 0.015; // descida mínima em coords normalizadas para contar como stroke

export type RejectReason = 'cooldown' | 'speed' | 'history' | 'no-descent' | 'alternance';

export interface SideDebug {
  speed: number;
  dy: number;
  cooldownMs: number;
  lastReject: RejectReason | null;
  lastRejectAt: number; // performance.now() do último reject
}

export interface DetectorDebug {
  L: SideDebug;
  R: SideDebug;
  lastStroke: 'L' | 'R' | null;
  lastStrokeAt: number;
}

export class RowingDetector {
  private tracker = new WristVelocityTracker();
  private lastStroke: 'L' | 'R' | null = null;
  private lastStrokeAt = 0;
  private refractoryUntil: Record<'L' | 'R', number> = { L: 0, R: 0 };
  private yHist: Record<'L' | 'R', number[]> = { L: [], R: [] };

  // Debug snapshot atualizado a cada push()
  private debug: DetectorDebug = {
    L: { speed: 0, dy: 0, cooldownMs: 0, lastReject: null, lastRejectAt: 0 },
    R: { speed: 0, dy: 0, cooldownMs: 0, lastReject: null, lastRejectAt: 0 },
    lastStroke: null,
    lastStrokeAt: 0,
  };

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

    // Atualizar snapshot debug
    this.updateDebug(now);
  }

  private updateDebug(now: number): void {
    for (const side of ['L', 'R'] as const) {
      const hist = this.yHist[side];
      const dy = hist.length >= 2 ? hist[hist.length - 1] - hist[0] : 0;
      this.debug[side].speed = this.tracker.speedNorm(side);
      this.debug[side].dy = dy;
      this.debug[side].cooldownMs = Math.max(0, this.refractoryUntil[side] - now);
    }
    this.debug.lastStroke = this.lastStroke;
    this.debug.lastStrokeAt = this.lastStrokeAt;
  }

  private setReject(side: 'L' | 'R', reason: RejectReason, now: number): void {
    this.debug[side].lastReject = reason;
    this.debug[side].lastRejectAt = now;
  }

  private checkSide(side: 'L' | 'R', now: number): void {
    if (now < this.refractoryUntil[side]) {
      this.setReject(side, 'cooldown', now);
      return;
    }

    const speed = this.tracker.speedNorm(side);
    if (speed < this.speedThreshold) {
      this.setReject(side, 'speed', now);
      return;
    }

    const hist = this.yHist[side];
    if (hist.length < Y_HISTORY) {
      this.setReject(side, 'history', now);
      return;
    }
    const dy = hist[hist.length - 1] - hist[0];
    if (dy < MIN_DY) {
      this.setReject(side, 'no-descent', now);
      return;
    }

    if (this.lastStroke === side) {
      this.setReject(side, 'alternance', now);
      return;
    }

    this.lastStroke = side;
    this.lastStrokeAt = now;
    this.refractoryUntil[side] = now + this.refractoryMs;
    this.debug[side].lastReject = null;
    this.onStroke(side);
  }

  getDebug(): DetectorDebug {
    return this.debug;
  }

  reset(): void {
    this.tracker.reset();
    this.lastStroke = null;
    this.lastStrokeAt = 0;
    this.refractoryUntil = { L: 0, R: 0 };
    this.yHist = { L: [], R: [] };
    this.debug = {
      L: { speed: 0, dy: 0, cooldownMs: 0, lastReject: null, lastRejectAt: 0 },
      R: { speed: 0, dy: 0, cooldownMs: 0, lastReject: null, lastRejectAt: 0 },
      lastStroke: null,
      lastStrokeAt: 0,
    };
  }
}
