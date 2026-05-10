# Design — Ninja Fruit (mini-jogo de cortar frutas)

**Data:** 2026-05-10
**Status:** Proposto (aguardando aprovação)
**Tipo:** feature

## Problema

O catálogo de mini-jogos do movemove tem hoje 8 jogos cobrindo cardio
(runner, ChickenGame), ritmo (DanceDance, BellRinger) e mira/coordenação
(CastorGame, BellRinger, CatchBicho, TrunkTwist). Falta um jogo que
explore **precisão de mão dominante com timing curto** — exigência de
foco e reação rápida, com identidade visual marcante. Ninja Fruit é um
clássico universalmente reconhecido que se traduz naturalmente para
detecção via pose: trajetória de pulso atravessando objeto.

## Usuário e caso de uso

Mesmo público dos outros mini-jogos (jogador do hub, qualquer faixa
etária do `AGE_GROUPS`). Caso de uso: sessão de ~60-90s no hub ou dentro
de uma `GuidedSession`, treinando coordenação mão-olho e reação.

## Escopo

### Inclui
- Cena Phaser nova `NinjaFruit.ts`
- Entidade unificada `Fruit.ts` com `FruitKind = 'fruit' | 'bomb'`
  (espelha o padrão `'good' | 'bad'` do `Castor.ts`)
- Spawning adaptativo em arco balístico (gravidade simulada na cena),
  com **grace period** inicial onde só fruta surge (igual `BAD_GRACE_MS`
  do Castor)
- Detecção híbrida: velocity-based (slice real) + trajectory polyline (rastro visual)
- Auto-detect mão dominante na intro (~3s)
- Sistema de vidas (3) + combo + scoring
- Hand glow no pulso da mão dominante (igual BellRinger)
- Integração no MiniGamesHub categoria "Mira"
- Encerra em `MiniGameResult`
- Mobile-first portrait

### Não inclui (fora desta issue)
- Modo 2 jogadores (futuro, segue padrão `CastorModePicker` se viável)
- Power-ups (frutas especiais, fruta congelada, etc.) — adicionar em issue separada se quisermos
- Música MIDI dedicada — reusa AudioBus genérico ou um track existente
- Compilação de strings PT-BR no catalog Lingui (continua identity fallback)

## Abordagem escolhida

**Detecção híbrida** + **auto-detect calibração** + **padrão good/bad
do Castor**:

- **Slice real (lógica):** wrist do braço dominante com velocidade
  acima de threshold (`> 1.2 H_corpo/s`, ajustável) cruzando bbox da
  fruta = corte confirmado. Mesma ideia do `Puncher` do CastorGame.
- **Rastro visual (cosmético):** Phaser `Graphics` desenha polyline
  dos últimos 10-12 pontos do pulso, com fade alpha e gradiente de
  cor. NÃO entra na detecção — só feel.
- **Auto-detect mão:** durante intro de ~3s, mede deslocamento total
  de cada pulso; o que somar mais distância vira a mão dominante.
  Texto na tela: "acene a mão que vai cortar". Após decisão, hand
  glow só no pulso escolhido.
- **Bomba como item negativo (= `bad` do Castor):** spawnada na
  mesma fila das frutas com chance crescente. Grace period inicial
  (~5s) só com frutas pra jogador entrar no ritmo. Visual contrasta
  fortemente (preta com pavio aceso animado). Cortar = -1 vida +
  screenShake + flash + SFX explosão + narrador reativo.

## Abordagens descartadas

| Abordagem | Motivo de descarte |
|-----------|---------------------|
| Velocity puro sem rastro | Perde identidade visual icônica do Fruit Ninja |
| Polyline puro (sem velocity check) | Tuning mais frágil, line-rect intersection cara |
| Picker de mão tipo CastorModePicker | Adiciona cena e clique; auto-detect é mais lúdico |
| Default direita + swap | Menos elegante, exige UI extra na HUD |

## Reuso do CODEMAP

- `src/game/ui/cameraBackdrop.ts` — vídeo + skeleton overlay
- `src/game/entities/Castor.ts` — **prior art direto do padrão alvo
  bom/mau:** `CastorKind = 'good' | 'bad'`, `BAD_EMOJIS`,
  `BAD_GRACE_MS`, `BAD_SPAWN_CHANCE`, narrador reage a hit ruim
  (`castorBadHit`). NinjaFruit adota a mesma estrutura: `FruitKind =
  'fruit' | 'bomb'`, `BOMB_EMOJIS` (`💣` `🧨`), grace period
  inicial, chance crescente de bomba ao longo da partida
- `src/game/entities/Puncher.ts` — referência para detecção de velocity
  (pode ser extraído pra utilitário `wristVelocity.ts` ou reusado direto)
- `src/pose/spatialQueries.ts::handAt` — hit test pulso↔fruta
- `src/game/ui/Pill.ts` (hudStyle) — HUD de pontos/vidas/combo
- `src/game/ui/BackButton.ts` — voltar pro hub
- `src/game/systems/audioBus.ts` — música/SFX
- `src/game/systems/narrator.ts` — fala "ninja!" em combos altos
- `src/game/scenes/MiniGameResult.ts` — tela de fim
- Padrão de **spawning adaptativo** (acelera em acertos, desacelera em
  erros) — visto em `CatchBicho` e `BellRinger`
- `src/game/ui/textureGen.ts` — placeholders procedurais para frutas/bombas
  enquanto sprites finais não chegam
- Cards do `MiniGamesHub` — adicionar entrada na categoria "Mira"

## Impacto arquitetural

- **Frontend:**
  - Cena: `src/game/scenes/NinjaFruit.ts` (nova)
  - Entidades: `src/game/entities/Fruit.ts`, `src/game/entities/Bomb.ts` (novas)
  - Possível util: `src/game/systems/wristVelocity.ts` (extrair de Puncher se valer)
  - Possível util: `src/game/ui/sliceTrail.ts` (rastro polyline cosmético)
  - Atualização: `src/game/orchestrator.ts` (registrar cena), `src/game/scenes/MiniGamesHub.ts` (card na categoria Mira)
- **Backend:** N/A
- **AI service:** N/A
- **Schema:** N/A (estatísticas locais via `RunHistoryStore` já existente, se aplicável)
- **Assets:** sprites de frutas (maçã, melancia, banana, laranja, abacaxi) +
  bomba/dinamite. Buscar no pack Kenney existente; fallback procedural via
  `textureGen` quando faltar.
- **Docs canônicas a atualizar:** CODEMAP (cenas registradas),
  GAMES.md (nova seção "13. Ninja Fruit"), MODULES.md se entidades
  novas o exigirem, CHANGELOG.md.

## Critérios de sucesso

- [ ] Aparece como card na categoria "Mira" do `MiniGamesHub`
- [ ] Intro auto-detecta mão dominante em ≤3s
- [ ] Frutas surgem em arcos balísticos a partir da borda inferior
- [ ] Cortar fruta = +pontos, split em 2 metades + partículas
- [ ] Bomba cortada = -1 vida + screenShake + flash
- [ ] Fruta perdida = -1 vida
- [ ] Combo cresce com cortes seguidos; multiplier visível na HUD
- [ ] 3 vidas → ao zerar, transição para `MiniGameResult` com score+bestCombo
- [ ] Mobile-first portrait; hand glow no pulso dominante
- [ ] `?debug=1` permite jogar com mouse/teclado como fallback

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Tuning de threshold de velocity inadequado (acionamentos espúrios ou jogador não consegue cortar) | alta | Reusar valores do `Puncher`; expor em `tuning.ts`; testar com `?debug=1` |
| Bomba indistinguível visualmente, jogador corta sem querer | média | Cor/shape muito contrastante (preta com pavio aceso animado), spawn delay menor que frutas, SFX preview |
| Auto-detect de mão erra em jogador estático | média | Fallback: se nenhuma mão atinge threshold de movimento em 3s, default direita + dica visual permitindo trocar acenando |
| Spawn balístico exige tuning físico fino | média | Começar com `Phaser.Physics.Arcade` simples; gravidade fixa; refinar |
| Performance com rastro polyline + skeleton + frutas voando | baixa | Limitar pontos do trail a 12; usar `Graphics.clear` + redraw por frame |

## Próximo passo

→ Executar `/sdd-plan 15` para gerar specs técnicas (spec + tasks granulares).
