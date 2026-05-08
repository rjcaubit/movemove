# Pesquisa — Polish Visual e Sonoro

**Issue:** #14
**Data:** 2026-04-27
**Tipo:** melhoria
**Baseado em:** `00-design.md`

## Problema / Necessidade

O jogo usa texturas procedurais (`Road.draw()` via `Graphics`), fonte `ui-monospace` hardcoded no `HUD`, e um `AudioBus` que depende de um único arquivo `music_run_loop` (sem SFX implementados). A ADR-2 (bitmap font) e ADR-6 (sprites Kenney) foram marcadas como "Polish pendente" desde a issue #3. O jogo parece um protótipo funcional, não um produto — a criança que testa reconhece imediatamente o aspecto "de programador".

Esta issue cumpre as ADRs diferidas e adiciona billboard sprites, novos obstáculos de movimento, oponentes variados e efeitos cinematográficos.

## Análise de Dependências

### O que já existe e será reutilizado (fonte: CODEMAP + leitura direta)

| Item | Localização | Como uso |
|------|-------------|----------|
| `Road` class | `src/game/systems/road.ts:7` | Modificar `draw()` para paleta Pixel Arcade; adicionar camada billboard no método `update()` |
| `zToScale`, `zToY`, `laneToX` | `src/game/systems/pseudo3d.ts` | Billboard sprites usam exatamente essas funções para posicionar e escalar |
| `Obstacle` entity | `src/game/entities/Obstacle.ts` | Adicionar novos `ObstacleKind` (`jump_brick`, `jump_column`, `duck_log`, `duck_banner`) — mesmo padrão sprite+z |
| `Coin` entity | `src/game/entities/Coin.ts` | Trocar texture key de `'coin'` para `'coin_kenney'`; remover `setTint` |
| `Spawner` | `src/game/systems/spawner.ts` | Adicionar novos kinds ao `ALL_KINDS`; adicionar fila de oponentes |
| `collision.ts` | `src/game/systems/collision.ts:28-35` | Adicionar ramos para `duck_log`/`duck_banner` → `ducking`; `Ghost` só evita por lane |
| `AudioBus` | `src/game/systems/audioBus.ts` | Migrar de `load.audio` + `sound.add` para `load.audioSprite` + `sound.playAudioSprite` |
| `HUD` | `src/game/ui/hud.ts` | Reescrever: VT323, Corner Widgets (4 cantos), painéis semi-transparentes |
| `Loading.ts` | `src/game/scenes/Loading.ts` | Adicionar `this.load.audioSprite()` + import CSS VT323 |
| `config.ts` | `src/game/config.ts` | Adicionar `PALETTE`, `FOG`, flags de FX |
| `tuning.ts` | `src/tuning.ts` | Adicionar knobs de FX (intensidades) |
| `ShieldEffect` | `src/game/systems/shield.ts` | Padrão de referência para screen shake + flash (tween + Graphics ephemero) |
| `GAME_CONFIG.bgColor` | `src/game/config.ts:9` | Trocar `0x0b0d10` → `0x66aaff` (Pixel Arcade sky) |

### O que precisa ser criado (não existe no CODEMAP)

| Item | Tipo | Onde viverá | Por que não reutilizar |
|------|------|-------------|------------------------|
| `BillboardLayer` | class | `src/game/systems/billboard.ts` | Não há sistema de sprites na borda da pista |
| `PostFxOverlay` | class | `src/game/ui/postfx.ts` | Não há PostFX/overlay de scanlines/vignette |
| `SpeedLines` | class | `src/game/ui/speedLines.ts` | Não há efeito de velocidade radial |
| `Robot` entity | class | `src/game/entities/Robot.ts` | Novo tipo de oponente |
| `Animal` entity | class | `src/game/entities/Animal.ts` | Novo tipo de oponente |
| `Zombie` entity | class | `src/game/entities/Zombie.ts` | Novo tipo de oponente |
| `Ghost` entity | class | `src/game/entities/Ghost.ts` | Novo tipo (evasão lateral apenas) |
| `Alien` entity | class | `src/game/entities/Alien.ts` | Novo tipo (rush) |
| `NpcRunner` entity | class | `src/game/entities/NpcRunner.ts` | Novo tipo (corredor NPC) |
| `Boss` entity | class | `src/game/entities/Boss.ts` | Novo tipo (health bar, milestone 1000m) |
| `public/assets/sprites/` | pasta de assets | `public/assets/sprites/` | Não existe |
| `public/assets/audio/` | pasta de assets | `public/assets/audio/` | Não existe (SFX) |
| audiosprite JSON | arquivo de dados | `public/assets/audio/sfx.json` | Não existe |

### Padrões canônicos que serão seguidos

- Imports relativos com extensão explícita: `'./Road.ts'`
- `import * as Phaser from 'phaser'`
- Sons gated por `cache.audio.exists()` — manter após migração para audioSprite
- Sprites de entidade: `scene.add.sprite(x, y, key).setOrigin(0.5, 1).setScale(zToScale(z)).setDepth(5)`
- `GAME_CONFIG` em `config.ts` como `as const`
- Tudo em TypeScript sem `any` explícito

## Código existente relacionado

| Arquivo | O que faz | Relevância | Ação |
|---------|-----------|------------|------|
| `road.ts:14-57` | Desenha pista com `Graphics` | Alta | Trocar cores + adicionar billboard rendering |
| `pseudo3d.ts:5-10` | `zToScale`, `zToY` | Alta | Reutilizar diretamente em `BillboardLayer` |
| `Obstacle.ts:1-40` | Entidade obstáculo com z + sprite | Alta | Padrão a copiar para novos oponentes |
| `collision.ts:28-35` | Lógica de evasão por tipo | Alta | Estender com novos kinds |
| `audioBus.ts:12-46` | Gerencia música + duck | Média | Refatorar completamente |
| `hud.ts:1-36` | HUD top-left | Alta | Reescrever para Corner Widgets |
| `Loading.ts:40-55` | Carrega recursos async | Alta | Adicionar audioSprite + font |
| `shield.ts:17-30` | Efeito de aura com tween | Referência | Copiar padrão para flash/shake |
| `config.ts:8` | `bgColor: 0x0b0d10` | Alta | Trocar para Pixel Arcade |

## Decisões tomadas

| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| VT323 via CSS `@import` no `index.html` | WebFontLoader Phaser plugin | Mais simples; Vite já injeta CSS; zero dependência extra |
| Billboard como classe separada `billboard.ts` | Embutir em `road.ts` | `road.ts` já tem 58 linhas; separação mantém SRP |
| AudioSprite único `sfx` + music separada | AudioSprite para tudo | Música tem duck/restore; manter `AudioBus` para música; audioSprite só para SFX |
| Novos oponentes como entidades separadas (Robot.ts etc.) | Enum em Obstacle.ts | Cada oponente tem comportamento diferente; herança simples |
| Fase D (oponentes) usa sprites pré-baked em PNG | Renderizar GLB 3D no browser | Phaser 4 é 2D; GLB requer Three.js — fora do escopo |
| Scanlines via `Graphics` overlay em Phaser | CSS `::after` com `background` | Canvas é filho de `div`; PostFX Phaser é mais limpo e resposta ao viewport |

## Riscos técnicos

- **Pré-bake dos GLBs sem Blender** — usar Kenney 2D packs equivalentes ou screenshot no Godot. Mitigação: criar placeholders procedurais primeiro (mesma abordagem atual) e trocar por PNGs quando prontos.
- **VT323 não disponível antes do Phaser criar textos** — resolver com `document.fonts.ready` ou garantir que a fonte esteja em CSS pré-carregado antes do `new Phaser.Game()`.
- **AudioSprite aumenta tempo de carregamento** — arquivo único OGG deve ser < 500KB para o pack chiptune da Kenney. Aceitável dado que o bundle já está em 10MB.
- **8 efeitos simultâneos com FPS drop** — cada efeito terá flag individual em `config.ts`. Chromatic aberration desativada por padrão em dispositivos lentos (detectado via `this.game.loop.actualFps < 40`).
- **Ghost evasão lateral** — exige novo estado de player ou nova lógica de colisão. Mitigação: Ghost ignora `jumping`/`ducking`; só `lane !== player.getLane()` evita.
