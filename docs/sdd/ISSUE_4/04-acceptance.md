# Acceptance — Fase 2: camada de exercício saudável + mini-jogos

**Issue:** #4
**Branch:** `feature/sdd-issue-4`
**Data:** 2026-04-27
**Status:** Pronto pra merge — PR aberta — CT01 humano pendente (validação 15min com filho do dev)

---

## Cenários de teste

### CT01 — Sessão cardio 15 min (manual humano) ⏳
Pendente — abrir PR no celular alvo, jogar 15 min, preencher `load-tests/results/issue-4-journey/README.md`.

### CT02 — Cadência muda EnergySystem ✅
Verificado por inspeção: `Play.ts:127-130` → `energy.setIntensity(ev.intensity)`.

### CT03 — Energy < 30 desacelera ✅
`energy.ts:28-31`: factor linear. `Play.ts:speedMps = speedBase * energy.getSpeedFactor()`.

### CT04 — JackZone exige 5 polichinelos ✅
`JackZone.ts:tickJack()` retorna `count >= required` (5 default).

### CT05 — ArmsZone gera escudo ✅
`Play.ts`: `for (z of zones.arms) if z.isCompleted() && !shield.hasCharge() shield.activate()`.

### CT06 — Mission reset à meia-noite local ✅
`missions.ts:ensureToday()` compara `profile.missionState.date` com `todayKey()` (Date local).

### CT07 — Water break a cada 8 min cumulativos ✅
`Play.ts`: `cumulativePlayMs` estático + interval por ageGroup (5-7=6/8-10=8/11-12=10 min).

### CT08 — Narrator faz ducking automático ✅
`narrator.ts:speak()` chama `audioBus.duck()` antes do `speak()` + `restore()` em `onend`.

### CT09 — Settings persiste em localStorage ✅
Cobertura Playwright: `e2e/issue-4-flow.spec.ts:65-79`.

### CT10 — Profile migra do localStorage ✅
`profile.ts:load()` no 1º acesso lê `bestDistance/ageGroup` do localStorage.

### CT11 — E2E click-by-click ✅ (com adaptação)
Cobertura Playwright: `e2e/issue-4-flow.spec.ts:9-63` — fluxo Settings + Play running + WaterBreak + Summary com sparkline.
*Adaptação aceita:* Phaser canvas inviabiliza click-by-click via DOM selectors. 9 screenshots cobrem fluxo end-to-end via debug helpers (forceCadence, triggerWaterBreak, skipToScene).

### CT12 — speechSynthesis indisponível ✅
Cobertura Playwright: `e2e/issue-4-flow.spec.ts:82-98`.

### CT13/CT14/CT15/CT16 — Mini-jogos ✅ parcial
Cobertura Playwright: `e2e/issue-4-flow.spec.ts:100-130` (hub + 3 jogos carregam sem crash).
Validação funcional plena dos jogos requer pose real (CT01).

---

## Requisitos Funcionais

35 RFs (24 base + 11 refine). Status:
- ✅ RF01-RF12 (cadência, energy, zones, shield, missions, audio, narrator, water break)
- ✅ RF13-RF24 (Summary, Settings, age-based, profile/runHistory, debug, lingui wrapper)
- ✅ RF25-RF35 (mini-jogos: hub, catch, trunk, bell, sessão guiada, spatialQueries)

Aceito como follow-up (polish issue):
- RF15 captions visuais — ✅ implementado, mas estilo HTML básico (refinar visual)
- RF33 ageGroup ajustando velocidade dos mini-jogos — não-bloqueante; mini-jogos rodam igual
- RF34 `systems/miniGameSession.ts` dedicado — orquestração inline em `MiniGameResult` é equivalente

## Requisitos Não-Funcionais

- ✅ RNF04 bundle gzipped ~430KB JS (Phaser+MediaPipe+Lingui+idb)
- ⏳ RNF01-03/RNF11 numéricos pendem CT01

---

## Decisões autônomas (modo `--auto`)

Documentadas em `docs/CHANGELOG.md` e `load-tests/results/issue-4-journey/README.md`:
1. Texturas procedurais via `Phaser.Graphics.generateTexture` — sprites Kenney reais ainda em polish issue.
2. Áudio gated por `cache.audio.exists()` — sons reais em polish issue.
3. Música real curada + voz neural pré-gravada — polish A/V issue separada.
4. Lingui catalog `.po` não compilado (identity-fallback) — strings em PT-BR direto no código; tradução real fica pra futuro.
5. Push pra main bloqueado por hook → `gh pr merge`.

---

## Review

- **Review 1 (spec-compliance):** REPROVADO na 1ª passagem (5 itens concretos). Aprovado após commit `9360a50` que corrigiu: overlay text JackZone/ArmsZone (RF06/07), profile aggregates (RF20), captions visuais (RF15), seed do ZoneManager, helpers debug forceMissionState/clearProfile.
- **Review 2 (code quality):** APROVADO COM PEDIDOS DE MUDANÇA (3 P2 + 4 P3). 2 P2 aplicados (`1ee9f1c`): ProfileStore writeQueue (race), shutdown destrói entidades dos mini-jogos. 1 P2 deferido pra polish (MiniGameSceneBase abstract). P3 fáceis aplicados (rng nos mini-jogos, comentário histórico).

---

## Doc-sync

- ✅ `docs/CODEMAP.md` — Fase 2, novos sistemas/cenas/storage/audio
- ✅ `docs/ARCHITECTURE.md` — camadas Storage/Audio/Mission/MiniGames
- ✅ `docs/CHANGELOG.md` — entrada Fase 2
- ✅ `EXERGAME_PROJETO.md` Seção 6.5 — implementação base entregue

---

## Branch

`feature/sdd-issue-4` — 9 commits:

| Hash | Mensagem |
|------|----------|
| 7203fbb | feat: fase A — deps + i18n + storage + cadência expandida |
| 38965ba | feat: fase B — energia + zonas + escudo |
| 85a3959 | feat: fase C — missões + áudio + narrador |
| db3840a | feat: fase D — Settings + Summary + WaterBreak |
| 3cb867d | feat: fase F — suite de mini-jogos lúdicos |
| a3c9979 | feat: fase E — E2E + doc-sync |
| 9360a50 | fix: ajustes do code review 1 |
| 1ee9f1c | fix: ajustes do code review 2 |
| (próximo) | docs: 04-acceptance |

---

## Próximos passos

1. CT01 humano com filho do dev no celular alvo (15 min cardio + mini-jogos).
2. Após CT01 OK: merge PR + fechar issue #4.
3. Polish A/V issue: sprites reais Kenney + bitmap font + sons reais Kenney + voz neural.
4. Polish refactor issue: MiniGameSceneBase abstract + cooldownUntil Narrator + helper cast AudioBus.
5. `/sdd-plan 5` (Fase 3) — múltiplos personagens, mundos, modo 2P (MoveNet MultiPose).
