import { GAME_CONFIG } from '../config.ts';
import type { Lane } from '../../pose/types.ts';

const C = GAME_CONFIG;

export function zToScale(z: number): number {
  const t = 1 - clamp01(z);
  return C.scaleAtHorizon + (C.scaleAtNear - C.scaleAtHorizon) * t;
}

export function zToY(z: number): number {
  const t = 1 - clamp01(z);
  return C.horizonY + (C.playerY - C.horizonY) * t;
}

export function laneToX(lane: Lane, z: number): number {
  const centerX = C.width / 2;
  const t = 1 - clamp01(z);
  const offsetAtZ = C.laneXOffsetAtHorizon + (C.laneXOffsetAtNear - C.laneXOffsetAtHorizon) * t;
  return centerX + lane * offsetAtZ;
}

function clamp01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x; }
