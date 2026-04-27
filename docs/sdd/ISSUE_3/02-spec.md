# Especificação — Fase 1: endless runner mínimo (Phaser 4 + 3 lanes + obstáculos)

**Issue:** #3
**Data:** 2026-04-26
**Status:** Aguardando implementação
**Baseado em:** `01-research.md` + ADRs 1, 2, 4, 5, 6 (study #1) + `EXERGAME_PROJETO.md` Seção 5

## Objetivo

Transformar a PoC da Fase 0 em jogo PWA jogável: endless runner pseudo-3D pixel art com 3 lanes, obstáculos, moedas e core loop fechado, controlado pelos `GameEvent` do `pose/events.ts`. Primeira versão entregável (v0.1) — provar que pose layer + Phaser 4 entregam game feel suficiente pra criança jogar sozinha.

## Requisitos Funcionais

- [ ] **RF01** Cena `Boot` carrega assets (sprites, sons, bitmap font, fundos pseudo-3D) com tela "Carregando…" usando bitmap font.
- [ ] **RF02** Cena `Welcome` mostra título do jogo + bonequinho mascote estático + botão grande "Começar" — leva a `Loading`.
- [ ] **RF03** Cena `Loading` mostra status do download/init do MediaPipe ("Inicializando WASM…", "Baixando modelo…", "Pronto") — chama `start()` do orquestrador (mesmo flow da Fase 0 — `loadModel` + `openCamera` + `start`).
- [ ] **RF04** Cena `Tutorial` (apenas na 1ª vez por device, flag em `localStorage` `movemove.tutorialDone=true`) mostra 3 slides estáticos com bonequinho + texto bitmap font: "PULE ↑", "AGACHE ↓", "MUDE DE LANE ←/→". Botão "Pular" sempre visível. Avança via tap/click; após o 3º slide, vai pra `Calibration`.
- [ ] **RF05** Cena `Calibration` reusa `Calibrator` da Fase 0 (`feed()` frame a frame). Mostra `<video>` ao fundo + `KeypointOverlay` por cima + countdown 3-2-1 em bitmap font centralizado + texto "Fique parado, braços ao lado". Em sucesso vai pra `Play`. Em falha (`reason: 'low_confidence'`) volta pro countdown automaticamente.
- [ ] **RF06** Cena `Play` (loop principal):
  - Personagem (32×32 sprite Kenney) na lane central inicial.
  - Estrada pseudo-3D com 3 linhas convergentes pro horizonte (sistema `road.ts`).
  - Paralax de fundo em 3 camadas (sky / mountains-far / mountains-near).
  - Spawner gera obstáculos (`barrier`, `low_barrier`, `wall_lane`) e clusters de moedas, com spawn rate variável por tempo.
  - Velocidade do mundo: 5 m/s inicial, +1 m/s a cada 30s, max 15 m/s.
  - Cada obstáculo/moeda tem `z` em [1.0, 0.0]; renderizado com escala via `pseudo3d.zToScale(z)` e Y via `pseudo3d.zToY(z)`.
  - Mini-preview da câmera no canto superior direito (160×90) reusando `KeypointOverlay`.
  - HUD bitmap font no canto superior esquerdo: distância em metros + moedas coletadas.
- [ ] **RF07** Personagem responde a `GameEvent` da bus do `EventDetector`:
  - `jump` → animação de pulo (parábola por 600ms, máximo 80px acima da altura base).
  - `duck` → animação de deslize (sprite encolhe verticalmente por 800ms).
  - `lane_change` → reposiciona o personagem na lane (`-1`, `0`, `1`) instantaneamente; sprite inclina por 200ms (rotação ±15°).
  - `arms_up`, `cadence`, `jumping_jack` na Fase 1 são **ignorados** pelo gameplay (mas continuam aparecendo no painel debug).
- [ ] **RF08** Sistema de colisão: quando obstáculo entra na zona próxima (`z < 0.15`) e a lane do obstáculo == lane do player, e o player NÃO está em estado de evasão (`jump` para `barrier`, `duck` para `low_barrier`, lane diferente para `wall_lane`), dispara `gameOver`.
- [ ] **RF09** Coleta de moeda: quando moeda entra em `z < 0.10` e lane do player == lane da moeda, soma +1 ao contador, toca som `coin.wav`, remove sprite.
- [ ] **RF10** Cena `GameOver` mostra:
  - Distância final em metros (bitmap font grande).
  - Moedas coletadas.
  - Recorde do device (de `localStorage.movemove.bestDistance`); se quebrou recorde, marca "NOVO RECORDE!".
  - Botão "Jogar de novo" → reinicia `Play`.
  - Botão "Recalibrar" → vai pra `Calibration`.
- [ ] **RF11** Banner de drift de calibração da Fase 0 (low confidence ≥10s) continua aparecendo durante `Play` como overlay (não pausa o jogo); botão "Recalibrar" do banner vai pra `Calibration` (perde a partida — comportamento aceitável).
- [ ] **RF12** Estado "no body" da Fase 0 (sem keypoints por 1.5s) durante `Play` mostra overlay "Apareça pra câmera 👋" e **pausa** (Phaser scene paused; spawner congela; tempo congela). Volta automaticamente quando keypoints retornam.
- [ ] **RF13** Modo debug `?debug=1` continua ativando `KeyboardDebug` (Space/←/→/↓/J/R) e o painel debug HTML por cima do canvas Phaser; flag adicional `?seed=N` torna spawning determinístico (RNG seedado) pra Playwright.
- [ ] **RF14** Detecção de orientação: se `window.matchMedia('(orientation: portrait)').matches` em mobile, mostra overlay HTML "Vire o celular pra paisagem" com ilustração — o jogo continua jogável em retrato (overlay tem botão "Continuar assim mesmo").
- [ ] **RF15** Sons: `jump.wav` no evento jump, `coin.wav` na coleta, `hit.wav` na colisão, `gameover.wav` ao entrar em `GameOver`. Ícone de mute no canto inferior direito do canvas; estado mute persistido em `localStorage.movemove.muted`.
- [ ] **RF16** Tela de erro fatal pré-jogo (cameraDenied, cameraNotFound, insecureContext, modelDownload) reusa `errorScreen.ts` HTML da Fase 0 — mostrada por cima do canvas Phaser (que nem chega a inicializar pra valer).
- [ ] **RF17** PWA básico: `manifest.webmanifest` em `public/`, `<link rel="manifest">` no `index.html`, ícones 192/512 em `public/icons/`. **Sem `display: standalone`** (`display: browser`). Risco iOS PWA + getUserMedia documentado.

## Requisitos Não-Funcionais

- [ ] **RNF01** FPS ≥ 30 sustentado durante `Play` no celular alvo (iPhone SE 2020). Meta: 60 FPS; aceito 30 FPS temporariamente. Medido pelo HUD `?fps=1` ou painel debug. (CT01 manual humano valida.)
- [ ] **RNF02** Latência de evento `pose → ação visual no Phaser` < 100ms. Meta: < 80ms (15-30ms inferência MediaPipe + 1 frame EMA + 1 frame Phaser ≈ 65ms). (CT01 manual.)
- [ ] **RNF03** Boot `Welcome` → `Calibration` jogável < 8s em rede 4G real. Cache pós-1ª visita ≤ 2s. (CT01 manual.)
- [ ] **RNF04** Bundle final ≤ 11MB gzipped (≈ 20MB uncompressed). Aceito como nova baseline — RNF04 da Fase 0 (5MB) declarado irreal. Documentado em `CHANGELOG.md` e `CODEMAP.md`.
- [ ] **RNF05** Privacidade: frames nunca saem do device. Mesmo `getUserMedia` em resposta a clique do usuário. Modelo + WASM same-origin (Cloudflare Pages).
- [ ] **RNF06** Sem PWA standalone. `display: browser` no manifest.
- [ ] **RNF07** A11y: botões com `aria-label`, contraste OK, focus visível. Bitmap font dentro do canvas é decorativa; tela de erro HTML mantém leitura por screen reader.
- [ ] **RNF08** Responsivo: canvas Phaser usa `Phaser.Scale.RESIZE` ou `FIT` (preferir `FIT` pra preservar proporção 16:9 do design pseudo-3D). Funciona em retrato (com aviso) e paisagem.
- [ ] **RNF09** Robustez baixa luz: banner low light da Fase 0 continua. Player do jogo NÃO pausa por isso (só drift recalibrate ≥10s sugere recalibrar).
- [ ] **RNF10** Offline pós-cache: `_headers` da Cloudflare Pages com `Cache-Control: max-age=31536000, immutable` para modelo, WASM, sprites, sons, bitmap font.
- [ ] **RNF11** Sem crash, freeze ou drift catastrófico em sessão de 10 min contínuos. (CT01 manual.)

## Modelo de Dados

### Persistência local (`localStorage`)

| Chave | Tipo | Default | Uso |
|-------|------|---------|-----|
| `movemove.bestDistance` | number (metros) | 0 | Recorde local — atualizado em `GameOver` |
| `movemove.tutorialDone` | boolean | false | Pula `Tutorial` se true |
| `movemove.muted` | boolean | false | Estado do botão mute |

Sem IndexedDB nesta fase. (Fase 2 introduz `idb-keyval` pra missões, perfil.)

### Não há tabelas (sem backend, sem schema.prisma)

## API

Sem endpoints HTTP. Sem AI service. Tudo client-side.

### Comunicação interna (entre módulos)

| Origem | Destino | Mecanismo | Payload |
|--------|---------|-----------|---------|
| `PoseDetector` | Subscribers (`Calibrator`, `EventDetector`, `cameraPreview`) | `onFrame(cb)` | `PoseFrame` |
| `EventDetector` | Cenas Phaser (`Play`, `GameOver`) | `addEventListener('event', cb)` (EventTarget) | `CustomEvent<GameEvent>` |
| `KeyboardDebug` | `EventDetector` (via callback do construtor) | `dispatchEvent` | `GameEvent` com `source: 'kbd'` |
| `Calibrator.feed()` | Cena `Calibration` | retorno síncrono | `CalibrationOutcome` ou `null` |

## Frontend — cenas e componentes

### Cenas Phaser a criar

| Arquivo | Descrição | Transições |
|---------|-----------|------------|
| `src/game/scenes/Boot.ts` | Carrega assets, mostra "Carregando…" bitmap font. | → `Welcome` |
| `src/game/scenes/Welcome.ts` | Título + mascote + botão "Começar". | → `Loading` |
| `src/game/scenes/Loading.ts` | Status do MediaPipe load. Em sucesso → `Tutorial` (ou `Calibration` se `tutorialDone`). Em erro → mostra HTML errorScreen. | → `Tutorial` ou `Calibration` ou erro HTML |
| `src/game/scenes/Tutorial.ts` | 3 slides com bonequinho. Botão "Pular" sempre. Marca `localStorage.movemove.tutorialDone=true` ao final. | → `Calibration` |
| `src/game/scenes/Calibration.ts` | Vídeo + keypoints + countdown 3-2-1. Consome `Calibrator.feed`. | → `Play` |
| `src/game/scenes/Play.ts` | Loop principal: spawner, scroll, colisão, scoring, HUD, mini-preview. | → `GameOver` (na colisão) ou `Calibration` (se clicar Recalibrar do banner) |
| `src/game/scenes/GameOver.ts` | Distância + moedas + recorde + 2 botões. | → `Play` ou `Calibration` |

### Sistemas e entidades

| Arquivo | Propósito |
|---------|-----------|
| `src/game/orchestrator.ts` | Cria `PoseDetector`, `EmaSmoother`, `Calibrator`, `EventDetector`, `KeyboardDebug`. Cria `Phaser.Game`. Compartilha refs via `game.registry.set('eventDetector', ...)` etc. Inicia RAF do detector. |
| `src/game/config.ts` | Constantes do jogo (velocidades, spawn rates, dimensões, paleta, recorde key). Separado de `POSE_CONFIG`. |
| `src/game/entities/Player.ts` | Sprite + animação de corrida + métodos `jump()/duck()/setLane(l)/setRotation`. Listener no bus. |
| `src/game/entities/Obstacle.ts` | Tipo: `'barrier' | 'low_barrier' | 'wall_lane'`. Lane (-1/0/1). Z. Sprite. |
| `src/game/entities/Coin.ts` | Lane. Z. Sprite (animação rotação). |
| `src/game/systems/road.ts` | Desenha estrada 3 lanes pseudo-3D (linhas convergentes + faixas + horizonte). Atualiza com offset por velocidade. |
| `src/game/systems/parallax.ts` | 3 camadas de fundo com velocidades diferentes (sky 0.1×, far 0.3×, near 0.6×). |
| `src/game/systems/pseudo3d.ts` | Helpers: `zToScale(z) = lerp(0.1, 1.5, 1-z)`, `zToY(z) = horizon + (height - horizon) * (1-z)`, `laneToX(lane, z)` (lanes convergem pro centro no horizonte). |
| `src/game/systems/spawner.ts` | Decide quando spawnar (`elapsed`, `nextSpawnAt`). Tipo de obstáculo aleatório (RNG seedável). Cluster de 5 moedas a cada ~50m. |
| `src/game/systems/scoring.ts` | `addDistance(dt, speed)`, `addCoin()`, `getDistance()`, `getCoins()`, `getBest()`, `setBest()` (localStorage). |
| `src/game/systems/collision.ts` | `check(obstacles, player)` retorna `{ collided: boolean, obstacle?: Obstacle }`. |
| `src/game/systems/rng.ts` | `mulberry32` ou `splitmix32` seedável; usado pelo spawner; default = `Math.random()` quando sem `?seed=`. |
| `src/game/ui/cameraPreview.ts` | Cria canvas DOM 160×90 absoluto top-right (z-index acima do canvas Phaser); reusa `KeypointOverlay` pra desenhar. |
| `src/game/ui/hud.ts` | Bitmap font: distância e moedas top-left. FPS opcional via `?fps=1`. |
| `src/game/ui/orientationGuard.ts` | Detecta retrato em mobile; cria overlay HTML "Vire o celular" com botão "Continuar". |

### Páginas/componentes Fase 0 a remover ou modificar

| Arquivo | O que muda |
|---------|------------|
| `src/main.ts` | **Reescrito**. Vira só `import { startApp } from './game/orchestrator.ts'; startApp();` |
| `index.html` | **Simplificado**. Remove pips, telas welcome/loading/calibration HTML, no-body-overlay. Mantém: `<video id="video" hidden>`, `<canvas id="overlay" hidden>` (compatibilidade — keypointOverlay pinta em qualquer canvas), `<div id="game">` (host Phaser), `<aside id="debug-panel" hidden>`, `<button id="debug-toggle" hidden>`, `<section id="screen-error" hidden>` (errorScreen reusado), `<div id="orientation-overlay" hidden>` (novo), `<div id="camera-preview" hidden>` (mini-preview HTML novo), `<link rel="manifest" href="/manifest.webmanifest">` |
| `src/ui/welcomeScreen.ts` | **Removido** após cena Welcome funcionar |
| `src/ui/loadingScreen.ts` | **Removido** |
| `src/ui/calibrationScreen.ts` | **Removido** |
| `src/ui/eventOverlay.ts` | **Removido** (substituído por animação do Player no canvas) |
| `src/ui/noBodyScreen.ts` | **Removido** (cena Play lida) |
| `src/ui/errorScreen.ts` | **Mantido** — fallback fatal HTML |
| `src/ui/debugPanel.ts` | **Mantido** simplificado (FPS / Conf / Lane / Cadência / log de eventos) |
| `src/ui/keypointOverlay.ts` | **Mantido** — usado em `cameraPreview` |
| `src/styles.css` | Remove regras de event-pip, screen-* (welcome/loading/calibration/no-body-overlay). Adiciona regras pra `#camera-preview` e `#orientation-overlay` |

### Componentes reutilizados (do CODEMAP)

- `PoseDetector`, `EmaSmoother`, `Calibrator`, `EventDetector`, `KeyboardDebug` — pose layer inteira (invariante).
- `KeypointOverlay` — dentro do `cameraPreview`.
- `errorScreen.ts` — fallback fatal HTML.
- `debugPanel.ts` — painel debug HTML.
- `strings.ts` — estendido com novas chaves.

## Assets a baixar/gerar

| Asset | Origem | Local | Como obter |
|-------|--------|-------|------------|
| Player sprite (running 6 frames) | edermunizz Pixel Art Infinite Runner | `public/assets/sprites/runner/player_run.png` (sheet) | Download manual de https://edermunizz.itch.io/free-pixel-art-platform-game (arquivo grátis); verificar `LICENSE.txt` permite uso comercial; se não, fallback Kenney |
| Player sprite (jump, duck, idle) | mesmo pack ou Kenney Pixel Platformer Redux | `public/assets/sprites/runner/player_*.png` | Mesmo download |
| Obstáculo: barrier | Kenney Pixel Platformer Blocks | `public/assets/sprites/obstacles/barrier.png` | https://kenney.nl/assets/pixel-platformer-blocks |
| Obstáculo: low_barrier | Kenney | `public/assets/sprites/obstacles/low_barrier.png` | mesmo |
| Obstáculo: wall_lane | Kenney | `public/assets/sprites/obstacles/wall.png` | mesmo |
| Coin (8 frames spin) | Kenney UI Pack ou Pixel Platformer | `public/assets/sprites/coin.png` | mesmo |
| Sky background | Kenney Background Pack | `public/assets/bg/sky.png` | https://kenney.nl/assets/background-elements |
| Mountains far | mesmo | `public/assets/bg/mountains_far.png` | mesmo |
| Mountains near | mesmo | `public/assets/bg/mountains_near.png` | mesmo |
| Bitmap font (PT-BR glyphs) | gerada via `bmfont` ou snippet manual de "Press Start 2P" (Google Fonts, OFL) | `public/assets/fonts/pixel.fnt` + `pixel.png` | Gerar com glifos `A-Z 0-9 . , ! ? ÁÂÃÉÊÍÓÔÚÇ áâãéêíóôúç` |
| Sons: jump, coin, hit, gameover | Kenney Audio Sounds | `public/assets/sounds/{jump,coin,hit,gameover}.wav` | https://kenney.nl/assets/sounds |
| Ícones PWA 192/512 | gerar (figma/inkscape ou usar mascote Kenney) | `public/icons/icon-192.png`, `icon-512.png` | manual |
| Mascote (logo, estático) | Kenney character | `public/assets/sprites/mascot.png` | mesmo |

**Licenças:** Kenney = CC0 (sem atribuição obrigatória). edermunizz = verificar arquivo `LICENSE.txt` na fonte do pack. Se incompatível, usar só Kenney (perde animação de corrida polida — aceitável). Press Start 2P = SIL Open Font License (compatível).

## Cenários de Teste (OBRIGATÓRIOS)

### CT01 — Filho do dev joga partida completa (E2E manual humano) [pendência da Fase 0 reagendada]

```
DADO QUE filho do dev abre https://movemove.pages.dev no celular alvo (iPhone SE 2020)
QUANDO ele segue tutorial (1 min) e calibra
ENTÃO joga partida sem ajuda e dura ≥ 60s sem morrer por bug
E observações:
- FPS médio ≥ 30 (HUD ?fps=1 ou painel debug)
- Latência percebida pose → ação < 100ms (subjetivo)
- Acerto de jump/duck/lane > 85% (em 20 tentativas, ≤ 3 perdas)
- Falsos positivos de jump em 30s parado: ≤ 2
- Sessão de 10 min sem crash, freeze, drift catastrófico
```

Resultados em `load-tests/results/issue-3-journey/README.md` + screenshots em `screenshots/`. Devices: iPhone SE 2020, Galaxy A54, MacBook Air M1. Iluminações: dia / noite com luz acesa / contraluz.

### CT02 — Câmera negada → Error screen HTML (regressão Fase 0)

```
DADO QUE getUserMedia rejeita com NotAllowedError
QUANDO usuário clica "Começar"
ENTÃO Phaser Game permanece escondido / não inicializa pra valer
E errorScreen HTML é mostrada com strings.error.cameraDenied
E botão "Tentar de novo" reinicia o fluxo
```

Cobertura via Playwright: adapta `e2e/issue-2.spec.ts:69-100` pro novo fluxo Phaser. Screenshot `02-camera-denied.png`.

### CT03 — Falha de download do modelo

```
DADO QUE fetch do .task model falha (network error)
QUANDO loadModel() lança
ENTÃO classifyError retorna 'modelDownload'
E errorScreen mostra strings.error.modelDownload
```

Cobertura via Playwright com route mock (`page.route('**/pose_landmarker_lite.task', r => r.abort())`). Screenshot `03-model-fail.png`.

### CT04 — Modo debug `?debug=1` com keyboard fallback durante Play

```
DADO QUE o usuário acessa ?debug=1&seed=42 (spawning determinístico)
QUANDO calibração é pulada (já tem baseline mockado via window.__movemoveDebug.transitionTo)
E na cena Play o usuário pressiona Space, Espaço, ←, →, ↓
ENTÃO debug panel mostra entradas [KBD] jump, lane=-1, lane=1, duck
E o personagem do canvas Phaser executa as ações
```

Cobertura via Playwright + window debug helper. Screenshot `04-debug-play.png`.

### CT05 — Game over após colisão (E2E click-by-click) [E2E click-by-click]

**Pré-condições:** stack local rodando (`npm run dev`), Playwright com `--use-fake-device`, `?debug=1&seed=42`.

**Sequência (executar via Playwright):**

1. Acessar `https://localhost:5173/?debug=1&seed=42`.
2. Verificar cena `Welcome`: título, mascote, botão "Começar" visível.
3. Clicar "Começar".
4. Esperar `Loading` resolver (espera por `__movemoveDebug.getState() === 'tutorial'` ou `'calibration'`).
5. Se for `tutorial`: clicar "Pular" → vai pra `Calibration`.
6. Em `Calibration`: forçar baseline mock via `window.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2 })` (helper exposto em modo debug).
7. Esperar transição pra `Play`. Verificar HUD com "0 m" e "0 moedas".
8. Pressionar `Space` (jump), verificar animação do personagem (sprite Y diminui).
9. Pressionar `←`, verificar lane do player = -1.
10. Pressionar `→` 2x, verificar lane = 1.
11. Pressionar `↓` (duck), verificar sprite encolhe.
12. Esperar colisão (com `seed=42`, sabemos a sequência de spawn — esperar ~10s para um obstáculo `barrier` na lane atual SEM pular).
13. Verificar transição automática pra `GameOver`.
14. Em `GameOver`: validar texto "DISTÂNCIA", número, "MOEDAS", botões "Jogar de novo" e "Recalibrar" visíveis.
15. Clicar "Recalibrar" → vai pra `Calibration`.
16. Recarregar página + ir até `Play` de novo, clicar mute toggle (botão `data-action=mute` no canto inferior direito) → verificar `localStorage.movemove.muted === 'true'`.

**Saída obrigatória:**
- Screenshots numerados em `load-tests/results/issue-3-journey/screenshots/` (`01-welcome.png`, `02-loading.png`, `03-tutorial.png`, `04-calibration.png`, `05-play-initial.png`, `06-play-jump.png`, `07-play-lane-right.png`, `08-game-over.png`, `09-recalibrate.png`, `10-mute-toggled.png`).
- README.md no mesmo diretório listando o que foi testado e bugs achados.
- Comentário na issue com link dos screenshots.

**Critério de aceitação:** zero botão silencioso (sem handler), nenhuma cena trava ou pula sem o usuário comandar, mute persiste após reload, E2E completo em ≤ 90s.

### CT06 — Tutorial roda só na 1ª vez

```
DADO QUE localStorage.movemove.tutorialDone = false
QUANDO usuário avança Welcome → Loading → ...
ENTÃO entra em Tutorial
E ao concluir, localStorage.movemove.tutorialDone === 'true'
E ao recarregar, o fluxo pula Tutorial e vai direto pra Calibration
```

Cobertura via Playwright. Screenshot `06-tutorial-skipped.png` (segunda visita).

### CT07 — No body durante Play pausa o jogo

```
DADO QUE Play está rodando
QUANDO PoseFrames param de chegar por > 1.5s
ENTÃO overlay "Apareça pra câmera 👋" aparece
E spawner/scroll congelam (verificável: distância no HUD não muda)
E ao retornar keypoints, jogo retoma sem perder estado
```

Cobertura difícil 100% E2E (precisa stub de pose layer); **descrito mas teste é manual no CT01**. Implementação verificável por inspeção de código.

### CT08 — Recorde local persiste e é exibido

```
DADO QUE localStorage.movemove.bestDistance = "100"
QUANDO o usuário joga e morre com distância < 100
ENTÃO GameOver mostra "Recorde: 100 m" sem "NOVO RECORDE"
QUANDO joga e morre com distância > 100
ENTÃO GameOver mostra "NOVO RECORDE" e localStorage.movemove.bestDistance é atualizado pra novo valor
```

Cobertura via Playwright. Screenshot `08-new-record.png`.

### CT09 — Orientation guard em retrato (mobile)

```
DADO QUE viewport simulado em retrato (Playwright `viewport: { width: 390, height: 844 }`)
QUANDO carrega a página
ENTÃO overlay "Vire o celular pra paisagem" aparece
E o jogo continua funcional (botão "Continuar assim mesmo" fecha overlay)
```

Cobertura via Playwright em browser mobile. Screenshot `09-orientation.png`.

## Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Pose layer com RAF próprio (independente do `Phaser.Game.loop`) | Isolamento entre detecção e renderização — cena `GameOver` pausa o Phaser mas pose continua coletando frames pra calibração e debug. Já era assim na Fase 0. |
| Bus de eventos via `EventTarget` (não trocar pra `mitt` ou `Phaser.Events`) | Fase 0 usa `EventTarget`. Trocar bus quebra invariante "pose layer inalterada entre fases". `EventDetector extends EventTarget` funciona dentro do Phaser sem problema. |
| Passar refs (eventDetector, calibrator, etc) via `Phaser.Game.registry` | Padrão Phaser 4 idiomático para compartilhar entre cenas, melhor que singletons globais. |
| Recorde em `localStorage` (não IndexedDB) | 1 número, sem migração futura significativa. `idb-keyval` chega na Fase 2 com missões/perfil. |
| Tutorial 1× por device (flag local) | UX padrão de jogos infantis; criança não quer ver tutorial toda vez. |
| Sem `display: standalone` no manifest | Risco iOS PWA + getUserMedia (study #1). |
| Bitmap font dentro do canvas + system fonts no HTML | ADR-2 study #1. |
| Spawning seedável via `?seed=N` | Necessário pra Playwright determinístico; também útil pra debug humano. |
| Pseudo-3D com `z` discreto (6 valores) | Simplifica spawning e collision; visual ainda lê como profundidade (ADR-6). |
| Velocidade do mundo em metros/s, distância em metros | Mais palpável pra criança que "tempo decorrido" (Seção 5.4 doc base). |

## Fora do Escopo

- Sistema de cadência de corrida (Fase 2).
- Polichinelos como power-up (Fase 2).
- Braços-pra-cima como ataque/escudo (Fase 2).
- Música ritmada (Fase 2).
- Narrador motivador (Fase 2).
- Missões diárias / IndexedDB (Fase 2).
- Múltiplos personagens / mundos / modos (Fase 3).
- Modo dois jogadores (Fase 3).
- Service worker / cache offline custom (Fase 3 ou nunca).
- PWA standalone (Fase 3).
- Integração com smartwatch, login, leaderboard, multiplayer (Fase 4).

## Docs canônicas a atualizar (após implementação)

- [x] `/docs/CODEMAP.md` — atualizar fase para 1, adicionar `src/game/`, marcar Phaser 4 como adotado, atualizar achados de bundle/FPS, atualizar histórico SDD com #3 mergeada.
- [ ] `/docs/MODULES.md` — N/A (não há módulos múltiplos ainda).
- [x] `/docs/ARCHITECTURE.md` — adicionar camada `Game (Phaser)` entre `Event Bus` e `UI Layer`; atualizar state machine pra refletir cenas Phaser.
- [ ] `/docs/MODULO_GAME.md` — N/A nesta fase (mais útil quando há múltiplos módulos paralelos).
- [ ] `/docs/database-documentation.md` — N/A (sem persistência além de localStorage).
- [ ] `/docs/database-schema-reference.md` — N/A.
- [ ] `/docs/PADROES_API_FRONTEND.md` — N/A (sem APIs HTTP).
- [x] `/docs/CHANGELOG.md` — entrada `2026-XX-XX — #3 — feat: Fase 1 — endless runner mínimo (Phaser 4)`.
- [x] `EXERGAME_PROJETO.md` — Atualizar Seção 5.6 marcando Fase 1 como entregue (com link pro deploy v0.1).

## Próximos passos

1. `/sdd-execute 3` (cadenciado por fase) ou `/sdd-execute 3 --auto` (batch).
2. Após merge: validação manual humana CT01 → atualizar `04-acceptance.md`.
3. `/sdd-plan 4` para Fase 2 quando CT01 confirmar Fase 1 jogável.

*Fim da spec.*
