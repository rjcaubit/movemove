# CODEMAP — Movemove

> Atualizado: 2026-04-27 (Issue #4 — Fase 2 + mini-jogos)
> Fonte da verdade sobre estrutura, módulos e padrões.

## Status do projeto
**Fase atual:** 2 (cardio + missões + narrador + mini-jogos lúdicos). Persistência via IndexedDB (`idb-keyval`).

## Stack
- **Bundler/dev:** Vite 6+ (HTTPS local via `vite-plugin-mkcert`)
- **Linguagem:** TypeScript 5.6+
- **Pose detection:** `@mediapipe/tasks-vision` (Pose Landmarker, modelo `lite`)
- **Engine de jogo:** **Phaser 4.x** (ADR-4 do study #1) — `import * as Phaser` (ESM sem default)
- **i18n:** `@lingui/core@^4` runtime (catalog `pt-BR.po` quando compilado; identity fallback enquanto vazio)
- **Persistência:** `localStorage` (recorde, settings, age, audio volumes) + **`idb-keyval@^6`** (profile + runHistory schema v1)
- **Áudio:** Phaser.Sound + Web Speech API (TTS pt-BR pro narrador)
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
│  └─ game/                 # camada de jogo Phaser 4
│     ├─ orchestrator.ts    # pose layer + Phaser.Game; refs via game.registry (incl. profile/missions)
│     ├─ config.ts          # GAME_CONFIG (energy/zones/audio/etc)
│     ├─ scenes/
│     │  ├─ Boot.ts / Welcome.ts / Loading.ts / Tutorial.ts / Calibration.ts
│     │  ├─ Play.ts         # loop principal + cadence/jacks/arms_up + EnergyBar + WaterBreak trigger
│     │  ├─ GameOver.ts     # fallback (Summary é o destino default)
│     │  ├─ Demo.ts         # ?demo=1 cenário sem câmera
│     │  ├─ Settings.ts     # ⭐ Fase 2 — sliders volume, toggles narrator/captions, radio age
│     │  ├─ Summary.ts      # ⭐ Fase 2 — distância+coins+jacks+...+sparkline+missions
│     │  ├─ WaterBreak.ts   # ⭐ Fase 2 — modal 30s a cada 8min cumulativos
│     │  ├─ MiniGamesHub.ts # ⭐ Fase 2 (refine) — hub dos 3 jogos
│     │  ├─ CatchBicho.ts / TrunkTwist.ts / BellRinger.ts # ⭐ mini-jogos
│     │  └─ MiniGameResult.ts                              # ⭐
│     ├─ entities/
│     │  ├─ Player.ts / Obstacle.ts / Coin.ts
│     │  ├─ JackZone.ts / ArmsZone.ts # ⭐ Fase 2
│     │  └─ Bicho.ts / TrunkTarget.ts / Bell.ts # ⭐ mini-jogos (procedurais)
│     ├─ systems/
│     │  ├─ pseudo3d.ts / road.ts / parallax.ts / spawner.ts / scoring.ts / collision.ts / rng.ts
│     │  ├─ energy.ts        # ⭐ EnergySystem (4 tiers, multiplicador velocidade)
│     │  ├─ zones.ts         # ⭐ ZoneManager (JackZone+ArmsZone)
│     │  ├─ shield.ts        # ⭐ ShieldEffect (1 carga)
│     │  ├─ missions.ts      # ⭐ MissionSystem (carrega missions.json, seed por dia, tick)
│     │  ├─ audioBus.ts      # ⭐ música loop + ducking
│     │  └─ narrator.ts      # ⭐ Web Speech API pt-BR
│     ├─ storage/            # ⭐ Fase 2
│     │  ├─ profile.ts       # ProfileStore (idb-keyval, schema v1, migra do localStorage)
│     │  └─ runHistory.ts    # RunHistoryStore (últimas 30 partidas FIFO)
│     ├─ i18n/
│     │  └─ narratorLines.ts # ⭐ Fase 2 — frases por evento via @lingui
│     └─ ui/
│        ├─ hud.ts / cameraPreview.ts / orientationGuard.ts
│        ├─ energyBar.ts     # ⭐ Fase 2 — barra com cor por tier + BPM
│        └─ sparkline.ts     # ⭐ Fase 2 — SVG inline com downsample
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
| #3 | feat | Fase 1 — endless runner mínimo | Mergeada ✅ |
| #4 | feat | Fase 2 — camada de exercício saudável + mini-jogos | **Em andamento — PR aberta** |
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
