# Design — CanoeGame: mini-jogo de remo top-down

**Data:** 2026-05-10
**Status:** Proposto (aguardando aprovação)
**Tipo:** feat

## Problema
O catálogo não tem exercício dedicado a braços/ombros em modo cardio contínuo.
A mecânica de remo com braços alternados (estilo Wii Sports Resort) preenche
essa lacuna e é uma das mais completas para a parte superior do corpo.

## Usuário e caso de uso
Usuário típico do movemove. Acessa pelo MiniGamesHub ou GuidedSession.
Sessão de 60 s de remo com braços alternados, vista top-down.

## Escopo
### Inclui
- Cena `CanoeGame`: rio top-down com paredes de cânion, sprite de caiaque
  visto de cima, remada alternada L/R, pedras como obstáculos, scoring
  por distância percorrida
- `RowingDetector`: detecção de stroke L/R com alternância obrigatória,
  refractory period ~400 ms, threshold ajustável em `tuning.ts`
- Avatar: sprite top-down desenhado via Phaser Graphics (oval laranja,
  bonequinho de cima, dois remos — paddle anima no lado que remou)
- Trail de esteira (triângulo branco atrás da canoa)
- PIP camera: retângulo pequeno num canto (bottom-right) com feed ao vivo
  + esqueleto `KeypointOverlay`, para usuário verificar detecção
- Colisão com pedra = freio de velocidade (sem vidas — V2 adiciona vidas)
- Indicadores visuais L/R na base da tela (flash no lado da remada detectada)
- Integração com `MiniGamesHub` e `MiniGameResult`
- Keyboard fallback: A/D para remada L/R quando `?debug=1`

### Não inclui (fora do escopo desta issue)
- Sistema de vidas (V2)
- Modo 2P
- Curvas / checkpoints (rio reto gerado proceduralmente)
- Sprites Kenney ou assets externos (tudo Phaser Graphics)
- Música temática nova (reusa AudioBus)
- Toggle para esconder/mostrar o PIP (V2)

## Abordagem escolhida
**Canoe sprite top-down + PIP camera + RowingDetector**

**Avatar (canoa):** Desenhado inteiramente com Phaser Graphics — sem sprites
externos. Oval apontada (frente/trás) em laranja, mini-boneco circular no
centro (cabeça + ombros vistos de cima), dois remos saindo das laterais.
No stroke detectado, o remo do lado correspondente anima (rotação + alpha
flash). Wake trail: triângulo branco estreito atrás da canoa, com fade.

**PIP camera:** Overlay HTML puro — `<video>` pequeno posicionado via CSS
absolute no canto bottom-right (~22% da largura da tela). Canvas de esqueleto
por cima, reutilizando a lógica do `KeypointOverlay` mas scaled para o tamanho
do PIP. Não usa `CameraBackdrop` (que é full-screen).

**RowingDetector:** Usa `WristVelocityTracker` existente + verificação de
direção Y: `dy > 0` (pulso desce, fase de remada) + velocidade acima de
`ROWING_STROKE_THRESHOLD`. Alternância obrigatória via `lastStroke: 'L'|'R'`.

**Rio e cenário:** Phaser Graphics com scroll vertical. Fundo azul. Paredes
de cânion: polígonos cinza irregulares nas bordas (L e R), scroll junto com
o rio. Pedras: círculos/elipses cinza spawn no topo, scrollam para baixo.

**Física simples:** `speed` cresce por stroke (até `CANOE_MAX_SPEED`), decai
sem remadas. Colisão AABB canoa × pedra → `speed *= CANOE_COLLISION_BRAKE`
+ screenShake leve + narrador "Cuidado!". Canoa desvia L/R com inércia suave
(`lerp` para a posição X alvo).

**HUD:** `Pill` distância (metros) no topo. Timer 60 s. Indicadores L/R
hexagonais na base (flash quando stroke detectado — feedback visual do gesto).

## Abordagens descartadas
| Abordagem | Motivo de descarte |
|-----------|---------------------|
| PuppetFigure frontal | Top-down sprite é mais simples e visualmente mais coerente com a perspectiva do jogo |
| PIP sem skeleton | Perde o feedback de detecção de pose — usuário não sabe se os braços estão sendo capturados |

## Pesquisa externa
### Projetos avaliados
| Projeto | Licença | Maturidade | Pró | Contra | Adotar? |
|---------|---------|------------|-----|--------|---------|
| TemugeB/joint_angles_calculate | MIT | Demo 2021 | Valida atan2 | Python/NumPy, não aplicável | Não — referência descartada (puppet removido do escopo) |
| Canoe VR (CHI 2022) | Academic | Protótipo | Valida remo como exergame eficaz | VR hardware | Não — referência conceitual |

### Decisão
Nenhuma lib externa. Puppet removido do escopo — abordagem sprite top-down
é mais simples e dispensa conversão keypoint→ângulo. Não existe equivalente
web + pose detection: feature genuinamente novel.

## Reuso do CODEMAP
- `src/game/systems/wristVelocity.ts` — `WristVelocityTracker`
- `src/pose/types.ts` — `KP`, `PoseFrame`
- `src/ui/keypointOverlay.ts` — lógica de skeleton reutilizada no PIP
- `src/game/ui/backButton.ts` — `BackButton`
- `src/game/ui/pill.ts` — `Pill` (HUD distância)
- `src/game/systems/narrator.ts` — `Narrator`
- `src/game/systems/audioBus.ts` — `AudioBus`
- `src/game/scenes/MiniGameResult.ts` — resultado final
- `src/tuning.ts` — constantes `CANOE_*` e `ROWING_*`
- `src/game/orchestrator.ts` — registro da cena
- `src/game/scenes/MiniGamesHub.ts` — card no hub

## Impacto arquitetural
- **Frontend — novos arquivos:**
  - `src/game/scenes/CanoeGame.ts`
  - `src/game/systems/rowingDetector.ts`
- **Frontend — arquivos modificados:**
  - `src/game/orchestrator.ts` — registrar `CanoeGame`
  - `src/game/scenes/MiniGamesHub.ts` — card da Canoa
  - `src/tuning.ts` — constantes `CANOE_*` e `ROWING_*`
- **Backend:** nenhum
- **Schema:** nenhum
- **Docs a atualizar:** CODEMAP.md, GAMES.md

## Critérios de sucesso
- [ ] Jogo aparece no MiniGamesHub e inicia corretamente
- [ ] Canoa top-down com remos e wake trail
- [ ] PIP camera no canto mostra feed + esqueleto de keypoints
- [ ] Remada esquerda → canoa vira esquerda; direita → vira direita
- [ ] Indicadores L/R na base flasham no stroke detectado
- [ ] Alternância obrigatória (duas do mesmo lado não contam)
- [ ] Colisão com pedra freia a canoa visivelmente
- [ ] Tela de resultado exibe distância percorrida
- [ ] Keyboard fallback A/D funciona com `?debug=1`

## Riscos e mitigações
| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Detecção de remada sensível/insensível | Média | `ROWING_STROKE_THRESHOLD` em `tuning.ts`; debug imprime velocidade por pulso |
| PIP camera conflita com layout mobile | Baixa | Tamanho fixo em vw units; testar em 375px |
| Paredes de cânion com scroll parecem "saltando" | Baixa | Gerar segmentos longos com overlap; scroll contínuo |

## Próximo passo
→ Executar `/sdd-plan 16` para gerar specs técnicas (research + spec + tasks).
