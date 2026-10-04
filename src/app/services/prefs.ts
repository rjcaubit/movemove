import { KEYS, readJSON, writeJSON } from './storage.ts';
import { DEFAULT_OPTIONS, type Workout, type WorkoutOptions } from './generateWorkout.ts';

export interface Prefs {
  nome: string;
  lastOptions: WorkoutOptions;
  voz: boolean;
  /** deviceId da câmera escolhida (vazio = frontal padrão). */
  cameraId: string;
}

const V = 1;
const DEFAULT_PREFS: Prefs = { nome: '', lastOptions: DEFAULT_OPTIONS, voz: true, cameraId: '' };

export function loadPrefs(): Prefs {
  const p = readJSON<Partial<Prefs>>(KEYS.prefs, V, {});
  return { ...DEFAULT_PREFS, ...p, lastOptions: { ...DEFAULT_OPTIONS, ...(p.lastOptions ?? {}) } };
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...loadPrefs(), ...patch };
  writeJSON(KEYS.prefs, V, next);
  return next;
}

export function loadLastWorkout(): Workout | null {
  return readJSON<Workout | null>(KEYS.lastWorkout, V, null);
}

export function saveLastWorkout(w: Workout): void {
  writeJSON(KEYS.lastWorkout, V, w);
}
