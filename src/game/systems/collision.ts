import { GAME_CONFIG } from '../config.ts';
import type { Player } from '../entities/Player.ts';
import type { Obstacle } from '../entities/Obstacle.ts';
import type { Coin } from '../entities/Coin.ts';
import type { HeartPickup } from '../entities/HeartPickup.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;

export interface OpponentLike {
  lane: Lane;
  y: number;
  alive: boolean;
  kind: string;
}

// Comportamento padrão: acerta se inimigo está na mesma lane na zona de colisão.
// Comportamentos especiais (preservados nas classes mas desligados aqui — ver
// docs/sdd/ISSUE_14/visual-assets.md): ghost ignora estado, alien evita por
// pular OU agachar, barrel evita só pulando, puncher cai com jumping jack.
export function checkOpponentCollisions(
  player: Player,
  opponents: OpponentLike[],
): { hitOpponent: boolean } {
  const result     = { hitOpponent: false };
  const playerLane = player.getLane();

  for (const opp of opponents) {
    if (!opp.alive) continue;
    if (opp.y < F.collisionTop) continue;
    if (opp.lane !== playerLane) continue;
    result.hitOpponent = true;
    break;
  }

  return result;
}

export interface CollisionResult {
  collidedObstacle?: Obstacle;
  collectedCoins: Coin[];
  collectedHeart?: HeartPickup;
}

export function checkCollisions(
  player: Player,
  obstacles: Obstacle[],
  coins: Coin[],
  hearts: HeartPickup[] = [],
): CollisionResult {
  const result: CollisionResult = { collectedCoins: [] };

  for (const obs of obstacles) {
    if (!obs.alive) continue;
    if (obs.y < F.collisionTop) continue;
    if (obs.lane !== player.getLane()) continue;
    const playerState = player.getState();
    let evading = false;
    if (obs.kind === 'barrier'     && playerState === 'jumping') evading = true;
    if (obs.kind === 'low_barrier' && playerState === 'ducking') evading = true;
    if (obs.kind === 'jump_brick'  && playerState === 'jumping') evading = true;
    if (obs.kind === 'jump_column' && playerState === 'jumping') evading = true;
    if (obs.kind === 'duck_log'    && playerState === 'ducking') evading = true;
    if (obs.kind === 'duck_banner' && playerState === 'ducking') evading = true;
    if (obs.kind === 'laser_beam'  && playerState === 'ducking') evading = true;
    if (!evading) {
      result.collidedObstacle = obs;
      return result;
    }
  }

  for (const coin of coins) {
    if (!coin.alive) continue;
    if (coin.y < F.collisionTop) continue;
    if (coin.lane !== player.getLane()) continue;
    result.collectedCoins.push(coin);
  }

  for (const heart of hearts) {
    if (!heart.alive) continue;
    if (heart.y < F.collisionTop) continue;
    if (heart.lane !== player.getLane()) continue;
    result.collectedHeart = heart;
    break;
  }

  return result;
}
