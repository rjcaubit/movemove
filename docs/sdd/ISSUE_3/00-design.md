# Design — Fase 1: endless runner mínimo

**Data:** 2026-04-26
**Status:** Proposto (aguardando `/sdd-plan`)
**Tipo:** feat
**Pai conceitual:** Issue #1 — study transversal Fases 0–3

---

## Contexto

Transformar a PoC da Fase 0 em jogo de verdade — `EXERGAME_PROJETO.md` Seção 5. Endless runner estilo Subway Surfers simplificado, controlado por pose, com personagem, obstáculos, scroll infinito, core loop fechado. **Primeira versão jogável.**

Decisões transversais fechadas no study #1 — não re-discutir ADRs aqui.

## Escopo (Seção 5 do EXERGAME_PROJETO.md)

### Inclui
- 3 lanes (esquerda, centro, direita).
- Personagem com animações básicas: correr, pular, deslizar, virar.
- Obstáculos vindo da frente: barreira (pular), barreira baixa (deslizar), parede em uma das lanes (mudar de lane).
- Coletáveis: moedas espalhadas pelas lanes.
- Cenário com scroll infinito (textura ou tilemap).
- HUD básico: distância percorrida, moedas, FPS.
- Game over ao bater em obstáculo, com tela "Tente de novo".
- Mini-preview da câmera no canto da tela com bonequinho de keypoints.
- Tela de tutorial inicial mostrando os 3 movimentos.

### Não inclui
- Sem múltiplos personagens.
- Sem múltiplos mundos (um cenário só).
- Sem música por enquanto (efeitos sonoros simples sim).
- Sem missões diárias, sem desbloqueáveis.

## Tarefas (do doc base Seção 5.3 — ponto de partida pro /sdd-plan)

1. Adicionar **Phaser 4** ao projeto (ADR-4).
2. Cena `Boot` carregando assets.
3. Cena `Calibration` — refinamento da Fase 0, com arte minimamente decente.
4. Cena `Play`: sistema de spawning de obstáculos por dificuldade crescente, sistema de scoring (distância + moedas), detecção de colisão, **reaproveita os eventos do `pose/events.ts`** da Fase 0.
5. Cena `GameOver` com "Jogar de novo" e "Recalibrar".
6. Sprites do **Kenney Pixel Platformer Redux** (CC0) e/ou **edermunizz Infinite Runner Pack** (verificar licença) como base — ADR-6.
7. Sons: pulo, moeda, colisão, game over (Kenney.nl, CC0).
8. Tutorial inicial com animação simples dos 3 movimentos.
9. Implementação **pseudo-3D estilo Enduro/Out Run**: estrada com 3 linhas convergentes pro horizonte, sprite scaling por `z`, paralax de fundo em 3+ camadas — ADR-6.
10. Bitmap font pixel art dentro do canvas Phaser — ADR-2 (revisado).
11. Strings centralizadas em `src/i18n/strings.ts` sem framework — ADR-1.

### Decisões de game design (Seção 5.4)
- Velocidade inicial baixa, aumenta a cada 30s.
- Obstáculos previsíveis nos primeiros 20s (só barreiras de pular).
- Lane change instantânea, animação só no inclinar do personagem.
- Score em metros (distância vence, não tempo).
- Cair = recomeçar imediatamente, sem loading. Botão grande "Jogar de novo".

## ADRs do study aplicáveis

- **ADR-1** — strings em `src/i18n/strings.ts` sem framework de runtime.
- **ADR-2 (revisado)** — system fonts pro HTML, **bitmap font pixel art dentro do canvas desde esta fase**.
- **ADR-4** — `phaser@^4.0.0` (não Phaser 3).
- **ADR-5** — EMA mantido; reavaliação de One Euro fica pra Fase 2.
- **ADR-6** — pseudo-3D Enduro/Out Run, sprites Kenney/edermunizz, paralax 3+ camadas.
- ADR-3 ainda não se aplica (single-pose).

## Marco de validação (Seção 5.5)

- [ ] Filho do desenvolvedor consegue jogar uma partida completa sem ajuda depois de 1 minuto de tutorial.
- [ ] Roda a 60 FPS no celular alvo (30 FPS aceito temporariamente).
- [ ] Funciona em retrato e paisagem (recomendado: paisagem, mas detectar e avisar).
- [ ] Game feel: jogador sente que controla o personagem (responsividade ok).
- [ ] Test session de 10 minutos sem crash, freeze ou drift de calibração.

## Entregável (Seção 5.6)

PWA jogável publicada com link curto. Versão 0.1.

## Dependências

- **Bloqueada por Issue #2** — Fase 0 (PoC de pose) entregue e empiricamente validada com >85% de acerto.
- Stack do study #1 fechada.

## Próximo passo

→ `/sdd-plan 3` — gerar specs técnicas granulares.
