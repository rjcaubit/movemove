# Especificação — Polish Visual e Sonoro

**Issue:** #14
**Data:** 2026-04-27
**Status:** Aguardando implementação
**Baseado em:** `01-research.md`

## Objetivo

Dar identidade visual e sonora coerente ao jogo completando ADR-2 (VT323) e ADR-6 (sprites Kenney), adicionando billboard sprites, audiosprites chiptune, efeitos cinematográficos, obstáculos de movimento e oponentes variados — em 4 fases progressivas de baixo risco.

## Requisitos Funcionais

### Fase A — Estética global
- [ ] RF01: Paleta Pixel Arcade (céu `#4488ff`, grama `#44bb44`, pista `#888899`, stripes `#ffff00`) aplicada em `Road.draw()` e `GAME_CONFIG.bgColor`
- [ ] RF02: Fonte VT323 carregada via CSS antes do Phaser inicializar; usada em todo `scene.add.text()` do HUD e menus
- [ ] RF03: HUD reescrito como Corner Widgets: score/distância canto superior esquerdo, coins canto superior direito, BPM canto inferior esquerdo, barra de energia canto inferior direito
- [ ] RF04: Todos os SFX (`coin_collect`, `obstacle_hit`, `jump`, `shield`, `game_over`, `mission_complete`) tocam via único audioSprite `sfx` — zero chamadas `load.audio()` separadas para SFX
- [ ] RF05: Músicas continuam em `AudioBus` (loop separado); `AudioBus.playSfx(marker)` delega ao audioSprite
- [ ] RF06: Overlay de scanlines (linhas horizontais a cada 3px, opacidade 0.08) ativo em todas as cenas de jogo
- [ ] RF07: Vinheta (escurecimento radial das bordas) ativa em Play, Summary e mini-jogos

### Fase B — Objetos da pista
- [ ] RF08: `BillboardLayer` renderiza 6 árvores por segmento de pista (3 lado esquerdo, 3 lado direito) com `zToScale()` — sem árvores nos primeiros 10 segmentos (área do player)
- [ ] RF09: Moeda usa `coin_kenney` (Kenney `sprites/coin.png`) como textura; mesma lógica de spawn e coleta
- [ ] RF10: `ObstacleKind` inclui `'jump_brick'` (muro de tijolos alto — evitado por `jumping`) e `'jump_column'` (coluna — evitado por `jumping`)
- [ ] RF11: `ObstacleKind` inclui `'duck_log'` (tronco baixo — evitado por `ducking`) e `'duck_banner'` (banner suspenso — evitado por `ducking`)
- [ ] RF12: Fog (neblina) ativa: segmentos distantes da pista ficam com opacidade proporcional a `z` — controlado por `GAME_CONFIG.fog.density`
- [ ] RF13: Screen shake de 200ms ao colidir com obstáculo (amplitude 8px)
- [ ] RF14: Flash branco semi-transparente de 150ms ao colidir com obstáculo

### Fase C — FX cinematográficos
- [ ] RF15: Speed lines (12 linhas radiais a partir do VP) aparecem quando `energy.tier >= 3`; desaparecem abaixo de tier 2
- [ ] RF16: Partículas douradas (6 partículas) emitidas na posição da moeda ao coletar
- [ ] RF17: Partículas vermelhas (4 partículas) emitidas na posição do player ao colidir
- [ ] RF18: Aberração cromática (deslocamento RGB nas bordas do canvas) ativa quando `energy.tier === 4`; desativada se FPS < 40

### Fase D — Oponentes
- [ ] RF19: `Robot` — patrol entre lanes 3× antes de sair da tela; evitado por `lane !== player.getLane()` OU `jumping`
- [ ] RF20: `Animal` — corrida diagonal (spawn numa lane, migra para outra); evitado por `lane !== player.getLane()`
- [ ] RF21: `Zombie` — velocidade 0.7× padrão, hitbox 1.2× maior; evitado por `jumping`
- [ ] RF22: `Ghost` — flutua (posição Y levemente oscilante); **somente** `lane !== player.getLane()` evita — `jumping`/`ducking` NÃO evitam
- [ ] RF23: `Alien` — velocidade 1.5× padrão (rush); evitado por `jumping` ou `ducking`
- [ ] RF24: `NpcRunner` — velocidade variável (0.8–1.2× padrão); evitado por `lane !== player.getLane()`
- [ ] RF25: `Boss` — aparece aos 1000m (e a cada 1000m seguintes); tamanho 2×; tem health bar visível; 3 hits para derrotar; cada hit requer `arms_up` event (`ArmsZone`-like); ao derrotar: +500 score + SFX `boss_defeat`
- [ ] RF26: Spawner inclui oponentes a partir de 30s de jogo, com probabilidade crescente por tempo

## Requisitos Não-Funcionais

- [ ] RNF01: Nenhum efeito da Fase C/D cause queda abaixo de 45 FPS em dispositivo com Snapdragon 660 ou equivalente — flags individuais em `GAME_CONFIG` permitem desativar
- [ ] RNF02: AudioSprite OGG total ≤ 600KB
- [ ] RNF03: VT323 disponível antes do primeiro `scene.add.text()` executar (sem FOUT visível)
- [ ] RNF04: Novos sprites PNG (billboard + obstáculos + oponentes) carregados em `Loading.ts` antes de `Play` iniciar
- [ ] RNF05: `?debug=1` continua funcional com todos os novos efeitos ativos

## Modelo de dados

Não há schema de BD. Alterações em `GAME_CONFIG` (`src/game/config.ts`):

```typescript
// Adicionar ao GAME_CONFIG:
palette: {
  sky:       0x4488ff,
  skyHorizon:0x88aaff,
  grassA:    0x44bb44,
  grassB:    0x33aa33,
  roadA:     0x888899,
  roadB:     0x777788,
  stripe:    0xffff00,
  line:      0xffffff,
},
fog: {
  enabled: true,
  density: 0.7,   // 0 = sem fog; 1 = opaco no horizonte
  color:   0x88aaff,
},
fx: {
  scanlines:  true,
  vignette:   true,
  speedLines: true,
  particles:  true,
  chromatic:  false,  // false = desativado por padrão (performance)
  screenShake: true,
  flash:      true,
},
```

Adicionar em `tuning.ts`:
```typescript
export const FX_CHROMATIC_STRENGTH = 3;   // px de deslocamento RGB
export const FX_SHAKE_AMPLITUDE_PX = 8;
export const FX_SHAKE_DURATION_MS = 200;
export const FX_SPEED_LINE_COUNT = 12;
export const FX_PARTICLE_COIN_COUNT = 6;
export const FX_PARTICLE_HIT_COUNT = 4;
```

## Novos ObstacleKind

```typescript
// Obstacle.ts — expandir ObstacleKind:
export type ObstacleKind =
  | 'barrier' | 'low_barrier' | 'wall_lane'   // existentes
  | 'jump_brick' | 'jump_column'               // novos — evitados por jumping
  | 'duck_log'   | 'duck_banner';              // novos — evitados por ducking

// collision.ts — adicionar:
if (obs.kind === 'jump_brick' && playerState === 'jumping') evading = true;
if (obs.kind === 'jump_column' && playerState === 'jumping') evading = true;
if (obs.kind === 'duck_log' && playerState === 'ducking') evading = true;
if (obs.kind === 'duck_banner' && playerState === 'ducking') evading = true;
// Ghost (Fase D): nenhum evasão por estado — só checagem de lane já feita upstream
```

## AudioSprite — marcadores esperados

Arquivo: `public/assets/audio/sfx.json`

```json
{
  "spritemap": {
    "coin_collect":     { "start": 0.0,  "end": 0.4,  "loop": false },
    "obstacle_hit":     { "start": 0.5,  "end": 1.1,  "loop": false },
    "jump":             { "start": 1.2,  "end": 1.6,  "loop": false },
    "shield":           { "start": 1.7,  "end": 2.2,  "loop": false },
    "game_over":        { "start": 2.3,  "end": 3.5,  "loop": false },
    "mission_complete": { "start": 3.6,  "end": 4.8,  "loop": false },
    "boss_defeat":      { "start": 4.9,  "end": 6.2,  "loop": false }
  }
}
```

## Assets a criar / baixar

| Asset | Fonte | Destino |
|-------|-------|---------|
| `coin.png` (32×32) | Kenney 3D Platformer `sprites/coin.png` | `public/assets/sprites/coin_kenney.png` |
| `tree.png` (64×128) | Kenney pré-baked ou placeholder procedural | `public/assets/sprites/tree.png` |
| `sign.png` (48×64) | Placeholder procedural ou Kenney | `public/assets/sprites/sign.png` |
| `obs_jump_brick.png` | Kenney `brick.glb` screenshot ou placeholder | `public/assets/sprites/obs_jump_brick.png` |
| `obs_jump_column.png` | Kenney Basic Scene `column.glb` screenshot | `public/assets/sprites/obs_jump_column.png` |
| `obs_duck_log.png` | Placeholder procedural | `public/assets/sprites/obs_duck_log.png` |
| `obs_duck_banner.png` | Kenney Basic Scene `banner.glb` screenshot | `public/assets/sprites/obs_duck_banner.png` |
| `robot.png` | Kenney Robots pack ou placeholder | `public/assets/sprites/robot.png` |
| `animal_fox.png` | Kenney Animals pack ou placeholder | `public/assets/sprites/animal_fox.png` |
| `zombie.png` | Placeholder | `public/assets/sprites/zombie.png` |
| `ghost.png` | Placeholder | `public/assets/sprites/ghost.png` |
| `alien.png` | Kenney Alien pack ou placeholder | `public/assets/sprites/alien.png` |
| `npc_runner.png` | Placeholder (variação do player) | `public/assets/sprites/npc_runner.png` |
| `boss.png` | Placeholder (2× scale de robot) | `public/assets/sprites/boss.png` |
| `sfx.ogg` + `sfx.json` | Kenney Chiptune Audio montado | `public/assets/audio/sfx.{ogg,mp3,json}` |

**Estratégia de placeholders:** Na Fase B, gerar texturas procedurais via `scene.textures.generate()` para cada key nova. Na Fase D, repetir. Trocar por PNGs reais em PR separado após aprovação visual.

## Cenas e componentes

### Arquivos a modificar
| Arquivo | O que muda |
|---------|-----------|
| `src/game/config.ts` | + `palette`, `fog`, `fx` |
| `src/tuning.ts` | + constantes FX |
| `src/game/systems/road.ts` | Paleta Pixel Arcade; fog; billboard call |
| `src/game/systems/audioBus.ts` | Migrar para audioSprite; adicionar `playSfx()` |
| `src/game/systems/spawner.ts` | Novos kinds; oponentes |
| `src/game/systems/collision.ts` | Novos ramos de evasão; Ghost |
| `src/game/entities/Obstacle.ts` | Novos `ObstacleKind` + texturas |
| `src/game/entities/Coin.ts` | Trocar texture key |
| `src/game/ui/hud.ts` | Reescrever Corner Widgets + VT323 |
| `src/game/scenes/Loading.ts` | + audioSprite + sprite assets |
| `src/game/scenes/Play.ts` | Screen shake + flash + SpeedLines + PostFx + BillboardLayer |
| `src/game/scenes/Welcome.ts` | VT323 nos textos |
| `src/index.html` (ou `styles.css`) | Import VT323 Google Font |

### Arquivos a criar
| Arquivo | Propósito |
|---------|-----------|
| `src/game/systems/billboard.ts` | `BillboardLayer` — árvores + sinais nas bordas da pista |
| `src/game/ui/postfx.ts` | `PostFxOverlay` — scanlines + vignette |
| `src/game/ui/speedLines.ts` | `SpeedLines` — linhas radiais do VP |
| `src/game/entities/Robot.ts` | Oponente robô com patrol |
| `src/game/entities/Animal.ts` | Oponente animal com corrida diagonal |
| `src/game/entities/Zombie.ts` | Oponente zumbi lento |
| `src/game/entities/Ghost.ts` | Oponente fantasma flutuante |
| `src/game/entities/Alien.ts` | Oponente alien rush |
| `src/game/entities/NpcRunner.ts` | Corredor NPC com velocidade variável |
| `src/game/entities/Boss.ts` | Chefão com health bar |

## Cenários de Teste

### CT01: Paleta Pixel Arcade
```
DADO QUE o servidor de dev está rodando
QUANDO navegar para ?demo=1
ENTÃO céu é azul (#4488ff), grama é verde (#44bb44), stripes são amarelas
E a pista NÃO tem cor cinza-escuro (0x2c2f36 removido)
```

### CT02: VT323 aplicada
```
DADO QUE estou na cena Play ou Welcome
ENTÃO todos os textos do HUD e menu estão em VT323
E nenhum texto usa 'ui-monospace'
```

### CT03: AudioSprite
```
DADO QUE o jogo está rodando em modo debug (?debug=1)
QUANDO coletar uma moeda (tecla C ou detecção real)
ENTÃO console.log mostra "SFX coin_collect via audioSprite"
E o som toca (sem erro de console)
QUANDO verificar devtools Network
ENTÃO não há requisições a arquivos .mp3/.ogg individuais de SFX (só sfx.ogg e music)
```

### CT04: Obstáculos jump/duck
```
DADO QUE ?debug=1 está ativo (keyboard fallback)
QUANDO um 'jump_brick' está na pista e pressionar J (jump)
ENTÃO player não perde vida
QUANDO um 'jump_brick' está na pista e NÃO pular
ENTÃO player perde vida e screen shake ocorre
QUANDO um 'duck_log' está na pista e pressionar S (duck)
ENTÃO player não perde vida
QUANDO um 'duck_banner' está na pista e NÃO agachar
ENTÃO player perde vida
```

### CT05: Billboard sprites
```
DADO QUE o jogo está em Play
ENTÃO árvores aparecem nas bordas da pista, escaladas por distância
E moeda usa sprite coin_kenney (dourada, sem tint de código)
E árvores distantes são menores que árvores próximas (zToScale aplicado)
```

### CT06: Boss aos 1000m [E2E click-by-click]
**Pré-condição:** dev server rodando com HTTPS, `?debug=1&seed=1`

**Sequência:**
1. Navegar para `https://localhost:5173/?debug=1`
2. Avançar no tutorial / calibração
3. Jogar até 1000m (usar teclas de debug para acelerar se necessário)
4. **Verificar:** Boss aparece na pista (sprite 2× maior)
5. **Verificar:** Health bar visível acima do Boss (3 pontos)
6. Executar `arms_up` 3× (tecla A se debug)
7. **Verificar:** Boss desaparece, +500 score, SFX `boss_defeat` toca
8. Screenshot salvo em `load-tests/results/issue-14-journey/`

**Critério:** boss aparece, health bar decresce a cada arms_up, derrota registra score corretamente.

### CT07: Efeitos visuais
```
DADO QUE o jogo está em Play com energia alta (tier 4)
ENTÃO speed lines visíveis no centro da tela
E chromatic aberration ativa (se FPS > 40)
QUANDO colidir com obstáculo
ENTÃO flash branco de ~150ms
E tela vibra por ~200ms
QUANDO coletar moeda
ENTÃO partículas douradas emitidas na posição da moeda
```

### CT08: Sem regressão em mini-jogos
```
DADO QUE os mini-jogos existentes funcionavam antes desta issue
QUANDO navegar para MiniGamesHub e jogar CatchBicho, TrunkTwist, BellRinger
ENTÃO nenhum mini-jogo crasha ou perde funcionalidade
E VT323 é usada nos textos dos mini-jogos
```

## Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| AudioSprite só para SFX, música separada em `AudioBus` | Música precisa de duck/restore dinâmico; audioSprite é one-shot |
| `BillboardLayer` separado de `Road` | SRP; `road.ts` está em 58 linhas e já lida com geometria da pista |
| Placeholders procedurais para sprites na Fase B | Unblock development; troca por PNGs reais é PR independente |
| Ghost evasão só lateral | Diferencia Ghost mecanicamente de outros oponentes; não exige novo estado no player |
| `chromatic: false` por padrão | Performance em devices lentos; usuário avançado pode ativar via `?chromatic=1` |

## Fora do Escopo

- Troca do sprite do player (mantém boneco de palito)
- Phaser 3D / Three.js para renderizar GLBs diretamente
- Multilinguagem para textos novos (narratorLines já tem pt-BR; VT323 só para UI)
- Novo sistema de missões relacionado a oponentes (issue #5)

## Docs canônicas a atualizar (após implementação)

- [x] `/docs/CODEMAP.md` — adicionar `billboard.ts`, `postfx.ts`, `speedLines.ts`, entidades novas
- [ ] `/docs/MODULES.md` — N/A (sem novo módulo top-level)
- [ ] `/docs/database-documentation.md` — N/A
- [x] `/docs/ARCHITECTURE.md` — mencionar pipeline de PostFX e billboard system
- [x] `/docs/CHANGELOG.md` — entrada da feature
