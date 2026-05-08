import { KP, type PoseFrame, type Keypoint } from '../../pose/types.ts';
import { trunkRotationAngle } from '../../pose/spatialQueries.ts';

export interface RepDetector {
  reset(): void;
  /** Process a frame; return true exactly when a rep just completed. */
  process(frame: PoseFrame): boolean;
}

const dist = (a: Keypoint, b: Keypoint): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const visible = (kp: Keypoint | undefined, min = 0.3): kp is Keypoint =>
  !!kp && (kp.visibility ?? 1) >= min;

const REFRACTORY_MS = 350;

abstract class AlternatingDetector implements RepDetector {
  protected lastSide: 'L' | 'R' | null = null;
  protected lastRepAt = 0;
  reset(): void { this.lastSide = null; this.lastRepAt = 0; }
  protected commit(side: 'L' | 'R', now: number): boolean {
    if (now - this.lastRepAt < REFRACTORY_MS) return false;
    if (side === this.lastSide) return false;
    this.lastSide = side;
    this.lastRepAt = now;
    return true;
  }
  abstract process(frame: PoseFrame): boolean;
}

export class TrunkRotationRep extends AlternatingDetector {
  private threshold = 12;
  process(frame: PoseFrame): boolean {
    const angle = trunkRotationAngle(frame);
    const dev = ((angle + 540) % 360) - 180;
    if (Math.abs(dev) < this.threshold) return false;
    const side: 'L' | 'R' = dev > 0 ? 'L' : 'R';
    return this.commit(side, frame.timestamp);
  }
}

export class HighKneeRep extends AlternatingDetector {
  process(frame: PoseFrame): boolean {
    const lh = frame.keypoints[KP.LEFT_HIP];
    const rh = frame.keypoints[KP.RIGHT_HIP];
    const lk = frame.keypoints[KP.LEFT_KNEE];
    const rk = frame.keypoints[KP.RIGHT_KNEE];
    if (!visible(lh) || !visible(rh) || !visible(lk) || !visible(rk)) return false;
    const hipY = (lh.y + rh.y) / 2;
    const lLift = hipY - lk.y;
    const rLift = hipY - rk.y;
    const TH = 0.05;
    let side: 'L' | 'R' | null = null;
    if (lLift > TH && lLift > rLift) side = 'L';
    else if (rLift > TH && rLift > lLift) side = 'R';
    if (!side) return false;
    return this.commit(side, frame.timestamp);
  }
}

/** Hand crosses near opposite-side knee/lower body. */
export class CrossBodyRep extends AlternatingDetector {
  process(frame: PoseFrame): boolean {
    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];
    const lk = frame.keypoints[KP.LEFT_KNEE];
    const rk = frame.keypoints[KP.RIGHT_KNEE];
    if (!visible(lw) || !visible(rw) || !visible(lk) || !visible(rk)) return false;
    const TH = 0.18;
    const lhand_to_rknee = dist(lw, rk);
    const rhand_to_lknee = dist(rw, lk);
    let side: 'L' | 'R' | null = null;
    if (lhand_to_rknee < TH && lhand_to_rknee < rhand_to_lknee) side = 'L';
    else if (rhand_to_lknee < TH) side = 'R';
    if (!side) return false;
    return this.commit(side, frame.timestamp);
  }
}

/** Lateral torso lean (shoulder line tilt) past threshold, alternating. */
export class LateralLeanRep extends AlternatingDetector {
  process(frame: PoseFrame): boolean {
    const ls = frame.keypoints[KP.LEFT_SHOULDER];
    const rs = frame.keypoints[KP.RIGHT_SHOULDER];
    const lh = frame.keypoints[KP.LEFT_HIP];
    const rh = frame.keypoints[KP.RIGHT_HIP];
    if (!visible(ls) || !visible(rs) || !visible(lh) || !visible(rh)) return false;
    const shoMidX = (ls.x + rs.x) / 2;
    const hipMidX = (lh.x + rh.x) / 2;
    const dx = shoMidX - hipMidX;
    const TH = 0.05;
    let side: 'L' | 'R' | null = null;
    if (dx < -TH) side = 'L';
    else if (dx > TH) side = 'R';
    if (!side) return false;
    return this.commit(side, frame.timestamp);
  }
}

/** Both wrists above shoulders. Counts each up-cycle. */
export class ArmsUpCycleRep implements RepDetector {
  private isUp = false;
  private lastRepAt = 0;
  reset(): void { this.isUp = false; this.lastRepAt = 0; }
  process(frame: PoseFrame): boolean {
    const ls = frame.keypoints[KP.LEFT_SHOULDER];
    const rs = frame.keypoints[KP.RIGHT_SHOULDER];
    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];
    if (!visible(ls) || !visible(rs) || !visible(lw) || !visible(rw)) return false;
    const shoY = (ls.y + rs.y) / 2;
    const up = lw.y < shoY - 0.02 && rw.y < shoY - 0.02;
    const now = frame.timestamp;
    if (up && !this.isUp && now - this.lastRepAt > 600) {
      this.isUp = true;
      this.lastRepAt = now;
      return true;
    }
    if (!up && this.isUp) {
      const shoYHigh = shoY + 0.05;
      if (lw.y > shoYHigh && rw.y > shoYHigh) this.isUp = false;
    }
    return false;
  }
}

/** Hip y goes below baseline (squat down) then comes back up. */
export class SquatCycleRep implements RepDetector {
  private baseHipY: number | null = null;
  private isDown = false;
  private lastRepAt = 0;
  reset(): void { this.baseHipY = null; this.isDown = false; this.lastRepAt = 0; }
  process(frame: PoseFrame): boolean {
    const lh = frame.keypoints[KP.LEFT_HIP];
    const rh = frame.keypoints[KP.RIGHT_HIP];
    if (!visible(lh) || !visible(rh)) return false;
    const hipY = (lh.y + rh.y) / 2;
    if (this.baseHipY === null) { this.baseHipY = hipY; return false; }
    this.baseHipY = this.baseHipY * 0.995 + hipY * 0.005;
    const drop = hipY - this.baseHipY;
    const now = frame.timestamp;
    if (!this.isDown && drop > 0.04) this.isDown = true;
    else if (this.isDown && drop < 0.015 && now - this.lastRepAt > REFRACTORY_MS) {
      this.isDown = false;
      this.lastRepAt = now;
      return true;
    }
    return false;
  }
}

export const DETECTORS: Record<string, () => RepDetector> = {
  trunkRotation: () => new TrunkRotationRep(),
  highKnee: () => new HighKneeRep(),
  elbowToKnee: () => new HighKneeRep(),
  lateralLean: () => new LateralLeanRep(),
  armsUp: () => new ArmsUpCycleRep(),
  squatCycle: () => new SquatCycleRep(),
  crossKick: () => new CrossBodyRep(),
  twistKneePull: () => new CrossBodyRep(),
  lateralHop: () => new LateralLeanRep(),
};
