# Design — Fase 3: conteúdo, progressão e modo dois jogadores

**Data:** 2026-04-26
**Status:** Proposto (aguardando `/sdd-plan`)
**Tipo:** feat
**Pai conceitual:** Issue #1 — study transversal Fases 0–3

---

## Contexto

Dar motivos pra criança voltar todo dia — `EXERGAME_PROJETO.md` Seção 7. Variedade visual, customização, progressão de longo prazo, modo dois jogadores. **Esse é o ponto onde o produto pode ser compartilhado mais amplamente** (família, amigos, escola do filho). É a v1.0.

Decisões transversais fechadas no study #1 — não re-discutir ADRs aqui.

## Escopo (Seção 7 do EXERGAME_PROJETO.md)

### Inclui
- **Múltiplos personagens** desbloqueáveis com moedas. 3-5 inicialmente.
- **Múltiplos mundos:** cidade, floresta, espaço, oceano, deserto. Cada um com paleta, obstáculos e coletáveis temáticos.
- **Sistema de níveis** com XP por partida.
- **Avatar customizável:** chapéu, mochila, trilha de partículas. Comprado com moedas.
- **Modos de jogo:**
  - **Corrida livre** (a da Fase 1+2): endless.
  - **Cardio guiado:** sequência fixa de exercícios, estilo "siga o personagem treinador" (puxa do estilo dos vídeos do YouTube).
  - **Desafio diário:** mapa fixo do dia, mesmo pra todos os jogadores, com recorde local.
- **Modo dois jogadores local** (mesma câmera, dois corpos detectados, lanes separadas em duas metades da tela).
- **Conquistas/badges.**

### Decisões de design abertas (Seção 7.3)
- Loja só com moedas in-game (sem microtransações). **Confirmado nesta fase.**
- Quanto de XP por partida? **Tunar com testes durante a fase.**
- Modo dois jogadores divide tela ou compartilha lanes? **Provavelmente split-screen** (a investigar no `/sdd-plan`).

## Tarefas (do doc base Seção 7.2 — ponto de partida pro /sdd-plan)

1. Refator do sistema de cenários para suportar temas plugáveis (config JSON + assets).
2. Sistema de inventário e loja in-game (moedas locais, sem dinheiro real).
3. Refator do `pose/poseDetector.ts` para suportar 2 corpos simultâneos — **swap pra MoveNet MultiPose (TensorFlow.js)** conforme ADR-3, mantendo a interface de eventos.
4. Sistema de progressão e save robusto (versionar schema do save — extensão do que começou na Fase 2).
5. Tela de seleção de modo, mundo, personagem.
6. Conteúdo: arte minimamente coerente (ilustrador freelancer ou packs Kenney/itch.io expandidos).
7. Modo cardio guiado — interface similar a vídeo do YouTube interativo.
8. Mundos como troca de paleta + sprites (mecânica visual do ADR-6 já cobre isso barato).

## ADRs do study aplicáveis

- **ADR-3** — multi-pessoa via **MoveNet MultiPose** (`@tensorflow-models/pose-detection`), não YOLO nem MediaPipe Holistic.
- **ADR-6** — mudança de mundo = troca de paleta + sprites; mecânica visual pseudo-3D já está pronta da Fase 1.
- ADR-1, ADR-2, ADR-4, ADR-5 — herdados, sem mudança estrutural nesta fase.
- **Schema IndexedDB versionado**: a Fase 3 mexe em progressão; obrigatório schema versioning antes de adicionar tabelas/campos novos (perfil, inventário, conquistas, recordes por mundo).

## Marco de validação (Seção 7.4)

- [ ] 5+ partidas seguidas sem repetição visual cansativa.
- [ ] Criança verbaliza desejo específico ("quero o chapéu de pirata!") — sinal de engajamento com progressão.
- [ ] Modo cardio guiado parece um vídeo de YouTube interativo.
- [ ] Modo dois jogadores funciona com criança e adulto na mesma câmera.

## Entregável (Seção 7.5)

Versão 1.0 — produto compartilhável com família, amigos, escola.

## Dependências

- **Bloqueada por Issue #4** — Fase 2 entregue (cadência + missões + áudio + IndexedDB).
- Schema IndexedDB versionado **antes** de adicionar tabelas novas (extensão da Fase 2).
- Stack do study #1 fechada.

## Próximo passo

→ `/sdd-plan 5` — gerar specs técnicas granulares.
