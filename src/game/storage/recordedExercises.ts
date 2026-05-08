import { get, set } from 'idb-keyval';

const KEY = 'movemove.recordedExercises.v1';

/** Subconjunto de keypoints capturados (ordem fixa, ver KP_ORDER em rec.ts). */
export interface RecPoint { x: number; y: number; v?: number }
export interface RecFrame { t: number; pts: RecPoint[] }

export interface RecordedExercise {
  id: string;
  name: string;
  desc: string;
  /** Keypoints amostrados ao longo do movimento médio (frames já resampleados/medianizados). */
  frames: RecFrame[];
  /** Duração total da animação em ms (= último t). */
  durationMs: number;
  createdAt: number;
}

export async function loadRecordedExercises(): Promise<RecordedExercise[]> {
  try {
    const v = await get<RecordedExercise[]>(KEY);
    return v ?? [];
  } catch { return []; }
}

export async function saveRecordedExercises(items: RecordedExercise[]): Promise<void> {
  try { await set(KEY, items); } catch { /* ignore */ }
}

export async function addRecordedExercise(ex: RecordedExercise): Promise<RecordedExercise[]> {
  const list = await loadRecordedExercises();
  list.push(ex);
  await saveRecordedExercises(list);
  return list;
}

export async function deleteRecordedExercise(id: string): Promise<RecordedExercise[]> {
  const list = (await loadRecordedExercises()).filter((x) => x.id !== id);
  await saveRecordedExercises(list);
  return list;
}

export async function updateRecordedExercise(id: string, patch: Partial<Pick<RecordedExercise, 'name' | 'desc'>>): Promise<RecordedExercise[]> {
  const list = await loadRecordedExercises();
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    await saveRecordedExercises(list);
  }
  return list;
}

export function exportToJson(items: RecordedExercise[]): string {
  return JSON.stringify(items, null, 2);
}
