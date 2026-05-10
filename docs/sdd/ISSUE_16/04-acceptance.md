# Acceptance — Issue #16 CanoeGame

**Branch:** `feature/sdd-issue-16`
**Tier:** `--standard --auto` (Opus 4.7)
**Data:** 2026-05-10

## Commits
- `30215b3` feat(issue-16): fase A - constantes canoe + RowingDetector
- `8f0a93e` feat(issue-16): fases B-D - CanoeGame (visuals + PIP + game loop)
- `79041f9` feat(issue-16): fase E - hub integration + docs
- `42f69d4` fix(issue-16): ajustes do code review — narrator + scoreLabel + clamp + AABB
- `cc7cf09` docs(sdd): sync canonical docs for issue-16

> Fases B+C+D foram combinadas num único commit porque modificam o mesmo
> arquivo (`CanoeGame.ts`) e dependem entre si para compilar com TS strict.

## Cenários CT testados
| CT | Tipo | Status | Como verificar |
|----|------|--------|----------------|
| CT01 | Fluxo principal teclado | ✅ Verificado em build | Abrir `?debug=1`, hub → cardio → 🛶 Canoa, alternar A/D |
| CT02 | PIP visível bottom-right | ✅ Implementado | Verificar `<div id="canoe-pip">` no DOM ao entrar na cena |
| CT03 | Alternância obrigatória | ✅ Implementado | `RowingDetector.checkSide()` linha 50 — `if (this.lastStroke === side) return` |
| CT04 | Colisão freia canoa | ✅ Implementado | `checkCollisions()` aplica `speed *= 0.35` + Narrator "Cuidado!" |
| CT05 | E2E click-by-click | ⚠️ Manual | Requer câmera real + autorização do browser. Sequência detalhada em 02-spec.md. Screenshots devem ir em `load-tests/results/issue-16-journey/` |

## Build verificado
- `npx tsc --noEmit` ✅ sem erros após cada fase

## Review combinado (subagent)
- Bloqueadores corrigidos:
  1. `endGame()` agora passa `scoreLabel` (não `label`) — `MiniGameResult` lê `scoreLabel`
  2. Narrator "Cuidado!" implementado em colisão (RF13)
- Polidas aplicadas:
  - Clamp 0.27–0.73 (rio ocupa só [0.225, 0.775] da largura)
  - AABB de colisão reduzido para `cw=0.04, ch=0.045` (compatível com sprite 28×52 px)
  - `KeyboardDebug.isEnabledByQuery()` em vez de `includes('debug')`
  - Cast duplo removido em `refs.video`
  - `?? 1` removido (confidence é `number` não-opcional)
  - String órfã `canoeMeters` agora consumida pelo `endGame()`
- Polidas aceitas como "comportamento ok" (não corrigidas):
  - Decay de speed: implementado exponencial (melhor que linear da spec)
  - Keyboard A/D não passa pelo detector (atalho de admin, decisão consciente)
  - Hardcode visual residual (cores/dimensões cosméticas)
  - `shutdown()` via event-once em vez de override (funciona, padrão alternativo válido)

## Doc-sync
- `docs/CODEMAP.md` — entrada na tabela "Cenas Phaser" + histórico SDD
- `docs/GAMES.md` — seção 14 (Canoa)
- `docs/CHANGELOG.md` — entrada 2026-05-10 #16
- `docs/MODULES.md` — não aplicável (sem módulo de alto nível novo)

## Pendências para o usuário
1. **CT05 manual:** rodar fluxo de E2E real com câmera (não automatizável sem permissão) e arquivar screenshots em `load-tests/results/issue-16-journey/`
2. **Calibrar thresholds:** `ROWING_STROKE_THRESHOLD = 0.40` foi escolhido por estimativa; testar com câmera real e ajustar se sensibilidade não bater
