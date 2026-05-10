# MODULES — Movemove

> Atualizado: 2026-05-10. Tabela canônica de **módulos × responsabilidades × arquivos × dependências**.
>
> Convenção: `←` = depende de; `→` = é consumido por. Caminhos relativos a `src/`.

---

## Visão geral em camadas

```
┌──────────────────────────────────────────────┐
│ Game Layer       (game/scenes, entities, …)  │  ← consumes Pose Layer
├──────────────────────────────────────────────┤
│ Pose Layer       (pose/, debug/keyboard)     │  ← invariante (substituível)
├──────────────────────────────────────────────┤
│ UI Overlays HTML (ui/ — debugPanel, errorScr)│  ← acima do canvas
└──────────────────────────────────────────────┘
```

A **comunicação** entre Game e Pose ocorre **só** via:
- `EventDetector` (bus `EventTarget`) emitindo `GameEvent`.
- `getRefs(scene).onSmoothedFrame(cb)` — stream de `PoseFrame` suavizado.
- Helpers puros de `spatialQueries.ts` (cenas chamam, não leem keypoints crus).

---

## 1. Pose Layer (`src/pose/`)

| Arquivo | Responsabilidade | Depende de |
|---------|------------------|------------|
| `types.ts` | Enum `KP` (33 keypoints), `Keypoint`, `PoseFrame`, `Baseline`, `Lane`, `GameEvent` (union), `CadenceIntensity`. **Nenhuma dependência runtime** — só types. | — |
| `config.ts` | `POSE_CONFIG` (emaAlpha, thresholds em fração de H_corpo). | — |
| `poseDetector.ts` | Wrapper MediaPipe + `getUserMedia`. Emite `onFrame` (P1) e `onFrame2` (P2). Espelha keypoints (selfie). | `@mediapipe/tasks-vision` |
| `smoother.ts` | `EmaSmoother` α=0.5 (default). | — |
| `oneEuroSmoother.ts` | One Euro Filter — alternativa adaptativa. **Não-default.** | — |
| `calibration.ts` | `Calibrator` — captura 4 baselines em 2s contínuos. | `types.ts` |
| `events.ts` | `EventDetector` extends `EventTarget`. 6 heurísticas: `jump`, `duck`, `lane_change`, `jumping_jack`, `arms_up`, `cadence`. | `types.ts` |
| `spatialQueries.ts` | Helpers puros (sem estado): `handAt`, `handPosition`, `trunkRotationAngle`, `bothHandsAbove`, `armsLateralOut`, `hipDropFromBaseline`, `hipY`, `detectDanceDir`. | `types.ts` |

**Padrão crítico:** Game Layer **nunca** importa `keypoints[KP.X]` direto — sempre via helper. Isso permite trocar driver de pose (MoveNet, YOLO-Pose, etc.) sem tocar cenas.

---

## 2. Debug Layer (`src/debug/`)

| Arquivo | Responsabilidade | Depende de |
|---------|------------------|------------|
| `keyboard.ts` | `KeyboardDebug` — emite `GameEvent` via teclado quando `?debug=1`. Mapeamento: Space=jump, ↑↓=duck/lane, J=jumping_jack, R=recalibrar. | `pose/types.ts` |

---

## 3. UI Overlays HTML (`src/ui/`)

Camada de overlays HTML/CSS **acima** do canvas Phaser — usados quando precisa pintar fora do contexto WebGL (ex.: erros, debug, esqueleto sobre vídeo).

| Arquivo | Responsabilidade | Depende de |
|---------|------------------|------------|
| `debugPanel.ts` | `DebugPanel` HTML — FPS, confidence, baselines, lane, cadência, log de eventos. Toggle visível com `?debug=1`. | `pose/types.ts` |
| `keypointOverlay.ts` | Desenha skeleton sobre canvas/vídeo; suporta `HandGlow` (halos coloridos). Reusado por `cameraBackdrop.ts` e `cameraPreview.ts`. | `pose/types.ts` |
| `errorScreen.ts` | Tela HTML fatal (cameraDenied, cameraNotFound, insecureContext, modelDownload, generic). | `i18n/strings.ts` |

---

## 4. i18n (`src/i18n/`)

| Arquivo | Responsabilidade | Depende de |
|---------|------------------|------------|
| `strings.ts` | Dicionário centralizado pt-BR via `i18n._()` do Lingui. Catalog vazio → identity fallback. | `@lingui/core` |

---

## 5. Game Layer — Orchestration (`src/game/`)

| Arquivo | Responsabilidade | Depende de |
|---------|------------------|------------|
| `orchestrator.ts` | `startApp()` — instancia `Phaser.Game`, `PoseDetector`, smoother, calibrator, eventDetector, stores, missions. Define `AppRefs` e injeta em `game.registry.set('refs', …)`. Suporta 2 streams (P1+P2). Helper `getRefs(scene)`. | tudo abaixo |
| `config.ts` | `GAME_CONFIG` (resolução, pseudo-3D, spawning, energy, zonas, paleta, falling-mode lanes, FX flags, storageKeys). Constantes de tuning principais. | `tuning.ts` |
| `tuning.ts` *(em src/, não em src/game/)* | Velocidades, age groups, FX intensity. Importado por `config.ts`. | — |

---

## 6. Game Layer — Cenas (`src/game/scenes/`)

| Arquivo | Categoria | Função |
|---------|-----------|--------|
| `Boot.ts` | Infra | Carrega assets iniciais |
| `Welcome.ts` | Menu | Tela inicial (Jogar / Configurações) |
| `Loading.ts` | Infra | MediaPipe init + camera open (idempotente) |
| `Tutorial.ts` | Onboarding | 3 slides (1× por device) |
| `Calibration.ts` | Pose | 4 baselines em 2s |
| `BodyCheck.ts` | Pose | Valida enquadramento 1P/2P antes de mini-jogo |
| `Play.ts` | Runner | Endless runner pseudo-3D principal |
| `GameOver.ts` | Runner | Fallback (Summary é default) |
| `Demo.ts` | Debug | `?demo=1` — vitrine sem câmera |
| `Settings.ts` | Menu | Volumes, narrador, captions, idade |
| `Summary.ts` | Runner | Pós-corrida + sparkline + missões |
| `WaterBreak.ts` | Runner | Modal a cada 8min cumulativos |
| `MiniGamesHub.ts` | Menu | Hub dos mini-games |
| `MiniGameResult.ts` | Mini-game | Resultado + próximo da Sessão Guiada |
| `CatchBicho.ts` | Mini-game | Pega o bicho |
| `TrunkTwist.ts` | Mini-game | Roda tronco |
| `BellRinger.ts` | Mini-game | Toca o sino |
| `ChickenGame.ts` | Mini-game | Galinha (flap+scratch) |
| `DanceDance.ts` | Mini-game | DDR com pictogramas |
| `HelicopterGame.ts` | Mini-game | Helicóptero (gravidade progressiva, jump pra subir) |
| `CastorGame.ts` | Mini-game | Whack-a-mole 1P/2P |
| `CastorModePicker.ts` | Mini-game | Picker 1P/2P |
| `GuidedSession.ts` | Sessão | Ciclos rest/exercise |
| `GuidedSessionPicker.ts` | Sessão | Picker de duração |
| `Rec.ts` | Ferramenta | Gravador de movimentos + replay |

**Detalhes mecânica/duração/scoring:** ver `docs/GAMES.md`.

---

## 7. Game Layer — Entidades (`src/game/entities/`)

Objetos do mundo. Maioria são "billboards" (sprite + posição `z` em pseudo-3D, ou y-px em modo falling).

| Arquivo | Tipo | Notas |
|---------|------|-------|
| `Player.ts` | Personagem | Run/jump/duck/lane com tweens. Único, persiste durante run. |
| `Obstacle.ts` | Obstáculo | 3+ tipos: barrier, low_barrier, wall_lane, brick, column, log, banner, laser. |
| `Coin.ts` | Power-up | Cluster de 5 (`coinClusterEveryMeters: 50`). |
| `HeartPickup.ts` | Power-up | Recupera 1 vida; tween yoyo. |
| `JackZone.ts` | Zona | 5 polichinelos em 4s → bônus. |
| `ArmsZone.ts` | Zona | 3s `arms_up` → escudo. |
| `Bicho.ts` | Mini-game | Sprite spawn fora do bbox do corpo (`CatchBicho`). |
| `TrunkTarget.ts` | Mini-game | Alvo lateral (`TrunkTwist`). |
| `Bell.ts` | Mini-game | Sino azul/vermelho (`BellRinger`). |
| `Castor.ts` | Mini-game | Pop-up em slot, `whack()`/`retreat()` (`CastorGame`). |
| `Alien.ts` | NPC mundo | Inimigo que desce (×1.5 speed). |
| `Animal.ts` | NPC mundo | Switch de lane ao passar y>200. |
| `Barrel.ts` | NPC mundo | Rola, ×0.85 speed. |
| `Ghost.ts` | NPC mundo | Bobbing senoidal + animação 4 frames. |
| `NpcRunner.ts` | NPC mundo | Aliado, speed variável 0.8–1.2. |
| `Puncher.ts` | NPC mundo | Soca; usado em `CastorGame` para detectar mão. |
| `Robot.ts` | NPC mundo | Lane-switch aleatório (até 3×). |
| `Zombie.ts` | NPC mundo | Lento (×0.7), 4 frames. |

**Padrão:** todas têm `update(dt)` + `destroy()`; sprites carregam textura PNG ou caem para `textureGen.ensureTexture()`.

---

## 8. Game Layer — Sistemas (`src/game/systems/`)

Lógica reusável e infraestrutura de gameplay.

| Arquivo | Tipo | Responsabilidade |
|---------|------|------------------|
| `pseudo3d.ts` | Render | Projeção pseudo-3D (z normalizado → x/y/scale). |
| `road.ts` | Render | Geração da pista (faixas, listras, horizon). |
| `parallax.ts` | Render | 3 camadas de fundo (sky/horizon/grass). |
| `billboard.ts` | Render | `BillboardLayer` — 6 árvores em paralaxe. |
| `spawner.ts` | Gameplay | Spawn de obstáculos/moedas com seed via `rng.ts`. |
| `rng.ts` | Util | RNG seedável (`?seed=N` para Playwright determinístico). |
| `scoring.ts` | Gameplay | Distância (m) + moedas. |
| `collision.ts` | Gameplay | `checkCollisions`, `checkOpponentCollisions`. |
| `energy.ts` | Gameplay | `EnergySystem` 0–100, multiplica velocidade do mundo. |
| `zones.ts` | Gameplay | `ZoneManager` agenda `JackZone`/`ArmsZone`. |
| `shield.ts` | Gameplay | `ShieldEffect` aura azul, 1 carga. |
| `missions.ts` | Gameplay | `MissionSystem` — carrega `public/data/missions.json`, seed `version + YYYY-MM-DD`. |
| `audioBus.ts` | Áudio | Música loop + ducking ~500 ms. |
| `narrator.ts` | Áudio | Web Speech API pt-BR + cooldown + prioridade. |
| `midiPlayer.ts` | Áudio | Sintetizador WebAudio próprio para MIDI (`@tonejs/midi`). |
| `exerciseRepDetectors.ts` | Pose | Classes RepDetector com refractory 350ms para `GuidedSession`. |
| `textureGen.ts` | Asset | `ensureTexture()` — gera placeholder procedural se PNG não existe. |
| `world2d.ts` | Util | Re-export de `GAME_CONFIG.falling`. |

---

## 9. Game Layer — Storage (`src/game/storage/`)

Persistência IndexedDB via `idb-keyval`. Schema v1.

| Arquivo | Store | Forma |
|---------|-------|-------|
| `profile.ts` | `ProfileStore` | `{ totalRuns, totalDistance, totalCoins, totalJacks, totalArmsUp, missionState, settings }`. Migra soft do `localStorage`. |
| `runHistory.ts` | `RunHistoryStore` | Últimas **30** partidas FIFO (`{ date, distance, coins, jacks, armsUp, bpmTrack[], … }`). |
| `recordedExercises.ts` | `RecordedExercisesStore` | `RecordedExercise { id, name, desc, frames, durationMs, createdAt }`. CRUD + `exportToJson`. |

---

## 10. Game Layer — UI Phaser (`src/game/ui/`)

Componentes visuais reusáveis dentro do canvas Phaser.

| Arquivo | Função |
|---------|--------|
| `hud.ts` | HUD principal do `Play` (lives, distance, coins, BPM). |
| `hudStyle.ts` | `Pill` (icon + texto), `addTitleBanner`. Componentes reusáveis. |
| `cameraBackdrop.ts` | Vídeo espelhado + skeleton overlay como Phaser texture. RAF próprio. |
| `cameraPreview.ts` | Preview pequeno (canto sup. dir.) para o `Play`. |
| `keypointOverlay.ts` *(referenciada de `src/ui/`)* | Skeleton + handGlows. |
| `energyBar.ts` | Barra de energia com cor por tier + pulso BPM. |
| `sparkline.ts` | Sparkline SVG inline com downsample (Summary). |
| `pictogram.ts` | Stick figures coloridos com setas para `DanceDance`. |
| `demoFigure.ts` | Stick figure paramétrico para `GuidedSession`. |
| `backButton.ts` | Botão padrão canto inf. dir. → `MiniGamesHub`. |
| `orientationGuard.ts` | Overlay HTML pedindo retrato em mobile (instalado em `installOrientationGuard()`). |
| `postfx.ts` | `PostFxOverlay` — scanlines + vignette estática (CRT). |
| `speedLines.ts` | Linhas radiais para sensação de velocidade. |

---

## 11. Game Layer — i18n específico (`src/game/i18n/`)

| Arquivo | Função |
|---------|--------|
| `narratorLines.ts` | Frases do narrador por evento (`zone_done`, `low_energy`, `jack_combo`, etc.). |

---

## Dependências externas

| Pacote | Uso | Onde |
|--------|-----|------|
| `phaser@^4` | Game engine | `game/**/*.ts` |
| `@mediapipe/tasks-vision@^0.10` | Pose detection | `pose/poseDetector.ts` |
| `idb-keyval@^6` | IndexedDB key-value | `game/storage/*` |
| `@lingui/core@^4` | i18n runtime | `i18n/strings.ts` |
| `@tonejs/midi@^2` | Parse MIDI | `game/systems/midiPlayer.ts` |
| `vite@^6` | Bundler/dev (HTTPS via `vite-plugin-mkcert`) | build-time |
| `@playwright/test@^1.59` | E2E | `e2e/*` |

---

## Mapa de imports — quem chama quem

**Hot path do frame (cada ~16ms):**

```
PoseDetector.onFrame(raw) ─→ EmaSmoother.smooth(kp) ─→ smoothedSubs[]
                                                       ├─ Calibrator.feed
                                                       ├─ EventDetector → bus → cenas
                                                       ├─ cameraBackdrop redraw
                                                       └─ cena específica (ex: TrunkTwist)
```

**Boot:**

```
main.ts ─→ orchestrator.startApp()
            ├─ new PoseDetector / EmaSmoother / Calibrator / EventDetector
            ├─ new ProfileStore / RunHistoryStore / MissionSystem (load)
            ├─ KeyboardDebug (se ?debug=1)
            ├─ DebugPanel HTML (se ?debug=1)
            ├─ installOrientationGuard()
            └─ new Phaser.Game({ scene: [Boot, Welcome, Loading, …, Rec] })
                game.registry.set('refs', AppRefs)
```

**Cena lendo gestos:**

```
SuaCena.create():
  refs = getRefs(this)
  this.unsubFrame = refs.onSmoothedFrame(frame => { /* helpers */ })
  refs.eventDetector.addEventListener('event', e => { /* GameEvent */ })

SuaCena.shutdown():
  this.unsubFrame?.()
  refs.eventDetector.removeEventListener(...)
```

---

## Adicionando um módulo novo

1. **Decida a camada:** se é **gameplay/render/áudio** → `src/game/systems/`; se é **gesto puro** → `src/pose/spatialQueries.ts` (estende sem estado); se é **detecção temporal/stateful** → nova classe em `pose/events.ts` ou `game/systems/exerciseRepDetectors.ts`.
2. **Não importe `keypoints` direto em cenas** — exporte um helper.
3. **Atualize `MODULES.md` e `CODEMAP.md`.**
4. **Se introduz dep externa:** documentar aqui na seção "Dependências externas" e justificar (`docs/sdd/ISSUE_{n}/01-research.md`).
