# Atribuição de PNGs — entidades visuais (ISSUE #14)

Estado atual dos sprites e comportamentos. PNGs vêm do Kenney Desert Shooter
Pack 1.0 (CC0), copiados em `public/assets/sprites/`.

## Obstáculos (`src/game/entities/Obstacle.ts`)

Caem na lane; jogador desvia conforme a ação. Pool ativo definido em
`spawner.ts:ALL_KINDS`.

| kind          | tamanho | ação            | PNG                                   | status |
|---------------|---------|-----------------|---------------------------------------|--------|
| `barrier`     | 80×28   | PULAR           | `obs_barrier.png` (Tiles/tile_0039)   | ativo  |
| `wall_lane`   | 64×96   | MUDAR LANE      | `obs_wall_lane.png` (Tiles/tile_0049) | ativo  |
| `jump_brick`  | 90×60   | PULAR           | `obs_jump_brick.png` (Tiles/tile_0160)| ativo  |
| `jump_column` | 50×110  | PULAR           | `obs_jump_column.png` (Tiles/tile_0044)| ativo |
| `low_barrier` | 72×64   | AGACHAR         | —                                     | desligado |
| `duck_log`    | 100×36  | AGACHAR         | —                                     | desligado |
| `duck_banner` | 110×80  | AGACHAR         | —                                     | desligado |
| `laser_beam`  | 120×40  | AGACHAR         | —                                     | desligado |

Reativar: adicionar o kind de volta em `ALL_KINDS` (spawner.ts) e ligar PNG
em `TEXTURE_BY_KIND` (Obstacle.ts). Forma procedural fallback existe em
`textureGen.ts`.

## Inimigos (`src/game/systems/spawner.ts`)

Pool ativo: 4 classes — todas com **comportamento padrão de colisão**
(acerta se mesma lane na zona de colisão, sem evasão por estado). Animação
cíclica de 4 frames durante a queda.

| classe   | PNGs                                    | comportamento ativo  |
|----------|-----------------------------------------|----------------------|
| `Robot`  | `robot_0..3.png`  (Enemies/0000-0003)   | padrão + patrulha lane |
| `Animal` | `animal_0..3.png` (Enemies/0004-0007)   | padrão + troca lane uma vez |
| `Zombie` | `zombie_0..3.png` (Enemies/0008-0011)   | padrão + queda mais lenta |
| `Ghost`  | `ghost_0..3.png`  (Enemies/0012-0015)   | padrão + bob vertical |

### Comportamentos especiais (preservados nas classes, **desligados** na colisão)

Classes existem em `src/game/entities/` mas não são spawnadas e a lógica de
colisão especial foi removida de `collision.ts`. Para reativar é preciso
voltar tanto o spawn quanto a regra de evasão.

| classe      | PNG sugerido | comportamento original                                  |
|-------------|--------------|---------------------------------------------------------|
| `Alien`     | —            | desviado por **pular OU agachar**                       |
| `Puncher`   | —            | derrotado por **jumping jack** na mesma lane (`Play.ts`)|
| `Barrel`    | —            | desviado **só pulando**                                 |
| `NpcRunner` | —            | corredor neutro, **não machuca**                        |

Para reativar:
1. Voltar import normal (não `import type`) em `spawner.ts`.
2. Voltar a opção no random pool de oponentes em `spawner.ts:update`.
3. Voltar a cláusula correspondente em `checkOpponentCollisions` (`collision.ts`).

## Coletáveis

| classe        | PNG                                  | função                       |
|---------------|--------------------------------------|------------------------------|
| `Coin`        | `coin_k.png`  (Tiles/tile_0218)      | +score                       |
| `HeartPickup` | `heart_k.png` (Tiles/tile_0222)      | +1 vida (só se vidas < 3)    |

## Player (`src/game/entities/Player.ts`)

PNGs já existentes em `public/assets/sprites/`, carregados em `Boot.ts`.

| estado    | textura                                                |
|-----------|--------------------------------------------------------|
| running   | alterna `player_walk` ↔ `player_stand` (a cada 0.14s)  |
| jumping   | `player_jump`                                          |
| ducking   | `player_duck`                                          |
| hurt      | `player_hurt` (carregado, não usado ainda)             |

## Boss

Removido. Classe `Boss.ts` deletada; `getBoss()` / `bossDead` / `BossLike` /
`armsUpThisFrame` removidos. Arms-up ainda alimenta `ArmsZone` — não há mais
inimigo final pra derrotar.
