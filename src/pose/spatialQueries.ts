import { KP, type PoseFrame, type Keypoint } from './types.ts';

export interface Target { x: number; y: number; r: number }

export function handAt(frame: PoseFrame, hand: 'L' | 'R', target: Target): boolean {
  const idx = hand === 'L' ? KP.LEFT_WRIST : KP.RIGHT_WRIST;
  const kp = frame.keypoints[idx];
  if (!kp) return false;
  const dx = kp.x - target.x;
  const dy = kp.y - target.y;
  return dx * dx + dy * dy <= target.r * target.r;
}

export function handPosition(frame: PoseFrame, hand: 'L' | 'R'): Keypoint | null {
  const idx = hand === 'L' ? KP.LEFT_WRIST : KP.RIGHT_WRIST;
  return frame.keypoints[idx] ?? null;
}

/** Ângulo (graus) da linha entre ombros vs horizontal. */
export function trunkRotationAngle(frame: PoseFrame): number {
  const ls = frame.keypoints[KP.LEFT_SHOULDER];
  const rs = frame.keypoints[KP.RIGHT_SHOULDER];
  if (!ls || !rs) return 0;
  const dx = rs.x - ls.x;
  const dy = rs.y - ls.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

export function bothHandsAbove(frame: PoseFrame, yLine: number): boolean {
  const lw = frame.keypoints[KP.LEFT_WRIST];
  const rw = frame.keypoints[KP.RIGHT_WRIST];
  if (!lw || !rw) return false;
  return lw.y < yLine && rw.y < yLine;
}
