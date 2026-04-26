# CODEMAP — Movemove

> Atualizado: 2026-04-26 (Issue #2 — Fase 0)
> Fonte da verdade sobre estrutura, módulos e padrões. Atualizar a cada issue que mexe em arquitetura.

## Status do projeto
**Fase atual:** 0 (PoC de detecção de pose). Sem jogo, sem backend, sem persistência.

## Stack
- **Bundler/dev:** Vite 6+
- **Linguagem:** TypeScript 5.6+
- **Pose detection:** `@mediapipe/tasks-vision` (Pose Landmarker, modelo `lite`)
- **Engine de jogo:** *(Fase 1+, Phaser 4)*
- **i18n:** `src/i18n/strings.ts` PT-BR-only sem framework *(Lingui na Fase 2)*
- **Persistência:** *(Fase 2+, IndexedDB via idb-keyval)*

## Estrutura

```
movemove/
├─ EXERGAME_PROJETO.md         # doc-base do projeto
├─ docs/
│  ├─ CODEMAP.md               # ESTE arquivo
│  ├─ ARCHITECTURE.md          # pose layer × event bus × UI states
│  ├─ CHANGELOG.md
│  └─ sdd/ISSUE_{n}/           # SDD docs por issue (00-design, 01-research, 02-spec, 03-tasks, 04-acceptance)
├─ src/
│  ├─ main.ts                  # entry — orquestra estado da app
│  ├─ styles.css
│  ├─ pose/
│  │  ├─ types.ts              # Keypoint, Baseline, GameEvent, Lane
│  │  ├─ config.ts             # thresholds em fração de H_corpo, cooldowns
│  │  ├─ poseDetector.ts       # wrapper MediaPipe + getUserMedia
│  │  ├─ smoother.ts           # EMA configurável
│  │  ├─ calibration.ts        # captura de baselines
│  │  └─ events.ts             # 6 heurísticas + bus EventTarget
│  ├─ ui/
│  │  ├─ welcomeScreen.ts
│  │  ├─ loadingScreen.ts
│  │  ├─ calibrationScreen.ts
│  │  ├─ debugPanel.ts
│  │  ├─ eventOverlay.ts
│  │  ├─ keypointOverlay.ts
│  │  ├─ errorScreen.ts
│  │  └─ noBodyScreen.ts
│  ├─ debug/
│  │  └─ keyboard.ts           # fallback ?debug=1
│  └─ i18n/
│     └─ strings.ts            # PT-BR centralizado
├─ public/
│  ├─ models/
│  │  └─ pose_landmarker_lite.task  # ~3MB, gitignored, baixado em setup
│  └─ wasm/
│     └─ vision_wasm_internal.{wasm,js}  # gitignored, copiado de node_modules
└─ load-tests/results/issue-{n}-journey/
   ├─ README.md                # observações empíricas (FPS, falsos positivos, devices testados)
   └─ screenshots/
```

## Padrões canônicos

- **Pose layer abstrai keypoints:** módulos consumidores **nunca** leem keypoints crus. `events.ts` emite eventos via bus (`EventTarget` nesta fase, `mitt` a partir da Fase 1).
- **Thresholds em fração de H_corpo:** nunca em pixels absolutos.
- **Strings em PT-BR:** centralizadas em `src/i18n/strings.ts` exportando constantes/funções nomeadas.
- **Modo debug com keyboard fallback (`?debug=1`):** sempre disponível, em todas as fases. Invariante.
- **Imports relativos com extensão explícita** (`./types.ts`) por causa do `allowImportingTsExtensions`.

## ADRs aplicáveis (do study #1)

- **ADR-5** — filtro EMA α=0.5 (Kalman descartado).
- Modelo MediaPipe = `pose_landmarker_lite.task` (~3MB) em 480p.
- Sem PWA standalone (risco iOS).
- ADRs 1, 2, 3, 4, 6 dormem nesta fase (entram a partir da Fase 1).

## Histórico SDD

| Issue | Tipo | Título | Status |
|-------|------|--------|--------|
| #1 | study | Viabilidade técnica e roadmap das Fases 0-3 | Aberta (pai conceitual) |
| #2 | feat | Fase 0 — PoC de detecção de pose | Em andamento |
| #3 | feat | Fase 1 — endless runner mínimo | Aguardando #2 |
| #4 | feat | Fase 2 — camada de exercício saudável | Aguardando #3 |
| #5 | feat | Fase 3 — conteúdo, progressão, 2P | Aguardando #4 |

## Próxima fase

Issue #3 (Fase 1 — endless runner mínimo). Adicionará Phaser 4, bitmap font, sprites, cenas Boot/Calibration/Play/GameOver. Atualizar este CODEMAP nessa fase.
