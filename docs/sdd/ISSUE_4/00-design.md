# Design — Fase 2: camada de exercício saudável

**Data:** 2026-04-26
**Status:** Proposto (aguardando `/sdd-plan`)
**Tipo:** feat
**Pai conceitual:** Issue #1 — study transversal Fases 0–3

---

## Contexto

Transformar de "jogo divertido" em "jogo divertido que faz exercício de verdade" — `EXERGAME_PROJETO.md` Seção 6. Esta é a fase em que o produto começa a cumprir o **propósito original** do projeto (substituir tempo de tela passivo por ativo). Aproxima do formato dos vídeos de exercício infantil que o filho do desenvolvedor assiste no YouTube.

Decisões transversais fechadas no study #1 — não re-discutir ADRs aqui.

## Escopo (Seção 6 do EXERGAME_PROJETO.md)

### Inclui
- **Cadência de corrida medida.** Personagem só avança se o jogador estiver correndo no lugar (ou andando, ajustável). Parou de correr → personagem desacelera.
- **Polichinelos como power-up.** Zonas no caminho onde precisa fazer X polichinelos para coletar bônus.
- **Braços pra cima como ataque/escudo.** Cria escudo temporário ou destrói obstáculo.
- **Música ritmada** durante a corrida; intensidade acompanha velocidade.
- **Narrador motivador opcional.** Frases curtas pré-gravadas. Pode ser TTS ou áudio gravado.
- **Resumo pós-partida.** "Você correu X metros, fez Y polichinelos, pulou Z obstáculos, seu coração trabalhou por T minutos." Visual divertido com mascote.
- **Missões diárias.** 3 simples renovadas por dia.
- **Modo "intervalo da água"** automático a cada 8 minutos: pausa de 30s com animação fofa e contagem regressiva.

### Não inclui
- Sem integração com smartwatch.
- Sem login/conta.
- Sem leaderboard.
- Sem multiplayer.

## Tarefas (do doc base Seção 6.3 — ponto de partida pro /sdd-plan)

1. Adicionar contador de cadência em `pose/events.ts`. Expor BPM/passos por segundo.
2. Sistema de "energia de corrida" no jogo: barra que enche com cadência, esvazia com inatividade. Personagem desacelera quando barra esvazia.
3. Sistema de zonas especiais (polichinelo, braços pra cima).
4. Sistema de missões: definição em JSON, persistência em IndexedDB via `idb-keyval`, reset diário.
5. Tela de resumo pós-partida com gráficos simples (Chart.js ou SVG manual).
6. Camada de áudio: música em loop, ducking quando narrador fala, efeitos.
7. Sistema de pause automático ("intervalo da água").
8. Configurações: volume, idade da criança (afeta dificuldade base e duração antes do intervalo), idioma do narrador.
9. **Adicionar `@lingui/core`** ao bundle (~8KB) — chegou a hora prevista no ADR-1.
10. Reavaliar EMA: se cadência rápida der jitter, trocar pra **One Euro Filter** — ADR-5.

## ADRs do study aplicáveis

- **ADR-1** — introduzir `@lingui/core` aqui (era o gatilho previsto: narrador motivador exige extração séria de strings).
- **ADR-5** — janela de reavaliação de filtro: EMA → One Euro se jitter de cadência aparecer.
- ADR-2, ADR-4, ADR-6 — herdados da Fase 1, sem mudança.
- **Schema IndexedDB começa aqui** — versionar o schema desde já (perfil + missões), não adiar.

## Marco de validação (Seção 6.4)

- [ ] Filho do desenvolvedor joga 15 minutos seguidos sem ficar entediado.
- [ ] No final, a criança está fisicamente cansada (suor, respiração mais forte).
- [ ] Resumo pós-partida desperta vontade de jogar de novo.
- [ ] Cadência detectada corresponde subjetivamente à intensidade percebida.
- [ ] Missões parecem alcançáveis mas não triviais.

## Entregável (Seção 6.5)

Versão 0.5 — primeira "completa" no sentido do propósito original.

## Dependências

- **Bloqueada por Issue #3** — Fase 1 jogável e estável (10 min sem crash, sem drift).
- Stack do study #1 fechada.

## Próximo passo

→ `/sdd-plan 4` — gerar specs técnicas granulares.
