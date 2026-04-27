import { get, set } from 'idb-keyval';

export type AgeGroup = '5-7' | '8-10' | '11-12';

export type MissionProgressKey =
  | 'run.distance'
  | 'run.duration_s'
  | 'run.miniGameCompleted'
  | 'daily.jacks'
  | 'daily.coins'
  | 'daily.armsUp'
  | 'daily.bichosCaught'
  | 'daily.trunkRotations';

export interface MissionInstance {
  defId: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: number;
}

export interface Profile {
  version: 1;
  ageGroup: AgeGroup;
  totalRuns: number;
  totalDistance: number;
  totalCoins: number;
  totalJacks: number;
  totalArmsUp: number;
  missionState: { date: string; missions: MissionInstance[] };
}

const KEY = 'movemove.profile.v1';

const DEFAULT_PROFILE: Profile = {
  version: 1,
  ageGroup: '8-10',
  totalRuns: 0,
  totalDistance: 0,
  totalCoins: 0,
  totalJacks: 0,
  totalArmsUp: 0,
  missionState: { date: '', missions: [] },
};

export class ProfileStore {
  private cache: Profile | null = null;

  async load(): Promise<Profile> {
    if (this.cache) return this.cache;
    let p: Profile | undefined;
    try { p = await get<Profile>(KEY); } catch { p = undefined; }
    if (!p) {
      p = { ...DEFAULT_PROFILE };
      try {
        const dist = Number(localStorage.getItem('movemove.bestDistance') ?? 0);
        if (dist > 0) p.totalDistance = dist;
        const ageStored = localStorage.getItem('movemove.ageGroup');
        if (ageStored === '5-7' || ageStored === '8-10' || ageStored === '11-12') p.ageGroup = ageStored;
      } catch { /* ignore */ }
      await this.save(p);
    }
    this.cache = p;
    return p;
  }

  async save(p: Profile): Promise<void> {
    this.cache = p;
    try { await set(KEY, p); } catch { /* fallback memory-only */ }
  }

  async update(patch: Partial<Profile>): Promise<Profile> {
    const cur = await this.load();
    const next = { ...cur, ...patch };
    await this.save(next);
    return next;
  }
}
