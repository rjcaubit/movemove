# Changelog — Movemove

Formato: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Todas as datas são UTC.

## 2026-04-26 — #3 — feat: Fase 1 — endless runner mínimo (Phaser 4)

### Added
- Adiciona Phaser 4 como engine de jogo (ADR-4 do study #1; `import * as Phaser` por causa do ESM sem default).
- 7 cenas Phaser: `Boot`, `Welcome`, `Loading`, `Tutorial` (3 slides 1× por device), `Calibration` (consome `Calibrator.feed` real), `Play`, `GameOver` (com recorde local).
- Sistemas em `src/game/systems/`: pseudo-3D Enduro/Out Run (`pseudo3d`, `road`), paralax 3 camadas (`parallax`), spawner determinístico via `?seed=N` (`spawner`, `rng`), scoring (distância em m + moedas), collision 2D em `z<0.15`.
- Entidades em `src/game/entities/`: `Player` (run/jump/duck/lane com tween), `Obstacle` (3 tipos: barrier/low_barrier/wall_lane), `Coin` (clusters de 5).
- Pose layer da Fase 0 reusada integralmente; cenas consomem `EventDetector` via bus `EventTarget`.
- Mini-preview da câmera (canto superior direito) reusa `KeypointOverlay`.
- HUD com fonte monoespace + sons gated por `cache.audio.exists()` + recorde local em `localStorage`.
- PWA básico (`manifest.webmanifest`, `display: browser` — sem standalone, evita risco iOS PWA + getUserMedia).
- Orientation guard pra retrato em mobile.
- E2E Playwright atualizado pra HTTPS (mkcert): 3 testes passando — boot/canvas (CT05), keyboard fallback (CT04), recorde persistido (CT08).
- `__movemoveDebug` helpers (`forceBaseline`, `skipToScene`) pra Playwright determinístico.

### Decisões autônomas (durante /sdd-execute --auto)
- **Sprites Kenney → texturas procedurais** geradas no Boot via `Phaser.Graphics.generateTexture`. Cumpre Seção 5.3.6 do doc base ("sprites placeholder formas geométricas"). Real Kenney/edermunizz vira issue separada de polish visual.
- **Bitmap font → fonte system monoespace bold**. ADR-2 não cumprido literalmente; visual menos coerente com pixel art mas zero dependência. Bitmap font real entra junto com sprites no polish issue.
- **Sons placeholders não carregados** — chamadas `sound.play()` viram no-op via `cache.audio.exists()` guard.
- **Push pra origin/main bloqueado por hook do projeto** — PR aberta via `gh pr create`; merge fica pra humano após review.

### Achados / pendências
- Bundle final ~10MB gzip (Phaser 4 ~250KB + MediaPipe lite + WASM). RNF04 redefinido vs Fase 0 (<5MB era irreal).
- CT01 manual humano (filho do dev no celular alvo) + RNF01-03 (FPS/latência/boot) pendentes pra validação pós-merge.

### Spec
- Design: `docs/sdd/ISSUE_3/00-design.md`
- Research: `docs/sdd/ISSUE_3/01-research.md`
- Spec: `docs/sdd/ISSUE_3/02-spec.md`
- Tasks: `docs/sdd/ISSUE_3/03-tasks.md`

## 2026-04-26 — #2 — feat: Fase 0 — PoC de detecção de pose com MediaPipe

### Added
- Setup inicial do projeto (Vite 6 + TS 5.9 + `@mediapipe/tasks-vision` 0.10.34).
- Pose layer (`src/pose/`): `poseDetector` (wrapper MediaPipe + getUserMedia), `smoother` (EMA α=0.5), `calibration` (countdown + baselines em 2s contínuos), `events` (6 heurísticas da Seção 3.3 do EXERGAME_PROJETO.md com thresholds em fração de H_corpo).
- UI layer (`src/ui/`): telas Welcome / Loading (com spinner indeterminado) / Calibration (countdown 3-2-1) / Active / Error / NoBody, painel debug toggle (FPS, conf, 4 baselines, lane, cadência, log de eventos), pip overlays coloridos por evento, banner amarelo de iluminação fraca, sugestão de recalibrar drift.
- Modo debug `?debug=1` com keyboard fallback (Seção 3.5): Space/Arrows/J/R.
- 6 estados especiais (Seção 3.4): no body, low confidence, drift recalibrate suggestion, error screens (camera denied/not found/model download/generic).
- Estrutura `docs/CODEMAP.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md` iniciais.
- Deploy Cloudflare Pages: `wrangler.toml`, `public/_headers` com Content-Type e Cache-Control corretos.
- Playwright E2E (CT06): 2 testes (fluxo principal + camera denied), 6 screenshots.

### Achados (não-bloqueantes)
- Bundle 18MB total (modelo lite 5.5MB + WASM SIMD 11MB) — RNF04 (<5MB) é irreal com MediaPipe lite. Documentado.
- CT01 (validação manual humana com criança real do dev) pendente — fora de escopo do agente. Critério de aceitação documentado em `load-tests/results/issue-2-journey/README.md`.
- Dev local agora roda em HTTPS via `vite-plugin-mkcert` (CA auto-instalada no Mac trust store). Necessário para `navigator.mediaDevices` funcionar fora de `localhost` (ex: testar do celular via IP LAN).
- Tratamento do erro de secure context: novo `ErrorKind: 'insecureContext'` mostra mensagem em PT-BR explicando como abrir corretamente.

### Spec
- Design: `docs/sdd/ISSUE_2/00-design.md`
- Research: `docs/sdd/ISSUE_2/01-research.md`
- Spec: `docs/sdd/ISSUE_2/02-spec.md`
- Tasks: `docs/sdd/ISSUE_2/03-tasks.md`
- Acceptance: `docs/sdd/ISSUE_2/04-acceptance.md`
