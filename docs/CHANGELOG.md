# Changelog — Movemove

Formato: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Todas as datas são UTC.

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
