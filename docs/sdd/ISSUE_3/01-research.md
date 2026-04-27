# Pesquisa — Fase 1: endless runner mínimo (Phaser 4 + 3 lanes + obstáculos)

**Issue:** #3
**Data:** 2026-04-26
**Tipo:** feature
**Baseado em:** `00-design.md` (esta issue) + study #1 (ADRs 1, 2, 4, 5, 6)

---

## Problema / Necessidade

A Fase 0 entregou detector de pose + 6 heurísticas + bus de eventos rodando em produção (`https://movemove.pages.dev`). Sem jogo. A Fase 1 transforma isso em PWA jogável: endless runner pseudo-3D estilo Enduro/Out Run em pixel art, 3 lanes, obstáculos vindo do horizonte, moedas, scroll infinito, controlado pelos mesmos `GameEvent` do `pose/events.ts`.

Critério de validação subjetivo (Seção 5.5): filho do dev consegue jogar partida completa sem ajuda após 1 min de tutorial; sessão de 10 min sem crash, freeze ou drift.

Esta fase é a **primeira que mistura camadas** (pose + game). Estabelece o contrato `pose/* → bus → cenas Phaser` que sobrevive até Fase 3.

---

## Análise de Dependências

### O que já existe e reuso (fonte: CODEMAP + leitura direta da Fase 0)

| Item | Localização | Como uso |
|------|-------------|----------|
| `PoseDetector` (MediaPipe + getUserMedia) | `src/pose/poseDetector.ts` | Inalterado. Continua emitindo `PoseFrame` via `onFrame()` |
| `EmaSmoother` (α=0.5) | `src/pose/smoother.ts` | Inalterado |
| `Calibrator` (2s contínuos, 4 baselines) | `src/pose/calibration.ts` | Inalterado. Cena `Calibration` consome `feed()` frame a frame |
| `EventDetector` (6 heurísticas + bus) | `src/pose/events.ts` | Inalterado. Cena `Play` adiciona listener no bus |
| `KeyboardDebug` (`?debug=1`, Space/←/→/↓/J/R) | `src/debug/keyboard.ts` | Inalterado. Continua disparando `GameEvent` no bus |
| Tipos `Keypoint/PoseFrame/Baseline/GameEvent/Lane` | `src/pose/types.ts` | Inalterado. `Lane` (`-1 | 0 | 1`) **já casa exatamente** com as 3 lanes do jogo |
| `POSE_CONFIG` (thresholds, MediaPipe) | `src/pose/config.ts` | Inalterado. Adiciono `GAME_CONFIG` separado em `src/game/config.ts` |
| `KeypointOverlay` (canvas 33 pts + connections) | `src/ui/keypointOverlay.ts` | Reuso direto na mini-preview da câmera. Renderiza num canvas pequeno (160×90) |
| `strings.ts` (PT-BR, sem framework — ADR-1) | `src/i18n/strings.ts` | **Estendo** com chaves `tutorial.*`, `play.*`, `gameOver.*`, `orientation.*` |
| `<video>` + getUserMedia + MediaPipe lite | `index.html` + `public/models/` + `public/wasm/` | Inalterados. Vídeo continua escondido (input só pra MediaPipe), Phaser desenha em canvas separado por cima |
| Playwright + `--use-fake-device` | `playwright.config.ts` | Reuso. Adiciono specs para cenas Phaser |
| Cloudflare Pages deploy | `wrangler.toml` + `dist/` | Inalterado |
| HTTPS local via mkcert | `vite.config.ts` | Inalterado |

### O que preciso criar (porque não existe)

| Item | Tipo | Onde viverá | Por que não reuso nada |
|------|------|-------------|------------------------|
| Dep `phaser@^4.0.0` | dependência | `package.json` | ADR-4 do study #1 — engine não estava no repo |
| `GameOrchestrator` | classe TS | `src/game/orchestrator.ts` | Conecta pose layer já existente ao `Phaser.Game`; substitui state machine de `main.ts` da Fase 0 |
| Cena `Boot` | Phaser.Scene | `src/game/scenes/Boot.ts` | Carrega assets (sprites, sons, bitmap font, fundo) — nada equivalente |
| Cena `Welcome` | Phaser.Scene | `src/game/scenes/Welcome.ts` | Substitui `welcomeScreen.ts` HTML por arte pixel + bitmap font |
| Cena `Loading` | Phaser.Scene | `src/game/scenes/Loading.ts` | Substitui `loadingScreen.ts` HTML; mostra status de download de modelo + assets |
| Cena `Tutorial` | Phaser.Scene | `src/game/scenes/Tutorial.ts` | 3 slides pulo/agacha/muda-lane com bonequinho + texto — não existe |
| Cena `Calibration` | Phaser.Scene | `src/game/scenes/Calibration.ts` | Versão Phaser da `calibrationScreen.ts` HTML, mostrando vídeo + keypoints como overlay e bitmap font do countdown |
| Cena `Play` | Phaser.Scene | `src/game/scenes/Play.ts` | Loop principal: spawn, scroll, colisão, scoring, HUD, mini-preview |
| Cena `GameOver` | Phaser.Scene | `src/game/scenes/GameOver.ts` | Mostra distância + moedas + recorde, com "Jogar de novo" / "Recalibrar" |
| `Player` entity | classe TS | `src/game/entities/Player.ts` | Personagem com lane atual, animações de correr/pular/deslizar/inclinar |
| `Obstacle` entity | classe TS | `src/game/entities/Obstacle.ts` | 3 tipos: `barrier` (pular), `low_barrier` (deslizar), `wall_lane` (mudar lane). Cada um tem campo `z` |
| `Coin` entity | classe TS | `src/game/entities/Coin.ts` | Coletável; cluster por lane |
| `pseudo3d` system | módulo TS | `src/game/systems/pseudo3d.ts` | Helpers: `zToScale(z)`, `zToY(z)`, lane-X em função de `z` (perspectiva afim simples) |
| `road` system | módulo TS | `src/game/systems/road.ts` | Renderiza estrada com 3 linhas convergentes pro horizonte (faixas + linha central + bordas) |
| `parallax` system | módulo TS | `src/game/systems/parallax.ts` | 3 camadas de fundo (sky / mountains-far / mountains-near) com velocidades diferentes |
| `spawner` system | módulo TS | `src/game/systems/spawner.ts` | Decide quando spawnar obstáculos e moedas com base em distância acumulada |
| `scoring` system | módulo TS | `src/game/systems/scoring.ts` | Distância em metros + contagem de moedas + recorde via localStorage (idb-keyval só na Fase 2) |
| `collision` system | módulo TS | `src/game/systems/collision.ts` | Bbox 2D check quando obstáculo entra na zona próxima do player (z < threshold) |
| `cameraPreview` UI | módulo TS | `src/game/ui/cameraPreview.ts` | Mini-preview 160×90 no canto, reusa `KeypointOverlay` |
| `hud` UI | módulo TS | `src/game/ui/hud.ts` | Distância (m) + moedas + FPS no canto |
| `orientationGuard` | módulo TS | `src/game/ui/orientationGuard.ts` | Detecta `screen.orientation` e mostra "vire o celular" se retrato + sugere paisagem |
| `GAME_CONFIG` | constantes TS | `src/game/config.ts` | Velocidades, taxas, recorde key, dimensões, paleta — separado de `POSE_CONFIG` |
| `manifest.webmanifest` | arquivo JSON | `public/manifest.webmanifest` | PWA básico **sem `display: standalone`** (ADR study #1: risco iOS PWA + getUserMedia) |
| Sprites Kenney Pixel Platformer Redux | assets PNG | `public/assets/sprites/` | Personagem 32×32 + obstáculos + tiles. CC0. Baixados manualmente |
| Pack edermunizz Infinite Runner | assets PNG | `public/assets/sprites/runner/` | Animação de corrida do personagem. itch.io, licença "free for use" — verificar `LICENSE.txt` antes de comitar |
| Sons Kenney UI Audio | assets WAV/OGG | `public/assets/sounds/` | jump.wav, coin.wav, hit.wav, gameover.wav. CC0 |
| Bitmap font pixel art | XML + PNG | `public/assets/fonts/` | "Press Start 2P" bitmap (CC0 derivada do Google Fonts) ou similar — para HUD e textos dentro do canvas (ADR-2) |
| Background pseudo-3D 3 camadas | assets PNG | `public/assets/bg/` | sky.png, mountains-far.png, mountains-near.png. Kenney background pack |
| Specs Playwright das cenas | arquivos TS | `e2e/issue-3-*.spec.ts` | CTs novos da Fase 1 |

### Padrões canônicos que vou seguir (do CODEMAP + ADRs do study #1)

- **Pose layer abstrai keypoints**: cenas Phaser nunca leem keypoints crus. Subscrevem ao `EventDetector` (bus) e recebem `GameEvent` tipado. (Invariante #1 da `ARCHITECTURE.md`)
- **Thresholds em fração de H_corpo, nunca pixels** — POSE_CONFIG já segue isso; GAME_CONFIG usa coordenadas de tela em pixels (Phaser desenha) e metros para o mundo lógico.
- **Strings em `src/i18n/strings.ts`** — sem framework de runtime na Fase 1 (ADR-1). Estender o objeto existente.
- **Modo debug com `?debug=1`** sempre disponível — `KeyboardDebug` continua sendo a única fonte alternativa de eventos. Adiciono `?fps=1` para mostrar FPS sempre, `?seed=N` para spawning determinístico em test runs.
- **Imports relativos com extensão explícita** (`./Player.ts`, `../pose/events.ts`).
- **Phaser 4** (`phaser@^4.0.0`) — ADR-4. Estável desde abril/2026.
- **Bitmap font pixel art dentro do canvas** desde Fase 1 — ADR-2 revisado.
- **Sem `display: standalone`** no manifest — risco iOS PWA + getUserMedia (study #1, Seção "Risco crítico"). Web app shareable por link, não instalável.
- **Sons via `Phaser.Sound`** — pre-carregados em `Boot`, gain bem baixo no default, mute persistido em localStorage.

---

## Código existente relacionado

| Arquivo | O que faz | Relevância | Ação |
|---------|-----------|------------|------|
| `src/main.ts` | Orquestra state machine HTML (welcome→loading→calibration→active) e RAF do detector | **Alta** | **Reescrito**: passa a só inicializar pose layer + criar `Phaser.Game`, registrar cenas. Cenas tomam conta da UI |
| `src/pose/poseDetector.ts:64-88` | RAF loop interno do detector emite `PoseFrame` | Alta | Mantido. `Phaser.Game` tem seu próprio loop; pose layer roda independente em paralelo (cada um no seu RAF) |
| `src/ui/welcomeScreen.ts` | Tela HTML inicial | Média | Removido após cena `Welcome` Phaser estar funcional |
| `src/ui/loadingScreen.ts` | Tela HTML de loading | Média | Removido após cena `Loading` Phaser estar funcional |
| `src/ui/calibrationScreen.ts` | Tela HTML de calibração (countdown 3-2-1) | Média | Removido após cena `Calibration` Phaser estar funcional |
| `src/ui/errorScreen.ts` | Tela HTML de erro (cameraDenied, etc) | Média | **Mantido** como fallback — se Phaser falhar inicializar (browser muito antigo, WebGL bloqueado), mostro tela HTML pura. Renomeio mental: virou "tela de erro fatal pré-jogo" |
| `src/ui/eventOverlay.ts` + pips no `index.html` | Pips PT-BR para os 6 eventos | Média | **Removido** — substituído por animação do personagem dentro do canvas Phaser |
| `src/ui/debugPanel.ts` | Painel debug HTML (FPS, conf, baseline, log de eventos) | Média | **Mantido**, simplificado. Continua HTML por cima do canvas (z-index). Útil em todas as fases |
| `src/ui/keypointOverlay.ts` | Pinta 33 keypoints em canvas | Alta | Reusado dentro do `cameraPreview.ts` |
| `src/ui/noBodyScreen.ts` | Overlay "apareça pra câmera" | Baixa | Removido — cena `Play` lida com isso (pausa + texto bitmap font) |
| `index.html` | Wrapper HTML com `<video>`, `<canvas>` (33 pts), pips, debug panel, calibração, etc | Alta | **Simplificado**: `<video>` escondido (input MediaPipe), `<div id="game">` (host do canvas Phaser), debug-toggle/panel, error-screen fallback. Removido tudo relacionado a pips e cenas HTML |
| `e2e/issue-2.spec.ts` | Cenários CT02, CT04, CT06 da Fase 0 | Alta | **Mantido como regressão** — câmera negada, keyboard fallback continuam válidos. Adapto seletores se mudar HTML |
| `vite.config.ts`, `tsconfig.json`, `playwright.config.ts` | Build/dev/test infra | Alta | Mantidos. Adiciono `phaser` em `optimizeDeps.include` se necessário |

---

## Decisões tomadas

| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| Pose layer mantém RAF próprio (independente do Phaser.Game) | Pose layer ser tickado pelo `Phaser.Scene.update` | RAF da MediaPipe casa com `requestVideoFrameCallback`-like padrão; acoplar ao update do Phaser arrisca perder frames quando cena pausa (`GameOver`) — eventos param de chegar e calibração quebra |
| `Phaser.Game` hospedado em `<div id="game">`, vídeo escondido em `<video id="video">` separado | Phaser.Video carregar a webcam | Phaser.Video não foi desenhado pra `getUserMedia` real-time + MediaPipe; mantemos o `<video>` da Fase 0 como input do MediaPipe e desenhamos mini-preview separado |
| GameEvents continuam saindo do `EventDetector` (não vira `EventEmitter` do Phaser) | Reescrever bus pra `mitt` ou `Phaser.Events.EventEmitter` | Fase 0 já roda; trocar bus quebra a invariante "mesma camada de pose entre fases". Cenas usam `addEventListener('event', …)` no `EventDetector` (`EventTarget` nativo) — funciona dentro do Phaser sem conflito |
| Recorde local em `localStorage` (não IndexedDB ainda) | `idb-keyval` desde Fase 1 | `idb-keyval` é roadmap de Fase 2 (perfil, missões). Recorde único cabe em `localStorage.setItem('movemove.bestDistance', ...)` — 1 linha. Migração futura é trivial |
| Tutorial é cena Phaser dedicada com 3 slides estáticos + bonequinho animado | Tutorial inline na primeira partida | Slides separados são mais didáticos para criança; primeira partida vira "fluxo de jogo limpo" |
| Tutorial roda **uma única vez por device** (flag em localStorage) | Sempre rodar tutorial | UX: pular tutorial após 1ª vez é o comportamento esperado em jogos infantis |
| Mini-preview da câmera: 160×90 no canto **superior direito** | Canto superior esquerdo | Canto direito não compete com HUD principal (distância) que vai no esquerdo. Padrão Subway Surfers |
| Pseudo-3D com 6 valores discretos de `z` (0.0..1.0 step 0.2) por simplicidade | `z` contínuo | Spawning e collision ficam triviais com z discreto. Visual ainda lê como profundidade |
| Velocidade do mundo: 5 m/s inicial, +1 m/s a cada 30s, max 15 m/s | Velocidade contínua linear | Curva degraus combina com tutorial inicial (Seção 5.4 do doc base) |
| Spawn rate: 1 obstáculo a cada 2.5s nos primeiros 20s, depois cai para 1.5s, depois 1.0s | Taxa fixa | Seção 5.4: obstáculos previsíveis nos primeiros 20s |
| Colisão é bbox 2D quando `z < 0.15` (perto do player) | Colisão 3D real | 2D simplifica e é justo: o jogador vê o obstáculo crescer e tem ~1s pra reagir |
| Cluster de 5 moedas em uma lane a cada ~50m | Moedas individuais espalhadas | Cluster é mais satisfatório de coletar e mais legível visualmente em pseudo-3D |
| `manifest.webmanifest` registrado mas **sem** `display: standalone` (`display: browser`) | PWA standalone na Fase 1 | Risco iOS PWA + getUserMedia (study #1). Standalone fica pra Fase 3 quando tivermos tempo de mitigar |
| Bitmap font: gerada de "Press Start 2P" via `BMFont` ou snippet manual; entrega `.fnt` + `.png` em `public/assets/fonts/` | Webfont (`@font-face`) global | ADR-2: bitmap font dentro do canvas é obrigatória pra coerência pixel art. Phaser carrega via `this.load.bitmapFont(...)` |
| Tela de orientação: detecta `window.matchMedia('(orientation: portrait)')` e mostra overlay "vire o celular pra paisagem" — jogo permite jogar em retrato mas com aviso | Forçar paisagem (lock) | `screen.orientation.lock()` falha em iOS; aviso é UX honesta |
| Sem service worker / sem cache offline custom | Service worker pra cachear assets | Cloudflare Pages já entrega `_headers` com `Cache-Control` longo (Fase 0). Service worker traz complexidade (atualizações) que fica pra Fase 3 |

---

## Riscos técnicos

- **Phaser 4 + iOS Safari 26: bug em SpriteGPULayer com WebGL2.** *Mitigação:* fallback `renderer: Phaser.AUTO` (Phaser escolhe Canvas se WebGL falhar). Testar antes do merge no celular alvo. Se quebrar, plano B é Phaser 3 LTS (custo ~1 dia, ADR-4 já prevê).
- **Bundle estoura ainda mais.** Fase 0 já está em ~18MB uncompressed (~9MB gzip). Phaser 4 minified ~250KB + sprites ~500KB + bitmap font ~100KB + sons ~200KB = +1MB. Total estimado: ~19MB / ~10MB gzip. *Mitigação:* RNF04 já foi aceito como "irreal" no encerramento da Fase 0; documentar nova baseline aqui.
- **MediaPipe inferência (~30ms) + Phaser update (~16ms a 60Hz) competem por main thread em mobile mid-range.** *Mitigação:* MediaPipe usa `delegate: 'GPU'` (já configurado). Em iPhone SE 2020 testar se 30 FPS é mantido com Phaser rodando junto; se não, baixar resolução de input pra 360p ou aumentar `α` do EMA pra 0.7 (descarta frames intermediários).
- **Drift de calibração em sessão longa (criança suando, mexendo a câmera).** *Mitigação:* já há banner "Recalibrar" da Fase 0 quando confiança média baixa por 10s. Cena `Play` deve mostrar esse banner como overlay sem pausar (criança não pode perder partida por isso).
- **Falsos positivos de jump quando criança mexe braços animada.** *Mitigação:* heurística da Fase 0 já tem cooldown de 400ms + exige movimento ascendente. Aumentar cooldown para 600ms se virar problema empírico.
- **Tutorial cansa criança que quer jogar.** *Mitigação:* tutorial roda só na 1ª vez (flag localStorage) + botão "Pular" sempre visível.
- **Fonte pixel art inflar bundle.** *Mitigação:* gerar bitmap font só com glifos usados (`A-Z 0-9 . , ! ?` + acentos PT-BR) — gera arquivo de ~30KB.
- **`load-tests/` virou padrão de Fase 0; pra Fase 1 manter ou consolidar?** *Decidido:* mantenho `load-tests/results/issue-3-journey/` para screenshots E2E + observações empíricas (FPS, devices testados, bugs).

---

## Histórico relacionado

- Issue #1 (study) — fixou ADRs 1-6.
- Issue #2 (Fase 0) — entregou pose layer + bus de eventos + UI HTML. Encerrada com CT01/RNF01-03 deferidos pra esta Fase 1.

*Fim do research.*
