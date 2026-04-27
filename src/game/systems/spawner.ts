import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Obstacle, type ObstacleKind } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import type { Lane } from '../../pose/types.ts';

const C = GAME_CONFIG;
const ALL_KINDS: ObstacleKind[] = ['barrier', 'low_barrier', 'wall_lane'];
const ALL_LANES: Lane[] = [-1, 0, 1];

export class Spawner {
  private elapsedMs = 0;
  private nextSpawnAtMs = 0;
  private metersAccum = 0;
  private nextCoinClusterAt = C.coinClusterEveryMeters;
  private rng: () => number;

  constructor(rng: () => number) {
    this.rng = rng;
  }

  update(scene: Phaser.Scene, dtSec: number, speedMps: number, obstacles: Obstacle[], coins: Coin[]): void {
    this.elapsedMs += dtSec * 1000;
    this.metersAccum += speedMps * dtSec;

    if (this.elapsedMs >= this.nextSpawnAtMs) {
      const interval = this.elapsedMs < 20000
        ? C.spawnIntervalMsInitial
        : this.elapsedMs < 60000
          ? C.spawnIntervalMsAfter20s
          : C.spawnIntervalMsAfter60s;
      this.nextSpawnAtMs = this.elapsedMs + interval;

      const kind = this.elapsedMs < 20000
        ? 'barrier'
        : ALL_KINDS[Math.floor(this.rng() * ALL_KINDS.length)];
      const lane = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
      obstacles.push(new Obstacle(scene, kind, lane));
    }

    if (this.metersAccum >= this.nextCoinClusterAt) {
      this.nextCoinClusterAt += C.coinClusterEveryMeters;
      const lane = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
      for (let i = 0; i < C.coinClusterSize; i++) {
        coins.push(new Coin(scene, lane, 0.95 - i * 0.03));
      }
    }
  }

  reset(): void {
    this.elapsedMs = 0;
    this.nextSpawnAtMs = 0;
    this.metersAccum = 0;
    this.nextCoinClusterAt = C.coinClusterEveryMeters;
  }
}
