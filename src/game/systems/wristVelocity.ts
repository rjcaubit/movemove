import { KP, type PoseFrame } from '../../pose/types.ts';

interface Sample { x: number; y: number; t: number }

const MAX_AGE_MS = 250;
const MAX_SAMPLES = 8;

export class WristVelocityTracker {
  private historyL: Sample[] = [];
  private historyR: Sample[] = [];

  push(frame: PoseFrame): void {
    const now = frame.timestamp ?? performance.now();
    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];
    if (lw) this.append(this.historyL, { x: lw.x, y: lw.y, t: now });
    if (rw) this.append(this.historyR, { x: rw.x, y: rw.y, t: now });
  }

  private append(arr: Sample[], s: Sample): void {
    arr.push(s);
    while (arr.length > MAX_SAMPLES) arr.shift();
    while (arr.length > 0 && s.t - arr[0].t > MAX_AGE_MS) arr.shift();
  }

  speedNorm(hand: 'L' | 'R'): number {
    const arr = hand === 'L' ? this.historyL : this.historyR;
    if (arr.length < 2) return 0;
    const a = arr[arr.length - 2];
    const b = arr[arr.length - 1];
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0 || dt > 0.1) return 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy) / dt;
  }

  totalDisplacement(hand: 'L' | 'R'): number {
    const arr = hand === 'L' ? this.historyL : this.historyR;
    let sum = 0;
    for (let i = 1; i < arr.length; i++) {
      const dx = arr[i].x - arr[i - 1].x;
      const dy = arr[i].y - arr[i - 1].y;
      sum += Math.sqrt(dx * dx + dy * dy);
    }
    return sum;
  }

  reset(): void { this.historyL = []; this.historyR = []; }
}
