import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Obstacle, type ObstacleKind } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { HeartPickup } from '../entities/HeartPickup.ts';
import { Puncher }   from '../entities/Puncher.ts';
import { Robot }     from '../entities/Robot.ts';
import { Animal }    from '../entities/Animal.ts';
import { Zombie }    from '../entities/Zombie.ts';
import { Ghost }     from '../entities/Ghost.ts';
import { Alien }     from '../entities/Alien.ts';
import { NpcRunner } from '../entities/NpcRunner.ts';
import { Boss }      from '../entities/Boss.ts';
import type { Lane } from '../../pose/types.ts';

export type Opponent = Robot | Animal | Zombie | Ghost | Alien | NpcRunner | Puncher;

const C = GAME_CONFIG;
const ALL_KINDS: ObstacleKind[] = [
  'barrier', 'low_barrier', 'wall_lane',
  'jump_brick', 'jump_column',
  'duck_log', 'duck_banner', 'laser_beam',
];
const ALL_LANES: Lane[] = [-1, 0, 1];
const HEART_EVERY_METERS = 600;

export class Spawner {
  private elapsedMs        = 0;
  private nextSpawnAtMs    = 0;
  private metersAccum      = 0;
  private nextCoinClusterAt = C.coinClusterEveryMeters;
  private nextHeartAt      = HEART_EVERY_METERS;
  private rng:             () => number;
  private opponents_:      Opponent[] = [];
  private boss_:           Boss | null = null;
  private bossNextAt       = 200;

  constructor(rng: () => number) { this.rng = rng; }

  update(
    scene: Phaser.Scene, dtSec: number, speedMps: number,
    obstacles: Obstacle[], coins: Coin[], hearts: HeartPickup[], lives: number,
  ): void {
    this.elapsedMs  += dtSec * 1000;
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

    if (lives < 3 && this.metersAccum >= this.nextHeartAt) {
      this.nextHeartAt += HEART_EVERY_METERS;
      const lane = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
      hearts.push(new HeartPickup(scene, lane, 0.95));
    }

    // Oponentes a partir de 5s
    if (this.elapsedMs >= 5_000 && Math.random() < 1.2 * dtSec) {
      const lane = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
      let opp: Opponent;
      const idx2 = Math.floor(this.rng() * 7);
      if      (idx2 === 0) opp = new Robot(scene, lane);
      else if (idx2 === 1) opp = new Animal(scene, lane);
      else if (idx2 === 2) opp = new Zombie(scene, lane);
      else if (idx2 === 3) opp = new Ghost(scene, lane);
      else if (idx2 === 4) opp = new Alien(scene, lane);
      else if (idx2 === 5) opp = new Puncher(scene, lane);
      else                 opp = new NpcRunner(scene, lane);
      this.opponents_.push(opp);
    }

    // Boss a cada 1000m
    if (this.metersAccum >= this.bossNextAt && !this.boss_) {
      this.boss_      = new Boss(scene);
      this.bossNextAt += 1000;
    }

    this.opponents_ = this.opponents_.filter(o => { o.update(speedMps, dtSec); return o.alive; });
    if (this.boss_) { this.boss_.update(speedMps, dtSec); if (!this.boss_.alive) this.boss_ = null; }
  }

  getOpponents(): Opponent[] { return this.opponents_; }
  getBoss(): Boss | null     { return this.boss_; }

  reset(): void {
    this.elapsedMs         = 0;
    this.nextSpawnAtMs     = 0;
    this.metersAccum       = 0;
    this.nextCoinClusterAt = C.coinClusterEveryMeters;
    this.nextHeartAt       = HEART_EVERY_METERS;
    this.opponents_.forEach(o => o.destroy());
    this.opponents_        = [];
    this.boss_?.destroy();
    this.boss_             = null;
    this.bossNextAt        = 1000;
  }
}
