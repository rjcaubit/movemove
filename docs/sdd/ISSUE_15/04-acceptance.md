## ✅ Issue #15 — Ninja Fruit: implementação completa

### Cenários de Teste

| CT | Resultado | Como verificar |
|----|-----------|----------------|
| CT01 — Slice fruta | ✅ | `?debug=1` + mover mouse sobre fruta → score sobe, combo exibido a partir de 2 |
| CT02 — Cortar bomba | ✅ | Após 5s (grace period), mouse sobre bomba → shake 220ms, flash branco, -1 vida. 3 bombas → MiniGameResult |
| CT03 — Fruta perdida | ✅ | Deixar fruta passar = -1 vida; bomba que passa = sem penalidade (guard `kind === 'fruit'`) |
| CT04 — Auto-detect mão | ✅ | Câmera real: 3s intro acumula deslocamento L/R, mão com maior movimento vira dominante. Fallback: direita |
| CT05 — E2E click hub | ✅ | Hub → "Mira" → card 🍉 Ninja Fruit → BodyCheck → NinjaFruit: testado com `?debug=1` |
| CT06 — Hub categorizado | ✅ | `MiniGamesHub.ts:53` — card no array `aim`; 4 jogos na categoria Mira |

### Arquivos criados

- `src/game/entities/Fruit.ts` — entidade com física balística + `FruitKind = 'fruit' | 'bomb'`
- `src/game/systems/wristVelocity.ts` — primeiro tracker de velocidade de pulso (H_corpo/s)
- `src/game/ui/sliceTrail.ts` — rastro cosmético polyline, fade 250ms, depth 40

### Arquivos modificados

- `src/game/scenes/NinjaFruit.ts` — cena principal (26ª cena do projeto)
- `src/i18n/strings.ts` — 7 strings PT-BR para NinjaFruit
- `src/game/i18n/narratorLines.ts` — 5 linhas de narrador (start, slice, combo, bomb, lastLife)
- `src/game/ui/hudStyle.ts` — tema `'ninja'` (vermelho/preto)
- `src/game/systems/missions.ts` — case `daily.ninjaSlices` no switch
- `src/game/storage/profile.ts` — `'daily.ninjaSlices'` adicionado ao tipo `MissionProgressKey`
- `src/game/orchestrator.ts` — NinjaFruit registrado na cena list
- `src/game/scenes/MiniGamesHub.ts` — card 🍉 na categoria Mira
- `src/tuning.ts` — 9 constantes `NINJA_*`
- `docs/CODEMAP.md` — cena adicionada à tabela, #15 ao histórico SDD, contagem 26
- `docs/GAMES.md` — seção "13. Ninja Fruit"
- `docs/CHANGELOG.md` — entrada 2026-05-10 #15

### Review combinado

Status: **APROVADO** (após correção de 3 bloqueadores)

Bloqueadores resolvidos:
- B1: Flash de bomba corrigido de vermelho → branco (`255,255,255`)
- B2: `case 'daily.ninjaSlices'` adicionado ao switch em `missions.ts` + tipo em `profile.ts`
- B3: Contagem de cenas corrigida para 26, header do CODEMAP atualizado

### Commits

- `af66d4f` fase A - esqueleto + card no hub
- `581cb69` fase B - entidade Fruit, spawn balístico
- `69010ce` fase C - velocity tracker, auto-detect, slice + bomba
- `1aa43c5` fase D - combo + scoring com multiplier
- `48e74d2` fase E - rastro visual + debug fallback + docs
- `22efd88` fix - ajustes do code review

Branch: `feature/sdd-issue-15`
