/**
 * Armazenamento chave-valor abstrato. Web usa localStorage; no React Native
 * basta trocar o adapter (AsyncStorage/MMKV) via `setStorageAdapter`.
 */
export interface KVAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const memory = new Map<string, string>();

const memoryAdapter: KVAdapter = {
  get: (k) => memory.get(k) ?? null,
  set: (k, v) => { memory.set(k, v); },
  remove: (k) => { memory.delete(k); },
};

function detectAdapter(): KVAdapter {
  try {
    if (typeof localStorage === 'undefined') return memoryAdapter;
    const probe = '__mm2_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return {
      get: (k) => { try { return localStorage.getItem(k); } catch { return memory.get(k) ?? null; } },
      set: (k, v) => { try { localStorage.setItem(k, v); } catch { memory.set(k, v); } },
      remove: (k) => { try { localStorage.removeItem(k); } catch { memory.delete(k); } },
    };
  } catch {
    return memoryAdapter;
  }
}

let adapter: KVAdapter = detectAdapter();

export function setStorageAdapter(a: KVAdapter): void { adapter = a; }

/** Chaves versionadas do MoveMove 2.0. Dados do app antigo (`movemove.*`) ficam intactos e ignorados. */
export const KEYS = {
  history: 'mm2.history',
  challenges: 'mm2.challenges',
  prefs: 'mm2.prefs',
  lastWorkout: 'mm2.lastWorkout',
} as const;

interface Envelope<T> { v: number; data: T }

export function readJSON<T>(key: string, version: number, fallback: T): T {
  const raw = adapter.get(key);
  if (!raw) return fallback;
  try {
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || typeof env !== 'object' || env.v !== version) return fallback;
    return env.data;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, version: number, data: T): void {
  adapter.set(key, JSON.stringify({ v: version, data } satisfies Envelope<T>));
}
