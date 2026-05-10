# Architecture — Movemove

> Atualizado: 2026-05-10 (Issue #14 WIP — 2P + Rec + catálogo de jogos lúdicos).

## Visão de alto nível

Movemove é um **exergame web cliente-only** que usa a câmera do dispositivo para detectar pose corporal em tempo real (MediaPipe Pose Landmarker) e mapear movimentos para mecânicas de jogo (Phaser 4). **Sem servidor de jogo:** toda a lógica roda no navegador. **Privacidade:** os keypoints **não saem do dispositivo** — nenhum frame da câmera é enviado para a rede.

---

## Camadas em runtime

```
┌─────────────────────────────────────────────────────┐
│  Game Layer (src/game/*)                            │
│  • 25 cenas Phaser 4 (Boot/Welcome/.../Rec)         │
│  • Entidades, sistemas (energy, road, missions,     │
│    audioBus, narrator, midiPlayer, …)               │
│  • Storage IndexedDB (profile, runHistory, recExer) │
│  • UI (HUD, EnergyBar, CameraBackdrop, FX, Pill)    │
└──────────▲──────────────────────────────────────────┘
           │ subscribe (EventTarget bus + onSmoothedFrame)
           │
┌──────────┴──────────────────────────────────────────┐
│  Event Bus + Pose Stream                            │
│  • EventDetector (EventTarget) → GameEvent          │
│  • smoothedSubs / smoothedSubs2 → PoseFrame         │
└──────────▲──────────────────────────────────────────┘
           │ frame (RAF próprio)
           │
┌──────────┴──────────────────────────────────────────┐
│  Pose Layer (src/pose/*) — INVARIANTE / TROCÁVEL    │
│  • PoseDetector: MediaPipe + getUserMedia + 2P      │
│  • EmaSmoother (default) / OneEuroSmoother          │
│  • Calibrator: 4 baselines em 2s                    │
│  • EventDetector: 6 heurísticas → GameEvent         │
│  • spatialQueries: helpers puros sem estado         │
└──────────▲──────────────────────────────────────────┘
           │ video frame
           │
┌──────────┴──────────────────────────────────────────┐
│  Hardware (browser camera, MediaPipe WASM)          │
└─────────────────────────────────────────────────────┘

Camadas auxiliares (overlays HTML acima do canvas Phaser):
  • DebugPanel HTML  (?debug=1)
  • ErrorScreen HTML (fallback fatal)
  • OrientationGuard HTML (retrato em mobile)
  • CameraBackdrop / CameraPreview (canvas + skeleton)
```

---

## Princípios invariantes

1. **Cenas Phaser nunca leem keypoints crus.** Apenas `GameEvent` do bus ou helpers puros (`spatialQueries.ts`).
2. **Pose layer é trocável.** Substituir `poseDetector.ts` (Fase 3 cogita MoveNet MultiPose) não toca cenas nem `events.ts`.
3. **Thresholds proporcionais ao corpo detectado** (`H_corpo`, fração de altura), nunca em pixels.
4. **Modo debug é fallback completo:** keyboard substitui pose layer 1:1 (mesmo `GameEvent`).
5. **Pose layer roda em RAF próprio**, independente do `Phaser.Game.loop` — calibração e eventos não param se cena Phaser pausa.
6. **Privacidade:** zero rede no caminho do frame. Frames da câmera não são gravados nem transmitidos (exceto em `Rec`, onde o usuário **explicitamente** salva keypoints suavizados em IndexedDB local).
7. **Adaptativo a viewport:** `main.ts` detecta retrato/paisagem e ajusta `GAME_CONFIG.width/height` antes de instanciar `Phaser.Game`.

---

## State machine das cenas Phaser

```
Boot → Welcome → Loading
Loading → Tutorial (1ª vez) ou MiniGamesHub (já viu tutorial)
Loading → Error HTML (cameraDenied/cameraNotFound/insecureContext/modelDownload)
Tutorial → Calibration

MiniGamesHub ─┬→ Calibration → Play         (cardio principal)
              ├→ CatchBicho / TrunkTwist / BellRinger / ChickenGame /
              │  DanceDance / HelicopterGame
              ├→ CastorModePicker → BodyCheck → CastorGame
              ├→ GuidedSessionPicker → GuidedSession (ciclos rest/exercise)
              └→ Rec (gravador de movimentos)

Play ↔ pause overlay (no body 1.5s) → resume
Play → WaterBreak (a cada 8min cumulativos) → resume
Play → Calibration (drift recalibrate banner)
Play → Summary (default) ou GameOver (fallback) ou Calibration

Mini-jogo → MiniGameResult → próximo da Sessão Guiada OU MiniGamesHub
```

Detalhes de cada cena: `docs/MODULES.md` §6 e `docs/GAMES.md`.

---

## Comunicação entre camadas

| Origem | Destino | Mecanismo | Payload |
|--------|---------|-----------|---------|
| `PoseDetector.onFrame` | `EmaSmoother` (orchestrator) | callback | `PoseFrame` raw (P1) |
| `PoseDetector.onFrame2` | `EmaSmoother` (smoother2) | callback | `PoseFrame` raw (P2) |
| `EmaSmoother` | `smoothedSubs[]` | `AppRefs.onSmoothedFrame(cb)` | `PoseFrame` smoothed (P1) |
| `EmaSmoother` (P2) | `smoothedSubs2[]` | `AppRefs.onSmoothedFrameP2(cb)` | `PoseFrame` smoothed (P2) |
| `EventDetector` | Cenas Phaser | `addEventListener('event', cb)` | `CustomEvent<GameEvent>` |
| `KeyboardDebug` | `EventDetector` | `dispatchEvent` direto | `GameEvent` com `source: 'kbd'` |
| Cenas | Cenas | `this.scene.start(key, data?)` | data opcional (incl. `session: string[]`) |
| Cenas | Cross-cena state | `game.registry.get('refs')` | `AppRefs` |
| `MissionSystem` | Cenas | `missions.tick(metric, value)` | métrica de progresso |
| `AudioBus` / `Narrator` | Browser APIs | `Phaser.Sound` / Web Speech API | sample / utterance |

### `AppRefs` (em `game.registry.set('refs', …)`)

```ts
interface AppRefs {
  detector: PoseDetector;
  smoother: EmaSmoother;
  calibrator: Calibrator;
  eventDetector: EventDetector;
  video: HTMLVideoElement;
  onSmoothedFrame:   (cb: (f: PoseFrame) => void) => () => void;
  onSmoothedFrameP2: (cb: (f: PoseFrame) => void) => () => void;
  profileStore: ProfileStore;
  runHistory: RunHistoryStore;
  missions: MissionSystem;
  detectorReady: boolean;
  markDetectorReady: () => void;
}
```

---

## Suporte 2 jogadores (P2)

`PoseDetector` mantém 2 streams paralelos:
- **P1** — corpo dominante detectado (maior bbox).
- **P2** — segundo corpo, estimado por divisão lateral (heurística simples).

Cada stream tem seu próprio `EmaSmoother`. Cenas que querem 2P se inscrevem em `onSmoothedFrame` (P1) **e** `onSmoothedFrameP2` (P2). Hoje só `CastorGame` (modo 2P) usa.

> **Limitação atual:** identidade dos jogadores pode trocar se eles cruzarem. Fase 3 (#5) propõe troca para MoveNet MultiPose para identidade estável.

---

## Persistência

| Camada | Tecnologia | Conteúdo |
|--------|-----------|----------|
| `localStorage` | nativo | `bestDistance`, `tutorialDone`, `muted`, `age`, volumes |
| IndexedDB (`idb-keyval`) | `ProfileStore` (`movemove.profile`) | totals + missionState + settings (schema v1) |
| IndexedDB | `RunHistoryStore` (`movemove.runHistory`) | últimas 30 partidas FIFO |
| IndexedDB | `RecordedExercisesStore` | gravações da cena `Rec` |

`ProfileStore` migra **soft** do `localStorage` na primeira inicialização (não apaga as chaves antigas).

---

## Áudio

```
GAME_CONFIG.muted? ─→ AudioBus (Phaser.Sound)
                       ├─ música em loop (ducking ~500ms na fala do narrator)
                       └─ SFX (gated por cache.audio.exists())

Narrator (Web Speech API)
  ├─ TTS pt-BR; cooldown 3s; cancelamento por prioridade
  └─ frases em src/game/i18n/narratorLines.ts

MidiPlayer (WebAudio próprio)
  ├─ parsing via @tonejs/midi
  ├─ oscilador triangle pra melodia, ruído branco pra drums
  └─ qualidade limitada — produção considerar fluidsynth offline
```

---

## Container Docker (deploy)

```
docker-compose.yml
└── frontend (nginx:alpine)
    ├─ COPY dist /usr/share/nginx/html
    ├─ docker/nginx.conf — SPA fallback + cache 1y para assets
    └─ EXPOSE 80, 443

# Comentado, pendente:
# backend (Express/TS, expose 3000 → mapeia 3301)
# db (Postgres, mapeia 55432)
```

**Realidade atual:** o projeto é **frontend-only**. O `docker-compose.yml` traz apenas o serviço `frontend` (nginx servindo `dist/`). Não há backend nem DB rodando — os blocos correspondentes estão **comentados** no compose e na config do nginx.

**Quando entrar backend** (não há ETA): descomentar serviço + bloco `proxy_pass http://backend:3000/` em `docker/nginx.conf`. Convenção da workspace: API em **3301**, Postgres em **55432** (ver `/Users/rjcaubit/Dev/CLAUDE.md`).

---

## Build & dev

| Comando | O que faz |
|---------|-----------|
| `npm run setup` | Baixa modelo MediaPipe (`pose_landmarker_lite.task`) + copia WASM para `public/` |
| `npm run dev` | Vite dev server HTTPS (mkcert auto-instala CA local) |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run preview` | Serve `dist/` via Vite preview |
| `npm run lint` | `tsc --noEmit` (type check) |
| `npm run e2e` | Playwright (HTTPS via mkcert + `--use-fake-device`) |
| `npm run i18n:extract` | Extrai mensagens do `i18n._()` para catalog Lingui |
| `npm run i18n:compile` | Compila catalog `pt-BR` |

Imagem nginx-only é construída a partir de `dist/`, então `npm run build` precisa rodar antes de `docker compose up -d`.

---

## Modo debug (`?debug=1`)

- Painel HTML (FPS, confidence, baselines, lane, cadência, log de eventos).
- Keyboard fallback: Space=jump, ↑↓=duck/lane, J=jumping_jack, R=recalibrar, B=boost, S=shield, M=skip-summary, W=trigger water break.
- `__movemoveDebug` no `window`: `forceBaseline`, `skipToScene`, `getRefs`, `triggerWaterBreak`, `forceCadence`, `skipMiniGame`, `forceMissionState`, `clearProfile`.
- Outras query strings: `?seed=N` (RNG determinístico), `?demo=1` (cena Demo), `?landscape=1`/`?portrait=1` (forçar orientação), `?dance=check` (modo curadoria DanceDance).

---

## Performance e bundle

- **Bundle gzip ≈ 10MB** (Phaser 4 ~250KB + MediaPipe lite ~5.5MB + WASM ~11MB descompactado). RNF04 (`<5MB`) deprecado desde Fase 1.
- **Modelo `lite`** (não `full`) suficiente para single-person; Fase 3 troca para MoveNet MultiPose por causa de 2P.
- **Texturas com fallback procedural** (`textureGen.ts`) — projeto roda mesmo se PNGs não carregarem.
- **FX configuráveis** via `GAME_CONFIG.fx` (scanlines, vignette, speedLines, particles, chromatic, screenShake, flash) — desativar em devices fracos.

---

## Próximas fases

- **Fase 3 (#5)** — MoveNet MultiPose, modo 2P em todos os jogos, mundos/temas plugáveis, múltiplos personagens.
- **Backend** — quando justificar (sync de profile entre devices, telemetria, conta multiusuária). Container preparado no `docker-compose.yml` (comentado).
- **Bitmap font pixel art** (ADR-2 completo) e **música real curada** (substitui `MidiPlayer` caseiro) — issues de polish A/V.
