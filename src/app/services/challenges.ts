import { KEYS, readJSON, writeJSON } from './storage.ts';
import { getExercise } from './catalog.ts';
import { fmtClock } from './format.ts';
import { generateWorkout, workoutTitle, type DurationMin, type Level, type WorkoutOptions } from './generateWorkout.ts';
import type { Equipment, Goal, MuscleGroup } from './catalog.ts';
import { CHALLENGE_MIN_AMPLITUDE, type SessionConfig, type SessionRunner } from './sessionRunner.ts';

/**
 * Desafios sem backend: o link carrega tudo (`/#/desafio/<payload>`), onde
 * payload = base64url(JSON { v, nome, exercicio, modo, alvo, marca, data }).
 */
export type ChallengeMode = 'reps_tempo' | 'max_reps' | 'segurar' | 'treino_total';

/** Alvo do modo treino inteiro: opções compactas + seed (os dois fazem o mesmo treino). */
export interface WorkoutTarget { g: MuscleGroup; o: Goal; d: DurationMin; n: Level; e: Equipment; s: number }

export interface ChallengePayload {
  v: 1;
  nome: string;
  /** id do catálogo, ou 'treino'. */
  exercicio: string;
  modo: ChallengeMode;
  /** reps_tempo: nº de reps · max_reps: segundos · segurar: 0 · treino_total: WorkoutTarget */
  alvo: number | WorkoutTarget;
  /** reps_tempo: ms (menor vence) · max_reps/treino_total: reps · segurar: ms (maior vence). */
  marca: number;
  /** Data (epoch ms) em que a marca foi feita. */
  data: number;
}

export interface ChallengeRecord {
  id: string;
  dir: 'enviado' | 'recebido';
  at: number;
  payload: ChallengePayload;
  /** Minha marca (recebido: depois de aceitar). */
  minhaMarca?: number;
}

interface Store { items: ChallengeRecord[]; bests: Record<string, { marca: number; at: number }> }

const V = 1;

export const MODE_OPTIONS: Array<{ modo: ChallengeMode; titulo: (alvo: number) => string; sub: string }> = [
  { modo: 'reps_tempo', titulo: (a) => `${a} repetições no menor tempo`, sub: 'Só conta rep com boa amplitude' },
  { modo: 'max_reps', titulo: (a) => `Máximo em ${a} segundos`, sub: 'Quem faz mais, ganha' },
  { modo: 'segurar', titulo: () => 'Segurar por mais tempo', sub: 'Para prancha e isometria' },
];

export const DEFAULT_TARGET: Record<Exclude<ChallengeMode, 'treino_total'>, number> = {
  reps_tempo: 20, max_reps: 60, segurar: 0,
};

// ---------------------------------------------------------------------------
// Codificação
// ---------------------------------------------------------------------------

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeChallenge(p: ChallengePayload): string {
  return toBase64Url(JSON.stringify(p));
}

const MODES: ChallengeMode[] = ['reps_tempo', 'max_reps', 'segurar', 'treino_total'];

export function decodeChallenge(raw: string): ChallengePayload | null {
  try {
    const p = JSON.parse(fromBase64Url(decodeURIComponent(raw))) as ChallengePayload;
    if (!p || p.v !== 1 || !MODES.includes(p.modo)) return null;
    if (typeof p.marca !== 'number' || !isFinite(p.marca) || p.marca < 0) return null;
    const nome = typeof p.nome === 'string' ? p.nome.slice(0, 40).trim() : '';
    if (p.modo === 'treino_total') {
      const a = p.alvo as WorkoutTarget;
      if (!a || typeof a !== 'object' || typeof a.s !== 'number') return null;
    } else {
      if (!getExercise(p.exercicio)) return null;
      if (typeof p.alvo !== 'number' || p.alvo < 0 || p.alvo > 1000) return null;
    }
    return { ...p, nome: nome || 'Alguém' };
  } catch {
    return null;
  }
}

export function challengeUrl(p: ChallengePayload, base = defaultBase()): string {
  return `${base}#/desafio/${encodeChallenge(p)}`;
}

function defaultBase(): string {
  if (typeof location === 'undefined') return '';
  return `${location.origin}${location.pathname}`;
}

export function whatsappUrl(p: ChallengePayload, base?: string): string {
  const text = `${p.nome} te desafiou no MoveMove: ${challengeTitle(p)} — ${challengeModeLabel(p)}. Marca a bater: ${formatMark(p.modo, p.marca)}.\n${challengeUrl(p, base)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Semântica dos modos
// ---------------------------------------------------------------------------

export function targetToOptions(t: WorkoutTarget): WorkoutOptions {
  return { grupo: t.g, objetivo: t.o, duracao: t.d, nivel: t.n, equipamento: t.e };
}

export function optionsToTarget(o: WorkoutOptions, seed: number): WorkoutTarget {
  return { g: o.grupo, o: o.objetivo, d: o.duracao, n: o.nivel, e: o.equipamento, s: seed };
}

export function challengeTitle(p: Pick<ChallengePayload, 'exercicio' | 'modo' | 'alvo'>): string {
  if (p.modo === 'treino_total') return `Treino ${workoutTitle(targetToOptions(p.alvo as WorkoutTarget))}`;
  return getExercise(p.exercicio)?.nome ?? 'Exercício';
}

export function challengeModeLabel(p: Pick<ChallengePayload, 'modo' | 'alvo'>): string {
  switch (p.modo) {
    case 'reps_tempo': return `${p.alvo} repetições no menor tempo`;
    case 'max_reps': return `Máximo em ${p.alvo} segundos`;
    case 'segurar': return 'Segurar por mais tempo';
    case 'treino_total': return `Treino inteiro · ${(p.alvo as WorkoutTarget).d} min · total de reps`;
  }
}

/** Rótulo curto (cards/histórico): "Agachamento 20×", "Prancha", "Polichinelo 60s". */
export function challengeShortLabel(p: Pick<ChallengePayload, 'exercicio' | 'modo' | 'alvo'>): string {
  const t = challengeTitle(p);
  if (p.modo === 'reps_tempo') return `${t} ${p.alvo}×`;
  if (p.modo === 'max_reps') return `${t} ${p.alvo}s`;
  return t;
}

export function formatMark(modo: ChallengeMode, marca: number): string {
  if (modo === 'reps_tempo' || modo === 'segurar') return fmtClock(marca);
  return `${marca} reps`;
}

export function lowerIsBetter(modo: ChallengeMode): boolean { return modo === 'reps_tempo'; }

/** >0 se `a` for melhor que `b`. */
export function compareMarks(modo: ChallengeMode, a: number, b: number): number {
  return lowerIsBetter(modo) ? b - a : a - b;
}

export function sessionForChallenge(p: Pick<ChallengePayload, 'exercicio' | 'modo' | 'alvo'>): SessionConfig {
  switch (p.modo) {
    case 'reps_tempo':
      return {
        blocks: [{ exerciseId: p.exercicio, durationMs: 5 * 60_000, targetReps: p.alvo as number }],
        restMs: 0, minAmplitude: CHALLENGE_MIN_AMPLITUDE, endOnTarget: true,
      };
    case 'max_reps':
      return {
        blocks: [{ exerciseId: p.exercicio, durationMs: (p.alvo as number) * 1000 }],
        restMs: 0, minAmplitude: CHALLENGE_MIN_AMPLITUDE,
      };
    case 'segurar':
      return {
        blocks: [{ exerciseId: p.exercicio, durationMs: 10 * 60_000 }],
        restMs: 0, endOnHoldBreakMs: 1500,
      };
    case 'treino_total': {
      const t = p.alvo as WorkoutTarget;
      const w = generateWorkout(targetToOptions(t), t.s);
      return { blocks: w.blocks, restMs: w.restMs, minAmplitude: CHALLENGE_MIN_AMPLITUDE };
    }
  }
}

/** Marca da sessão encerrada, ou null se não completou (ex: não chegou às N reps). */
export function markFromRunner(modo: ChallengeMode, runner: SessionRunner): number | null {
  const r = runner.results;
  switch (modo) {
    case 'reps_tempo': return r[0]?.targetReachedMs ?? null;
    case 'max_reps': return r[0]?.reps ?? 0;
    case 'segurar': return r[0] && r[0].holdMs > 0 ? Math.round(r[0].holdMs) : null;
    case 'treino_total': return r.reduce((a, b) => a + b.reps, 0);
  }
}

// ---------------------------------------------------------------------------
// Persistência (mm2.challenges)
// ---------------------------------------------------------------------------

function load(): Store {
  const s = readJSON<Store>(KEYS.challenges, V, { items: [], bests: {} });
  return { items: Array.isArray(s.items) ? s.items : [], bests: s.bests ?? {} };
}

function save(s: Store): void { writeJSON(KEYS.challenges, V, s); }

export function markKey(p: Pick<ChallengePayload, 'exercicio' | 'modo' | 'alvo'>): string {
  const alvo = typeof p.alvo === 'number' ? p.alvo : `${p.alvo.g}.${p.alvo.o}.${p.alvo.d}.${p.alvo.n}.${p.alvo.e}.${p.alvo.s}`;
  return `${p.exercicio}|${p.modo}|${alvo}`;
}

export function listChallenges(): ChallengeRecord[] { return load().items; }

export function getBest(key: string): { marca: number; at: number } | undefined { return load().bests[key]; }

/** Registra minha marca; devolve true se for recorde pessoal. */
export function recordMark(p: Pick<ChallengePayload, 'exercicio' | 'modo' | 'alvo'>, marca: number): boolean {
  const s = load();
  const key = markKey(p);
  const prev = s.bests[key];
  const isRecord = !prev || compareMarks(p.modo, marca, prev.marca) > 0;
  if (isRecord) s.bests[key] = { marca, at: Date.now() };
  save(s);
  return isRecord;
}

export function upsertChallenge(rec: ChallengeRecord): void {
  const s = load();
  const i = s.items.findIndex((x) => x.id === rec.id);
  if (i >= 0) s.items[i] = rec; else s.items.unshift(rec);
  s.items = s.items.slice(0, 100);
  save(s);
}

export function challengeId(p: ChallengePayload, dir: ChallengeRecord['dir']): string {
  return `${dir}:${encodeChallenge(p).slice(-24)}:${p.data}`;
}

/** Melhor marca pessoal mais recente (mini-card "Desafio" da home). */
export function latestBest(): { key: string; marca: number; at: number } | null {
  const bests = load().bests;
  let out: { key: string; marca: number; at: number } | null = null;
  for (const [key, v] of Object.entries(bests)) if (!out || v.at > out.at) out = { key, ...v };
  return out;
}

export function parseMarkKey(key: string): { exercicio: string; modo: ChallengeMode; alvo: number } | null {
  const [exercicio, modo, alvo] = key.split('|');
  if (!MODES.includes(modo as ChallengeMode) || modo === 'treino_total') return null;
  return { exercicio, modo: modo as ChallengeMode, alvo: Number(alvo) };
}
