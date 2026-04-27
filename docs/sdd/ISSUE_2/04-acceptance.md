# Acceptance — Fase 0: PoC de detecção de pose

**Issue:** #2
**Branch:** `feature/sdd-issue-2`
**Data:** 2026-04-26
**Status:** Encerrada — CT01 e RNF01–03 deferidos pra Fase 1 (validação humana só faz sentido com gameplay real)

---

## Cenários de teste (do `02-spec.md`)

### CT01 — Fluxo principal manual humano *(deferido pra Fase 1)*

Validação manual com filho do dev no celular alvo. **Não automatizável.**

Decisão de encerramento (2026-04-26): medir FPS/acerto/latência/falsos positivos *sem gameplay real* gera ruído subjetivo demais. CT01 e RNF01–03 viram critério de aceite da Fase 1, junto com o loop de jogo, onde "errar um pulo" tem consequência observável.

Critérios reagendados pra Fase 1:
- [ ] FPS médio ≥ 30 (medir no painel debug)
- [ ] Acerto subjetivo > 85% pra jump/duck/lane (em 20 tentativas, ≤ 3 perdas)
- [ ] Latência percebida < 150ms (julgamento subjetivo)
- [ ] Falsos positivos de jump em 1 min parado: ≤ 2

📍 Devices a testar: iPhone SE 2020, Galaxy A54, MacBook Air M1.
📍 Iluminações: dia, noite com luz acesa, contraluz, pouca luz.
📍 Roupas: colada, larga, com casaco/chapéu.

### CT02 — Câmera negada → Error screen ✅

Cobertura via Playwright: `e2e/issue-2.spec.ts:69-100`.

- ✅ Stub de `getUserMedia` rejeita com `NotAllowedError`
- ✅ `expect(errorScreen).toBeVisible({ timeout: 10s })`
- ✅ `expect(errorScreen).toContainText(/permitir a câmera/i)` (string PT-BR de `strings.error.cameraDenied`)
- ✅ Botão "Tentar de novo" visível
- ✅ Screenshot `07-camera-denied.png`

### CT03 — Falha de download do modelo *(coberto por design, sem teste E2E)*

Tratamento via `classifyError` em `main.ts:175`: erro com `/fetch|network|loading/i` → `'modelDownload'` → Error screen com mensagem `strings.error.modelDownload`. Sem mock automatizado, mas fluxo idêntico ao CT02 (mesma Error screen, botão Retry).

### CT04 — Modo debug com keyboard fallback ✅

Cobertura via Playwright: `e2e/issue-2.spec.ts:43-60`.

- ✅ `?debug=1` ativa `KeyboardDebug`
- ✅ Espaço → log mostra `[KBD] jump` (verificado via `expect(log).toContainText('[KBD]')` + `expect(log).toContainText('jump')`)
- ✅ ←/→ → `lane=-1` / `lane=1`
- ✅ ↓ → `duck`
- ✅ J → `jumping_jack`
- ✅ R → `cadence=` no log
- ✅ Screenshot `05-keyboard-fired.png`

### CT05 — Estados degradados *(implementados, sem teste E2E automatizado)*

Implementação verificada em `src/main.ts`:
- **No body** (linha 234): `setNoBodyVisible` quando `lastFrameAt` > 1.5s (`POSE_CONFIG.noBodyTimeoutMs`).
- **Low light banner** (linha 218): após 3s contínuos de confiança < 0.6 (`POSE_CONFIG.lowConfidenceWarnDurationMs`).
- **Drift recalibrate suggestion** (linha 220-228): após 10s contínuos de baixa confiança, banner com botão Recalibrar.

Cobertura E2E pendente — exige stream com keypoints simulados de baixa confiança, fora do escopo do `--use-fake-device` do Chrome.

### CT06 — E2E click-by-click ✅

Cobertura via Playwright: `e2e/issue-2.spec.ts:10-67`.

- ✅ Welcome screen visível com headline e CTA
- ✅ Click "Ligar câmera" → transição
- ✅ Toggle debug visível e clicável (z-index fix verificado)
- ✅ Painel debug abre com rows FPS/Conf./Lane/Baseline/Cadência
- ✅ Keyboard fallback: 6 eventos disparados, log validado
- ✅ Recalibrate path coberto no fluxo principal
- ✅ 6 screenshots numerados em `load-tests/results/issue-2-journey/screenshots/`:
  - `01-welcome.png`, `02-after-click-cta.png`, `03-after-loading.png`,
  - `04-debug-panel.png`, `05-keyboard-fired.png`, `07-camera-denied.png`.

---

## Requisitos funcionais (RF)

| RF | Status | Onde |
|----|--------|------|
| RF01 | ✅ | `src/ui/welcomeScreen.ts:14-17` (botão CTA) + `src/main.ts:128` (boot) |
| RF02 | ✅ | `src/pose/poseDetector.ts:36-54` (`getUserMedia` 480p frontal) |
| RF03 | ✅ | `src/ui/loadingScreen.ts:17-39` (spinner + status messages) + `src/main.ts:156-157` |
| RF04 | ✅ | `src/pose/calibration.ts:31-77` (2s contínuos com confiança ≥0.6) + `src/ui/calibrationScreen.ts` |
| RF05 | ✅ | `src/ui/keypointOverlay.ts:30-59` (33 keypoints + connections) |
| RF06 | ✅ | `src/pose/events.ts` (6 heurísticas — jump com ascendente, duck 200ms sustain, lane com histerese, cadence por step novo, jack com topo da cabeça via nariz, arms_up sobre olhos) |
| RF07 | ✅ | `src/ui/eventOverlay.ts` (pip 500ms) |
| RF08 | ✅ | `src/ui/debugPanel.ts` (FPS/Conf/4 baselines/Lane/Cadência/log) |
| RF09 | ✅ | `src/main.ts:103-110` (handler do botão Recalibrar) |
| RF10 | ✅ | `src/main.ts:209-226, 233-241` (no body / low conf / drift) |
| RF11 | ✅ | `src/debug/keyboard.ts` (Space/Arrows/J/R) + `src/main.ts:54-57` |
| RF12 | ✅ | `src/i18n/strings.ts:28-38` + `src/main.ts:172-181` (classify) |

## Requisitos não-funcionais (RNF)

| RNF | Status | Notas |
|-----|--------|-------|
| RNF01 — FPS≥30 | ⏳→Fase 1 | Mensuração só faz sentido com gameplay real |
| RNF02 — Latência<150ms | ⏳→Fase 1 | Idem RNF01 |
| RNF03 — Boot<8s | ⏳→Fase 1 | Idem RNF01 |
| **RNF04 — Bundle<5MB** | ❌ | **Achado:** modelo lite real é 5.5MB (não 3MB), WASM SIMD 11MB. Bundle final 18MB (~9MB gzipped). Budget irreal com MediaPipe lite. Atualizar na Fase 1. |
| RNF05 — Privacidade | ✅ | `getUserMedia` em resposta a clique (welcomeScreen). Modelo + WASM same-origin. |
| RNF06 — Sem PWA standalone | ✅ | `index.html` sem `<link rel="manifest">` nem service worker. |
| RNF07 — A11y básica | ✅ | `aria-label` em todos os botões, `aria-expanded` no debug toggle, focus visível, contraste OK. |
| RNF08 — Responsivo | ✅ | `videoIdealWidth/Height` adapta; `keypointOverlay.resizeToVideo` ajusta canvas. |
| RNF09 — Robustez baixa luz | ✅ | Banner low light + threshold de confiança 0.6 (`POSE_CONFIG.lowConfidenceThreshold`). |
| RNF10 — Offline pós-cache | ✅ | `_headers` com `Cache-Control: max-age=31536000, immutable` pra modelo + WASM. |

---

## Review

- **Review 1 (spec-compliance, adversarial):** Reprovado na 1ª passagem (12 achados). Aprovado na 2ª passagem após commit `df9d1dd` que corrigiu 9 achados de fórmula de heurística + Playwright assertions + npm scripts. CT01 e RNF04 aceitos como pendências documentadas.
- **Review 2 (code quality):** Aprovado com 6 P2 cosmetic. Aplicados 3 deles em commit `e1ec955` (try/catch no RAF loop + i18n strings + aria-expanded). Outros P2 ficam pra follow-up issue não bloqueante.

---

## Doc-sync

- ✅ `docs/CODEMAP.md` — atualizado com status pós-merge da #2 e seção de achados da Fase 0
- ✅ `docs/ARCHITECTURE.md` — criado com camadas e state machine
- ✅ `docs/CHANGELOG.md` — entrada `2026-04-26 — #2 — feat: Fase 0`
- N/A — `docs/MODULES.md` (não há módulos múltiplos ainda; vai aparecer na Fase 1+)
- N/A — `docs/database-documentation.md` (sem persistência)
- N/A — `docs/PADROES_API_FRONTEND.md` (sem APIs HTTP)

---

## Branch

`feature/sdd-issue-2` — 8 commits:

| Hash | Mensagem |
|------|----------|
| 934e8a5 | chore: fase A — setup do projeto greenfield |
| 6f0c6cb | feat: fase B — UI base, telas e state machine |
| 0a2071c | feat: fase C — pose detection com MediaPipe |
| eabe141 | feat: fase D — calibração + 6 heurísticas + bus de eventos |
| 52bc29b | feat: fase E — debug, estados especiais, deploy, validação |
| df9d1dd | fix: ajustes do code review 1 |
| e1ec955 | fix: ajustes do code review 2 |
| (próximo) | docs: sync canonical docs |

---

## Encerramento

Issue #2 fechada em 2026-04-26. Detector de pose, calibração, 6 heurísticas, debug panel, estados degradados, deploy Cloudflare Pages e HTTPS local via mkcert estão em `main`. Pips de evento já com labels PT-BR (POLI / PULAR / AGACHAR / ESQ / DIR / BRAÇOS).

**Pendências reagendadas:**
- **CT01 + RNF01–03** → Fase 1 (validação humana com loop de jogo real)
- **RNF04 (bundle <5MB)** → reescopo na Fase 1 (modelo lite real é 5.5MB; budget irreal)
- **Cosmetic P2:** refactor `duckPhase` state machine, extrair `headTopOffsetFracHCorpo`, mover `RELEVANT_KP_INDICES` pro config, trocar `innerHTML` do log por DOM. Vira issue separada sem urgência.

**Próximo:** `/sdd-plan 3` pra abrir Fase 1.
