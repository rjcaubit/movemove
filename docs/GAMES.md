# Mini-Games e Modos — Referência Técnica

> Atualizado: 2026-05-10 — cobre Issue #14 WIP (catálogo expandido + 2P + Rec).

Cada jogo é uma **cena Phaser independente** registrada em `src/game/orchestrator.ts`. Quase todas usam:

- `CameraBackdrop` (`src/game/ui/cameraBackdrop.ts`) — vídeo espelhado + overlay de keypoints como texture Phaser.
- `getRefs(scene).onSmoothedFrame(cb)` — assinatura no stream de `PoseFrame` suavizado.
- Helpers de `src/pose/spatialQueries.ts` (`handAt`, `trunkRotationAngle`, `bothHandsAbove`, `armsLateralOut`, `hipDropFromBaseline`, `detectDanceDir`).
- `Narrator` (TTS pt-BR) e `AudioBus` (música/SFX) compartilhados.

Convenção: jogos chamam `MiniGameResult` ao terminar; este pode encadear o próximo da `GuidedSession` ou voltar ao `MiniGamesHub`.

---

## 1. Endless Runner — Cardio (`Play` / `Demo`)

**Arquivo:** `src/game/scenes/Play.ts` (jogo principal), `src/game/scenes/Demo.ts` (vitrine sem câmera).

**Fluxo de entrada:** `Welcome` → `Loading` → `Tutorial` (1ª vez) → `Calibration` → `Play`.

**Gestos detectados:**
- **Cadência de corrida** (`cadence` event com `bpm` + 4 `intensity` tiers: none/walking/jogging/running)
- **Pulo** (`jump`) e **agachamento** (`duck`)
- **Mudança de faixa** (`lane_change`, lanes `-1` | `0` | `+1`)
- **Polichinelo** (`jumping_jack`) — disparado dentro de `JackZone`
- **Braços pra cima sustentado** (`arms_up`) — ativa escudo dentro de `ArmsZone`

**Mecânica:** corredor pseudo-3D (Enduro/Out Run). Velocidade do mundo ligada a `EnergySystem`: cadência alimenta energia (0–100), velocidade segue energia (linear < 30, full ≥ 30). Spawn de obstáculos (barrier/low_barrier/wall_lane), moedas em clusters (`coinClusterEveryMeters: 50`), corações (`HeartPickup`), e zonas `JackZone`/`ArmsZone` periódicas (`zoneSpacingMeters: 80`).

**Vidas:** 3. **Escudo:** `ShieldEffect` consome 1 carga em colisão antes de tirar vida.

**Entidades:** `Player`, `Obstacle` (3 tipos), `Coin`, `HeartPickup`, `JackZone`, `ArmsZone`. NPCs do mundo lúdico (`Alien`, `Animal`, `Barrel`, `Ghost`, `NpcRunner`, `Puncher`, `Robot`, `Zombie`) — **alguns coexistem como obstáculos especializados** dependendo do mundo.

**Sistemas:** `road.ts` (geração da pista), `parallax.ts` (3 camadas), `pseudo3d.ts`, `billboard.ts` (árvores em paralaxe), `spawner.ts`, `scoring.ts`, `collision.ts`, `energy.ts`, `zones.ts`, `shield.ts`, `audioBus.ts`, `narrator.ts`, `postfx.ts` (scanlines + vignette CRT), `speedLines.ts`.

**FX:** screenShake, flash, particles em coleta/colisão, chromatic aberration (opt-in via `GAME_CONFIG.fx`).

**Idade do jogador:** `AGE_GROUPS` em `src/tuning.ts` ajusta `speedInitial` por grupo (`getAgeGroup()`).

**WaterBreak:** modal a cada **8 min cumulativos** (`Play.cumulativePlayMs` static) — pausa o jogo em `WaterBreak.ts` por 30s.

**Duração:** ilimitada — termina ao zerar energia/vidas.

**Modo Demo (`?demo=1`):** sem câmera, sem colisão. Tecla `O` spawna obstáculo aleatório de 7 tipos (`barrier`, `low_barrier`, `jump_brick`, `jump_column`, `duck_log`, `duck_banner`, `laser_beam`). Setas ajustam velocidade/lane; SPACE/D simulam pulo/duck. Útil para validação visual a distância.

---

## 2. Pega o Bicho (`CatchBicho`)

**Arquivo:** `src/game/scenes/CatchBicho.ts` — Entidade: `Bicho.ts`

**Gesto:** pulsos próximos um do outro (`hypot(lw.x - rw.x, lw.y - rw.y) < 0.12`) **e** ambas as mãos na região do alvo — simula bater palmas sobre o bicho.

**Mecânica:**
- Bichos surgem em posições aleatórias **fora do bounding box do corpo** (ombros + quadril + nariz), com lifetime **3000 ms**.
- Spawn adaptativo: começa em 1500 ms, acelera até 600 ms (acertos rápidos) ou desacelera até 2400 ms (erros).

**Pontuação:** 1 pt por bicho capturado.
**Duração:** 60 s.
**Métrica:** `bichosCaught` → `missions.tick()`.

---

## 3. Roda Tronco (`TrunkTwist`)

**Arquivo:** `src/game/scenes/TrunkTwist.ts` — Entidade: `TrunkTarget.ts`

**Gesto:** rotação do tronco medida por `trunkRotationAngle(frame)` (tilt da linha entre ombros, em graus).

**Mecânica:** alvos surgem à esquerda e à direita; o jogador gira o tronco até apontar para o alvo. Threshold de ângulo (~25° sustentado por ~200 ms) define acerto.

**Duração:** ~60 s.

---

## 4. Toca o Sino (`BellRinger`)

**Arquivo:** `src/game/scenes/BellRinger.ts` — Entidade: `Bell.ts`

**Gesto:** **uma mão específica** (esquerda ou direita, color-coded) dentro do raio do sino (`handAt(frame, hand, target, 0.10)`).

**Mecânica:**
- Fase **intro 4 s** com overlay explicando cor → mão.
- Sinos surgem em beat adaptativo (1000 ms inicial, faixa 450–1600 ms).
- Janela de acerto: **700 ms** (apertada, exige timing).
- Combo zera ao perder; melhor combo salvo no resultado.
- Cores (azul/vermelho) sorteadas por partida — alterna mapping mão↔cor.

**Visual:** durante a fase play, `CameraBackdrop.handGlows` recebe os dois pulsos (índices 15/16) com alpha pleno na mão ativa e 0.28 na inativa. `KeypointOverlay` reduz esqueleto a 15% e desenha halos sobre cada pulso.

**Pontuação:** 10 pts/sino + tracking de `bestCombo`.
**Duração:** 75 s.

---

## 5. Galinha (`ChickenGame`)

**Arquivo:** `src/game/scenes/ChickenGame.ts`

**Gestos:**
- **Flap** — braços abertos lateralmente (`armsLateralOut` ou similar).
- **Scratch** — agachar (`hipDropFromBaseline`).

**Mecânica:** ações disparam em ritmo (DDR-style); calibração do `hipY` baseline ajusta scratch. Beat acelera em acerto perfeito, desacelera em miss. Adaptativo.

**Duração:** ~70 s.

---

## 6. DanceDance (`DanceDance`)

**Arquivo:** `src/game/scenes/DanceDance.ts` — UI: `pictogram.ts`

**Gestos cobertos (6):** `arms_up`, `arms_out`, `squat`, `left_arm`, `right_arm`, `jumping_jack`. Mapeamento para frames do `pictograms_sheet.png` em `docs/movimentos.md`.

**Mecânica:** pictogramas (stick figures coloridos com setas curvas) deslizam em lane horizontal; jogador faz o gesto correspondente dentro da janela. `MOVES` array define cores e funções `match(frame, helpers)`.

**Modo curadoria:** `?dance=check` ativa modo de teste — exibe cada pictograma e valida se o detector reconhece.

**Duração:** ~75 s.

> Para mapeamentos pictograma↔move, ver `docs/movimentos.md`.

---

## 7. Helicóptero (`HelicopterGame`)

**Arquivo:** `src/game/scenes/HelicopterGame.ts`

**Gesto:** `jump` event dispara um pulso de rotor (igual ao runner principal). SPACE = fallback de teclado.

**Mecânica:** Flappy-style com helicóptero (🚁) — pulo dá impulso pra cima, gravidade puxa pra baixo. Evitar tocar o chão. **3 vidas**, contador de tempo, hand glows pra feedback.

- **Gravidade progressiva:** começa suave (`0.15 normalized/s²`) e cresce linearmente até `0.55` ao longo dos primeiros **8 s**, dando margem pra entrar no ritmo.
- **Posição inicial:** topo da tela (`y = 0.10`) — começa lá em cima pra facilitar.
- **Tilt:** inclina pra trás na descida, pra frente quando sobe.

**Duração:** 60 s.

---

## 8. Castores (`CastorGame`)

**Arquivo:** `src/game/scenes/CastorGame.ts` — Entidade: `Castor.ts`
**Picker:** `CastorModePicker.ts` → `BodyCheck` → `CastorGame`

**Gesto:** **socar** com a mão — `Puncher.ts` detecta velocity da mão atravessando bbox do castor.

**Mecânica:** whack-a-mole. Castores pop-up em slots (coords normalizadas) com `windowMs` de exposição. `whack()` desce o castor com tween de crunch; `retreat()` desaparece sem ponto. Castores "ruim" (`BAD_EMOJIS`) penalizam.

**Modos:**
- **1P:** stream principal (`onSmoothedFrame`).
- **2P:** `onSmoothedFrameP2` adiciona segundo jogador. Scores independentes; tela mostra diferença entre os dois.

**Difficulty creep:** spawn vai acelerando ao longo dos 60s.

**Duração:** 60 s.

---

## 9. Sessão Guiada (`GuidedSession`)

**Arquivo:** `src/game/scenes/GuidedSession.ts`
**Picker:** `GuidedSessionPicker.ts` (5 / 7 / 10 / 15 minutos)

**Mecânica:** rotina estruturada de exercícios em ciclos `rest → exercise → rest → ...`. Lista de até **9 movimentos** baseada em `exerciseRepDetectors.ts`:

- `TrunkRotationRep` — torso girando além de threshold
- `HighKneeRep` — joelho acima do quadril
- `CrossBodyRep` — mão oposta cruza para perto do joelho
- `LateralLeanRep` — desalinhamento ombro/quadril
- Variantes: elbow-to-knee, squat cycle, cross-kick, twist-knee-pull, lateral hop

**Plano:** duração total escolhida ajusta nº de exercícios e tempo por ciclo.

**Visual:** `DemoFigure` (stick figure paramétrico em `src/game/ui/demoFigure.ts`) anima o exercício à esquerda; usuário executa à direita com câmera. Refractory period de **350 ms** evita double-count de reps.

**Encadeamento:** após sessão, `MiniGameResult` exibe métricas e oferece próximo jogo da playlist (se `session: string[]` foi passado via `data`).

---

## 10. Gravador (`Rec`)

**Arquivo:** `src/game/scenes/Rec.ts` — Storage: `recordedExercises.ts`

**Não é um jogo** — ferramenta para o time de produto **gravar movimentos** que viram demos / referências de detector.

**Fluxo:**
1. **Prep** — countdown 3 s.
2. **Record** — 15 s capturando keypoints, com **5 reps pulsadas** (visual indica beat).
3. **Process** — resample temporal + median filter para suavizar frames.
4. **Replay** — looped, com possibilidade de revisar.
5. **Form** — campos `name` + `description`, salva em IndexedDB via `recordedExercises.ts`.

**Storage shape:** `RecordedExercise { id, name, desc, frames: RecFrame[], durationMs, createdAt }`.

**Operações:** `load`, `add`, `delete`, `update`, `exportToJson`.

---

## 11. Body Check (`BodyCheck`)

**Não é jogo** — gate de calibração antes de mini-jogos.

**Função:** valida que `head`, `shoulders` e `hips` estão visíveis e enquadrados. Suporta **1P e 2P** com checks independentes (cada um precisa estar OK simultaneamente). Countdown 3 s quando ambos OK; volta ao estado de espera se sair do enquadramento.

**Usado por:** `CastorModePicker` (modo 2P), e qualquer cena que precise validar postura inicial.

---

## 12. Sessão Guiada — encadeamento

`GuidedSession` consome `data.session: string[]` passado entre cenas. Cada jogo, ao terminar, chama `MiniGameResult` que decide o próximo:
- Se há mais entradas em `session`, dispara a próxima cena com a lista reduzida.
- Caso contrário, volta para `MiniGamesHub`.

---

## 13. Ninja Fruit (`NinjaFruit`)

**Arquivo:** `src/game/scenes/NinjaFruit.ts` — Entidade: `src/game/entities/Fruit.ts` (`FruitKind = 'fruit' | 'bomb'`)

**Gesto:** pulso da mão dominante (auto-detectada na intro de 3s) com velocidade ≥ `NINJA_VELOCITY_THRESHOLD` (1.2 H_corpo/s, ajustável em `tuning.ts`) cruzando bbox da fruta. Mão errada não corta.

**Mecânica:**
- Intro de 3s: "Acene a mão que vai cortar!" — mede deslocamento total de cada pulso e fixa a dominante. Hand glow só nesse pulso.
- Frutas surgem em arco balístico vindo de baixo (gravidade simulada manual em coords normalizadas), com x random.
- **Espelha padrão `good/bad` do Castor:** `FruitKind = 'fruit' | 'bomb'`, `NINJA_BOMB_GRACE_MS = 5000` (só fruta nos primeiros 5s), chance de bomba cresce de 5% até 30% ao longo de 30s.
- Slice de fruta = +1 × multiplier do combo + split visual em 2 metades.
- Slice de bomba = -1 vida + screenShake + flash + narrador. Combo reseta.
- Fruta perdida (sai pela borda) = -1 vida. Bomba que sai sem cortar = sem penalidade.
- Combo cresce por slices consecutivos de fruta; HUD aparece quando combo ≥ 2; reseta em miss/bomba. `bestCombo` no `MiniGameResult.extra`.
- Rastro visual cosmético (`SliceTrail`, `src/game/ui/sliceTrail.ts`) — polyline com fade nos últimos 12 pontos. NÃO entra na detecção.

**Velocidade do pulso:** `WristVelocityTracker` (`src/game/systems/wristVelocity.ts`) — histórico de 8 amostras, descarta gaps > 100ms, expõe `speedNorm()` em H_corpo/s.

**Modo debug:** `?debug=1` força mão dominante = R, pula intro, mouse vira pulso virtual.

**Vidas:** 3. **Duração:** ilimitada — termina ao zerar vidas.

**Pontuação:** frutas cortadas × multiplier de combo. `missions.tick({ ninjaSlices })`.

---

## 14. Canoa (`CanoeGame`)

**Arquivo:** `src/game/scenes/CanoeGame.ts`
**Sistema:** `src/game/systems/rowingDetector.ts` — `RowingDetector`

**Gesto:** pulso desce com velocidade ≥ `ROWING_STROKE_THRESHOLD`
(coords norm/s) em movimento descendente (`dy > 0.015`). Alternância
obrigatória — não conta dois strokes seguidos do mesmo lado.
Refractory de `ROWING_REFRACTORY_MS` ms por lado após detectar.

**Mecânica:**
- Rio top-down scrollando verticalmente (sem `CameraBackdrop`).
- Canoa (sprite Phaser Graphics: oval laranja + bonequinho de cima +
  dois remos) move L/R com inércia (`lerp` por frame).
- Stroke L → canoa desvia para esquerda; stroke R → para direita.
- `speed` cresce `CANOE_SPEED_PER_STROKE` por stroke (até `CANOE_MAX_SPEED`);
  decai exponencialmente após 600 ms sem stroke (`CANOE_SPEED_DECAY`/s).
- Pedras spawnam no topo a cada `CANOE_ROCK_SPAWN_MS` ms; scrollam para
  baixo. Colisão AABB normalizado → `speed *= CANOE_COLLISION_BRAKE` +
  screenShake + flash vermelho.
- Wake trail (triângulo branco) atrás da canoa, fade por velocidade.
- Indicadores L/R hexagonais na base da tela: `0x4cd9ff` em repouso,
  flash `0xffd60a` no stroke detectado (300 ms).

**PIP camera:** HTML overlay (`<video>` + `<canvas>` com `KeypointOverlay`)
em `position: fixed; bottom-right; width: 22vw` (clamp 80–140 px).
Stream compartilhado via `refs.video.srcObject`; skeleton desenhado em
tempo real para usuário verificar detecção.

**Vidas:** sem vidas nesta versão (V2). **Duração:** 60 s fixos.
**Pontuação:** distância em metros (`distanceM`, `CANOE_METERS_PER_UNIT`
converte unidades normalizadas).
**Keyboard debug:** `A` = stroke L; `D` = stroke R (com `?debug=1`).

---

## Infra compartilhada

| Módulo | Papel |
|---|---|
| `CameraBackdrop` | Vídeo espelhado + skeleton overlay como texture Phaser |
| `KeypointOverlay` | Desenha esqueleto + suporta `HandGlow` (halos por keypoint) |
| `PoseDetector` | MediaPipe Pose Landmarker; keypoints já espelhados (`x = 1 - p.x`); 2 streams |
| `EmaSmoother` / `OneEuroSmoother` | EMA α=0.5 default; One Euro disponível como alternativa |
| `EventDetector` | Bus `EventTarget` para `GameEvent` (`jump`/`duck`/`lane_change`/`jacks`/`arms_up`/`cadence`) |
| `spatialQueries.ts` | Helpers puros: `handAt`, `trunkRotationAngle`, `bothHandsAbove`, `armsLateralOut`, `hipDropFromBaseline`, `detectDanceDir` |
| `exerciseRepDetectors.ts` | Classes de RepDetector com refractory para `GuidedSession` |
| `Narrator` | TTS pt-BR via Web Speech API (cooldown 3s, prioridade) |
| `AudioBus` | `Phaser.Sound` música em loop + ducking ~500 ms |
| `MidiPlayer` | Sintetizador WebAudio próprio (oscilador triangle + ruído branco) |
| `MissionSystem` | 3 missões/dia com seed determinístico (`version + YYYY-MM-DD`) |
| `ProfileStore` / `RunHistoryStore` | IndexedDB schema v1 (totals, missionState, last 30 runs) |
| `BackButton` | Botão padrão canto inferior-direito → `MiniGamesHub` |
| `Pill` (hudStyle) | Widget arredondado com icon + texto reusável (HUD) |
| `PostFxOverlay` | Scanlines + vignette estática (CRT retrô) |
| `SpeedLines` | Linhas radiais para sensação de velocidade |

---

## Adicionando um jogo novo

1. **Cena** em `src/game/scenes/MeuJogo.ts` (extends `Phaser.Scene`).
2. **Registrar** no `orchestrator.ts` (import + array `scene: [...]`).
3. **Subscrever** a `getRefs(this).onSmoothedFrame(cb)` ou ao bus do `eventDetector`.
4. **Usar helpers de `spatialQueries.ts`** — não ler keypoints crus.
5. **Reusar `CameraBackdrop`, `Pill`, `BackButton`** para visual consistente.
6. **Encerrar com `this.scene.start('MiniGameResult', { ... })`** para se integrar à Sessão Guiada.
7. **Atualizar este `GAMES.md`** com gesto/duração/scoring.
