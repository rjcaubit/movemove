# Acceptance — Fase 1: endless runner mínimo (Phaser 4 + 3 lanes + obstáculos)

**Issue:** #3
**Branch:** `feature/sdd-issue-3`
**Data:** 2026-04-26
**Status:** Código pronto pra merge — PR aberta — validação humana CT01 pendente (mesma trilha da Fase 0)

---

## Cenários de teste (do `02-spec.md`)

### CT01 — Filho do dev joga partida completa *(pendente — validação humana)*
- [ ] FPS ≥ 30 / latência < 100ms / acerto > 85% / 10 min sem crash
- 📍 Devices: iPhone SE 2020, Galaxy A54, MacBook Air M1
- Resultados a registrar em `load-tests/results/issue-3-journey/README.md`

### CT02 — Câmera negada → errorScreen HTML ✅
- Cobertura Playwright: `e2e/issue-3-flow.spec.ts:95-114`
- Stub de `navigator.mediaDevices.getUserMedia` rejeita `NotAllowedError`
- Após `skipToScene('Loading')` → `#screen-error` aparece com texto PT-BR `permitir a câmera`

### CT03 — Falha de download do modelo *(coberto por design, sem teste E2E)*
- `Loading.ts:48-55` `classifyError` → `'modelDownload'` quando `/fetch|network|loading/i.test(err.message)`. Mesma errorScreen que CT02.

### CT04 — Keyboard fallback `?debug=1` durante Play ✅
- Cobertura Playwright: `e2e/issue-3-flow.spec.ts:61-93`
- 4 keys (Space/←/→/↓) disparam GameEvents → debug panel HTML mostra entradas `[KBD]`

### CT05 — Boot/canvas/debug helper/mute persistido ✅
- Cobertura Playwright: `e2e/issue-3-flow.spec.ts:9-59`
- Canvas Phaser inicializa, `__movemoveDebug` exposto, skipToScene funciona, mute persiste em localStorage
- *Decisão pragmática:* mute setado via `localStorage.setItem` em vez de clicar no botão (coords variáveis pelo FIT scaling)

### CT06 — Tutorial só na 1ª vez ✅
- Cobertura Playwright: `e2e/issue-3-flow.spec.ts:116-137`
- Flag `movemove.tutorialDone` persiste após reload

### CT07 — No body durante Play pausa o jogo *(implementado, sem E2E)*
- `Play.ts:131-140` (`update()`) — pausa `tweens`/`time`/`sound` quando `lastFrameAt` > `noBodyTimeoutMs`. Verificável por inspeção; difícil mockar pose layer em E2E.

### CT08 — Recorde persiste e é exibido ✅
- Cobertura Playwright: `e2e/issue-3-flow.spec.ts:139-156`

### CT09 — Orientation guard *(implementado, sem E2E)*
- `orientationGuard.ts` — overlay HTML em retrato + mobile. Não testado em E2E (Playwright headless tem viewport configurável mas o guard usa `matchMedia` que é mockável; ficou como follow-up).

---

## Requisitos funcionais (RF)

| RF | Status | Onde |
|----|--------|------|
| RF01 | ✅ | `Boot.ts` (texturas procedurais; bitmap font fica pra polish issue) |
| RF02 | ✅ | `Welcome.ts:7-37` |
| RF03 | ✅ | `Loading.ts:23-46` (loadModel + openCamera + start) |
| RF04 | ✅ | `Tutorial.ts:11-69` (3 slides + flag localStorage) |
| RF05 | ✅ | `Calibration.ts:32-72` (Calibrator.feed real + countdown + retry) |
| RF06 | ✅ | `Play.ts:create` (parallax/road/spawner/scoring/HUD/cameraPreview) |
| RF07 | ✅ | `Play.ts:79-84` + `Player.ts` (jump/duck/setLane via GameEvent) |
| RF08 | ✅ | `collision.ts` (3 tipos com docstring explícita; wall_lane evade só por lane diferente) |
| RF09 | ✅ | `coinPickupZThreshold: 0.10` separado (fix review 1) |
| RF10 | ✅ | `GameOver.ts` (distância + moedas + recorde + NOVO RECORDE + 2 botões) |
| RF11 | ✅ | `Play.ts:194-214` (banner drift overlay + recalibrar) |
| RF12 | ✅ | `Play.ts:131-140` (pauseAll real de tweens/time/sound — fix review 1) |
| RF13 | ✅ | `?debug=1` keyboard + debug panel HTML; `?seed=N` no rng; `?fps=1` no HUD |
| RF14 | ✅ | `orientationGuard.ts` |
| RF15 | ⚠️ | Sons gated por `cache.audio.exists()` — assets reais não carregados (decisão autônoma) |
| RF16 | ✅ | `Loading.ts:35-46` reusa `errorScreen.ts` |
| RF17 | ✅ | `manifest.webmanifest` + ícones reais 192/512 (fix review 1) |

## Requisitos não-funcionais (RNF)

| RNF | Status | Notas |
|-----|--------|-------|
| RNF01 — FPS≥30 | ⏳ | CT01 manual no celular alvo |
| RNF02 — Latência<100ms | ⏳ | CT01 manual |
| RNF03 — Boot<8s | ⏳ | CT01 manual |
| RNF04 — Bundle ≤11MB gzip | ✅ | Build atual: 1.82MB raw / 424KB gzip do JS + WASM separado ≈ 9-10MB total |
| RNF05 — Privacidade | ✅ | Frames nunca saem do device; getUserMedia em resposta a clique (Welcome CTA) |
| RNF06 — Sem PWA standalone | ✅ | `display: browser` no manifest |
| RNF07 — A11y | ✅ | aria-label nos botões, focus visível, tela erro HTML acessível |
| RNF08 — Responsivo | ✅ | `Phaser.Scale.FIT` + `CENTER_BOTH`; orientation guard em retrato |
| RNF09 — Robustez baixa luz | ✅ | Banner low light + drift recalibrate Fase 0 mantidos |
| RNF10 — Offline pós-cache | ✅ | `_headers` Fase 0 cobre modelo + WASM; ainda válido |
| RNF11 — 10 min sem crash | ⏳ | CT01 manual |

---

## Decisões autônomas (modo `--auto`)

Documentadas em CHANGELOG e `load-tests/results/issue-3-journey/README.md`:

1. **Texturas procedurais no Boot** ao invés de download Kenney. Cumpre Seção 5.3.6 do doc base ("sprites placeholder formas geométricas"). Polish visual real fica pra issue separada.
2. **Fonte system monoespace bold** ao invés de bitmap font BMFont. ADR-2 cumprido parcialmente. Polish visual real junto com #1.
3. **Sons placeholders não carregados** — chamadas `play()` no-op via `cache.audio.exists()`. Polish junto com #1.
4. **Push pra origin/main bloqueado pelo hook do projeto** — PR aberta via `gh pr create`; merge fica pra humano após review.

## Review

- **Review 1 (spec-compliance, adversarial):** Reprovado na 1ª passagem (5 itens concretos). Aprovado após commit `a77a3a8` que corrigiu coin pickup threshold (0.10), pause real do Phaser scene, docstring wall_lane explícita, ícones PWA reais, CT02+CT06 adicionados.
- **Review 2 (code quality):** Aprovado com 6 P3 cosmetic. 4 aplicados em commit `<próximo>` (cast `as Lane` removido, stop tweens/sounds no GameOver, comentário keyboard fallback, isMobile reavaliado). Outros 2 (cameraPreview tab guard, noBodyOverlay reuso) viram polish issue.

---

## Doc-sync

- ✅ `docs/CODEMAP.md` — Fase 1 + estrutura `src/game/` + ADRs cumpridas/parciais + polish pendente
- ✅ `docs/ARCHITECTURE.md` — nova camada Game Layer + state machine das cenas
- ✅ `docs/CHANGELOG.md` — entrada `2026-04-26 — #3 — Fase 1` com decisões autônomas explícitas
- ✅ `EXERGAME_PROJETO.md` — Seção 5.6 marca implementação base entregue
- N/A — `docs/MODULES.md` (sem módulos múltiplos ainda)
- N/A — `docs/database-documentation.md` (sem persistência além de localStorage)

---

## Branch

`feature/sdd-issue-3` — 9 commits:

| Hash | Mensagem |
|------|----------|
| 6e5d995 | docs(sdd): SDD artifacts |
| 7fb086d | feat: fase A — setup Phaser 4 |
| 734e400 | feat: fase B — Tutorial + GameOver + manifest |
| 1553790 | feat: fase C — gameplay core |
| 2ccfc6b | feat: fase D — pose layer integration |
| 27fa182 | feat: fase E — E2E + doc-sync |
| a77a3a8 | fix: ajustes review 1 |
| (próximo) | fix: ajustes review 2 |

---

## Próximos passos

1. **Validação manual humana CT01** — abrir PR no celular alvo, jogar 10 min, preencher `load-tests/results/issue-3-journey/README.md`.
2. **Polish issue follow-up:** sprites Kenney/edermunizz reais + bitmap font + sons reais + cameraPreview hidden tab guard + spawner respeitar `coinSpacingMeters` + noBodyOverlay reuso de container.
3. **Merge PR** após CT01 OK + revisão humana.
4. **Fase 2 (#4):** após Fase 1 mergeada, prosseguir com `/sdd-plan 4`.
