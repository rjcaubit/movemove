# CODEMAP — Movemove

> Atualizado: 2026-05-10 (Issue #14 WIP — assets Kenney, novas cenas e sistemas)
> Fonte da verdade sobre estrutura, módulos e padrões do projeto.

## Status do projeto

**Fase atual:** 2+ (cardio + missões + narrador) com Issue #14 em andamento adicionando catálogo de jogos lúdicos (DanceDance, ChickenGame, HelicopterGame, CastorGame, GuidedSession), gravador de movimentos (Rec), suporte 2 jogadores e assets reais Kenney. Hub categorizado (Cardio / Ritmo / Mira). Todo mini-jogo (incl. Runner) passa por `BodyCheck` antes de calibrar. Persistência via `localStorage` + IndexedDB (`idb-keyval`).

**Frontend-only por enquanto:** o `docker-compose.yml` só sobe o `frontend` (nginx servindo `dist/`). Backend e DB estão **comentados** no compose — quando entrarem, seguirão as portas-padrão da workspace (3301 / 55432).

## Stack

- **Bundler/dev:** Vite 6 (HTTPS local via `vite-plugin-mkcert`)
- **Linguagem:** TypeScript 5.6 (build via `tsc -b && vite build`)
- **Engine de jogo:** **Phaser 4.x** (ESM sem default — `import * as Phaser`) — ADR-4
- **Pose detection:** `@mediapipe/tasks-vision@^0.10` (Pose Landmarker, modelo `lite`, 33 keypoints)
- **i18n:** `@lingui/core@^4` (catalog `pt-BR.po` ainda vazio → identity fallback via `i18n._()`)
- **Persistência:** `localStorage` (recorde, settings, idade, volumes) + `idb-keyval@^6` (profile, runHistory, recordedExercises)
- **Áudio:** `Phaser.Sound` + Web Speech API (TTS pt-BR pro narrador) + `MidiPlayer` (sintetizador WebAudio próprio para `@tonejs/midi`)
- **Deploy:** Cloudflare Pages (static); container Docker com nginx para self-host
- **E2E:** Playwright (HTTPS via mkcert; `--use-fake-device`)

## Estrutura

```
movemove/
├─ EXERGAME_PROJETO.md           # spec original do produto
├─ docker-compose.yml            # só frontend (nginx)
├─ Dockerfile                    # nginx:alpine servindo dist/
├─ docker/nginx.conf             # SPA fallback + cache + proxy /api comentado
├─ docs/
│  ├─ CODEMAP.md                 # ESTE arquivo
│  ├─ MODULES.md                 # tabela módulos × responsabilidades
│  ├─ GAMES.md                   # mini-games (mecânica, gestos, duração)
│  ├─ ARCHITECTURE.md            # camadas, comunicação, runtime
│  ├─ CHANGELOG.md
│  ├─ movimentos.md              # catálogo de movimentos detectáveis + pictogramas
│  └─ sdd/ISSUE_{n}/             # specs SDD
├─ src/
│  ├─ main.ts                    # bootstrap + ajuste retrato/paisagem + __movemoveDebug
│  ├─ tuning.ts                  # constantes ajustáveis (velocidade, FX, age groups)
│  ├─ styles.css
│  ├─ pose/                      # camada de pose (invariante entre cenas)
│  │  ├─ types.ts                # KP enum, Keypoint, PoseFrame, Baseline, GameEvent
│  │  ├─ config.ts               # POSE_CONFIG (emaAlpha, thresholds)
│  │  ├─ poseDetector.ts         # MediaPipe wrapper + getUserMedia (suporta 2 streams)
│  │  ├─ smoother.ts             # EMA α=0.5 (default)
│  │  ├─ oneEuroSmoother.ts      # One Euro Filter alternativo (não-default)
│  │  ├─ calibration.ts          # 4 baselines em 2s contínuos
│  │  ├─ events.ts               # 6 heurísticas (jump/duck/lane/jack/arms_up/cadence)
│  │  └─ spatialQueries.ts       # handAt, trunkRotationAngle, bothHandsAbove, etc.
│  ├─ debug/
│  │  └─ keyboard.ts             # ?debug=1 keyboard fallback
│  ├─ i18n/
│  │  └─ strings.ts              # wrapper @lingui/core (identity até catalog compilar)
│  ├─ ui/                        # overlays HTML (acima do canvas)
│  │  ├─ debugPanel.ts
│  │  ├─ keypointOverlay.ts      # esqueleto + HandGlow opcional
│  │  └─ errorScreen.ts          # fallback fatal
│  └─ game/                      # camada Phaser
│     ├─ orchestrator.ts         # boot Phaser.Game; AppRefs em registry; 2P stream
│     ├─ config.ts               # GAME_CONFIG (mundo pseudo-3D + zonas + falling mode)
│     ├─ scenes/                 # cenas Phaser (25 cenas ativas)
│     ├─ entities/               # objetos no mundo (Player, Obstacle, Coin, NPCs, etc.)
│     ├─ systems/                # gameplay systems (energia, missões, áudio, road, FX)
│     ├─ storage/                # ProfileStore, RunHistoryStore, RecordedExercisesStore
│     ├─ i18n/
│     │  └─ narratorLines.ts     # frases do narrador por evento
│     └─ ui/                     # overlays Phaser (HUD, EnergyBar, CameraBackdrop, FX)
├─ public/
│  ├─ manifest.webmanifest       # PWA básico (display: browser — sem standalone)
│  ├─ icons/                     # 192/512
│  ├─ models/pose_landmarker_lite.task    # gitignored, baixado em `npm run setup`
│  ├─ wasm/vision_wasm_internal.{wasm,js} # copiados de @mediapipe/tasks-vision
│  ├─ data/missions.json         # 7 templates de missões diárias
│  └─ assets/
│     ├─ sprites/                # ~64 sprites (Kenney + custom): inimigos, animais,
│     │                          # power-ups, obstáculos, cenário, pictogramas
│     ├─ kenney_desert/          # background pack
│     ├─ bg/                     # backgrounds custom
│     ├─ audio/                  # MIDI tracks + SFX
│     ├─ fonts/                  # VT323 e similares
│     └─ sounds/                 # SFX tradicionais
├─ e2e/                          # Playwright
│  └─ issue-3-flow.spec.ts       # CT05/CT04/CT08
├─ load-tests/
└─ keys/                         # gitignored — certs locais
```

## Cenas Phaser registradas

Todas registradas no `orchestrator.ts` (`new Phaser.Game({ scene: [...] })`).

| Cena | Categoria | Função |
|------|-----------|--------|
| `Boot` | Infra | Carrega assets iniciais |
| `Welcome` | Menu | Tela inicial com botões "Jogar" / "Configurações" |
| `Loading` | Infra | Inicializa MediaPipe + abre câmera (idempotente) |
| `Tutorial` | Onboarding | 3 slides (1× por device) |
| `Calibration` | Pose | Captura 4 baselines |
| `BodyCheck` | Pose | Valida enquadramento antes de mini-jogo (1P/2P) |
| `Play` | Runner | Endless runner pseudo-3D (cardio principal) |
| `GameOver` | Runner | Fallback (Summary é o destino default) |
| `Demo` | Debug | `?demo=1` cenário sem câmera/colisão |
| `Settings` | Menu | Volumes, narrador, captions, idade |
| `Summary` | Runner | Pós-corrida: dist+coins+sparkline+missões |
| `WaterBreak` | Runner | Modal a cada 8min cumulativos |
| `MiniGamesHub` | Menu | Hub dos mini-games |
| `MiniGameResult` | Mini-game | Tela de resultado + "next" da Sessão Guiada |
| `CatchBicho` | Mini-game | Pega o bicho (60s) |
| `TrunkTwist` | Mini-game | Roda tronco (~60s) |
| `BellRinger` | Mini-game | Toca o sino (75s) |
| `ChickenGame` | Mini-game | Galinha — flap+scratch (70s) |
| `DanceDance` | Mini-game | DDR com pictogramas (~75s) |
| `HelicopterGame` | Mini-game | Helicóptero — pula pra subir (60s, gravidade progressiva) |
| `NinjaFruit` | Mini-game | Corta frutas, evita bombas — mão dominante auto-detectada, 3 vidas, combo |
| `CastorGame` | Mini-game | Whack-a-mole 1P/2P (60s) |
| `CastorModePicker` | Mini-game | Picker 1P/2P → BodyCheck → Castor |
| `GuidedSession` | Sessão | Ciclos rest/exercise (5/7/10/15min) |
| `GuidedSessionPicker` | Sessão | Picker de duração |
| `Rec` | Ferramenta | Gravador de movimentos (15s) + replay |

> Detalhe de cada jogo (gestos, mecânica, duração, scoring): ver **`docs/GAMES.md`**.

## Padrões canônicos

- **Cenas Phaser nunca leem keypoints crus.** Subscrevem ao bus do `EventDetector` (`EventTarget`) ou usam helpers `spatialQueries.ts` (`handAt`, `trunkRotationAngle`, etc.). Garantia: pose layer é trocável.
- **Refs compartilhadas via `Phaser.Game.registry`** (chave `'refs'` → `AppRefs`). Helper `getRefs(scene)`.
- **Pose layer com RAF próprio**, independente do `Phaser.Game.loop` — calibração e eventos não param se cena pausa.
- **Suporte 2 jogadores:** detector emite `onFrame2`, smoother próprio (`smoother2`), e `AppRefs.onSmoothedFrameP2` permite inscrever segundo stream (usado em `CastorGame` 2P).
- **Thresholds proporcionais ao corpo detectado** (`H_corpo`, fração de altura), nunca em pixels.
- **Strings em PT-BR** centralizadas em `src/i18n/strings.ts` via `i18n._()` (Lingui).
- **Modo debug `?debug=1`:** keyboard fallback completo (Space/↑↓←→/J/R) + painel debug HTML por cima do canvas. `?seed=N` torna spawning determinístico. `?demo=1` ativa cena Demo. `?landscape=1` / `?portrait=1` força orientação. `?dance=check` modo curadoria do DanceDance.
- **Imports relativos com extensão explícita** (`./Player.ts`).
- **Phaser ESM:** `import * as Phaser from 'phaser'`.
- **Sons gated por `cache.audio.exists()`** — `play()` no-op se asset não carregou.
- **Texturas com fallback procedural:** `textureGen.ensureTexture()` gera placeholder se PNG não existe.
- **Sem `display: standalone` no manifest** (risco iOS PWA + getUserMedia).
- **Spawning seedável** via `?seed=N`.
- **Orientação responsiva:** `main.ts` ajusta `GAME_CONFIG.width/height` para casar com viewport real (retrato → 720×altura-proporcional).

## ADRs aplicáveis (do study #1)

- **ADR-1** ✅ — strings em `src/i18n/strings.ts`. **Fase 2 evoluiu** para wrapper `@lingui/core` (catalog vazio = identity fallback).
- **ADR-2** ⏳ parcial — system fonts (`VT323`, `ui-monospace`) com stroke como aproximação de bitmap font; bitmap font real continua follow-up.
- **ADR-4** ✅ — Phaser 4 adotado.
- **ADR-5** ⏳ — EMA α=0.5 default; `OneEuroSmoother` existe mas não-ativado.
- **ADR-6** ⏳ parcial — pseudo-3D Enduro/Out Run + paralax adotados; sprites Kenney **agora carregados** (Issue #14, ainda em refinamento) com fallback procedural via `textureGen`.

## Histórico SDD

| Issue | Tipo | Título | Status |
|-------|------|--------|--------|
| #1 | study | Viabilidade técnica e roadmap das Fases 0-3 | Aberta (pai conceitual) |
| #2 | feat | Fase 0 — PoC de detecção de pose | Encerrada |
| #3 | feat | Fase 1 — endless runner mínimo | Mergeada ✅ |
| #4 | feat | Fase 2 — exercício saudável + mini-jogos | Mergeada ✅ |
| #5 | feat | Fase 3 — conteúdo, progressão, 2P | Aberta (parcialmente coberta por #14) |
| #14 | improve | Catálogo de jogos lúdicos + assets Kenney + 2P + Rec | **WIP** |
| #15 | feat | Ninja Fruit — mini-jogo de cortar frutas com mão dominante | **WIP** |

## Achados acumulados

- **Bundle ~10MB gzip** (Phaser 4 ~250KB + MediaPipe lite ~5.5MB + WASM ~11MB descompactado). RNF04 (`<5MB`) deprecado.
- **iOS PWA + getUserMedia** — não usar `display: standalone`.
- **Phaser 4 ESM sem default export** — sempre `import * as Phaser`.
- **Vite + mkcert obriga Playwright HTTPS** (baseURL `https://localhost:5173`, `ignoreHTTPSErrors: true`).
- **MidiPlayer caseiro tem qualidade limitada** (oscilador triangle + ruído branco para drums) — para produção, considerar fluidsynth offline.
- **2 streams de pose simultâneos** funcionam via `poseDetector.onFrame2` (jogador 2 = lado direito do frame, estimativa de bounding box).

## Polish pendente

- ADR-2 completo (bitmap font pixel art).
- Música real curada + voz neural pré-gravada (tornar narrador menos sintético).
- Sprites Kenney 100% (alguns ainda procedurais — coin, log, banner, etc.).
- Catalog `pt-BR.po` compilado (hoje strings rodam em identity fallback).

## Próximas fases

- **Fase 3 (#5)** — troca pose driver para MoveNet MultiPose (2P estável), mundos/temas plugáveis, múltiplos personagens, modo dois jogadores em todos os jogos.
- **Backend** — quando entrar, descomentar serviço no `docker-compose.yml` e proxy `/api/` no `nginx.conf` (porta 3301 conforme convenção da workspace).
