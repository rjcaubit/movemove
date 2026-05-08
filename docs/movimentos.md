# Catálogo de Movimentos

Referência viva dos movimentos do corpo que o sistema reconhece, com mapeamento
para os pictogramas usados no `DanceDance` e ideias de uso em outros mini-jogos
ou exercícios.

Coords de keypoints normalizadas (0..1). Eixo Y cresce para baixo. O frame já
vem espelhado (selfie) — `LEFT_*` é o lado esquerdo do usuário e aparece na
metade esquerda da tela.

## Helpers de detecção (em `src/pose/spatialQueries.ts`)

| Função | O que detecta | Notas |
|---|---|---|
| `handAt(frame, hand, target)` | Pulso de uma mão dentro de um círculo | usado em CatchBicho, BellRinger |
| `handPosition(frame, hand)` | Coords brutas do pulso | utilitário |
| `trunkRotationAngle(frame)` | Tilt da linha dos ombros (graus) | usado em TrunkTwist (twist/lateral lean) |
| `bothHandsAbove(frame, yLine)` | Ambos pulsos acima de uma linha y | base para "braços pra cima" |
| `armsLateralOut(frame)` | T-pose: pulsos longe lateralmente, na altura dos ombros | base para "braços abertos" |
| `hipDropFromBaseline(frame, baseY, t)` | Quadril desceu mais que `t` do baseline | agachamento; precisa baseline calibrado |
| `hipY(frame)` | Y médio do quadril (utilitário pra coletar baseline) | |
| `detectDanceDir(frame, baseY)` | Retorna L/R/U/D (DDR-style) | usado no DanceDance antigo |

Helpers locais ao `DanceDance.ts`:

- `leftArmRaised(frame)` — só braço esquerdo levantado, direito abaixo do ombro
- `rightArmRaised(frame)` — espelho do anterior

## Movimentos com detecção sólida

Cada um tem helper + check funciona em luz/calibração razoável.

| ID | Detecção | Pictogramas mapeados |
|---|---|---|
| `arms_up` | `bothHandsAbove(frame, ombro−0.02)` E não está agachado | 40, 48, 49 |
| `arms_out` | `armsLateralOut(frame)` | 8 |
| `squat` | `hipDropFromBaseline(frame, base, 0.04)` | 18 |
| `left_arm` | pulso esq acima do ombro esq E direito abaixo | 3, 9, 10, 13, 39, 43, 45 |
| `right_arm` | espelho de left_arm | 11, 14, 26, 42, 44, 46 |
| `jumping_jack` | T-pose OU braços acima dos ombros | 15, 16 |

## Pictogramas curados (sprite sheet `pictograms_sheet.png`)

Grid 13×4, frames 124×124. Numeração L→R, T→B (base 0).

Frame index = (linha−1) × 13 + (coluna−1)

### Mapeados a moves detectáveis

| Frame | Pos | Descrição | Move ligado |
|---|---|---|---|
| 3 | L1C04 | arco com braço cima→baixo | left_arm |
| 8 | L1C09 | abrir braços e girar | arms_out |
| 9 | L1C10 | chute um lado | left_arm (visualmente é chute) |
| 10 | L1C11 | puxando bracinho | left_arm |
| 11 | L1C12 | chute outro lado | right_arm (visualmente é chute) |
| 13 | L2C01 | puxa braço | left_arm |
| 14 | L2C02 | puxa braço outro lado | right_arm |
| 15 | L2C03 | pulinho mão cabeça | jumping_jack |
| 16 | L2C04 | pulinho mão cabeça outro | jumping_jack |
| 18 | L2C06 | mão cintura sacode quadril | squat (placeholder) |
| 26 | L3C01 | John Travolta | right_arm |
| 39 | L4C01 | apontando dedo | left_arm |
| 40 | L4C02 | sobe e desce o braço | arms_up |
| 42 | L4C04 | arco com braço baixo→cima | right_arm |
| 43 | L4C05 | cotovelada | left_arm |
| 44 | L4C06 | cotovelada outro | right_arm |
| 45 | L4C07 | mão no queixo (final) | left_arm |
| 46 | L4C08 | mão no queixo outro (final) | right_arm |
| 48 | L4C10 | vira lado, sobe-desce braço reto | arms_up |
| 49 | L4C11 | vira outro, sobe-desce braço reto | arms_up |

### Mapeamentos parciais (visual ≠ detecção real)

Estes pictogramas mostram um movimento mais rico que o detector cobre. O
jogador acerta executando o move detectável associado — quem olha vê
"chute" mas pra acertar levanta o braço.

| Frames | Pictograma mostra | Detector usado | Detector ideal (futuro) |
|---|---|---|---|
| 9, 11 | chute lateral | left/right_arm raised | `legRaised(side)` — joelho/tornozelo acima da altura média do quadril |
| 18 | mão cintura, sacode quadril | hip drop (squat) | `hipShake(side)` — variância do x do quadril em janela ~600ms |
| 48, 49 | giro/virada com sacode | arms_up | `bodyTurned(side)` — comparar x ombros com x quadris (rotação eixo vertical) ou `lateralShake()` |

## Ideias de detectores novos (pra evoluir o catálogo)

Cada um destrava uma família de pictogramas / exercícios.

### Pernas / passos

- `kneeRaised(side)` — joelho com Y < quadril − 0.04 → joelho alto, marcha
- `legSideKick(side)` — pé com X mais lateral que ombro do mesmo lado → chute lateral
- `legFrontKick(side)` — pé com Y < quadril E X próximo do centro → chute frontal
- `lunge(side)` — um joelho dobrado E o outro estendido (pé um pra frente)

### Tronco / quadril

- `hipShake(window)` — desvio padrão do x do quadril > limiar em janela (mexer quadril)
- `bodyTurn(side)` — diff entre x médio dos ombros e x médio dos quadris > limiar (rotação)
- `lateralLean(side)` — `trunkRotationAngle` > limiar (já temos, falta expor com lados)

### Braços / mãos

- `clap()` — pulsos a < 0.08 de distância um do outro, na altura do peito
- `armCircle(side, period)` — trajeto circular do pulso em janela (FFT ou amostragem)
- `elbowToKnee(crossSide)` — distância entre cotovelo de um lado e joelho do outro < limiar (já existe em `exerciseRepDetectors.ts:CrossBodyRep`)
- `handsToHead()` — ambas mãos acima da cabeça (proxy para "mãos na nuca")
- `pointing(side, direction)` — pulso um lado estendido E linha ombro→pulso ~horizontal

### Corpo todo

- `jump()` — pico negativo na velocidade Y dos quadris (subida) seguido de descida (já existe em `exerciseRepDetectors.ts`)
- `crouch()` — quadril abaixo do baseline + tronco vertical (diferente de squat — mais fundo)
- `tposeHold(durationMs)` — `armsLateralOut` segurado por X ms

## Como adicionar um movimento novo

1. **Implementa detector** em `src/pose/spatialQueries.ts` (função pura, recebe `PoseFrame` + opcionais como baseline ou side)
2. **Adiciona o Move** no array `MOVES` de `DanceDance.ts`:
   ```ts
   { id: 'novo_move', color: 0xRRGGBB, match: (f, h) => detectorNovo(f, h) },
   ```
3. **Mapeia frames** no `PICTO_POOL` ligando `novo_move` aos índices do sheet.
4. **Reps** (opcional) — pra usar como contador em outros lugares (Sessão Guiada,
   missões), criar uma classe `RepDetector` em
   `src/game/systems/exerciseRepDetectors.ts` envolvendo o detector.

## Como descobrir o frame index a partir de LxCy

`frame = (linha − 1) * 13 + (coluna − 1)`

Ex: L3C01 → (3−1)·13 + 0 = 26.

Tabela rápida:

| Linha | Range de frames |
|---|---|
| 1 | 0–12 |
| 2 | 13–25 |
| 3 | 26–38 |
| 4 | 39–51 |
