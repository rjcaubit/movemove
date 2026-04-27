# Changelog — Movemove

Formato: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Todas as datas são UTC.

## 2026-04-27 — #4 — feat: Fase 2 — camada de exercício saudável + mini-jogos lúdicos

### Added
- `idb-keyval@^6` + `@lingui/core@^4` adotados; `strings.ts` virou wrapper `i18n._()` (catalog vazio = identity fallback).
- `OneEuroSmoother` criado (preparado, não ativado por default — ADR-5).
- Cadência ganha `bpm` + `intensity` (4 tiers: none/walking/jogging/running) + decay event quando jogador para.
- `EnergySystem`: barra 0-100 sobe com cadência, multiplica velocidade do mundo (linear abaixo de 30, full acima).
- `ZoneManager` com 2 tipos: `JackZone` (5 polichinelos em 4s → bônus) e `ArmsZone` (3s arms_up sustentado → escudo).
- `ShieldEffect`: aura azul, 1 carga, consome em colisão antes de game over.
- `MissionSystem` + `ProfileStore` + `RunHistoryStore` (idb-keyval, schema v1, migra soft do localStorage).
- 7 templates de missão diária (`public/data/missions.json`) com seed `version + YYYY-MM-DD`.
- `AudioBus` com música em loop + ducking automático (~500ms restore).
- `Narrator` Web Speech API pt-BR com cooldown 3s + cancelamento por prioridade + fallback gracioso.
- 3 cenas novas: `Settings` (sliders + toggles + radio age), `Summary` (substitui GameOver default; sparkline SVG), `WaterBreak` (modal a cada 8 min, ajustável por idade).
- Welcome ganha 2 botões: "Mini-jogos" + "Configurações".
- **Modo Mini-jogos** (refinamento /sdd-refine): 3 jogos lúdicos focados em movimentos de braço/tronco:
  - **Pega o Bicho** (60s, mão única ou alternando por cor azul/vermelho)
  - **Roda Tronco** (90s, threshold 25° sustentado 200ms)
  - **Toca o Sino** (75s, BPM 100 com combo)
  - `MiniGamesHub` + `MiniGameResult` + Sessão Guiada (3 jogos em sequência)
- `src/pose/spatialQueries.ts` (handAt / trunkRotationAngle / bothHandsAbove) — preserva invariante "scenes não leem keypoints crus".
- `?debug=1` ganha B/S/M/W (boost/shield/skip-summary/water-break).
- `__movemoveDebug` ganha `triggerWaterBreak`, `forceCadence`, `skipMiniGame`, `skipToScene` com data.
- E2E: 4 testes novos (CT09/CT11/CT12 + CT13/CT16). 9/9 passando.

### Decisões autônomas (mantidas da Fase 1, ainda válidas)
- Texturas procedurais via `Phaser.Graphics.generateTexture` (sprites Kenney reais ainda em polish issue).
- Áudio gated por `cache.audio.exists()` (sons reais em polish issue).
- Push pra main bloqueado por hook → `gh pr merge`.

### Pendências
- CT01 manual humano 15min (filho do dev no celular alvo) — validação pós-merge.
- Música real curada + voz neural pré-gravada → polish A/V issue separada.

### Spec
- Design: `docs/sdd/ISSUE_4/00-design.md`
- Research: `docs/sdd/ISSUE_4/01-research.md`
- Spec: `docs/sdd/ISSUE_4/02-spec.md` (24 RFs base + 11 RFs do refine + 16 CTs)
- Tasks: `docs/sdd/ISSUE_4/03-tasks.md` (Fases A-F)

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
- **Push pra origin/main bloqueado por hook do projeto** — PR aberta via `gh pr create`; merge via `gh pr merge`.

### Iteração UX pós-validação no celular (mesmo dia)
- **Câmera frontal espelhada** (poseDetector flip x + cameraPreview ctx.scale(-1,1)): "movo pra direita → personagem vai pra direita".
- **Pista alargada** (laneXOffsetAtNear 200→280, multiplicador 1.5→1.7): consome ~99% da largura ao invés de ~62%.
- **Placeholders semânticos**: vermelho virou rolo horizontal (cilindro deitado) pra ler como "pular por cima"; laranja virou torii (2 postes + trave) pra ler como "agachar pra passar por baixo". Roxo segue parede.
- **Janela de evasão maior**: pulo 600→1000ms + altura 80→110px; agachamento 800→1200ms.
- **Cena Demo (`?demo=1`)**: visual completo (player + obstáculos + moedas) sem câmera/colisão pra avaliar à distância. Setas ajustam velocidade/lane.
- **Reordenação calibração**: agora **calibra primeiro** (capturando silenciosamente com "..." pulsando) → 3-2-1-GO → Play. Antes era 3-2-1 → captura → Play.
- **"Get ready" 3-2-1 no Play**: roda só no replay (botão "Jogar de novo"); não duplica após calibração via `init({ skipPrep: true })`.
- **Sensibilidade lateral reduzida**: `laneThresholdFracOmbros` 0.20→0.35, `laneHysteresisFrac` 0.05→0.12 — exige deslocamento maior do quadril; reduz lane-changes acidentais.

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
