import { KEYS, readJSON, writeJSON } from './storage.ts';
import { dayKey } from './format.ts';
import type { WorkoutOptions } from './generateWorkout.ts';

/** Histórico local (mm2.history). O RunHistoryStore dos jogos continua separado. */
export interface HistoryBlock { exerciseId: string; reps: number; holdMs: number; amplitude: number; skipped: boolean }

export interface HistoryEntry {
  id: string;
  kind: 'treino' | 'desafio';
  at: number;
  title: string;
  durationMs: number;
  reps: number;
  amplitude: number;
  options?: WorkoutOptions;
  blocks?: HistoryBlock[];
  /** Desafio: texto curto do resultado ("venceu Rafael", "sua marca"). */
  resultLabel?: string;
  /** Desafio: marca formatada ("0:48", "32 reps"). */
  markLabel?: string;
  record?: boolean;
}

const V = 1;
const MAX = 200;

export function listHistory(): HistoryEntry[] {
  const items = readJSON<HistoryEntry[]>(KEYS.history, V, []);
  return Array.isArray(items) ? items.filter((e) => e && typeof e.at === 'number') : [];
}

export function addHistory(entry: HistoryEntry): void {
  const items = listHistory();
  items.unshift(entry);
  writeJSON(KEYS.history, V, items.slice(0, MAX));
}

export interface WeekDay { label: string; key: string; minutes: number; count: number; isToday: boolean }

export interface WeekStats {
  days: WeekDay[];
  workouts: number;
  minutes: number;
  reps: number;
  streak: number;
}

const DAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Semana de segunda a domingo contendo `now`. */
export function weekStats(items: HistoryEntry[], now = Date.now()): WeekStats {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days: WeekDay[] = DAY_LETTERS.map((label, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const key = dayKey(d.getTime());
    return { label, key, minutes: 0, count: 0, isToday: key === dayKey(today.getTime()) };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  let workouts = 0; let minutes = 0; let reps = 0;
  for (const e of items) {
    const d = byKey.get(dayKey(e.at));
    if (!d) continue;
    d.minutes += e.durationMs / 60000;
    d.count += 1;
    if (e.kind === 'treino') workouts += 1;
    minutes += e.durationMs / 60000;
    reps += e.reps;
  }
  return { days, workouts, minutes, reps, streak: streakDays(items, now) };
}

/** Dias seguidos com atividade, terminando hoje (ou ontem, se hoje ainda não treinou). */
export function streakDays(items: HistoryEntry[], now = Date.now()): number {
  const set = new Set(items.map((e) => dayKey(e.at)));
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  if (!set.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d.getTime()))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}
