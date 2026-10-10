import { KP, type Keypoint, type PoseFrame } from './types.ts';

/**
 * Ângulo (graus) das articulações que dá pra medir direto no esqueleto:
 * joelho, cotovelo e quadril. Usado no treino pra mostrar o valor ao vivo ao
 * lado da articulação-foco do exercício e pra desenhar a curva do movimento.
 */
export type AngleKind = 'joelho' | 'cotovelo' | 'quadril';

const TRIPLES: Record<number, { kind: AngleKind; a: number; c: number }> = {
  [KP.LEFT_KNEE]: { kind: 'joelho', a: KP.LEFT_HIP, c: KP.LEFT_ANKLE },
  [KP.RIGHT_KNEE]: { kind: 'joelho', a: KP.RIGHT_HIP, c: KP.RIGHT_ANKLE },
  [KP.LEFT_ELBOW]: { kind: 'cotovelo', a: KP.LEFT_SHOULDER, c: KP.LEFT_WRIST },
  [KP.RIGHT_ELBOW]: { kind: 'cotovelo', a: KP.RIGHT_SHOULDER, c: KP.RIGHT_WRIST },
  [KP.LEFT_HIP]: { kind: 'quadril', a: KP.LEFT_SHOULDER, c: KP.LEFT_KNEE },
  [KP.RIGHT_HIP]: { kind: 'quadril', a: KP.RIGHT_SHOULDER, c: KP.RIGHT_KNEE },
};

const MIN_VISIBILITY = 0.5;

const seen = (k: Keypoint | undefined): k is Keypoint => !!k && (k.visibility ?? 1) >= MIN_VISIBILITY;

function angleAt(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const v1x = a.x - b.x; const v1y = a.y - b.y;
  const v2x = c.x - b.x; const v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n < 1e-6) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / n))) * 180) / Math.PI;
}

export interface JointAngle { joint: number; deg: number }

/** Tipo de ângulo que o exercício mede (pela primeira articulação-foco mensurável). */
export function angleKindFor(focusJoints: readonly number[]): AngleKind | null {
  for (const j of focusJoints) {
    const t = TRIPLES[j];
    if (t) return t.kind;
  }
  return null;
}

/** Ângulos das articulações-foco visíveis neste quadro (só as do tipo medido). */
export function focusAngles(frame: PoseFrame, focusJoints: readonly number[]): JointAngle[] {
  const kind = angleKindFor(focusJoints);
  if (!kind) return [];
  const out: JointAngle[] = [];
  for (const j of focusJoints) {
    const t = TRIPLES[j];
    if (!t || t.kind !== kind) continue;
    const a = frame.keypoints[t.a]; const b = frame.keypoints[j]; const c = frame.keypoints[t.c];
    if (seen(a) && seen(b) && seen(c)) out.push({ joint: j, deg: angleAt(a, b, c) });
  }
  return out;
}
