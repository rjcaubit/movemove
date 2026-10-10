import { get, set } from 'idb-keyval';

export interface RunEntry {
  id: string;
  startedAt: number;
  durationS: number;
  distance: number;
  coins: number;
  jacks: number;
  armsUp: number;
  jumps: number;
  ducks: number;
  bpmAvg: number;
  bpmTrack: number[];
}

const KEY = 'movemove.runHistory.v1';
const MAX_ENTRIES = 30;

export class RunHistoryStore {
  async list(): Promise<RunEntry[]> {
    try { return (await get<RunEntry[]>(KEY)) ?? []; } catch { return []; }
  }

  async push(entry: RunEntry): Promise<void> {
    const cur = await this.list();
    cur.unshift(entry);
    while (cur.length > MAX_ENTRIES) cur.pop();
    try { await set(KEY, cur); } catch { /* memory-only */ }
  }
}
