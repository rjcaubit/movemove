import { GAME_CONFIG } from '../config.ts';

export class Scoring {
  private distance = 0;
  private coins = 0;

  addDistance(dtSec: number, speedMps: number): void { this.distance += dtSec * speedMps; }
  addCoin(): void { this.coins += 1; }

  getDistance(): number { return this.distance; }
  getCoins(): number { return this.coins; }

  getBest(): number {
    try { return Number(localStorage.getItem(GAME_CONFIG.storageKeys.bestDistance) ?? 0); } catch { return 0; }
  }
  setBest(distance: number): void {
    try { localStorage.setItem(GAME_CONFIG.storageKeys.bestDistance, String(Math.floor(distance))); } catch {/* ignore */}
  }

  reset(): void { this.distance = 0; this.coins = 0; }
}
