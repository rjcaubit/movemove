# Architecture — Movemove (Fase 2)

> Atualizado: 2026-04-27 (Issue #4)

## Camadas

```
┌─────────────────────────────────────────┐
│  Game Layer (src/game/*)                │
│  • Phaser 4 cenas: Boot/Welcome/Loading │
│    /Tutorial/Calibration/Play/GameOver  │
│  • Entidades: Player/Obstacle/Coin      │
│  • Sistemas: pseudo3d/road/parallax/    │
│    spawner/scoring/collision/rng        │
│  • UI: HUD + cameraPreview              │
└─────────▲───────────────────────────────┘
          │ subscribe (EventTarget bus)
          │
┌─────────┴───────────────────────────────┐
│  Event Bus (EventTarget nativo)         │
│  • dispatch GameEvent                   │
└─────────▲───────────────────────────────┘
          │ emit
          │
┌─────────┴───────────────────────────────┐
│  Pose Layer (src/pose/*) — INVARIANTE   │
│  • poseDetector: MediaPipe + getUM      │
│  • smoother: EMA α=0.5                  │
│  • calibration: 4 baselines             │
│  • events: 6 heurísticas                │
└─────────▲───────────────────────────────┘
          │ frame
          │
┌─────────┴───────────────────────────────┐
│  Hardware (browser camera, MediaPipe)   │
└─────────────────────────────────────────┘

Camadas auxiliares (overlays HTML por cima do canvas Phaser):
  • debugPanel HTML (?debug=1)
  • errorScreen HTML (fallback fatal)
  • cameraPreview HTML (160×90 keypoints)
  • orientationGuard HTML (retrato em mobile)
```

## Princípios invariantes

1. **Cenas Phaser nunca leem keypoints crus.** Apenas `GameEvent` do bus.
2. **Pose layer é trocável.** Substituir `poseDetector.ts` (Fase 3 = MoveNet MultiPose) não toca cenas nem `events.ts`.
3. **Thresholds proporcionais ao corpo detectado** (`H_corpo`), nunca em pixels.
4. **Modo debug é fallback completo:** keyboard substitui pose layer 1:1.
5. **Pose layer roda em RAF próprio**, independente do `Phaser.Game.loop` — calibração e eventos não param se cena Phaser pausa.

## State machine das cenas Phaser

```
Boot → Welcome → Loading
Loading → Tutorial (1ª vez) ou Calibration (já viu tutorial)
Loading → Error HTML (cameraDenied/cameraNotFound/insecureContext/modelDownload)
Tutorial → Calibration
Calibration → Play (baseline OK) ou Calibration loop (low confidence)
Play → GameOver (colisão)
Play → Calibration (drift recalibrate banner)
Play → pause overlay (no body 1.5s) → resume
GameOver → Play (Jogar de novo) ou Calibration (Recalibrar)
```

## Comunicação entre layers

| Origem | Destino | Mecanismo | Payload |
|--------|---------|-----------|---------|
| `PoseDetector` | `EmaSmoother` (orchestrator) | `onFrame(cb)` | `PoseFrame` raw |
| `EmaSmoother` | Subscribers (`Calibrator`, `EventDetector`, `cameraPreview`, cenas) | `onSmoothedFrame(cb)` em `AppRefs` | `PoseFrame` smoothed |
| `EventDetector` | Cenas Phaser (`Play`, `GameOver`) | `addEventListener('event', cb)` | `CustomEvent<GameEvent>` |
| `KeyboardDebug` | `EventDetector` | `dispatchEvent` direto | `GameEvent` com `source: 'kbd'` |
| Cenas | Cenas | `this.scene.start(key, data?)` | data opcional |
| Cenas | Cross-cena state | `game.registry.get/set` | `AppRefs` em `'refs'` |

## Camadas adicionadas na Fase 2

- **Storage Layer** (`src/game/storage/`): `ProfileStore` + `RunHistoryStore` via `idb-keyval` (schema v1).
- **Audio Layer** (`src/game/systems/audioBus.ts` + `narrator.ts`): `Phaser.Sound` (música/SFX) + Web Speech API (TTS pt-BR).
- **Mission Layer** (`src/game/systems/missions.ts`): carrega `public/data/missions.json`, gera 3 missões/dia com seed determinístico.
- **MiniGames Layer** (`src/game/scenes/{MiniGamesHub,CatchBicho,TrunkTwist,BellRinger,MiniGameResult}.ts`): modo paralelo ao endless runner. Consome `src/pose/spatialQueries.ts` (handAt / trunkRotationAngle).

## Próximas fases

- **Fase 3 (#5):** troca pose driver para MoveNet MultiPose, modo dois jogadores, mundos/temas plugáveis, múltiplos personagens.
