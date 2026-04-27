import { GAME_CONFIG } from '../config.ts';
import type { Player } from '../entities/Player.ts';
import type { Obstacle } from '../entities/Obstacle.ts';
import type { Coin } from '../entities/Coin.ts';
import type { HeartPickup } from '../entities/HeartPickup.ts';
import type { Lane } from '../../pose/types.ts';

export interface OpponentLike {
  lane: Lane;
  z: number;
  alive: boolean;
  kind: string;
}

export interface BossLike {
  lane: Lane;
  z: number;
  alive: boolean;
  hit(): boolean;
}

export function checkOpponentCollisions(
  player: Player,
  opponents: OpponentLike[],
  boss: BossLike | null,
  armsUpActive: boolean,
): { hitOpponent: boolean; bossDead: boolean } {
  const result      = { hitOpponent: false, bossDead: false };
  const playerState = player.getState();
  const playerLane  = player.getLane();

  for (const opp of opponents) {
    if (!opp.alive) continue;
    if (opp.z > GAME_CONFIG.collisionZThreshold) continue;
    if (opp.lane !== playerLane) continue;
    // Ghost: só lane diferente evita — jump/duck não ajudam
    if (opp.kind === 'ghost') { result.hitOpponent = true; break; }
    // Alien: jump ou duck evitam
    if (opp.kind === 'alien' && (playerState === 'jumping' || playerState === 'ducking')) continue;
    result.hitOpponent = true;
    break;
  }

  if (boss?.alive && boss.z <= GAME_CONFIG.collisionZThreshold) {
    if (armsUpActive) {
      result.bossDead = boss.hit();
    } else if (boss.lane === playerLane) {
      result.hitOpponent = true;
    }
  }

  return result;
}

export interface CollisionResult {
  collidedObstacle?: Obstacle;
  collectedCoins: Coin[];
  collectedHeart?: HeartPickup;
}

/**
 * Player evita:
 *  - barrier → pulando
 *  - low_barrier → agachando
 *  - wall_lane → estando em lane diferente (única evasão; pular/agachar NÃO evade — parede ocupa toda a altura).
 * O filtro `obs.lane !== player.getLane()` exclui obstáculos que não estão na lane do player ANTES
 * da checagem de evasão. Para `wall_lane` isso é justamente o comportamento desejado: se está na
 * mesma lane → colide; se está em lane diferente → nem entra no loop.
 */
export function checkCollisions(
  player: Player,
  obstacles: Obstacle[],
  coins: Coin[],
  hearts: HeartPickup[] = [],
): CollisionResult {
  const result: CollisionResult = { collectedCoins: [] };

  for (const obs of obstacles) {
    if (!obs.alive) continue;
    if (obs.z > GAME_CONFIG.collisionZThreshold) continue;
    if (obs.lane !== player.getLane()) continue;
    const playerState = player.getState();
    let evading = false;
    if (obs.kind === 'barrier'     && playerState === 'jumping') evading = true;
    if (obs.kind === 'low_barrier' && playerState === 'ducking') evading = true;
    if (obs.kind === 'jump_brick'  && playerState === 'jumping') evading = true;
    if (obs.kind === 'jump_column' && playerState === 'jumping') evading = true;
    if (obs.kind === 'duck_log'    && playerState === 'ducking') evading = true;
    if (obs.kind === 'duck_banner' && playerState === 'ducking') evading = true;
    // wall_lane: nenhuma evasão por estado — só lane diferente evita (filtrado acima)
    if (!evading) {
      result.collidedObstacle = obs;
      return result;
    }
  }

  for (const coin of coins) {
    if (!coin.alive) continue;
    if (coin.z > GAME_CONFIG.coinPickupZThreshold) continue;
    if (coin.lane !== player.getLane()) continue;
    result.collectedCoins.push(coin);
  }

  for (const heart of hearts) {
    if (!heart.alive) continue;
    if (heart.z > GAME_CONFIG.coinPickupZThreshold) continue;
    if (heart.lane !== player.getLane()) continue;
    result.collectedHeart = heart;
    break;
  }

  return result;
}
