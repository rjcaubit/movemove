# Design — Fase 0: PoC de detecção de pose

**Data:** 2026-04-26
**Status:** Proposto (aguardando `/sdd-plan`)
**Tipo:** feat
**Pai conceitual:** Issue #1 — study transversal Fases 0–3

---

## Contexto

Primeira fase do exergame infantil (`EXERGAME_PROJETO.md` Seção 4). **Sem jogo.** O objetivo é validar empiricamente, no celular do filho do desenvolvedor, que: (1) MediaPipe Tasks Vision Pose Landmarker roda com FPS aceitável; (2) as 6 heurísticas da Seção 3.3 do doc base (jump, duck, lane, cadence, jumping jack, arms up) detectam movimento real com taxa de acerto subjetiva >85%; (3) latência percebida fica abaixo de 150ms.

Decisões transversais já fechadas no study #1 — **não re-discutir** ADRs nesta fase.

## Escopo (Seção 4 do EXERGAME_PROJETO.md)

### Inclui
- Página HTML simples que abre a câmera.
- Carregamento do MediaPipe Pose Landmarker.
- Sobreposição de keypoints na imagem da câmera (debug visual).
- Implementação das 6 heurísticas da Seção 3.3.
- Tela de calibração inicial (Seção 3.1) com countdown.
- Painel de debug lateral: FPS, confiança média, valores de baseline, lane atual, log dos últimos 20 eventos com timestamp.
- Botão "Recalibrar".
- Indicadores visuais por evento detectado (quadrado colorido por tipo).

### Não inclui
- Sem motor de jogo (Phaser entra na Fase 1).
- Sem sprites, sons, score, persistência, PWA.

## Tarefas (do doc base Seção 4.3 — ponto de partida pro /sdd-plan)

1. Setup de projeto Vite + TypeScript.
2. Página `index.html` com `<video>`, `<canvas>` overlay, painel de debug lateral.
3. `pose/poseDetector.ts` — inicializa MediaPipe via `@mediapipe/tasks-vision`, conecta com `getUserMedia`, expõe stream de frames com keypoints.
4. `pose/smoother.ts` — EMA configurável (α≈0.5 como ponto de partida, conforme ADR-5).
5. `pose/calibration.ts` — countdown 3-2-1, captura `H_corpo`, `Y_quadril_base`, `X_centro_base`, `Largura_ombros`.
6. `pose/events.ts` — implementa as 6 heurísticas da Seção 3.3.
7. UI de debug com FPS, confiança, baselines, lane, log de eventos.
8. Botão "Recalibrar".
9. Modo debug com keyboard fallback ativado por `?debug=1` (Seção 3.5 do doc base, **invariante** do study).

## ADRs do study aplicáveis

- **ADR-5** — EMA α=0.5 como filtro de suavização (Kalman descartado).
- **Modelo MediaPipe**: forçar `pose_landmarker_lite.task` (~3MB) em 480p — decisão de viabilidade do study.
- **Stack**: Vite + TS + `@mediapipe/tasks-vision` (study confirma versões viáveis em abr/2026).
- **iOS PWA + getUserMedia** — risco crítico documentado no study; nesta fase, **não** colocar `display: standalone` no manifest. Tratar PWA como otimização da Fase 3.
- ADR-1, ADR-2, ADR-3, ADR-4, ADR-6 ainda **não se aplicam** (sem jogo, sem texto visível significativo, sem multi-pessoa, sem engine).

## Marco de validação (Seção 4.4)

- [ ] Roda no Chrome/Safari de iPhone do desenvolvedor a 30+ FPS.
- [ ] Detecta jump, duck e lane change do filho do desenvolvedor com taxa de acerto subjetiva > 85%.
- [ ] Latência percebida entre movimento e indicador na tela < 150ms.
- [ ] Calibração funciona em diferentes alturas (criança e adulto sem mudar código).
- [ ] Não falha catastroficamente em baixa luz ou com alguém entrando no fundo.

### Métricas a coletar (Seção 4.5)
- FPS médio em 3 dispositivos diferentes.
- Falsos positivos de jump em 1 minuto parado em pé.
- Jumps reais perdidos em 20 tentativas.

## Entregável (Seção 4.6)

Link compartilhável (Cloudflare Pages) que abre no celular e executa o protótipo.

## Dependências

- Stack do study #1 fechada (ADRs 1–6).
- Nenhuma issue de código bloqueando.

## Próximo passo

→ `/sdd-plan 2` — gerar `01-research.md`, `02-spec.md`, `03-tasks.md` granulares.
