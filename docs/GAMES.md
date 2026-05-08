# Mini-Games — Referência Técnica

Cada mini-game é uma cena Phaser independente. Todas usam `CameraBackdrop` (vídeo + overlay de keypoints) e o sistema de `PoseDetector` via `getRefs().onSmoothedFrame`.

---

## 1. Runner — Corredor (`Demo` / `Play`)

**Cena de entrada:** `Calibration` → `Demo` → `Play`

**Gesto detectado:** postura de corrida (cadência de passos via `Cadence` system), pulo (`jump`), agachamento (`duck`), mudança de faixa (`lane_change`).

**Mecânica:** corredor infinito com faixas (−1, 0, +1). Oponentes (`NpcRunner`, `Alien`, `Puncher`), obstáculos e power-ups surgem na estrada. O jogador se mantém vivo desviando com o corpo.

**Entidades relevantes:** `Player`, `NpcRunner`, `Alien`, `Puncher`, `JackZone`, `ArmsZone` (todas em `src/game/entities/`).

**Sistemas:** `road.ts` (geração de pista), `energy.ts` (barra de vida), `missions.ts`.

**Duração:** ilimitada (termina ao zerar energia).

---

## 2. Catch Bicho — Pega Mosca (`CatchBicho`)

**Arquivo:** `src/game/scenes/CatchBicho.ts`

**Gesto detectado:** pulsos próximos um do outro (`hypot(lw.x - rw.x, lw.y - rw.y) < 0.12`) **e** ambas as mãos na região do alvo — simula bater palmas sobre o bicho.

**Mecânica:**
- Bichos (`Bicho`) surgem em posições aleatórias fora do corpo do jogador, com lifetime de **3 000 ms**.
- Spawn adaptativo: começa em 1 500 ms, acelera até 600 ms (acertos rápidos) ou desacelera até 2 400 ms (erros).
- Detecção de sobreposição com o corpo via bounding box de ombros/quadril/nariz, para spawnar o bicho em área acessível.

**Pontuação:** 1 ponto por bicho capturado.

**Duração:** 60 s.

**Métrica registrada:** `bichosCaught` → `missions.tick()`.

---

## 3. Trunk Twist — Giro de Tronco (`TrunkTwist`)

**Arquivo:** `src/game/scenes/TrunkTwist.ts`

**Gesto detectado:** rotação do tronco medida via ângulo da linha entre ombros (`trunkRotationAngle`).

**Mecânica:** alvos surgem à esquerda e à direita; o jogador precisa girar o tronco até apontar para o alvo. Limiar de ângulo define acerto.

**Duração:** ~60 s.

---

## 4. Bell Ringer — Sino (`BellRinger`)

**Arquivo:** `src/game/scenes/BellRinger.ts`

**Gesto detectado:** **uma mão específica** (L ou R, cor codificada) dentro do raio do sino (`handAt`, r = 0.10).

**Mecânica:**
- Fase de **intro** (4 s) com overlay explicando cor → mão.
- Sinos (`Bell`) surgem em beat adaptativo: começa em 1 000 ms, min 450 ms / max 1 600 ms.
- Janela de acerto: **700 ms** por sino (bem mais apertada que o Catch Bicho).
- Combo zera ao perder um sino; melhor combo é salvo no resultado.
- Cores (azul/vermelho) são sorteadas por partida para alternar mão ↔ cor.

**Visual (mãos iluminadas):** durante a fase play, `CameraBackdrop.handGlows` recebe os dois pulsos (índices 15 = LEFT_WRIST, 16 = RIGHT_WRIST) com alpha pleno para a mão ativa e 0.28 para a inativa. O `KeypointOverlay` reduz o esqueleto a 15% de opacidade e desenha halos glowing sobre cada pulso.

**Pontuação:** 10 pts por sino acertado + rastreamento de `bestCombo`.

**Duração:** 75 s.

---

## 5. Chicken Game (`ChickenGame`)

**Arquivo:** `src/game/scenes/ChickenGame.ts`

**Mecânica:** a definir / em desenvolvimento.

---

## 6. Dance Dance (`DanceDance`)

**Arquivo:** `src/game/scenes/DanceDance.ts`

**Gesto detectado:** direção DDR via `detectDanceDir` (L, R, U, D) com base em posição dos pulsos em relação aos ombros e quadril.

**Mecânica:** setas surgem em ritmo; jogador faz o gesto correspondente dentro da janela de tempo.

---

## Sessão Guiada (`GuidedSession` / `GuidedSessionPicker`)

Encadeia mini-games em sequência definida pelo perfil ou picker. Usa `session: string[]` passado via `data` entre cenas. Cada jogo ao terminar chama `MiniGameResult` que decide o próximo da lista.

---

## Infra compartilhada

| Módulo | Papel |
|---|---|
| `CameraBackdrop` | Vídeo espelhado + overlay de keypoints como texture Phaser |
| `KeypointOverlay` | Desenha esqueleto + suporte a `HandGlow` (glow por keypoint) |
| `PoseDetector` | MediaPipe Pose Landmarker; keypoints já espelhados (`x = 1 - p.x`) |
| `handAt()` | Verifica se wrist está dentro de raio normalizado do alvo |
| `Narrator` | Voz sintetizada de feedback (TTS) |
| `missions.tick()` | Registra métricas de jogo para sistema de missões |
