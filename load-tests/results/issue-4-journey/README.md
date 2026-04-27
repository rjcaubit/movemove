# Issue #4 — Fase 2 cardio + mini-jogos — Resultados

**Branch:** `feature/sdd-issue-4`
**Data dos testes E2E:** 2026-04-27

## Testes Playwright (automatizados — 4 novos + 5 regressão Fase 1 = 9/9 passando)

Screenshots em `screenshots/`:
- `01-welcome.png` — Welcome com 2 botões (Começar + Mini-jogos) + Configurações
- `02-settings.png` — Settings scene com sliders/toggles/age
- `04-play-running.png` — Play após force cadence running
- `05-water-break.png` — modal water break
- `06-summary.png` — Summary com sparkline SVG visível
- `ct13-hub.png` — MiniGamesHub
- `ct13-catch.png` — Pega o Bicho ativa
- `ct14-trunk.png` — Roda Tronco ativo
- `ct15-bell.png` — Toca o Sino ativo

CTs cobertos:
- CT09 — Settings persiste em localStorage após reload
- CT11 — Settings + Play running + WaterBreak + Summary com sparkline (E2E click-by-click)
- CT12 — speechSynthesis indisponível não crasha
- CT13/CT16 — MiniGames hub e 3 jogos carregam

## CT01 — Validação humana 15min — PENDENTE

| Device | FPS | Cadência fiel? | Polichinelos zonas (5+)? | Escudos (3+)? | Missão completa? | 15 min sem crash? | Cansou? |
|--------|-----|----------------|--------------------------|---------------|------------------|--------------------|---------|
| iPhone SE 2020 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| MacBook Air M1 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Mini-jogos — testar manualmente
- **Pega o Bicho** — modo alternando: bicho azul vem na esquerda → toca com mão esquerda; vermelho na direita → mão direita. Testar 60s.
- **Roda Tronco** — alvos esquerda/direita; girar tronco até quebrar (>25° sustentado).
- **Toca o Sino** — sinos azuis (mão esquerda) e vermelhos (mão direita) pulsam em ritmo. Testar combo de 5+.
- **Sessão Guiada** — concatena os 3, ~4 min total.

## Bugs encontrados

| # | Severidade | Descrição | Status |
|---|-----------|-----------|--------|
| — | — | (preencher após CT01 manual) | — |

## Decisões autônomas (durante /sdd-execute --auto)

Mantidas da Fase 1 (texturas procedurais, sons placeholders, fonte system) — esperado pra polish A/V issue separada.
Push pra main bloqueado por hook → PR via `gh pr create`/`gh pr merge`.
