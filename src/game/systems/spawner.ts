import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Obstacle, type ObstacleKind } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { HeartPickup } from '../entities/HeartPickup.ts';
import { Robot }  from '../entities/Robot.ts';
import { Animal } from '../entities/Animal.ts';
import { Zombie } from '../entities/Zombie.ts';
import { Ghost }  from '../entities/Ghost.ts';
// Desligados (classes preservadas pra reativar):
// Puncher, Alien, Barrel, NpcRunner — ver docs/sdd/ISSUE_14/visual-assets.md
import type { Puncher }   from '../entities/Puncher.ts';
import type { Alien }     from '../entities/Alien.ts';
import type { Barrel }    from '../entities/Barrel.ts';
import type { NpcRunner } from '../entities/NpcRunner.ts';
import type { Lane } from '../../pose/types.ts';

export type Opponent = Robot | Animal | Zombie | Ghost | Alien | NpcRunner | Puncher | Barrel;

const C = GAME_CONFIG;
const F = C.falling;
// Apenas kinds com PNG atribuído. Demais (low_barrier, duck_log, duck_banner,
// laser_beam) ficaram desligados conforme docs/sdd/ISSUE_14/visual-assets.md.
const ALL_KINDS: ObstacleKind[] = [
  'barrier', 'wall_lane', 'jump_brick', 'jump_column',
];
const ALL_LANES: Lane[] = [-1, 0, 1];
const HEART_EVERY_METERS = 600;

export class Spawner {
  private elapsedMs         = 0;
  private nextSpawnAtMs     = 0;
  private metersAccum       = 0;
  private nextCoinClusterAt = C.coinClusterEveryMeters;
  private nextHeartAt       = HEART_EVERY_METERS;
  private rng:              () => number;
  private opponents_:       Opponent[] = [];

  constructor(rng: () => number) { this.rng = rng; }

  update(
    scene: Phaser.Scene, dtSec: number, speedMps: number,
    obstacles: Obstacle[], coins: Coin[], hearts: HeartPickup[], lives: number,
  ): void {
    this.elapsedMs   += dtSec * 1000;
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
        coins.push(new Coin(scene, lane, F.spawnY - i * 50));
      }
    }

    if (lives < 3 && this.metersAccum >= this.nextHeartAt) {
      this.nextHeartAt += HEART_EVERY_METERS;
      const lane = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
      hearts.push(new HeartPickup(scene, lane));
    }

    // Pool ativo: Robot, Animal, Zombie, Ghost — todos com colisão padrão.
    // Alien/Puncher/Barrel/NpcRunner ficam desligados (classes preservadas
    // pra reativar depois). Ver docs/sdd/ISSUE_14/visual-assets.md.
    if (this.elapsedMs >= 10_000 && Math.random() < 0.35 * dtSec) {
      const lane = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
      const idx2 = Math.floor(this.rng() * 4);
      let opp: Opponent;
      if      (idx2 === 0) opp = new Robot(scene, lane);
      else if (idx2 === 1) opp = new Animal(scene, lane);
      else if (idx2 === 2) opp = new Zombie(scene, lane);
      else                 opp = new Ghost(scene, lane);
      this.opponents_.push(opp);
    }

    this.opponents_ = this.opponents_.filter(o => { o.update(speedMps, dtSec); return o.alive; });
  }

  getOpponents(): Opponent[] { return this.opponents_; }

  reset(): void {
    this.elapsedMs         = 0;
    this.nextSpawnAtMs     = 0;
    this.metersAccum       = 0;
    this.nextCoinClusterAt = C.coinClusterEveryMeters;
    this.nextHeartAt       = HEART_EVERY_METERS;
    this.opponents_.forEach(o => o.destroy());
    this.opponents_        = [];
  }
}
