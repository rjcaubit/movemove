# CODEMAP — Movemove

> Atualizado: 2026-04-26 (Issue #3 — Fase 1)
> Fonte da verdade sobre estrutura, módulos e padrões.

## Status do projeto
**Fase atual:** 1 (endless runner mínimo, jogável). Sem backend, sem persistência além de `localStorage`.

## Stack
- **Bundler/dev:** Vite 6+ (HTTPS local via `vite-plugin-mkcert`)
- **Linguagem:** TypeScript 5.6+
- **Pose detection:** `@mediapipe/tasks-vision` (Pose Landmarker, modelo `lite`)
- **Engine de jogo:** **Phaser 4.x** (ADR-4 do study #1) — `import * as Phaser` (ESM sem default)
- **i18n:** `src/i18n/strings.ts` PT-BR-only sem framework (Lingui na Fase 2)
- **Persistência:** `localStorage` (recorde, mute, tutorial flag); `idb-keyval` chega na Fase 2
- **Deploy:** Cloudflare Pages
- **E2E:** Playwright (HTTPS via mkcert; `--use-fake-device`)

## Estrutura

```
movemove/
├─ EXERGAME_PROJETO.md
├─ docs/
│  ├─ CODEMAP.md            # ESTE arquivo
│  ├─ ARCHITECTURE.md
│  ├─ CHANGELOG.md
│  └─ sdd/ISSUE_{n}/
├─ src/
│  ├─ main.ts               # bootstrap mínimo (delega ao orchestrator) + __movemoveDebug
│  ├─ styles.css
│  ├─ pose/                 # camada de pose (invariante entre fases)
│  │  ├─ types.ts
│  │  ├─ config.ts
│  │  ├─ poseDetector.ts
│  │  ├─ smoother.ts
│  │  ├─ calibration.ts
│  │  └─ events.ts
│  ├─ debug/
│  │  └─ keyboard.ts        # ?debug=1 keyboard fallback
│  ├─ i18n/
│  │  └─ strings.ts         # estendido com chaves tutorial/play/gameOver/orientation
│  ├─ ui/
│  │  ├─ debugPanel.ts      # mantido (HTML por cima do canvas)
│  │  ├─ keypointOverlay.ts # reusado em cameraPreview
│  │  └─ errorScreen.ts     # fallback fatal HTML
│  └─ game/                 # ⭐ NOVO (Fase 1) — camada de jogo Phaser 4
│     ├─ orchestrator.ts    # cria pose layer + Phaser.Game; refs via game.registry
│     ├─ config.ts          # GAME_CONFIG (separado de POSE_CONFIG)
│     ├─ scenes/
│     │  ├─ Boot.ts         # gera texturas placeholder via Graphics.generateTexture
│     │  ├─ Welcome.ts
│     │  ├─ Loading.ts      # MediaPipe load + camera open
│     │  ├─ Tutorial.ts     # 3 slides; flag localStorage
│     │  ├─ Calibration.ts  # consome Calibrator.feed real
│     │  ├─ Play.ts         # loop principal
│     │  └─ GameOver.ts
│     ├─ entities/
│     │  ├─ Player.ts
│     │  ├─ Obstacle.ts     # barrier | low_barrier | wall_lane
│     │  └─ Coin.ts
│     ├─ systems/
│     │  ├─ pseudo3d.ts     # zToScale, zToY, laneToX
│     │  ├─ road.ts         # estrada 3-lane convergente
│     │  ├─ parallax.ts     # 3 camadas
│     │  ├─ spawner.ts      # determinístico via ?seed=
│     │  ├─ scoring.ts      # distância + moedas + recorde localStorage
│     │  ├─ collision.ts    # z<0.15 + lane match
│     │  └─ rng.ts          # mulberry32
│     └─ ui/
│        ├─ hud.ts          # Text monoespace bold (substitui bitmap font na Fase 1)
│        ├─ cameraPreview.ts # mini-preview canto superior direito
│        └─ orientationGuard.ts # overlay HTML retrato
├─ public/
│  ├─ manifest.webmanifest  # PWA básico, display: browser
│  ├─ icons/                # 192/512 placeholder
│  ├─ models/pose_landmarker_lite.task  # gitignored, baixado em setup
│  └─ wasm/vision_wasm_internal.{wasm,js}
├─ e2e/
│  ├─ issue-3-flow.spec.ts                  # CT05/CT04/CT08 — passa
│  └─ issue-2-legacy.spec.ts.skip           # arquivado (HTML Fase 0 removido)
└─ load-tests/results/issue-{n}-journey/
   ├─ README.md
   └─ screenshots/
```

## Padrões canônicos

- **Pose layer abstrai keypoints:** cenas Phaser nunca leem keypoints crus. Subscrevem ao `EventDetector` (bus `EventTarget`) e recebem `GameEvent`.
- **Refs compartilhadas via `Phaser.Game.registry`** (chave `'refs'` → `AppRefs`). Cenas usam helper `getRefs(scene)`.
- **Pose layer com RAF próprio**, independente do `Phaser.Game.loop` — preserva fluxo de calibração/eventos mesmo quando cena Phaser pausa.
- **Thresholds em fração de H_corpo** na pose layer; coordenadas de tela em px no game layer.
- **Strings em PT-BR** centralizadas em `src/i18n/strings.ts`. Sem framework runtime.
- **Modo debug `?debug=1`** sempre disponível: keyboard fallback + painel debug HTML por cima do canvas. `?seed=N` torna spawning determinístico (Playwright). `?fps=1` mostra FPS no HUD.
- **Imports relativos com extensão explícita** (`./Player.ts`).
- **Phaser ESM:** `import * as Phaser from 'phaser'` (Phaser 4 não exporta default).
- **Sons gated por `cache.audio.exists()`** — chamadas `play()` no-op se asset não carregou.
- **Sem `display: standalone` no manifest** (risco iOS PWA + getUserMedia).
- **Spawning seedável** via `?seed=N` pra testes determinísticos.

## ADRs aplicáveis (do study #1)

- **ADR-1** — strings em `src/i18n/strings.ts` sem framework de runtime (até Fase 2).
- **ADR-2** (revisado) — system fonts HTML + bitmap font canvas desde Fase 1. **Fase 1 cumpre parcialmente:** usa `ui-monospace` bold com stroke como aproximação; bitmap font real fica pra polish issue.
- **ADR-4** — Phaser 4 (não Phaser 3) ✅ adotado.
- **ADR-5** — EMA α=0.5 mantido; reavaliação One Euro fica pra Fase 2.
- **ADR-6** — pseudo-3D Enduro/Out Run, sprites Kenney, paralax 3+ camadas. **Fase 1 cumpre parcialmente:** pseudo-3D + paralax implementados; sprites Kenney substituídos por texturas procedurais (placeholder), polish visual fica pra issue separada.

## Histórico SDD

| Issue | Tipo | Título | Status |
|-------|------|--------|--------|
| #1 | study | Viabilidade técnica e roadmap das Fases 0-3 | Aberta (pai conceitual) |
| #2 | feat | Fase 0 — PoC de detecção de pose | Encerrada (CT01/RNF01-03 deferidos pra #3) |
| #3 | feat | Fase 1 — endless runner mínimo | **PR aberta — aguardando review/merge humano** |
| #4 | feat | Fase 2 — camada de exercício saudável | Aguardando #3 mergear + CT01 |
| #5 | feat | Fase 3 — conteúdo, progressão, 2P | Aguardando #4 |

## Achados acumulados

- **RNF04 (`<5MB` bundle)** — irreal. Fase 0: ~9MB gzip. Fase 1: ~10MB gzip (+Phaser 4 ~250KB +HUD +texturas procedurais).
- **iOS PWA + `getUserMedia`** — não usar `display: standalone` até Fase 3 ter mitigação.
- **Phaser 4** estável em abr/2026. ESM sem default export — usar namespace import.
- **Vite + mkcert obriga Playwright HTTPS** — `playwright.config.ts` baseURL `https://localhost:5173` + `ignoreHTTPSErrors: true`.
- **localStorage suficiente** pra recorde/mute/tutorial; IndexedDB chega na Fase 2 com missões/perfil.

## Polish pendente (follow-up issue)

Decisões autônomas da #3 que viram issue separada pós-merge:
- Substituir texturas procedurais por sprites reais Kenney + edermunizz (ADR-6 completo).
- Substituir `Text` monoespace por bitmap font pixel art (ADR-2 completo).
- Carregar sons reais Kenney (`jump`/`coin`/`hit`/`gameover`).

## Próxima fase

Issue #4 (Fase 2) — adiciona cadência de corrida medida, polichinelos como power-up, braços-pra-cima como escudo, narrador motivador, missões diárias, IndexedDB.
