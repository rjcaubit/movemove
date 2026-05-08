# Design — Polish Visual e Sonoro

**Data:** 2026-04-27
**Status:** Proposto (aguardando aprovação)
**Tipo:** melhoria

## Problema

O jogo atualmente usa texturas procedurais, fonte monospace do sistema (`ui-monospace`) e sons carregados individualmente. A ADR-6 decidiu usar sprites Kenney + edermunizz e a ADR-2 decidiu bitmap font pixel art, mas ambas foram diferidas como "Polish pendente" na issue #3. A experiência visual é inconsistente: a pista tem aspecto de protótipo, o HUD é funcional mas sem personalidade, e o áudio carece de feedback sonoro satisfatório.

O objetivo desta issue é transformar o jogo de "protótipo funcional" para "jogo com identidade visual coerente" sem alterar mecânicas existentes.

## Usuário e caso de uso

Criança de 4–8 anos jogando com câmera de pose ativa. A identidade visual precisa ser:
- Imediatamente legível (contraste alto, objetos grandes)
- Visualmente estimulante (cores vibrantes do tema Pixel Arcade)
- Consistente em todas as cenas (Boot → Play → Summary → Mini-jogos)

## Escopo

### Inclui
- Paleta Pixel Arcade (céu azul vivo, grama verde brilhante, linhas amarelas na pista)
- Fonte VT323 substituindo `Text` monospace em HUD e menus
- Audiosprites chiptune (Kenney CC0) — 1 arquivo `.ogg`/`.mp3` + mapa JSON
- Corner Widgets HUD (painéis nos 4 cantos, centro da tela livre)
- Billboard sprites na pista: árvores, sinais, `coin.png` — escalados por distância
- Obstáculos de pular: muro de tijolos (`brick.glb`), coluna (`column.glb`)
- Obstáculos de agachar: tronco rolando, banner suspenso (`banner.glb`)
- Oponentes: robôs, animais, barris/pedras, zumbis, fantasmas, alienígenas, corredores NPC, chefão
- Efeitos visuais: scanlines, screen shake, speed lines, flash, particles, aberração cromática, fog, vignette

### Não inclui
- Alterações nas mecânicas de detecção de pose
- Novas missões ou progressão (issue #5)
- Troca do sprite do player (mantém boneco de palito — apenas animações melhoradas)
- Modo multiplayer

## Abordagem escolhida — 4 fases progressivas

Cada fase é um PR independente, mergeable e testável.

### Fase A — Estética global (zero risco mecânico)
- Fonte VT323 carregada no `Loading.ts` e aplicada em todo `hud.ts`, menus e cenas
- Paleta Pixel Arcade: constantes adicionadas em `config.ts` (`PALETTE.sky`, `PALETTE.grass`, etc.)
- Audiosprites chiptune: arquivo único Kenney; refatora `audioBus.ts` de `load.audio()` para `load.audioSprite()`
- Corner Widgets HUD: reescreve `hud.ts` com painéis semi-transparentes nos 4 cantos
- Scanlines + vignette: PostFX pipeline Phaser 4 ou canvas overlay CSS

### Fase B — Objetos da pista
- Sistema billboard em `road.ts`/`pseudo3d.ts`: sprites escalados pelo fator de distância já calculado
- `coin.png` (Kenney 3D Platformer) como sprite billboard substituindo geometria procedural
- Obstáculos de **pular**: muro de tijolos (`brick.glb` pré-baked em PNG) e coluna (`column.glb` pré-baked)
- Obstáculos de **agachar**: tronco (sprite) e banner (`banner.glb` pré-baked) — detecção via `crouch` event
- Fog: `fogDensity` em `config.ts` + blend no loop de segmentos em `road.ts`
- Screen shake + flash: baseados na referência existente em `shield.ts`

### Fase C — FX cinematográficos
- Speed lines: linhas radiais emitidas do VP quando `energy.tier >= 3`
- Particles: `Phaser.GameObjects.Particles` para coleta de moedas e colisões
- Aberração cromática: canvas `filter` CSS ou WebGL shader leve sobre o canvas principal

### Fase D — Oponentes
Sprites pré-baked de ângulo pseudo-3D para cada tipo:
- **Estáticos:** barris/pedras — substitui obstáculos procedurais atuais
- **Patrol:** robô (vai e volta entre lanes)
- **Animal:** raposa/pinguim (Kenney Animals) — corrida diagonal
- **Flutuante:** fantasma — ignorado por `duck` e `jump`, exige desvio lateral
- **Rush:** alienígena — vem em linha reta com velocidade crescente
- **NPC runner:** corredor colorido diferente do player, velocidades variadas
- **Zumbi:** andar arrastado, hitbox ligeiramente maior
- **Boss:** entidade 2× maior, aparece a cada 1000m, tem health bar, requer sequência de movimentos (ex: 3× `arms_up`)

## Abordagens descartadas

| Abordagem | Motivo de descarte |
|-----------|-------------------|
| Big-bang único PR | 8 oponentes + 8 efeitos + billboards = PR irrevisuável e difícil de reverter |
| 2 fases grandes | Cada fase ainda muito ampla; uma regressão num asset trava todo o lote |

## Pesquisa externa

### Referências visuais e técnicas
| Recurso | Relevância |
|---------|-----------|
| [moonsault.itch.io/phaser-driving](https://moonsault.itch.io/phaser-driving) | Referência visual alvo — pixel art + pseudo-3D Outrun em Phaser |
| [jakesgordon.com/games/racer](https://jakesgordon.com/games/racer/) | Técnica billboard sprites escalados por distância (segmentos de pista) |
| [KenneyNL/Starter-Kit-3D-Platformer](https://github.com/KenneyNL/Starter-Kit-3D-Platformer) | `character.glb`, `coin.png`, `brick.glb`, `cloud.glb`, `platform.glb` — CC0 |
| [KenneyNL/Starter-Kit-Basic-Scene](https://github.com/KenneyNL/Starter-Kit-Basic-Scene) | `column.glb`, `banner.glb`, `character-soldier.glb`, `trophy.glb`, `stairs.glb` — CC0 |
| [github.com/Raiper34/awesome-phaser](https://github.com/Raiper34/awesome-phaser) | Catálogo de plugins e assets para Phaser |

### Assets selecionados
- **Fonte:** VT323 (Google Fonts, OFL)
- **Áudio:** Kenney Chiptune Audio (kenney.nl, CC0)
- **Sprites:** pré-bake manual ou via screenshot dos modelos GLB dos kits Kenney (CC0)

### Nota sobre pré-bake dos GLBs
Os modelos `.glb` dos kits Kenney são assets 3D; para uso em Phaser 2D precisam ser renderizados em PNG de ângulo fixo. Opções: (a) screenshot manual no Godot/Blender do ângulo desejado, (b) usar os Kenney 2D packs equivalentes (`Kenney Game Assets` inclui versões flat de muitos objetos 3D).

## Reuso do CODEMAP

- `src/game/systems/road.ts` — billboard rendering entra aqui (VP e segmentos já existem)
- `src/game/systems/pseudo3d.ts` — fator de scaling por distância já calculado
- `src/game/systems/spawner.ts` — novos tipos de obstáculo entram no registry de spawn
- `src/game/systems/audioBus.ts` — migrar de `load.audio()` para `load.audioSprite()`
- `src/game/systems/collision.ts` — novos hitboxes para obstáculos jump/duck
- `src/game/systems/shield.ts` — referência para efeitos pontuais (shake, flash)
- `src/game/ui/hud.ts` — reescrever para Corner Widgets + VT323
- `src/game/config.ts` — paleta de cores, fog params, sprite keys, efeito flags
- `src/game/entities/` — novos arquivos por oponente (`Robot.ts`, `Animal.ts`, etc.)
- `src/tuning.ts` — já existe como untracked; pode receber knobs de FX

## Impacto arquitetural

- **Game layer:** novos tipos em `entities/`, PostFX shaders, billboard system em `road.ts`
- **UI:** `hud.ts` reescrito; VT323 carregada em `Loading.ts`
- **Audio:** `audioBus.ts` migrado; single audioSprite key
- **Assets:** nova pasta `public/assets/sprites/` e `public/assets/audio/`
- **Config:** constantes visuais centralizadas em `config.ts`
- **Docs a atualizar:** `CODEMAP.md`, `CHANGELOG.md`

## Critérios de sucesso

- [ ] Paleta Pixel Arcade visível em todas as cenas (Boot → Play → Summary → Mini-jogos)
- [ ] VT323 substituiu todo texto monospace no HUD e menus
- [ ] Todos os sons tocam via único `audioSprite` (0 chamadas `load.audio()` soltas)
- [ ] Billboard sprites visíveis na pista com scaling correto por distância
- [ ] Obstáculos de pular (muro + coluna) e agachar (tronco + banner) funcionais com detecção de pose
- [ ] Pelo menos 3 tipos de oponentes implementados na Fase D
- [ ] Boss aparece ao atingir 1000m e tem health bar funcional
- [ ] Filho do desenvolvedor joga 5min sem comentar "parece de programador"

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Pré-bake dos GLBs Kenney trabalhoso sem Blender | alta | Usar Kenney 2D packs equivalentes (já existem versões flat) |
| Billboard jitter em velocidade alta | média | One Euro Filter já planejado na ADR-5 |
| VT323 ilegível em tamanhos < 12px | média | Testar em 360p; fallback `ui-monospace` para strings críticas |
| 8 efeitos simultâneos com queda de FPS em mobile | média | Flag individual por efeito em `config.ts`; desabilitar chromatic por padrão em devices lentos |
| audioSprite aumenta bundle | baixa | Bundle já > 10MB gzip — não é restrição real (ver achados CODEMAP) |

## Decisões de design (Fase 0 — confirmadas pelo usuário em 2026-04-27)

Escolhas feitas via picker interativo (`/tmp/movemove-style-picker.html`):

```
TEMA VISUAL:   Pixel Arcade
TIPOGRAFIA:    VT323
HUD LAYOUT:    Corner Widgets
OBJETOS PISTA: Billboard Sprites
PLAYER:        Boneco de Palito (mantido, animações melhoradas)
COLETÁVEL:     Moeda Giratória (coin.png)
ÁUDIO:         8-bit Chiptune
PULAR:         Muro de Tijolos, Coluna
AGACHAR:       Tronco Rolando, Banner Suspenso
OPONENTES:     Robôs, Animais, Barris/Pedras, Zumbis, Fantasmas, Alienígenas, Corredores NPC, Chefão
EFEITOS:       scanlines, screenshake, speed-lines, flash, particles, chromatic, fog, vignette
```

## Próximo passo

→ `/sdd-plan 14` — gerar research + spec técnica + tasks granulares
