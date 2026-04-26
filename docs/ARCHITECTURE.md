# Architecture — Movemove (Fase 0)

> Atualizado: 2026-04-26 (Issue #2)

## Camadas

```
┌─────────────────────────────────────────┐
│  UI Layer (src/ui/*, src/main.ts)       │
│  • render screens (Welcome/Loading/     │
│    Calibration/Active/Error/NoBody)     │
│  • paint canvas overlays                │
│  • debug panel toggle                   │
└─────────▲───────────────────────────────┘
          │ subscribe
          │
┌─────────┴───────────────────────────────┐
│  Event Bus (EventTarget nativo)         │
│  • dispatch GameEvent: jump/duck/...    │
└─────────▲───────────────────────────────┘
          │ emit
          │
┌─────────┴───────────────────────────────┐
│  Pose Layer (src/pose/*)                │
│  • poseDetector: MediaPipe + getUM      │
│  • smoother: EMA                        │
│  • calibration: captura baselines       │
│  • events: 6 heurísticas (3.3 doc-base) │
└─────────▲───────────────────────────────┘
          │ frame
          │
┌─────────┴───────────────────────────────┐
│  Hardware (browser camera, MediaPipe)   │
└─────────────────────────────────────────┘
```

## Princípios invariantes

1. **UI nunca lê keypoints crus.** Apenas eventos abstratos do bus.
2. **Pose layer é trocável.** Substituir `poseDetector.ts` por outro driver (MoveNet MultiPose na Fase 3) não toca UI nem `events.ts`.
3. **Thresholds proporcionais ao corpo detectado** (`H_corpo`), nunca em pixels.
4. **Modo debug é fallback completo:** keyboard substitui pose layer 1:1.

## State machine da app

```
Welcome → (clique "Ligar câmera") → Loading
Loading → (modelo ok) → Calibration
Loading → (erro) → Error
Calibration → (baselines capturados) → Active
Active → (clique Recalibrar / drift detectado) → Calibration
Active → (1.5s sem keypoints) → NoBody (overlay sobreposto)
NoBody → (volta keypoints) → Active
* → (erro fatal) → Error
```

## Próximas fases

- Fase 1 (#3): adiciona Phaser 4 entre Pose Layer e UI Layer; introduz cenas; mantém event bus invariante.
- Fase 2 (#4): adiciona persistência (IndexedDB), narrador (`@lingui/core`), reavalia EMA→One Euro.
- Fase 3 (#5): troca pose driver para MoveNet MultiPose, multi-pessoa, multi-mundos.
