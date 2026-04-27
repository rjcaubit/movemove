import { GAME_CONFIG } from '../config.ts';
import type { Player } from '../entities/Player.ts';
import type { Obstacle } from '../entities/Obstacle.ts';
import type { Coin } from '../entities/Coin.ts';

export interface CollisionResult {
  collidedObstacle?: Obstacle;
  collectedCoins: Coin[];
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
export function checkCollisions(player: Player, obstacles: Obstacle[], coins: Coin[]): CollisionResult {
  const result: CollisionResult = { collectedCoins: [] };

  for (const obs of obstacles) {
    if (!obs.alive) continue;
    if (obs.z > GAME_CONFIG.collisionZThreshold) continue;
    if (obs.lane !== player.getLane()) continue;
    const playerState = player.getState();
    let evading = false;
    if (obs.kind === 'barrier' && playerState === 'jumping') evading = true;
    if (obs.kind === 'low_barrier' && playerState === 'ducking') evading = true;
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

  return result;
}
