# Issue #3 — Endless Runner v0.1 — Resultados

**Branch:** `feature/sdd-issue-3`
**Deploy:** _pendente humano: `npx wrangler pages deploy dist`_
**Data dos testes E2E:** 2026-04-26

## CT05 / CT04 / CT08 — Playwright (automatizado)

Screenshots em `screenshots/`:
- `01-welcome.png` (canvas Phaser inicializado)
- `03-tutorial.png` (cena Tutorial via debug helper)
- `05-play-initial.png` (Play scene após force baseline)
- `06-play-jump.png` (após Space)
- `07-play-lane-right.png` (após ArrowRight)
- `10-mute-toggled.png` (mute persistido)
- `ct04-debug-play.png` (debug panel HTML com eventos [KBD])
- `ct08-record-persisted.png` (recorde 100m persistido)

## CT01 — Validação humana manual (filho do dev) — PENDENTE

| Device | FPS médio | Acerto jump/duck/lane | Latência percebida | Falsos pos. jump (30s parado) | 10 min sem crash? |
|--------|-----------|----------------------|---------------------|--------------------------------|-------------------|
| iPhone SE 2020 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| Galaxy A54 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| MacBook Air M1 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Bugs encontrados

| # | Severidade | Descrição | Status |
|---|-----------|-----------|--------|
| — | — | (preencher após CT01 manual) | — |

## Decisões autônomas registradas (durante /sdd-execute --auto)

1. **Sprites Kenney substituídos por texturas procedurais no Boot** — gera retângulos coloridos via `Phaser.Graphics.generateTexture`. Cumpre Seção 5.3.6 do doc base (sprites placeholder permitidos). Real Kenney/edermunizz fica pra issue separada de polish visual.
2. **Bitmap font substituída por fonte system monoespace** (`ui-monospace, Menlo, monospace`) com `fontStyle: bold`. ADR-2 não cumprido literalmente; visual menos coerente com pixel art mas legível e zero dependência externa. Bitmap font real entra junto com sprites no polish issue.
3. **Sons placeholder não carregados** — chamadas `sound.play()` viram no-op via `cache.audio.exists()` guard. Sons reais entram no polish issue.
4. **Push pra origin/main bloqueado por hook do projeto** — PR aberta via `gh pr create`; merge fica pra humano após review.
