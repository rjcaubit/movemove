# Especificação — CanoeGame: mini-jogo de remo top-down

**Issue:** #16
**Data:** 2026-05-10
**Status:** Aguardando implementação

## Objetivo
Novo mini-jogo de cardio para braços: remo alternado L/R em rio top-down com
avatar de caiaque (sem câmera na tela principal) e PIP camera no canto.

---

## Pesquisa & Dependency Analysis

### O que já existe e será reutilizado (fonte: CODEMAP)
| Item | Localização | Como uso |
|------|-------------|----------|
| `WristVelocityTracker` | `src/game/systems/wristVelocity.ts` | Base do `RowingDetector` (speed por pulso) |
| `KeypointOverlay` | `src/ui/keypointOverlay.ts` | Desenha skeleton no canvas PIP |
| `getRefs()` / `AppRefs` | `src/game/orchestrator.ts` | `onSmoothedFrame`, `refs.video` (stream) |
| `MiniGameResult` | `src/game/scenes/MiniGameResult.ts` | Tela de resultado padrão |
| `goCheck()` | `src/game/scenes/MiniGamesHub.ts:36` | Entry point: `goCheck('CanoeGame')` |
| `GAMES_BY_CATEGORY.cardio` | `src/game/scenes/MiniGamesHub.ts:40-44` | Adicionar card da canoa |
| `scene[...]` array | `src/game/orchestrator.ts:138` | Registrar `CanoeGame` |
| `GAME_CONFIG` + `isPortrait()` | `src/game/config.ts` | Dimensões da cena |
| `KP`, `PoseFrame` | `src/pose/types.ts` | Keypoints (LEFT_WRIST=15, RIGHT_WRIST=16) |
| `strings.miniGames.*` | `src/i18n/strings.ts` | Adicionar `canoeTitle`, `canoeDesc` |

### O que precisa ser criado (porque não existe)
| Item | Tipo | Onde | Por que não reutiliza |
|------|------|------|----------------------|
| `CanoeGame` | cena Phaser | `src/game/scenes/CanoeGame.ts` | Jogo novo; nenhuma cena existente tem rio top-down |
| `RowingDetector` | sistema | `src/game/systems/rowingDetector.ts` | Detecta alternância L/R com direção Y; `WristVelocityTracker` sozinho não tem alternância nem direção |

### Padrões canônicos a seguir
- Cenas nunca leem keypoints crus — usam `onSmoothedFrame` (✓ — já planejado)
- Thresholds em `tuning.ts`, não hardcoded (✓ — constantes `CANOE_*` / `ROWING_*`)
- Imports com extensão explícita (`./RowingDetector.ts`)
- Phaser ESM: `import * as Phaser from 'phaser'`
- `shutdown()` limpa recursos HTML externos (PIP div) e cancela `unsub`

### Decisões tomadas
| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| PIP via HTML overlay (video + canvas) | Phaser texture do feed | HTML overlay é simples, a `KeypointOverlay` já trabalha em canvas DOM |
| Rio gerado com Phaser Graphics | Sprites Kenney | Sem assets externos; consistente com sprint atual |
| Alternância obrigatória no detector | Contar toda remada | Evita repetição do mesmo braço sem exercitar o outro |

### Riscos técnicos
| Risco | Mitigação |
|-------|-----------|
| `refs.video.srcObject` nulo se câmera ainda não abriu | Checar em `create()` após `BodyCheck` já validou — nunca será nulo; mas adicionar guard |
| PIP interfere com layout em portrait 375px | `width: 22vw; min-width: 80px; max-width: 140px` |
| Threshold de remada muito sensível | `ROWING_STROKE_THRESHOLD` em `tuning.ts`; `?debug=1` loga speed em console |

---

## Requisitos Funcionais

- [ ] RF01: Cena `CanoeGame` exibe rio top-down com paredes de cânion scrollando de cima para baixo
- [ ] RF02: Avatar de caiaque (oval laranja + bonequinho de cima + dois remos) desenhado via Phaser Graphics, sem `CameraBackdrop`
- [ ] RF03: Remo direito e esquerdo animam (alpha flash + rotação) no stroke correspondente
- [ ] RF04: Wake trail (triângulo/trapézio branco, fade alpha) atrás da canoa
- [ ] RF05: PIP camera no canto bottom-right: `<video>` pequeno + canvas com skeleton do `KeypointOverlay`
- [ ] RF06: `RowingDetector` emite `onStroke('L' | 'R')` quando: velocidade do pulso ≥ `ROWING_STROKE_THRESHOLD` **e** pulso em movimento descendente (`dy > 0`)
- [ ] RF07: Alternância obrigatória — dois strokes consecutivos do mesmo lado não acionam `onStroke`
- [ ] RF08: Refractory period de `ROWING_REFRACTORY_MS` ms por lado após stroke detectado
- [ ] RF09: Stroke L → `canoeTargetX -= CANOE_STEER_AMOUNT`; stroke R → `canoeTargetX += CANOE_STEER_AMOUNT` (clamped 0.1–0.9 normalizado)
- [ ] RF10: `canoeX` interpola para `canoeTargetX` com lerp (fator `CANOE_LERP` por frame)
- [ ] RF11: `speed` cresce `CANOE_SPEED_PER_STROKE` por stroke (max `CANOE_MAX_SPEED`); decai `speed * CANOE_SPEED_DECAY * dt` por frame sem stroke
- [ ] RF12: Pedras (círculos/elipses cinza) spawn no topo com X aleatório, scrollam para baixo a velocidade proporcional a `speed + CANOE_ROCK_BASE_SPEED`; removidas ao sair pela base
- [ ] RF13: Colisão canoa × pedra (AABB simplificado) → `speed *= CANOE_COLLISION_BRAKE` + screenShake + Narrator "Cuidado!"
- [ ] RF14: Indicadores L/R hexagonais semitransparentes na base da tela flasham (alpha pulse) no stroke detectado do lado correspondente
- [ ] RF15: `distanceM` acumula `speed * dt * CANOE_METERS_PER_UNIT` por frame
- [ ] RF16: Timer de 60s; ao chegar a 0 → `scene.start('MiniGameResult', { score: Math.floor(distanceM), label: 'metros' })`
- [ ] RF17: Jogo aparece na categoria `cardio` do `MiniGamesHub` com ícone 🛶
- [ ] RF18: `BodyCheck` é executado antes via `goCheck('CanoeGame')` no hub
- [ ] RF19: Keyboard fallback `A` = stroke L, `D` = stroke R, quando `?debug=1`

## Requisitos Não-Funcionais

- [ ] RNF01: Mobile-first — PIP usa `vw`/`px` fixo, não conflita com BackButton
- [ ] RNF02: Sem sprites externos — tudo Phaser Graphics e HTML/CSS para PIP
- [ ] RNF03: Todos os thresholds em `tuning.ts`, zero hardcode nas cenas
- [ ] RNF04: `shutdown()` remove PIP div do DOM e chama `unsub()`

---

## Frontend — arquivos

### Novos
| Arquivo | Descrição |
|---------|-----------|
| `src/game/scenes/CanoeGame.ts` | Cena principal |
| `src/game/systems/rowingDetector.ts` | Detector de stroke L/R |

### Modificados
| Arquivo | O que muda |
|---------|------------|
| `src/tuning.ts` | Bloco `// CANOE GAME` com 10 constantes |
| `src/game/orchestrator.ts:138` | Adicionar `CanoeGame` no array `scene` |
| `src/game/scenes/MiniGamesHub.ts:40-44` | Novo entry em `GAMES_BY_CATEGORY.cardio` |
| `src/i18n/strings.ts` | `canoeTitle` e `canoeDesc` em `miniGames` |

### Estrutura de CanoeGame.ts
```typescript
// State: canoeX (norm), canoeTargetX (norm), speed (norm/s),
//        distanceM, timeLeft, rocks[], riverOffset, lastRockSpawnAt
// create(): setupVisuals, setupPip, subscribeToFrame, setupDebugKeys
// update(_, dt): decaySpeed, lerpCanoe, scrollRiver, spawnRocks,
//                updateRocks, drawCanoe, updateWake, checkCollisions,
//                updateHud, checkEnd
// drawRiver(): Graphics — fundo azul + paredes cinza irregulares
// drawCanoe(): Graphics — oval + bonequinho + 2 remos (alpha animated)
// updateWake(): Graphics — trapézio branco com fade
// createPip(): cria div, video, canvas DOM; instancia KeypointOverlay
// shutdown(): remove pip div, unsub()
```

### Estrutura de rowingDetector.ts
```typescript
// Deps: WristVelocityTracker, KP, PoseFrame
// State: tracker, lastStroke, refractoryUntil{L,R}, yHistory{L,R}
// push(frame): atualiza tracker + yHistory; checkSide() para cada lado
// checkSide(side, now): guard refractory + speedThreshold + dy>0 + alternância
// reset(): limpa tudo
```

---

## Cenários de Teste

### CT01: Fluxo principal com teclado
```
DADO ?debug=1 ativo e CanoeGame aberto diretamente
QUANDO pressionar A alternando com D (5× cada)
ENTÃO canoa se move para esquerda em A, direita em D;
      distância aumenta no HUD; timer decresce;
      ao 0s → MiniGameResult exibe "X metros"
```

### CT02: PIP camera visível
```
DADO CanoeGame rodando com câmera ativa
QUANDO cena estiver em execução
ENTÃO elemento <video> de ~22vw aparece no canto bottom-right
      com skeleton verde desenhado sobre ele
```

### CT03: Alternância obrigatória
```
DADO ?debug=1 e RowingDetector instanciado
QUANDO pressionar A três vezes seguidas sem D
ENTÃO apenas o primeiro A aciona onStroke('L');
      os dois seguintes são ignorados (alternância + refractory)
```

### CT04: Colisão freia canoa
```
DADO canoa a speed > 0 colidindo com pedra
QUANDO colisão detectada
ENTÃO speed cai para speed * CANOE_COLLISION_BRAKE;
      screenShake ocorre; Narrator fala
```

### CT05: E2E click-by-click [E2E click-by-click]

**Pré-condições:** `npm run dev` rodando; abrir em Chrome com câmera permitida.

**Sequência:**
1. Abrir `/` → Welcome → screenshot
2. Clicar "Jogar" → MiniGamesHub categoria picker → screenshot
3. Snapshot → clicar card "Cardio" → screenshot categoria cardio
4. Snapshot → clicar card "🛶 Canoa" → screenshot BodyCheck
5. Aguardar enquadramento OK (ou pressionar espaço em debug) → screenshot CanoeGame
6. Verificar: PIP camera visível no canto bottom-right → screenshot
7. Verificar: canoa visível com remos → screenshot
8. Aguardar 60s (ou forçar com `?debug=1` + manipular timer) → screenshot MiniGameResult
9. Verificar: "X metros" no resultado → screenshot
10. Clicar "Voltar" → screenshot MiniGamesHub

**Saída:** screenshots em `load-tests/results/issue-16-journey/`

---

## Decisões Arquiteturais
| Decisão | Justificativa |
|---------|---------------|
| `RowingDetector` é classe separada (não inline na cena) | Testável isoladamente; reutilizável em eventual modo 2P ou GuidedSession |
| PIP usa HTML overlay, não Phaser texture | `KeypointOverlay` já existe para canvas DOM; evita criar pipeline de vídeo Phaser |
| `speed` em unidades normalizadas (0–1/s) | Independe de resolução; `CANOE_METERS_PER_UNIT` converte para HUD |
| Sem BackButton no canto inferior-direito (ocupado pelo PIP) | Usar botão no canto inferior-esquerdo, ou topo-esquerdo |

---

## Fora do Escopo
- Sistema de vidas (V2)
- Modo 2P
- Curvas / checkpoints no rio
- Sprites externos / assets Kenney
- Toggle hide/show do PIP
- GuidedSession integration (será adicionada quando jogo estiver estável)

---

## Docs canônicas a atualizar
- [x] `docs/CODEMAP.md` — nova cena + novo sistema
- [x] `docs/GAMES.md` — seção CanoeGame (gestos, duração, scoring)
- [ ] `docs/MODULES.md` — não necessário (sem módulo novo de alto nível)
- [ ] `docs/database-documentation.md` — não necessário (sem persistência nova)
- [ ] `docs/ARCHITECTURE.md` — não necessário (sem container novo)
- [x] `docs/CHANGELOG.md` — entrada #16
