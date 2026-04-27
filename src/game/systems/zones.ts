import * as Phaser from 'phaser';
import { JackZone } from '../entities/JackZone.ts';
import { ArmsZone } from '../entities/ArmsZone.ts';

export class ZoneManager {
  jacks: JackZone[] = [];
  arms: ArmsZone[] = [];
  private metersAccum = 0;
  private nextZoneAt: number;
  private scene: Phaser.Scene;
  private rng: () => number;
  private spacing: number;

  constructor(scene: Phaser.Scene, rng: () => number, spacingMeters = 80) {
    this.scene = scene;
    this.rng = rng;
    this.spacing = spacingMeters;
    this.nextZoneAt = spacingMeters;
  }

  tickDistance(deltaM: number): void {
    this.metersAccum += deltaM;
    if (this.metersAccum >= this.nextZoneAt) {
      this.nextZoneAt += this.spacing;
      if (this.rng() < 0.5) this.jacks.push(new JackZone(this.scene));
      else this.arms.push(new ArmsZone(this.scene));
    }
  }

  update(speedMps: number, dtSec: number): void {
    for (const j of this.jacks) j.update(speedMps, dtSec);
    for (const a of this.arms) a.update(speedMps, dtSec);
    this.jacks = this.jacks.filter((j) => j.alive);
    this.arms = this.arms.filter((a) => a.alive);
  }

  activeJackZone(): JackZone | null {
    return this.jacks.find((j) => j.isInPlayerZone()) ?? null;
  }

  activeArmsZone(): ArmsZone | null {
    return this.arms.find((a) => a.isInPlayerZone()) ?? null;
  }

  destroy(): void {
    for (const j of this.jacks) j.destroy();
    for (const a of this.arms) a.destroy();
    this.jacks = [];
    this.arms = [];
  }
}
