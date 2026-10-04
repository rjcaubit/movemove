import { CATALOG, GOAL_LABEL, GROUP_LABEL, type Equipment, type Exercise, type Goal, type MuscleGroup } from './catalog.ts';

/**
 * Gerador de treino por regra local. Função pura e isolada — quando o gerador
 * por IA chegar, basta trocar a implementação mantendo a assinatura.
 */
export type Level = 'leve' | 'medio' | 'intenso';
export type DurationMin = 5 | 7 | 10 | 15;

export interface WorkoutOptions {
  grupo: MuscleGroup;
  objetivo: Goal;
  duracao: DurationMin;
  nivel: Level;
  equipamento: Equipment;
}

export interface WorkoutBlock {
  exerciseId: string;
  durationMs: number;
  /** Meta de reps (tipo 'reps'). Isométricos usam só o tempo. */
  targetReps?: number;
}

export interface Workout {
  id: string;
  options: WorkoutOptions;
  seed: number;
  blocks: WorkoutBlock[];
  restMs: number;
  createdAt: number;
}

export const LEVEL_LABEL: Record<Level, string> = { leve: 'Leve', medio: 'Médio', intenso: 'Intenso' };

export const DEFAULT_OPTIONS: WorkoutOptions = {
  grupo: 'corpo', objetivo: 'forca', duracao: 7, nivel: 'medio', equipamento: 'nenhum',
};

/** Nível → duração do bloco, descanso e fator da meta de reps. */
const LEVEL_TIMING: Record<Level, { workS: number; restS: number; repFactor: number }> = {
  leve: { workS: 30, restS: 15, repFactor: 0.75 },
  medio: { workS: 40, restS: 5, repFactor: 0.9 },
  intenso: { workS: 45, restS: 5, repFactor: 1.05 },
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function equipmentAllowed(ex: Exercise, eq: Equipment): boolean {
  if (ex.equipamento === 'nenhum') return true;
  return ex.equipamento === eq;
}

function matchesGroup(ex: Exercise, g: MuscleGroup): boolean {
  return g === 'corpo' || ex.grupo.includes(g) || ex.grupo.includes('corpo');
}

/** Filtra o catálogo relaxando critérios até ter exercícios suficientes. */
export function pickPool(o: WorkoutOptions, minSize = 4): Exercise[] {
  const eq = CATALOG.filter((e) => equipmentAllowed(e, o.equipamento));
  const strict = eq.filter((e) => matchesGroup(e, o.grupo) && e.objetivo.includes(o.objetivo));
  if (strict.length >= minSize) return strict;
  const byGroup = eq.filter((e) => matchesGroup(e, o.grupo));
  const merged = [...strict, ...byGroup.filter((e) => !strict.includes(e))];
  if (merged.length >= minSize) return merged;
  const byGoal = eq.filter((e) => e.objetivo.includes(o.objetivo));
  const all = [...merged, ...byGoal.filter((e) => !merged.includes(e))];
  return all.length >= minSize ? all : [...all, ...eq.filter((e) => !all.includes(e))];
}

export function planShape(o: WorkoutOptions): { count: number; workS: number; restS: number } {
  const { workS, restS } = LEVEL_TIMING[o.nivel];
  const count = Math.max(3, Math.round((o.duracao * 60 + restS) / (workS + restS)));
  return { count, workS, restS };
}

/** "9 exercícios · 40s cada · 5s de descanso" */
export function describeOptions(o: WorkoutOptions): string {
  const { count, workS, restS } = planShape(o);
  return `${count} exercícios · ${workS}s cada · ${restS}s de descanso`;
}

export function workoutTitle(o: WorkoutOptions): string {
  return `${GROUP_LABEL[o.grupo]} · ${GOAL_LABEL[o.objetivo]}`;
}

export function workoutSubtitle(o: WorkoutOptions): string {
  return `${GROUP_LABEL[o.grupo]} · ${o.duracao} min · ${LEVEL_LABEL[o.nivel]}`;
}

/** Preenche n posições equilibrando o uso e nunca repetindo o anterior (se houver alternativa). */
function fill(list: Exercise[], n: number, rng: () => number): Exercise[] {
  const used = new Map<string, number>();
  const out: Exercise[] = [];
  for (let i = 0; i < n; i++) {
    const prev = out[out.length - 1];
    const cands = list.length > 1 ? list.filter((e) => e.id !== prev?.id) : list;
    const minUse = Math.min(...cands.map((e) => used.get(e.id) ?? 0));
    const least = cands.filter((e) => (used.get(e.id) ?? 0) === minUse);
    const pick = least[Math.floor(rng() * least.length)];
    used.set(pick.id, (used.get(pick.id) ?? 0) + 1);
    out.push(pick);
  }
  return out;
}

export function generateWorkout(options: WorkoutOptions, seed = Date.now()): Workout {
  const rng = mulberry32(seed);
  const pool = pickPool(options);
  const { count, workS, restS } = planShape(options);
  const repFactor = LEVEL_TIMING[options.nivel].repFactor;

  // Em pé primeiro, exercícios de chão no fim: a câmera só muda de posição uma vez.
  const front = shuffle(pool.filter((e) => e.camera === 'frente'), rng);
  const floor = shuffle(pool.filter((e) => e.camera === 'lateral'), rng);
  let nFloor = floor.length && front.length ? Math.round((count * floor.length) / pool.length) : floor.length ? count : 0;
  if (front.length && nFloor >= count) nFloor = count - 1;
  const ordered = [...fill(front, count - nFloor, rng), ...fill(floor, nFloor, rng)];

  const blocks: WorkoutBlock[] = ordered.map((ex) => ({
    exerciseId: ex.id,
    durationMs: workS * 1000,
    targetReps: ex.tipo === 'reps' ? Math.max(3, Math.round(((workS * 1000) / ex.ritmoMs) * repFactor)) : undefined,
  }));

  return {
    id: `w${seed.toString(36)}`,
    options,
    seed,
    blocks,
    restMs: restS * 1000,
    createdAt: Date.now(),
  };
}

export function totalWorkoutMs(w: Workout): number {
  return w.blocks.reduce((a, b) => a + b.durationMs, 0) + Math.max(0, w.blocks.length - 1) * w.restMs;
}
