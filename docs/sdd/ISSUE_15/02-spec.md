# Especificação — Ninja Fruit (mini-jogo de cortar frutas)

**Issue:** #15
**Data:** 2026-05-10
**Status:** Aguardando implementação

## Objetivo

Adicionar mini-jogo "Ninja Fruit" ao catálogo (categoria Mira): cortar
frutas em arco balístico com a mão dominante (auto-detectada na intro)
evitando bombas, modo arcade com 3 vidas, combo e scoring crescente.

## Pesquisa & Dependency Analysis

### O que já existe e reuso (fonte: CODEMAP / leitura direta)

| Item | Localização | Como uso |
|------|-------------|----------|
| `Phaser.Scene` boilerplate de mini-jogo (timer, lives, banner, themed frame, MiniGameResult) | `src/game/scenes/HelicopterGame.ts` | Modelo direto da nova `NinjaFruit.ts` (3 vidas, narrator, finish → MiniGameResult). Copiar estrutura, trocar gameplay |
| Padrão `kind: 'good' \| 'bad'` (negativo penaliza) | `src/game/entities/Castor.ts:4-6` (`CastorKind`, `BAD_EMOJIS`) e `CastorGame.ts:25-26,280` (`BAD_GRACE_MS`, `BAD_SPAWN_CHANCE`, kind sorteado) | Espelhar como `FruitKind = 'fruit' \| 'bomb'`, `BOMB_GRACE_MS = 5000`, `BOMB_SPAWN_CHANCE` crescente |
| `getRefs(scene)` + `onSmoothedFrame(cb)` | `src/game/orchestrator.ts:42-58,118` | Subscrever ao stream de pose (1P apenas) |
| `handAt(frame, 'L'\|'R', target)` | `src/pose/spatialQueries.ts:5-12` | Hit test pulso↔fruta (proximidade) |
| `handPosition(frame, 'L'\|'R')` | `src/pose/spatialQueries.ts:14-17` | Pegar posição crua do pulso pra rastreio de velocity |
| `CameraBackdrop` + `handGlows` | `src/game/ui/cameraBackdrop.ts` (referenciado em `HelicopterGame.ts:104-108`, `CastorGame.ts:80,156-159`) | Vídeo + halo no pulso da mão dominante |
| `Pill`, `addTitleBanner`, `addThemedFrame` | `src/game/ui/hudStyle.ts` | HUD de pontos/tempo/vidas/combo + banner do título + frame temático |
| `addBackButton(this)` | `src/game/ui/backButton.ts` | Botão voltar pro hub |
| `Narrator` + `narratorLines` | `src/game/systems/narrator.ts` + `src/game/i18n/narratorLines.ts` | Falas reativas (acerto, bomba, combo) — adicionar entradas novas seguindo padrão `castorHit/castorBadHit/helicopterStart` |
| `MiniGameResult` cena | `src/game/scenes/MiniGameResult.ts` (data: `gameKey`, `score`, `scoreLabel`, `extra?`, `session?`) | Encerrar partida com score + bestCombo no `extra` |
| `MissionDeltas` + `missions.tick()` | `src/game/systems/missions.ts:15-29` | Adicionar campo `ninjaSlices?: number` no payload |
| `ensureTexture()` (fallback procedural) | `src/game/ui/textureGen.ts` | Placeholder pra frutas/bomba enquanto sprites finais não chegam (MVP usa emoji direto, igual Castor/HelicopterGame) |
| `strings.miniGames.*` (`@lingui/core`) | `src/i18n/strings.ts:110-145` | Adicionar chaves `ninjaTitle`, `ninjaDesc`, `ninjaSeconds`, `ninjaIntroWave`, `ninjaCombo`, `ninjaSlices`, `ninjaBestCombo` |
| Card de mini-jogo no hub (categoria `aim`) | `src/game/scenes/MiniGamesHub.ts:49-53` | Adicionar entrada com `start: goCheck('NinjaFruit')` |
| Themed frame por tema | `src/game/ui/hudStyle.ts:101,110-118` | Adicionar tema `'ninja'` com paleta vermelho/preto |

### O que preciso criar (porque não existe)

| Item | Tipo | Onde | Por que não reuso |
|------|------|------|-------------------|
| `Fruit` entidade | Classe Phaser entity | `src/game/entities/Fruit.ts` | Não há entidade balística com split visual e `kind` fruit/bomb. `Castor` é estática (pop-up de buraco), `Bicho` tem lifetime mas não tem física balística |
| `wristVelocity.ts` utility | Função pura | `src/game/systems/wristVelocity.ts` | **Não existe nenhum tracker de velocity no projeto** (grep `velocity` retornou só MIDI). `CastorGame` faz proximidade pura via `handAt`, sem checar velocidade — pra NinjaFruit, sem velocity check, jogador parado encostando na fruta = corte automático. Solução: módulo que mantém histórico recente das posições do pulso e expõe `wristSpeed(frame, hand)` em `H_corpo/s` |
| `sliceTrail.ts` UI helper | Função / classe leve | `src/game/ui/sliceTrail.ts` | Não há helper de polyline com fade. Phaser `Graphics` baixo nível precisa estado encapsulado |
| `NinjaFruit` cena | `Phaser.Scene` | `src/game/scenes/NinjaFruit.ts` | Cena nova |

### Padrões canônicos a seguir

- **Phaser ESM:** `import * as Phaser from 'phaser'` (sem default export)
- **Imports relativos com extensão:** `./Fruit.ts`, não `./Fruit`
- **Cenas Phaser nunca leem keypoints crus** — usam `handAt`/`handPosition`
  ou `getRefs(scene).onSmoothedFrame(cb)` (que já entrega frame
  smoothed via EMA)
- **Coordenadas normalizadas** (0-1) em vez de pixels — `H_corpo/s` para velocity, `target.r` para raio de hit
- **Sons gated por `cache.audio.exists()`** — `play()` no-op se asset não carregou
- **Strings em PT-BR** centralizadas em `src/i18n/strings.ts` via `i18n._()`
- **Imports relativos com extensão explícita** (`.ts`)
- **Mobile-first portrait** — usar `GAME_CONFIG.width/height` que são ajustados em `main.ts` para casar com viewport real
- **Encerrar com `this.scene.start('MiniGameResult', { gameKey: 'NinjaFruit', score, scoreLabel, extra: { bestCombo }, session })`**
- **Fluxo:** `MiniGamesHub` (card categoria `aim`) → `BodyCheck` → `NinjaFruit`

### Decisões tomadas

| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| Velocity tracker novo (`wristVelocity.ts`) | Reusar `Puncher.ts` (mencionado no design) | Inspeção do código mostrou que `Puncher.ts` é obstáculo do runner, não detector. **Design original estava errado** — não existe util de velocity no codebase |
| Detecção: velocity check + `handAt` (proximidade) | Linha-segmento intersection (polyline cruzando bbox) | Mais simples, padrão do projeto, evita `O(N×pontos)` por frame; rastro polyline fica só cosmético |
| `kind: 'fruit' \| 'bomb'` numa só entidade `Fruit` | Entidades `Fruit` e `Bomb` separadas | Espelha o padrão do `Castor.ts` (`kind: 'good' \| 'bad'` na mesma classe); reduz duplicação de física |
| Auto-detect mão dominante na intro de 3s | Picker tipo `CastorModePicker` | Mais lúdico, sem clique, alinhado ao fluxo "sem teclado" do movemove |
| `BOMB_GRACE_MS = 5000` (5s só com fruta) | Bombas desde t=0 | Mesmo padrão do `BAD_GRACE_MS = 4000` do Castor; entrada amigável |
| Spawn balístico via física manual (vy + gravity por frame) | `Phaser.Physics.Arcade` | Coords normalizadas já em uso na `HelicopterGame`; `arcade` exigiria conversão. Manter consistência |
| Modo apenas 1P nesta issue | Já incluir 2P | Out-of-scope explícito no design. Adicionar 2P em issue futura segue padrão `CastorModePicker` |

### Riscos técnicos

- **Tuning de velocity threshold:** valor default `1.2 H_corpo/s` é palpite — exposto em `tuning.ts` para iteração com `?debug=1`
- **MediaPipe latency:** wrist pode pular alguns frames; smoothing via EMA já ajuda, mas histórico de 3 frames com gaps pode dar falsa baixa velocidade. Mitigação: ignorar gaps > 100ms
- **Bomba indistinguível:** mitigar com cor/forma muito contrastante (preto + emoji `💣`) e SFX de pavio se existir
- **Auto-detect com jogador imóvel:** se nenhum wrist se mexer >0.05 H_corpo em 3s, fallback default = direita

## Requisitos Funcionais

- [ ] **RF01** — Card "Ninja Fruit" aparece na categoria "Mira" do `MiniGamesHub`, abrindo `BodyCheck` → `NinjaFruit`
- [ ] **RF02** — Intro de ~3s na cena com texto "acene a mão que vai cortar"; mede deslocamento de cada wrist e fixa a mão dominante
- [ ] **RF03** — Após intro, hand glow ativa só no pulso dominante via `CameraBackdrop.handGlows`
- [ ] **RF04** — Frutas surgem em arco balístico (vy inicial + gravidade) a partir da borda inferior, com x normalizado random
- [ ] **RF05** — Cortar fruta com mão dominante (proximidade via `handAt` + velocity > threshold) = +1 ponto base × multiplier do combo, FX de slice (split visual em 2 metades + flash)
- [ ] **RF06** — Bomba só spawna após `BOMB_GRACE_MS` (5s) e segue chance crescente de aparição
- [ ] **RF07** — Cortar bomba = -1 vida + screenShake + flash branco + SFX + narrador reativo + reseta combo
- [ ] **RF08** — Fruta sai pela borda superior/lateral sem ser cortada = -1 vida e reseta combo (bomba sai sem penalidade)
- [ ] **RF09** — Combo cresce com cortes consecutivos sem miss/bomba; HUD de combo aparece quando combo ≥ 2; reseta em miss/bomba
- [ ] **RF10** — `bestCombo` rastreado durante a partida
- [ ] **RF11** — Partida termina quando `lives === 0` → `MiniGameResult` com `gameKey: 'NinjaFruit'`, `score`, `scoreLabel: strings.miniGames.ninjaSlices`, `extra: { bestCombo }`
- [ ] **RF12** — Rastro visual cosmético desenhado pelos últimos ~12 pontos do pulso dominante (Phaser `Graphics`, fade alpha)
- [ ] **RF13** — Modo `?debug=1` permite "cortar" via mouse (ponteiro vira pulso virtual com velocity simulada por `pointermove`)
- [ ] **RF14** — Narrador fala em eventos: início, slice em combo alto (≥5), bomba, última vida

## Requisitos Não-Funcionais

- [ ] **RNF01** — Mobile-first portrait (`GAME_CONFIG.width/height` ajustado pelo `main.ts`)
- [ ] **RNF02** — Sem APIs exclusivas de browser na lógica do jogo (todas as constantes parametrizáveis em `tuning.ts` quando aplicável)
- [ ] **RNF03** — Estilo lúdico/divertido (cores quentes, emojis, FX exuberantes)
- [ ] **RNF04** — `play()` de SFX gated por `this.cache.audio.exists()`
- [ ] **RNF05** — Strings via `strings.miniGames.*`, sem texto hardcoded em PT-BR no `.ts`
- [ ] **RNF06** — Performance: `Graphics.clear` + redraw do trail por frame; máximo 12 pontos no histórico
- [ ] **RNF07** — `shutdown()` cancela subscriptions (`unsub()` do `onSmoothedFrame`) e destrói entidades vivas

## Modelo de Dados

N/A — sem persistência nesta issue. `RunHistoryStore` poderia receber stats no futuro, mas fora do escopo. `missions.tick({ ninjaSlices: score })` apenas roda em memória dentro do `MissionSystem`.

### Alteração em interface existente

```typescript
// src/game/systems/missions.ts:15
export interface MissionDeltas {
  // ...existing fields
  ninjaSlices?: number;  // novo
}
```

## API

N/A — frontend-only.

## Frontend — páginas/componentes

### Arquivos a criar

| Arquivo | Descrição |
|---------|-----------|
| `src/game/scenes/NinjaFruit.ts` | Cena Phaser principal |
| `src/game/entities/Fruit.ts` | Entidade fruta/bomba com física balística |
| `src/game/systems/wristVelocity.ts` | Tracker de velocidade do pulso (puro) |
| `src/game/ui/sliceTrail.ts` | Helper de rastro polyline cosmético |

### Arquivos a modificar

| Arquivo | O que muda |
|---------|------------|
| `src/game/orchestrator.ts` | Importar `NinjaFruit` + adicionar ao array `scene` |
| `src/game/scenes/MiniGamesHub.ts:49-53` | Adicionar card no `aim` array |
| `src/i18n/strings.ts` | Novas chaves `miniGames.ninja*` |
| `src/game/i18n/narratorLines.ts` | Novas funções `ninjaSlice`, `ninjaCombo`, `ninjaBomb`, `ninjaStart`, `ninjaLastLife` |
| `src/game/systems/missions.ts` | Adicionar `ninjaSlices?` em `MissionDeltas` |
| `src/game/ui/hudStyle.ts:101,110-118` | Adicionar tema `'ninja'` |
| `src/tuning.ts` | Constantes `NINJA_VELOCITY_THRESHOLD`, `NINJA_BOMB_SPAWN_CHANCE_MAX` |
| `docs/CODEMAP.md` | Listar `NinjaFruit` em "Cenas Phaser registradas" |
| `docs/GAMES.md` | Nova seção "13. Ninja Fruit" |
| `docs/CHANGELOG.md` | Entrada Issue #15 |

### Reutilizados (CODEMAP)

`CameraBackdrop`, `Pill`, `addTitleBanner`, `addThemedFrame`,
`addBackButton`, `Narrator`, `getRefs`, `handAt`, `handPosition`,
`MiniGameResult`, `BodyCheck`.

## AI Service

N/A.

## Cenários de Teste

### CT01 — Fluxo principal: cortar frutas

```
DADO usuário em /  com BodyCheck OK e cena NinjaFruit ativa
QUANDO mão dominante calibrada cruza fruta com velocity > threshold
ENTÃO score incrementa, combo cresce, fruta split em 2 metades
  E mão errada não causa corte (proximidade ignorada)
```

### CT02 — Bomba penaliza

```
DADO partida ativa (após BOMB_GRACE_MS)
QUANDO mão dominante corta bomba
ENTÃO lives -= 1, screenShake dispara, combo reseta para 0
  E ao zerar 3 vidas → cena MiniGameResult com extra.bestCombo
```

### CT03 — Fruta perdida = -1 vida

```
DADO fruta spawnada
QUANDO ela atravessa a tela e despawna sem ser cortada
ENTÃO lives -= 1
  E bomba que despawna NÃO subtrai vida (passar reto é correto)
```

### CT04 — Auto-detect mão dominante

```
DADO intro ativa por 3s
QUANDO jogador acena a mão direita (deslocamento total > esquerda)
ENTÃO mão dominante = R, hand glow ativa só no idx 16
QUANDO jogador imóvel por 3s
ENTÃO fallback = mão direita
```

### CT05 — `?debug=1` keyboard/mouse fallback [E2E click-by-click]

> ⚠️ Mini-jogo é cena Phaser pura sem rotas; "click-by-click" aqui significa **fluxo manual em browser com câmera fake** validando o jogo end-to-end com `?debug=1`. Não é Playwright tradicional (web app não-cena), mas segue o spírito de validar UI ponto-a-ponto.

**Pré-condições:** `npm run dev` rodando, navegar para `https://localhost:5173/?debug=1` (mkcert).

**Sequência:**
1. Tela `Welcome` → screenshot
2. Click "Jogar" → `MiniGamesHub` → screenshot da hub
3. Click categoria "Mira" → screenshot dos cards
4. Verificar card "Ninja Fruit" presente → click
5. `BodyCheck` (com câmera fake) → screenshot
6. Aguardar countdown → entrar em `NinjaFruit` → screenshot da intro "acene a mão"
7. Aguardar 3s → screenshot da fase play (deve ter timer 60s, lives 3, hand glow)
8. Mover ponteiro do mouse atravessando uma fruta → screenshot do split + ponto
9. Mover sobre uma bomba (após 5s) → screenshot do flash + screenShake
10. Continuar até zerar vidas OU forçar `__movemoveDebug.endNinja()` (helper a expor) → screenshot do `MiniGameResult`
11. Verificar `extra.bestCombo` exibido na tela de resultado

**Saída:**
- Screenshots em `load-tests/results/issue-15-journey/01.png` ... `11.png`
- README listando: cards visuais OK, hand glow correto, score sobe, lives caem, MiniGameResult mostra bestCombo

### CT06 — Categoria "Mira" no hub

```
DADO usuário entra no MiniGamesHub
QUANDO escolhe categoria "Mira & Reflexo"
ENTÃO vê 4 cards: Mata Mosca, Bate Castor, Roda Tronco, **Ninja Fruit**
  E o card de Ninja Fruit tem ícone de katana ou fruta cortada
```

## Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Velocity tracker como sistema puro (`src/game/systems/wristVelocity.ts`) e não método na cena | Reuso futuro: outros mini-jogos podem precisar (slap, swing). Lógica testável isoladamente |
| Trail visual em arquivo separado (`src/game/ui/sliceTrail.ts`) | Cosmético, isolável, pode evoluir pra efeito mais sofisticado sem tocar lógica do jogo |
| `Fruit` unifica fruta+bomba via `kind` (não duas classes) | Espelha `Castor.ts`, reduz duplicação de física e tweens |
| Fluxo Hub → BodyCheck → NinjaFruit (sem picker) | Consistente com 7 dos 8 mini-jogos atuais; só Castor tem picker (1P/2P) |

## Fora do Escopo

- Modo 2 jogadores
- Power-ups (fruta especial, fruta congelada, frutas multi-corte)
- Música MIDI dedicada (reusa AudioBus)
- Compilação do `pt-BR.po` (continua identity fallback)
- Persistência de high-score em `RunHistoryStore`
- Sprites finais de fruta/bomba (MVP usa emojis tipo `🍎🍌🍉💣`, igual Castor)

## Docs canônicas a atualizar

- [x] `/docs/CODEMAP.md` — adicionar linha em "Cenas Phaser registradas"
- [x] `/docs/GAMES.md` — nova seção "13. Ninja Fruit"
- [x] `/docs/CHANGELOG.md` — entrada Issue #15
- [ ] `/docs/MODULES.md` — N/A (sem módulo novo, só arquivos dentro de módulos existentes)
- [ ] `/docs/ARCHITECTURE.md` — N/A (sem container/serviço novo)
- [ ] `/docs/database-documentation.md` — N/A
- [ ] `/docs/movimentos.md` — N/A (não introduz novo movimento detectado pelo `EventDetector`)
