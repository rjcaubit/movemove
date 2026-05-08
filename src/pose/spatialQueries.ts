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

/** Braços abertos lateralmente: pulsos longe do corpo na horizontal e na altura dos ombros. */
export function armsLateralOut(frame: PoseFrame): boolean {
  const ls = frame.keypoints[KP.LEFT_SHOULDER];
  const rs = frame.keypoints[KP.RIGHT_SHOULDER];
  const lw = frame.keypoints[KP.LEFT_WRIST];
  const rw = frame.keypoints[KP.RIGHT_WRIST];
  if (!ls || !rs || !lw || !rw) return false;
  const shoulderWidth = Math.abs(rs.x - ls.x);
  if (shoulderWidth < 0.05) return false;
  const spread = Math.abs(rw.x - lw.x);
  if (spread < shoulderWidth * 1.6) return false;
  const shoulderY = (ls.y + rs.y) / 2;
  if (Math.abs(lw.y - shoulderY) > 0.18) return false;
  if (Math.abs(rw.y - shoulderY) > 0.18) return false;
  return true;
}

/** Quadril abaixo do baseline (y cresce pra baixo) — agachamento leve. */
export function hipDropFromBaseline(frame: PoseFrame, baselineHipY: number, threshold = 0.04): boolean {
  const lh = frame.keypoints[KP.LEFT_HIP];
  const rh = frame.keypoints[KP.RIGHT_HIP];
  if (!lh || !rh) return false;
  const hipY = (lh.y + rh.y) / 2;
  return hipY - baselineHipY > threshold;
}

export function hipY(frame: PoseFrame): number | null {
  const lh = frame.keypoints[KP.LEFT_HIP];
  const rh = frame.keypoints[KP.RIGHT_HIP];
  if (!lh || !rh) return null;
  return (lh.y + rh.y) / 2;
}

export type DanceDir = 'L' | 'R' | 'U' | 'D';

/**
 * Detecta a "direção" expressa no momento (DDR-style):
 *  L = só braço esquerdo levantado
 *  R = só braço direito levantado
 *  U = ambos braços levantados
 *  D = agachamento (quadril abaixo do baseline)
 * Prioridade: D > U > L/R. Retorna null se nenhuma se aplica claramente.
 */
export function detectDanceDir(frame: PoseFrame, baselineHipY: number): DanceDir | null {
  if (hipDropFromBaseline(frame, baselineHipY, 0.045)) return 'D';
  const ls = frame.keypoints[KP.LEFT_SHOULDER];
  const rs = frame.keypoints[KP.RIGHT_SHOULDER];
  const lw = frame.keypoints[KP.LEFT_WRIST];
  const rw = frame.keypoints[KP.RIGHT_WRIST];
  if (!ls || !rs || !lw || !rw) return null;
  const lUp = lw.y < ls.y - 0.04;
  const rUp = rw.y < rs.y - 0.04;
  if (lUp && rUp) return 'U';
  if (lUp) return 'L';
  if (rUp) return 'R';
  return null;
}

export function bothHandsAbove(frame: PoseFrame, yLine: number): boolean {
  const lw = frame.keypoints[KP.LEFT_WRIST];
  const rw = frame.keypoints[KP.RIGHT_WRIST];
  if (!lw || !rw) return false;
  return lw.y < yLine && rw.y < yLine;
}
