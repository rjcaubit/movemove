/**
 * Poses paramétricas do boneco guia — sem dependência de renderer.
 *
 * - `ANIMATORS` (vista frontal, ângulos de junta) veio de `game/ui/demoFigure.ts`
 *   e continua alimentando o DemoFigure do Phaser.
 * - `GUIDE_ANIMATIONS` devolve um `Skeleton` (pontos) pronto pra qualquer
 *   renderer (SVG no app, futuramente react-native-svg). Exercícios de perfil
 *   (agachamento, flexão, prancha…) são keyframes de pontos interpolados.
 *
 * Sistema de coordenadas: origem no centro do quadril em pé, y cresce pra baixo,
 * chão em y = GROUND. Vista de perfil olha pra +x.
 */
export interface FigurePose {
  ox: number;
  oy: number;
  tilt: number;
  laShoulder: number; laElbow: number;
  raShoulder: number; raElbow: number;
  llHip: number; llKnee: number;
  rlHip: number; rlKnee: number;
}

export const NEUTRAL_POSE: FigurePose = {
  ox: 0, oy: 0, tilt: 0,
  laShoulder: 0, laElbow: 0,
  raShoulder: 0, raElbow: 0,
  llHip: 0, llKnee: 0,
  rlHip: 0, rlKnee: 0,
};


const DEG = Math.PI / 180;

export type Animator = (t: number) => FigurePose;

const tri = (t: number, period: number): number => {
  const phase = (t % period) / period;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
};

const swing = (t: number, period: number): number => Math.sin((t / period) * Math.PI * 2);

export const ANIMATORS: Record<string, Animator> = {
  trunkRotation: (t) => ({
    ...NEUTRAL_POSE,
    raShoulder: 90 * DEG, raElbow: -80 * DEG,
    laShoulder: 90 * DEG, laElbow: -80 * DEG,
    tilt: swing(t, 2000) * 18 * DEG,
  }),

  highKneeHandsHead: (t) => {
    const p = swing(t, 1000);
    const left = p > 0;
    return {
      ...NEUTRAL_POSE,
      // Braços quase verticais e antebraço dobra PRA DENTRO (mãos na cabeça)
      laShoulder: 165 * DEG, laElbow: 80 * DEG,
      raShoulder: 165 * DEG, raElbow: 80 * DEG,
      llHip: left ? 70 * DEG * Math.abs(p) : 0,
      llKnee: left ? -100 * DEG * Math.abs(p) : 0,
      rlHip: !left ? 70 * DEG * Math.abs(p) : 0,
      rlKnee: !left ? -100 * DEG * Math.abs(p) : 0,
    };
  },

  elbowToKneeSide: (t) => {
    const p = swing(t, 1200);
    const left = p > 0;
    const m = Math.abs(p);
    return {
      ...NEUTRAL_POSE,
      laShoulder: left ? (60 + 60 * m) * DEG : 30 * DEG,
      laElbow: left ? -110 * DEG * m : -20 * DEG,
      raShoulder: !left ? (60 + 60 * m) * DEG : 30 * DEG,
      raElbow: !left ? -110 * DEG * m : -20 * DEG,
      llHip: left ? 50 * DEG * m : 0,
      llKnee: left ? -70 * DEG * m : 0,
      rlHip: !left ? 50 * DEG * m : 0,
      rlKnee: !left ? -70 * DEG * m : 0,
      tilt: p * 8 * DEG,
    };
  },

  lateralStretch: (t) => {
    const p = swing(t, 2400);
    const left = p > 0;
    return {
      ...NEUTRAL_POSE,
      laShoulder: left ? 175 * DEG : 10 * DEG,
      raShoulder: !left ? 175 * DEG : 10 * DEG,
      tilt: -p * 22 * DEG,
    };
  },

  lungeArmsUp: (t) => {
    const p = tri(t, 1600);
    const phase = swing(t, 3200) > 0 ? 1 : -1;
    return {
      ...NEUTRAL_POSE,
      laShoulder: (40 + 130 * p) * DEG,
      raShoulder: (40 + 130 * p) * DEG,
      llHip: phase > 0 ? 35 * DEG * p : -10 * DEG * p,
      llKnee: phase > 0 ? -40 * DEG * p : 0,
      rlHip: phase < 0 ? 35 * DEG * p : -10 * DEG * p,
      rlKnee: phase < 0 ? -40 * DEG * p : 0,
      oy: -8 * (1 - p),
    };
  },

  squatLateralShift: (t) => {
    const sq = tri(t, 1200);
    const shift = swing(t, 2400);
    return {
      ...NEUTRAL_POSE,
      laShoulder: 70 * DEG, laElbow: -60 * DEG,
      raShoulder: 70 * DEG, raElbow: -60 * DEG,
      llHip: 25 * DEG * sq, llKnee: -55 * DEG * sq,
      rlHip: 25 * DEG * sq, rlKnee: -55 * DEG * sq,
      ox: shift * 14,
      oy: 18 * sq,
    };
  },

  crossKick: (t) => {
    const p = swing(t, 1100);
    const leftPhase = p > 0; // perna ESQ chuta + braço DIR cruza pra esquerda
    const m = Math.abs(p);
    return {
      ...NEUTRAL_POSE,
      // Braço cruza o corpo: ângulo NEGATIVO (mirror inverte → vai pro lado oposto)
      laShoulder: !leftPhase ? -(50 + 60 * m) * DEG : 25 * DEG,
      raShoulder: leftPhase ? -(50 + 60 * m) * DEG : 25 * DEG,
      // Perna sobe alta (chute frontal)
      llHip: leftPhase ? 130 * DEG * m : 0,
      rlHip: !leftPhase ? 130 * DEG * m : 0,
      tilt: p * 6 * DEG,
    };
  },

  twistKneePull: (t) => {
    const p = swing(t, 1400);
    const leftKnee = p > 0;  // joelho ESQ sobe + cotovelo DIR cruza pra esquerda
    const m = Math.abs(p);
    return {
      ...NEUTRAL_POSE,
      // Cotovelo cruza pro lado oposto: ângulo NEGATIVO no ombro do braço cruzante
      laShoulder: !leftKnee ? -(60 + 50 * m) * DEG : 25 * DEG,
      laElbow: !leftKnee ? -90 * DEG * m : -20 * DEG,
      raShoulder: leftKnee ? -(60 + 50 * m) * DEG : 25 * DEG,
      raElbow: leftKnee ? -90 * DEG * m : -20 * DEG,
      llHip: leftKnee ? 60 * DEG * m : 0,
      llKnee: leftKnee ? -90 * DEG * m : 0,
      rlHip: !leftKnee ? 60 * DEG * m : 0,
      rlKnee: !leftKnee ? -90 * DEG * m : 0,
      tilt: -p * 10 * DEG,
    };
  },

  lateralHopTwist: (t) => {
    const hop = Math.max(0, Math.sin((t / 600) * Math.PI * 2));
    const shift = swing(t, 1200);
    return {
      ...NEUTRAL_POSE,
      laShoulder: 60 * DEG, laElbow: -60 * DEG,
      raShoulder: 60 * DEG, raElbow: -60 * DEG,
      llHip: 5 * DEG, rlHip: 5 * DEG,
      llKnee: -10 * DEG, rlKnee: -10 * DEG,
      ox: shift * 18,
      oy: -hop * 12,
      tilt: -shift * 12 * DEG,
    };
  },
};

// ---------------------------------------------------------------------------
// Skeleton (pontos) — formato comum pra renderização
// ---------------------------------------------------------------------------

export interface Pt { x: number; y: number }

export interface Skeleton {
  head: Pt;
  /** Traços do lado de perto (opacidade cheia). */
  near: Pt[][];
  /** Traços do lado de longe (perfil) — desenhados mais claros. */
  far: Pt[][];
  /** Articulações marcadas com ponto. */
  joints: Pt[];
}

export const FIG = {
  SHOULDER_HALF: 26,
  HIP_HALF: 18,
  TORSO: 70,
  NECK: 14,
  HEAD_R: 14,
  ARM: 36,
  LEG: 46,
  FOOT: 12,
  GROUND: 127,
} as const;

/** Caixa que contém qualquer pose (pra viewBox fixo, sem "pulo" de escala). */
export const FIGURE_VIEWBOX = { x: -125, y: -118, w: 250, h: 255 } as const;

/** Converte pose frontal (ângulos) em pontos — mesma geometria do DemoFigure. */
export function frontSkeleton(p: FigurePose): Skeleton {
  const { SHOULDER_HALF, HIP_HALF, TORSO, NECK, HEAD_R, ARM, LEG } = FIG;
  const cx = p.ox;
  const hipY = p.oy + TORSO / 2;
  const shoY = p.oy - TORSO / 2;
  const cos = Math.cos(p.tilt);
  const sin = Math.sin(p.tilt);
  const rot = (lx: number, ly: number): Pt => {
    const dx = lx - cx;
    const dy = ly - hipY;
    return { x: cx + dx * cos - dy * sin, y: hipY + dx * sin + dy * cos };
  };
  const lS = rot(cx - SHOULDER_HALF, shoY);
  const rS = rot(cx + SHOULDER_HALF, shoY);
  const lH = { x: cx - HIP_HALF, y: hipY };
  const rH = { x: cx + HIP_HALF, y: hipY };
  const neck = rot(cx, shoY - NECK);
  const midS = { x: (lS.x + rS.x) / 2, y: (lS.y + rS.y) / 2 };
  const limb = (o: Pt, a1: number, a2: number, s1: number, s2: number, mirror: number): Pt[] => {
    const ang1 = a1 * mirror + p.tilt;
    const j1 = { x: o.x + Math.sin(ang1) * s1, y: o.y + Math.cos(ang1) * s1 };
    const ang2 = ang1 + a2 * mirror;
    const j2 = { x: j1.x + Math.sin(ang2) * s2, y: j1.y + Math.cos(ang2) * s2 };
    return [o, j1, j2];
  };
  const la = limb(lS, p.laShoulder, p.laElbow, ARM, ARM, -1);
  const ra = limb(rS, p.raShoulder, p.raElbow, ARM, ARM, 1);
  const ll = limb(lH, p.llHip, p.llKnee, LEG, LEG, -1);
  const rl = limb(rH, p.rlHip, p.rlKnee, LEG, LEG, 1);
  return {
    head: { x: neck.x, y: neck.y - HEAD_R },
    near: [[lS, rS, rH, lH, lS], [midS, neck], la, ra, ll, rl],
    far: [],
    joints: [la[1], la[2], ra[1], ra[2], ll[1], ll[2], rl[1], rl[2]],
  };
}

// ---------------------------------------------------------------------------
// Perfil — construção por pontos + IK de 2 segmentos
// ---------------------------------------------------------------------------

const polar = (o: Pt, ang: number, len: number): Pt =>
  ({ x: o.x + Math.sin(ang) * len, y: o.y + Math.cos(ang) * len });

/** IK 2 segmentos: devolve [junta, ponta]. `bend` escolhe o lado da junta. */
function ik(root: Pt, target: Pt, l1: number, l2: number, bend: 1 | -1): [Pt, Pt] {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const dist = Math.max(1e-3, Math.hypot(dx, dy));
  const d = Math.min(dist, l1 + l2 - 1e-3);
  const ux = dx / dist;
  const uy = dy / dist;
  const end = { x: root.x + ux * d, y: root.y + uy * d };
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const joint = { x: root.x + ux * a + bend * -uy * h, y: root.y + uy * a + bend * ux * h };
  return [joint, end];
}

interface SideSpec {
  hip: Pt;
  /** Inclinação do tronco em graus: 0 = vertical, + = pra frente (+x), 90 = deitado de bruços. */
  tilt: number;
  /** Direção cabeça: por padrão continua o tronco. Graus absolutos (0 = pra baixo). */
  headDir?: number;
  handNear: Pt; handFar?: Pt;
  /** +1 cotovelo pra trás/baixo, -1 pra frente/cima (depende da direção do braço). */
  elbowBend?: 1 | -1;
  footNear: Pt; footFar?: Pt;
  kneeBend?: 1 | -1;
  /** Calcanhar levantado (panturrilha): px acima do chão. */
  heelLift?: number;
}

function side(s: SideSpec): Skeleton {
  const { TORSO, NECK, HEAD_R, ARM, LEG, FOOT, GROUND } = FIG;
  const tr = (s.tilt * Math.PI) / 180;
  const up = { x: Math.sin(tr), y: -Math.cos(tr) };
  const shoulder = { x: s.hip.x + up.x * TORSO, y: s.hip.y + up.y * TORSO };
  let neck: Pt;
  let head: Pt;
  if (s.headDir !== undefined) {
    const hd = (s.headDir * Math.PI) / 180;
    neck = polar(shoulder, hd, NECK);
    head = polar(neck, hd, HEAD_R);
  } else {
    neck = { x: shoulder.x + up.x * NECK, y: shoulder.y + up.y * NECK };
    head = { x: neck.x + up.x * HEAD_R, y: neck.y + up.y * HEAD_R };
  }
  const eb = s.elbowBend ?? 1;
  const kb = s.kneeBend ?? -1;
  const armN = ik(shoulder, s.handNear, ARM, ARM, eb);
  const armF = ik(shoulder, s.handFar ?? s.handNear, ARM, ARM, eb);
  const lift = s.heelLift ?? 0;
  const leg = (foot: Pt): Pt[] => {
    const ankle = { x: foot.x, y: foot.y - lift };
    const [knee, a] = ik(s.hip, ankle, LEG, LEG, kb);
    const onFloor = foot.y >= GROUND - 1;
    const toe = onFloor
      ? { x: a.x + Math.sqrt(Math.max(0, FOOT * FOOT - lift * lift)), y: GROUND }
      : { x: a.x + FOOT * 0.9, y: a.y + FOOT * 0.3 };
    return [s.hip, knee, a, toe];
  };
  const legN = leg(s.footNear);
  const legF = leg(s.footFar ?? s.footNear);
  return {
    head,
    near: [[s.hip, shoulder, neck], [shoulder, armN[0], armN[1]], legN],
    far: [[shoulder, armF[0], armF[1]], legF],
    joints: [shoulder, armN[0], armN[1], s.hip, legN[1], legN[2]],
  };
}

// ---------------------------------------------------------------------------
// Interpolação de keyframes
// ---------------------------------------------------------------------------

const lerpPt = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const lerpLines = (a: Pt[][], b: Pt[][], k: number): Pt[][] =>
  a.map((line, i) => line.map((p, j) => lerpPt(p, b[i]?.[j] ?? p, k)));

export function lerpSkeleton(a: Skeleton, b: Skeleton, k: number): Skeleton {
  return {
    head: lerpPt(a.head, b.head, k),
    near: lerpLines(a.near, b.near, k),
    far: lerpLines(a.far, b.far, k),
    joints: a.joints.map((p, i) => lerpPt(p, b.joints[i] ?? p, k)),
  };
}

const ease = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

/**
 * Loop por keyframes. `frames[i].hold` = fração do período parada no frame;
 * o resto é dividido igualmente entre as transições (fecha o ciclo no 1º).
 */
function keyLoop(frames: Skeleton[], periodMs: number, holdFrac = 0.15): (t: number) => Skeleton {
  const n = frames.length;
  return (t: number) => {
    const phase = ((t % periodMs) + periodMs) % periodMs / periodMs * n;
    const i = Math.floor(phase);
    const local = phase - i;
    const k = local < holdFrac ? 0 : (local - holdFrac) / (1 - holdFrac);
    return lerpSkeleton(frames[i], frames[(i + 1) % n], ease(k));
  };
}

// ---------------------------------------------------------------------------
// Keyframes de perfil
// ---------------------------------------------------------------------------

const G = FIG.GROUND;
const STAND_HIP = { x: 0, y: G - FIG.LEG * 2 };
const hangHands = (hip: Pt, tilt: number): Pt => {
  const tr = (tilt * Math.PI) / 180;
  return { x: hip.x + Math.sin(tr) * FIG.TORSO + 4, y: hip.y - Math.cos(tr) * FIG.TORSO + FIG.ARM * 2 - 2 };
};

const standSide = (armsForward = 0): Skeleton => {
  const shoulder = { x: 0, y: STAND_HIP.y - FIG.TORSO };
  const hand = polar(shoulder, (armsForward * Math.PI) / 180, FIG.ARM * 2 - 1);
  return side({ hip: STAND_HIP, tilt: 0, handNear: armsForward ? hand : hangHands(STAND_HIP, 0), footNear: { x: 0, y: G } });
};

const squatBottom = ((): Skeleton => {
  const hip = { x: -26, y: STAND_HIP.y + 44 };
  const tilt = 38;
  const tr = (tilt * Math.PI) / 180;
  const shoulder = { x: hip.x + Math.sin(tr) * FIG.TORSO, y: hip.y - Math.cos(tr) * FIG.TORSO };
  return side({ hip, tilt, handNear: { x: shoulder.x + 70, y: shoulder.y - 4 }, footNear: { x: 0, y: G } });
})();

const lungeBase = (depth: number): Skeleton => {
  const hip = { x: 0, y: STAND_HIP.y + 8 + depth * 34 };
  return side({
    hip, tilt: 4,
    handNear: hangHands(hip, 4),
    footNear: { x: 38, y: G },
    footFar: { x: -44, y: G },
    heelLift: 0,
  });
};

/** Afundo: perna de trás com joelho quase no chão (IK com pé de trás na ponta). */
const lungeDown = ((): Skeleton => {
  const s = lungeBase(1);
  return s;
})();

const pushup = (beta: number, handX: number): Skeleton => {
  const feet = { x: -92, y: G };
  const b = (beta * Math.PI) / 180;
  const hip = { x: feet.x + Math.cos(b) * FIG.LEG * 2, y: feet.y - 4 - Math.sin(b) * FIG.LEG * 2 };
  return side({
    hip, tilt: 90 - beta,
    handNear: { x: handX, y: G },
    elbowBend: 1,
    footNear: feet,
    kneeBend: 1,
  });
};

const plank = (wobble: number): Skeleton => {
  const beta = 12.5 + wobble;
  const feet = { x: -96, y: G };
  const b = (beta * Math.PI) / 180;
  const hip = { x: feet.x + Math.cos(b) * FIG.LEG * 2, y: feet.y - 4 - Math.sin(b) * FIG.LEG * 2 };
  const sh = { x: hip.x + Math.cos(b) * FIG.TORSO, y: hip.y - Math.sin(b) * FIG.TORSO };
  return side({
    hip, tilt: 90 - beta,
    handNear: { x: sh.x + 34, y: G - 2 },
    elbowBend: 1,
    footNear: feet,
    kneeBend: 1,
  });
};

const crunch = (elev: number): Skeleton => {
  const hip = { x: -12, y: G - 8 };
  const tilt = -(90 - elev); // deitado de costas, cabeça pra -x
  const tr = (tilt * Math.PI) / 180;
  const shoulder = { x: hip.x + Math.sin(tr) * FIG.TORSO, y: hip.y - Math.cos(tr) * FIG.TORSO };
  return side({
    hip, tilt,
    handNear: { x: shoulder.x + 26, y: shoulder.y - 26 + elev * 0.2 },
    elbowBend: -1,
    footNear: { x: 58, y: G },
    kneeBend: -1,
  });
};

const bridge = (lift: number): Skeleton => {
  const shoulderAnchor = { x: -72, y: G - 8 };
  const hip = { x: -8, y: G - 10 - lift * 44 };
  const dx = shoulderAnchor.x - hip.x;
  const dy = shoulderAnchor.y - hip.y;
  const tilt = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const tr = (tilt * Math.PI) / 180;
  const shoulder = { x: hip.x + Math.sin(tr) * FIG.TORSO, y: hip.y - Math.cos(tr) * FIG.TORSO };
  return side({
    hip, tilt, headDir: -94,
    handNear: { x: shoulder.x + 62, y: G - 3 },
    elbowBend: 1,
    footNear: { x: 60, y: G },
    kneeBend: -1,
  });
};

const calf = (lift: number): Skeleton => {
  const hip = { x: 0, y: STAND_HIP.y - lift };
  return side({ hip, tilt: 0, handNear: hangHands(hip, 0), footNear: { x: 0, y: G }, heelLift: lift });
};

const burpeeFrames: Skeleton[] = [
  standSide(),
  squatBottom,
  (() => { // agachado com mãos no chão
    const hip = { x: -20, y: STAND_HIP.y + 58 };
    return side({ hip, tilt: 62, handNear: { x: 52, y: G }, footNear: { x: 0, y: G } });
  })(),
  pushup(18, 60),
  (() => { // de volta ao agachado
    const hip = { x: -20, y: STAND_HIP.y + 58 };
    return side({ hip, tilt: 62, handNear: { x: 52, y: G }, footNear: { x: 0, y: G } });
  })(),
  (() => { // salto com braços pra cima
    const hip = { x: 0, y: STAND_HIP.y - 16 };
    const shoulder = { x: 0, y: hip.y - FIG.TORSO };
    return side({ hip, tilt: 0, handNear: { x: 8, y: shoulder.y - FIG.ARM * 2 + 2 }, elbowBend: -1, footNear: { x: -4, y: G - 16 } });
  })(),
];

// Frontal: polichinelo em ângulos, igual aos animators legados.
const jumpingJack = (t: number): FigurePose => {
  const k = tri(t, 1000);
  return {
    ...NEUTRAL_POSE,
    laShoulder: (15 + 150 * k) * DEG, raShoulder: (15 + 150 * k) * DEG,
    laElbow: 0, raElbow: 0,
    llHip: 18 * DEG * k, rlHip: 18 * DEG * k,
    oy: -4 * k,
  };
};

// --- Catálogo 2.1 -----------------------------------------------------------

const easeTri = (t: number, period: number): number => ease(tri(t, period));

const sumoSquat = (t: number): FigurePose => {
  const k = easeTri(t, 2000);
  return {
    ...NEUTRAL_POSE,
    laShoulder: 25 * DEG, laElbow: -110 * DEG, raShoulder: 25 * DEG, raElbow: -110 * DEG,
    llHip: (26 + 20 * k) * DEG, llKnee: -(8 + 72 * k) * DEG,
    rlHip: (26 + 20 * k) * DEG, rlKnee: -(8 + 72 * k) * DEG,
    oy: 18 * k,
  };
};

const lateralLunge = (t: number): FigurePose => {
  const p = swing(t, 2600);
  const m = ease(Math.abs(p));
  const left = p > 0; // perna esquerda dobra, direita estica
  return {
    ...NEUTRAL_POSE,
    laShoulder: 35 * DEG, laElbow: -70 * DEG, raShoulder: 35 * DEG, raElbow: -70 * DEG,
    llHip: (left ? 12 + 12 * m : 20 + 28 * m) * DEG, llKnee: (left ? -70 * m : 0) * DEG,
    rlHip: (!left ? 12 + 12 * m : 20 + 28 * m) * DEG, rlKnee: (!left ? -70 * m : 0) * DEG,
    ox: (left ? -1 : 1) * 16 * m,
    oy: 16 * m,
  };
};

const skater = (t: number): FigurePose => {
  const p = swing(t, 1300);
  const m = Math.abs(p);
  const left = p > 0; // aterrissa na esquerda, direita cruza atrás
  const hop = Math.max(0, Math.cos((t / 1300) * Math.PI * 4)) * 6;
  return {
    ...NEUTRAL_POSE,
    laShoulder: (left ? 30 : -45 * m) * DEG, raShoulder: (!left ? 30 : -45 * m) * DEG,
    llHip: (left ? 6 : -22 * m) * DEG, llKnee: (left ? -40 * m : -55 * m) * DEG,
    rlHip: (!left ? 6 : -22 * m) * DEG, rlKnee: (!left ? -40 * m : -55 * m) * DEG,
    ox: (left ? -1 : 1) * 26 * m,
    oy: 8 * m - hop,
    tilt: (left ? 1 : -1) * 10 * m * DEG,
  };
};

const lateralRaise = (t: number): FigurePose => {
  const k = easeTri(t, 2200);
  return { ...NEUTRAL_POSE, laShoulder: (8 + 82 * k) * DEG, raShoulder: (8 + 82 * k) * DEG };
};

const jumpFrame = ((): Skeleton => {
  const hip = { x: 0, y: STAND_HIP.y - 18 };
  return side({ hip, tilt: 4, handNear: { x: -26, y: hip.y - 10 }, footNear: { x: 2, y: G - 18 } });
})();

const buttKick = (near: boolean): Skeleton => {
  const hip = STAND_HIP;
  const kicked = { x: hip.x - 34, y: hip.y + 24 };
  const planted = { x: 0, y: G };
  return side({
    hip, tilt: 6,
    handNear: near ? { x: 34, y: hip.y - 30 } : { x: -20, y: hip.y + 2 },
    handFar: near ? { x: -20, y: hip.y + 2 } : { x: 34, y: hip.y - 30 },
    elbowBend: -1,
    footNear: near ? kicked : planted,
    footFar: near ? planted : kicked,
  });
};

const climber = (knee: 'near' | 'far' | 'none'): Skeleton => {
  const feet = { x: -92, y: G };
  const b = (24 * Math.PI) / 180;
  const hip = { x: feet.x + Math.cos(b) * FIG.LEG * 2, y: feet.y - 4 - Math.sin(b) * FIG.LEG * 2 };
  const sh = { x: hip.x + Math.cos(b) * FIG.TORSO, y: hip.y - Math.sin(b) * FIG.TORSO };
  const tucked = { x: hip.x + 22, y: G - 8 };
  return side({
    hip: knee === 'none' ? hip : { x: hip.x, y: hip.y - 4 }, tilt: 90 - 24,
    handNear: { x: sh.x + 4, y: G }, elbowBend: 1,
    footNear: knee === 'near' ? tucked : feet,
    footFar: knee === 'far' ? tucked : feet,
    kneeBend: -1,
  });
};

const legRaise = (deg: number): Skeleton => {
  const hip = { x: -14, y: G - 8 };
  const a = (deg * Math.PI) / 180;
  const foot = { x: hip.x + Math.cos(a) * (FIG.LEG * 2 - 1), y: hip.y - Math.sin(a) * (FIG.LEG * 2 - 1) };
  return side({ hip, tilt: -86, handNear: { x: hip.x - 18, y: G - 3 }, footNear: foot, kneeBend: -1 });
};

const superman = (lift: number): Skeleton => {
  const hip = { x: -10, y: G - 10 };
  const chest = 2 + lift * 14;
  const tr = ((90 - chest) * Math.PI) / 180;
  const sh = { x: hip.x + Math.sin(tr) * FIG.TORSO, y: hip.y - Math.cos(tr) * FIG.TORSO };
  const legA = ((3 + lift * 12) * Math.PI) / 180;
  const foot = { x: hip.x - Math.cos(legA) * (FIG.LEG * 2 - 1), y: hip.y - Math.sin(legA) * (FIG.LEG * 2 - 1) };
  const armA = ((4 + lift * 16) * Math.PI) / 180;
  const hand = { x: sh.x + Math.cos(armA) * (FIG.ARM * 2 - 1), y: sh.y - Math.sin(armA) * (FIG.ARM * 2 - 1) };
  return side({ hip, tilt: 90 - chest, handNear: hand, footNear: foot, kneeBend: 1 });
};

/** Tríceps no banco: mãos na borda da cadeira (y ≈ assento), pés à frente. */
const dip = (depth: number): Skeleton => {
  const hip = { x: -30, y: 78 + depth * 34 };
  return side({
    hip, tilt: -4,
    handNear: { x: -44, y: 82 }, elbowBend: 1,
    footNear: { x: 58, y: G }, kneeBend: -1,
  });
};

/** Flexão inclinada: mãos no assento da cadeira. */
const inclinePushup = (beta: number): Skeleton => {
  const feet = { x: -96, y: G };
  const b = (beta * Math.PI) / 180;
  const hip = { x: feet.x + Math.cos(b) * FIG.LEG * 2, y: feet.y - 4 - Math.sin(b) * FIG.LEG * 2 };
  return side({ hip, tilt: 90 - beta, handNear: { x: 56, y: 84 }, elbowBend: 1, footNear: feet, kneeBend: 1 });
};

const wallSit = (breath: number): Skeleton => {
  const hip = { x: -30, y: G - FIG.LEG + breath };
  return side({ hip, tilt: 0, handNear: { x: -8, y: hip.y - 36 }, elbowBend: -1, footNear: { x: 16, y: G } });
};

const sidePlank = (wobble: number): Skeleton => {
  const beta = 20 + wobble;
  const feet = { x: -96, y: G };
  const b = (beta * Math.PI) / 180;
  const hip = { x: feet.x + Math.cos(b) * FIG.LEG * 2, y: feet.y - 4 - Math.sin(b) * FIG.LEG * 2 };
  const sh = { x: hip.x + Math.cos(b) * FIG.TORSO, y: hip.y - Math.sin(b) * FIG.TORSO };
  return side({
    hip, tilt: 90 - beta,
    handNear: { x: sh.x + 30, y: G - 2 }, handFar: { x: sh.x + 4, y: sh.y - FIG.ARM * 2 + 2 },
    elbowBend: 1, footNear: feet, kneeBend: 1,
  });
};

export type SkeletonAnimator = (t: number) => Skeleton;

const fromFront = (a: Animator): SkeletonAnimator => (t) => frontSkeleton(a(t));

/**
 * Uma animação por exercício do catálogo (chave = `poseKeyframes` do catálogo).
 * Período alinhado ao ritmo esperado de uma rep.
 */
export const GUIDE_ANIMATIONS: Record<string, SkeletonAnimator> = {
  trunkRotation: fromFront(ANIMATORS.trunkRotation),
  highKneeHandsHead: fromFront(ANIMATORS.highKneeHandsHead),
  elbowToKneeSide: fromFront(ANIMATORS.elbowToKneeSide),
  lateralStretch: fromFront(ANIMATORS.lateralStretch),
  lungeArmsUp: fromFront(ANIMATORS.lungeArmsUp),
  squatLateralShift: fromFront(ANIMATORS.squatLateralShift),
  crossKick: fromFront(ANIMATORS.crossKick),
  twistKneePull: fromFront(ANIMATORS.twistKneePull),
  lateralHopTwist: fromFront(ANIMATORS.lateralHopTwist),
  jumpingJack: fromFront(jumpingJack),
  squat: keyLoop([standSide(), squatBottom], 2000, 0.2),
  lunge: keyLoop([lungeBase(0), lungeDown], 2400, 0.2),
  pushup: keyLoop([pushup(22, 60), pushup(7, 60)], 2000, 0.2),
  plank: (t) => plank(Math.sin(t / 700) * 0.6),
  crunch: keyLoop([crunch(4), crunch(38)], 2000, 0.2),
  gluteBridge: keyLoop([bridge(0), bridge(1)], 2400, 0.25),
  calfRaise: keyLoop([calf(0), calf(9)], 1500, 0.2),
  burpee: keyLoop(burpeeFrames, 4200, 0.12),
  sumoSquat: fromFront(sumoSquat),
  lateralLunge: fromFront(lateralLunge),
  skater: fromFront(skater),
  lateralRaise: fromFront(lateralRaise),
  jumpSquat: keyLoop([standSide(), squatBottom, jumpFrame], 1800, 0.12),
  buttKick: keyLoop([buttKick(true), buttKick(false)], 800, 0.1),
  mountainClimber: keyLoop([climber('near'), climber('none'), climber('far'), climber('none')], 1100, 0.05),
  legRaise: keyLoop([legRaise(3), legRaise(72)], 2400, 0.2),
  superman: keyLoop([superman(0), superman(1)], 2400, 0.3),
  dip: keyLoop([dip(0), dip(1)], 2000, 0.2),
  inclinePushup: keyLoop([inclinePushup(38), inclinePushup(28)], 2000, 0.2),
  wallSit: (t) => wallSit(Math.sin(t / 900) * 1.2),
  sidePlank: (t) => sidePlank(Math.sin(t / 700) * 0.6),
};

/** Pose "parada" representativa (card de descanso / miniaturas estáticas). */
export function guideStill(key: string, t = 450): Skeleton {
  const a = GUIDE_ANIMATIONS[key] ?? GUIDE_ANIMATIONS.squat;
  return a(t);
}
