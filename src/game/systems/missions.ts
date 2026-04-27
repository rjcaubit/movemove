import { mulberry32 } from './rng.ts';
import type { ProfileStore, MissionInstance, MissionProgressKey } from '../storage/profile.ts';

interface MissionDef {
  id: string;
  title: string;
  desc: string;
  progressKey: MissionProgressKey;
  targetMin: number;
  targetMax: number;
}

interface MissionsCatalog { version: number; defs: MissionDef[] }

export interface MissionDeltas {
  distance?: number;
  jacks?: number;
  coins?: number;
  armsUp?: number;
  durationS?: number;
  bichosCaught?: number;
  trunkRotations?: number;
  miniGameCompleted?: number;
}

export class MissionSystem {
  private catalog: MissionsCatalog | null = null;
  private profileStore: ProfileStore;

  constructor(profileStore: ProfileStore) {
    this.profileStore = profileStore;
  }

  async load(): Promise<void> {
    if (this.catalog) return;
    try {
      const res = await fetch('/data/missions.json');
      this.catalog = await res.json() as MissionsCatalog;
    } catch {
      this.catalog = { version: 0, defs: [] };
    }
    await this.ensureToday();
  }

  private async ensureToday(): Promise<void> {
    if (!this.catalog) return;
    const today = this.todayKey();
    const profile = await this.profileStore.load();
    if (profile.missionState.date === today && profile.missionState.missions.length > 0) return;

    const seed = this.hash(`${this.catalog.version}-${today}`);
    const rng = mulberry32(seed);
    const pool = [...this.catalog.defs];
    const chosen: MissionInstance[] = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      const def = pool.splice(idx, 1)[0];
      const target = Math.round(def.targetMin + rng() * (def.targetMax - def.targetMin));
      chosen.push({ defId: def.id, target, progress: 0, completed: false });
    }
    await this.profileStore.update({ missionState: { date: today, missions: chosen } });
  }

  async getActive(): Promise<{ inst: MissionInstance; def: MissionDef }[]> {
    if (!this.catalog) return [];
    const profile = await this.profileStore.load();
    return profile.missionState.missions.map((inst) => {
      const def = this.catalog!.defs.find((d) => d.id === inst.defId);
      return def ? { inst, def } : null;
    }).filter((x): x is { inst: MissionInstance; def: MissionDef } => x !== null);
  }

  async tick(deltas: MissionDeltas): Promise<MissionInstance[]> {
    if (!this.catalog) return [];
    const profile = await this.profileStore.load();
    const justCompleted: MissionInstance[] = [];
    let dirty = false;
    for (const m of profile.missionState.missions) {
      if (m.completed) continue;
      const def = this.catalog.defs.find((d) => d.id === m.defId);
      if (!def) continue;
      let delta = 0;
      switch (def.progressKey) {
        case 'run.distance': delta = deltas.distance ?? 0; break;
        case 'run.duration_s': delta = deltas.durationS ?? 0; break;
        case 'run.miniGameCompleted': delta = deltas.miniGameCompleted ?? 0; break;
        case 'daily.jacks': delta = deltas.jacks ?? 0; break;
        case 'daily.coins': delta = deltas.coins ?? 0; break;
        case 'daily.armsUp': delta = deltas.armsUp ?? 0; break;
        case 'daily.bichosCaught': delta = deltas.bichosCaught ?? 0; break;
        case 'daily.trunkRotations': delta = deltas.trunkRotations ?? 0; break;
      }
      if (delta > 0) {
        m.progress += delta;
        dirty = true;
        if (m.progress >= m.target) {
          m.completed = true;
          m.completedAt = Date.now();
          justCompleted.push(m);
        }
      }
    }
    if (dirty) await this.profileStore.save(profile);
    return justCompleted;
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h >>> 0;
  }
}
