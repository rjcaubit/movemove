# Changelog — Movemove

Formato: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Todas as datas são UTC.

## [Unreleased] — Fase 0 (Issue #2)

### Added
- Setup inicial do projeto (Vite 6 + TS 5.6 + `@mediapipe/tasks-vision` 0.10.34).
- `pose/poseDetector.ts`, `smoother.ts`, `calibration.ts`, `events.ts` com 6 heurísticas da Seção 3.3 do `EXERGAME_PROJETO.md`.
- Telas Welcome / Loading / Calibration / Active / Error / NoBody.
- Painel de debug com FPS, baselines, lane, cadência, log de eventos.
- Modo debug `?debug=1` com keyboard fallback (Seção 3.5).
- Estrutura `docs/CODEMAP.md`, `docs/ARCHITECTURE.md`.
- Deploy Cloudflare Pages.
