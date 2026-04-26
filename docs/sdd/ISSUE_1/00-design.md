# Design — Estudo Abrangente: Exergame Infantil (Fases 0–3, sem backend)

**Data:** 2026-04-26
**Status:** Proposto (aguardando aprovação)
**Tipo:** study

---

## Problema

O `EXERGAME_PROJETO.md` propõe um exergame infantil PWA (endless runner controlado por pose, MediaPipe + Phaser, 30+ FPS em mid-range, latência <100ms, bundle <5MB) organizado em 5 fases. Antes de implementar qualquer linha de código, três classes de pergunta seguem em aberto:

1. **Viabilidade técnica.** As premissas de stack (MediaPipe Tasks Vision, Phaser 3, idb-keyval, Vite) seguem válidas em abril/2026? Os números prometidos (30+ FPS no iPhone SE 2020, modelo + bundle <5MB) são realistas? Existem riscos de plataforma — particularmente em iOS PWA com câmera — que comprometem a abordagem?
2. **Roadmap.** Como as Fases 0–3 se ligam (dependências reais, marcos de validação, reuso entre fases)? Onde estão os pontos de retrabalho mais prováveis?
3. **Decisões em aberto.** A Seção 10.2 do doc lista 5 itens; 3 são relevantes pras Fases 0–3 (i18n, tipografia, multi-pessoa). Sem ADR, cada um vira retrabalho.

Sem fundamentar essas três frentes, qualquer issue de `feat:` que crie a Fase 0 começa apoiada em premissas frágeis. Este estudo é a base que torna o resto do pipeline SDD mais barato.

## Usuário e caso de uso

Usuário deste estudo: o próprio desenvolvedor (você). Frequência: leitura única na hora de fundar o repositório, e referência pontual ao iniciar cada fase. Saída esperada: cada premissa do `EXERGAME_PROJETO.md` validada (ou refutada com plano B), cada decisão da 10.2 fechada, e um roadmap que diz "próxima issue a criar é X, depende de Y".

## Escopo

### Inclui
- Viabilidade técnica via desk research das tecnologias declaradas no `EXERGAME_PROJETO.md` Seção 2.
- ADRs fundamentados para as 3 decisões em aberto da Seção 10.2 relevantes às Fases 0–3 (i18n, tipografia, multi-pessoa) + 3 ADRs adicionais que a pesquisa e a conversa revelaram (Phaser 3 vs 4, filtro de suavização, estética visual pseudo-3D).
- Avaliação da Seção 10.1 (projetos open-source de referência) — atividade, valor real como referência.
- Roadmap conciso das Fases 0, 1, 2 e 3 com dependências, marcos de validação e estimativa relativa.
- Mapa de reuso transversal (o que sobrevive de fase em fase).
- Riscos macro com mitigação.

### Não inclui (fora do escopo desta issue)
- Fase 4 (backend Supabase/Cloudflare, contas, RLS, leaderboard, escola/professor, sync, Capacitor, LGPD/COPPA).
- Quebra fina de tarefas por fase (isso fica pro `/sdd-plan` quando cada fase virar sua própria issue de `feat:`).
- Especificação de schema de IndexedDB, sprites, narrações ou copy de UI — detalhe demais pra um study.
- Medição prática (rodar MediaPipe no celular alvo e medir FPS real) — opção [B] descartada na conversa.
- Decisões em aberto exclusivas da Fase 4 (telemetria provider, Capacitor) — saem com a Fase 4.

## Abordagem escolhida

Documento único de estudo (uma issue só, conforme pedido), estruturado em 4 blocos: **(1) Pesquisa externa** validando o estado da arte em abr/2026 das tecnologias, referências e estética visual, **(2) Viabilidade técnica** confrontando os números prometidos com a realidade descoberta, **(3) ADRs** que fecham cada decisão em aberto com recomendação fundamentada (incluindo direção estética), **(4) Roadmap** das Fases 0–3 com dependências e reuso explícito.

Por que esse formato e não outros:
- **Vs. issue por fase desde já:** as fases compartilham a camada de pose, padrões de código, performance budget e ADRs — separar agora duplica esses blocos. Quando cada fase virar issue própria via `/sdd-plan`, ela linka este estudo em vez de re-derivar.
- **Vs. estudo + roadmap em issues separadas:** esse desacoplamento faz sentido em produto maduro com múltiplos contribuidores; aqui é um único desenvolvedor e mistura é mais barata que coordenação.
- **Vs. desk research só (sem ADR):** as decisões em aberto da 10.2 já estão cobradas pelo doc original; deixá-las pra "depois" é exatamente o tipo de débito que o SDD evita.

## Abordagens descartadas

| Abordagem | Motivo de descarte |
|-----------|---------------------|
| Estudo abrangente das 5 fases (incluindo backend) | Usuário pediu explicitamente Fases 0–3, sem backend |
| Estudo + protótipo de medição | Custo alto; números reais vão aparecer naturalmente na Fase 0 — antecipar é trabalho duplicado |
| Estudo das Fases 0+1, depois Fases 2+3 separado | Usuário escolheu issue única; também perderíamos o reuso transversal num doc só |
| Issue separada por ADR | 3 ADRs viram 3 issues que ninguém abriu — concentração no estudo é mais pragmática |

---

## Pesquisa externa

### Estado da arte das tecnologias declaradas (abr/2026)

| Tecnologia | Estado | Implicação |
|---|---|---|
| `@mediapipe/tasks-vision` (Pose Landmarker Web) | Pacote vivo, atualização recente em mar/2026. API JS de Tasks segue sendo a recomendação oficial do Google AI Edge. 33 keypoints, 3 variantes de modelo (`lite` ~3MB, `full` ~9MB, `heavy` ~29MB). | Manter a escolha do doc. Para mobile (budget de bundle 5MB), **forçar `pose_landmarker_lite`** — `full` e `heavy` estouram o budget sozinhos. |
| Phaser 3 | Phaser 4.0 atingiu estável em **abril/2026**. Phaser 3 declarado pelo time como "última versão da linha v3" — todo desenvolvimento futuro em v4. | **Recomendação muda:** começar direto em Phaser 4 (ver ADR-4). Doc original aponta v3, mas v3 vira legado em poucos meses. |
| Vite + TypeScript | Padrão maduro, sem novidade que afete a decisão. | Manter. |
| `idb-keyval` | Wrapper minúsculo (<1KB), padrão moderno sobre IndexedDB. | Manter. Para Fase 2/3 (missões, perfil, inventário) com schema mais rico, talvez evoluir pra `idb` (mesma família, mais flexível) — **não é decisão pra agora**. |
| Cloudflare Pages / Vercel deploy | Inalterado, free tier serve. | Manter. |

### Risco crítico descoberto: iOS PWA + `getUserMedia`

A pesquisa expôs um problema conhecido (e ainda parcialmente vivo em 2026) de **WebKit reabrir prompt de permissão de câmera** em PWAs em modo standalone na home screen do iOS, especialmente quando há mudança de hash/rota (bugs WebKit 185448 e 215884, com relatos atualizados em 2025–2026 de re-prompts mesmo após permissão concedida). Safari 26 introduziu melhorias mas o caso "PWA instalada na home + câmera" segue irregular.

**Implicação:** o critério "abrir num link e funcionar" do princípio 1.3.2 (zero fricção de instalação) está em tensão direta com o uso de câmera quando o app é adicionado à home como PWA. Precisa estar no risco e no roadmap.

**Mitigação proposta:** durante Fase 0/1, **desencorajar adicionar à home** (omitir o `manifest.json` `display: standalone` ou usar `browser`). Tratar PWA standalone como otimização da Fase 3, não default. Documentar limitação na tela de calibração ("se a câmera pedir permissão de novo, é o iOS — toca em permitir").

### Multi-pessoa (relevante pra Fase 3)

A Seção 7.1 do doc original prevê modo dois jogadores e a 7.2.3 menciona "investigar YOLO-pose ou MediaPipe Holistic com múltiplas instâncias". A pesquisa em abr/2026 mostra um caminho mais simples e maduro:

- **MoveNet MultiPose (TensorFlow.js)** detecta até 6 pessoas simultaneamente, mantendo 30+ FPS em desktop e mobile mid-range, via `@tensorflow-models/pose-detection`. É single-purpose (só pose), mais leve que YOLO-pose generalista.
- Custo: trocar a fonte de keypoints na Fase 3. Como o `EXERGAME_PROJETO.md` Seção 2.4 já prescreve "Pose layer separada do game layer" e "jogo nunca lê keypoints crus", a troca é local — só `pose/poseDetector.ts` muda; `events.ts` e tudo acima continuam.
- 33 keypoints (MediaPipe) vs 17 keypoints (MoveNet/COCO) é a única perda real — para as 6 heurísticas da Seção 3.3 do doc, **17 keypoints bastam** (olhos, ombros, quadris, joelhos, tornozelos, pulsos estão todos no COCO).

Conclusão: a "investigação" da 7.2.3 já tem resposta. ADR-3 fixa MoveNet MultiPose como caminho da Fase 3.

### Projetos open-source da Seção 10.1 — avaliação

| Projeto | Uso real recomendado | Status |
|---------|----------------------|--------|
| MediaPipe (google-ai-edge) | Dependência direta — usar via `@mediapipe/tasks-vision` | Vivo, mantido |
| Phaser 3 | Substituir por Phaser 4 (ver ADR-4) | Em transição p/ legado |
| Endless-Game-automation-using-mediapipe (AdityaWadkar) | **Apenas leitura** — inspiração de heurísticas. Não é base de código. | Inativo (3 commits totais) |
| mediapipe-game (SUcy6) | **Apenas leitura** — referência de mini-jogos com pose. | Maduro mas inativo (19 commits) |
| fitness-trainer-pose-estimation (yakupzengin) | **Apenas leitura** — contagem de repetições, útil pra cadência (Fase 2) | Inativo |
| Good-GYM (yo-WASSUP) | **Apenas leitura** — assistente de exercícios | Verificação inconclusiva |
| Kenney.nl | Fonte de assets CC0 — usar diretamente | Vivo |
| InteractiveEdu (UTFPR) | Inspiração acadêmica, ler o paper | Estático (artigo) |

**Tomada de decisão:** nenhum projeto da lista é base de código adotada. Todos servem como leitura de inspiração para heurísticas e padrões. As heurísticas da Seção 3.3 do doc original já são suficientes pra Fase 0; refinamento empírico vem do uso real, não de copiar de projeto inativo.

### i18n (relevante pra ADR-1)

Comparação atualizada (abr/2026) de runtime gzipped:
- `lingui` (`@lingui/core` + `@lingui/react`) ~10 KB, compile-time, mensagens vão pra bundle como funções; melhor pra bundle apertado.
- `i18next` + `react-i18next` ~22 KB, runtime, JSON loader; ecossistema mais rico.
- `react-intl` (FormatJS) ~maior que i18next, ICU MessageFormat completo.

Como o budget é 5MB total e o jogo *não* é React (Phaser cuida da render), o caso é ainda mais favorável a Lingui — usar só `@lingui/core` (~8KB) sem `@lingui/react`. Ver ADR-1.

### Referências visuais e estética (relevante pra ADR-6)

A direção visual ganhou tração específica na conversa: **pseudo-3D estilo Enduro (Atari 2600) / Out Run (1986), modernizado em pixel art 16/32-bit**. A pesquisa abaixo valida disponibilidade de assets free/CC0 alinhados.

**Por que pseudo-3D em 2D, e não 3D real ou side-scroller puro:**
- Subway Surfers (referência do doc original) é Unity 3D — não roda em Phaser sem trocar a stack inteira.
- Side-scroller 2D puro (Sonic/Mega Man) perde a "profundidade que cresce" que faz endless runner ler bem visualmente.
- Doom-like first-person foi descartado: visual hostil pra criança 5–12, FOV largo confunde, e Phaser não é engine pra raycasting.
- Pseudo-3D Enduro-style se faz em Phaser 2D puro com sprite scaling + linhas convergentes — **mantém a stack do doc** e entrega profundidade legível.

**Asset packs CC0/livre uso comercial avaliados:**

| Pack | Licença | Uso | URL |
|------|---------|-----|-----|
| Kenney — Pixel Platformer | CC0 | Chars + tiles + HUD básico (200 assets) | kenney.nl/assets/pixel-platformer |
| Kenney — Platformer Art Pixel Redux | CC0 | Pack maior (900 assets), variedade de cenário | kenney.nl/assets/platformer-art-pixel-redux |
| Kenney — Pixel Platformer Blocks | CC0 | Blocos extras (80) | kenney.nl/assets/pixel-platformer-blocks |
| edermunizz — Pixel Art Infinite Runner Pack | itch.io (verificar licença comercial) | Específico pra runner: chars + bg + obstáculos + animações run/jump/death | edermunizz.itch.io/infinite-runner |
| OpenGameArt — Endless Runner Platformer art pack | OGA-BY/CC-BY (verificar) | Uso comercial OK | opengameart.org/content/endless-runner-platformer-art-pack |
| CraftPix — Free Basic Pixel Art UI for RPG | Verificar | HUD, botões, painéis, health bars | craftpix.net/freebies/free-basic-pixel-art-ui-for-rpg |
| SNES.css | MIT | Framework CSS retrô 16-bit pro **HTML fora do canvas** (calibração, tutorial, game over screens) | github.com/devMiguelCarrero/snes.css |

**Referências de inspiração visual (não-asset):**
- Enduro (Atari 2600, 1983) — pseudo-3D com sprite scaling, lanes, mudança de ambiente (dia → noite → neblina → neve).
- Out Run (Sega, 1986) — Enduro modernizado em 16-bit, paleta rica.
- Pole Position II / Top Gear (SNES) — runners pseudo-3D 16-bit.
- Drift Stage (moderno) — prova que essa estética envelhece bem e cabe num jogo 2026.
- Hyper Light Drifter / Sea of Stars — pixel art 32-bit moderno (paleta + animação rica).

---

## Viabilidade técnica

### Performance budget vs realidade descoberta

| Métrica | Promessa do doc (Seção 2.5) | Avaliação |
|---|---|---|
| FPS no iPhone SE 2020 / Android mid-range | 30+ | **Plausível com `pose_landmarker_lite` em 480p**. MediaPipe Tasks Vision atinge 30+ FPS em desktops e laptops modernos consistentemente; em mobile mid-range com modelo `lite` o resultado é tipicamente 25–35 FPS conforme relatos comunitários, com queda em iluminação ruim. Worst-case é um Android antigo; iPhone SE 2020 é caso favorável (GPU Apple A13). **Risco aceitável**, com plano B = baixar pra 24 FPS na barra de movimento, jogo continua jogável. |
| Latência pose → ação | <100ms | **Plausível mas justa**. MediaPipe inferência típica 15–30ms em mobile + filtro EMA (1 frame) + render Phaser (~16ms) ≈ 50–80ms. Cabe, mas qualquer overhead extra (Kalman, decisão de evento com janela de 200ms pra duck) come o budget. |
| Boot até jogável | <5s em 4G | **Plausível** com `pose_landmarker_lite` (~3MB) cacheado via Service Worker depois do primeiro load. Primeira visita pode passar de 5s em 4G real (latência + 3G effective). Mitigação: tela de carregamento "Carregando o detector de movimento" com barra de progresso. |
| Tamanho total inicial | <5MB | **Apertado mas viável**. Conta: `pose_landmarker_lite.task` ~3MB + runtime `@mediapipe/tasks-vision` ~1.5–2MB (WASM SIMD) + Phaser 4 build mínimo ~250KB + código + Lingui ~10KB + idb-keyval ~1KB ≈ 4.7–5.2MB. **Risco real de estourar.** Mitigação: lazy-load Phaser e MediaPipe (eles podem carregar em paralelo após calibração). |

### Riscos secundários

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| iOS PWA standalone re-prompt de câmera | alta | médio | Não usar `display: standalone` por default; aviso na tela de calibração |
| Modelo `lite` perde keypoints com baixa luz | média | médio | Limiar de confiança média 0.6 (já no doc Seção 3.4); aviso "iluminação fraca" |
| Calibração corrompida quando criança chega muito perto da câmera | média | alto | Recalibrar automaticamente quando bbox cresce >30% do baseline (extensão da Seção 9.2) |
| Drift do baseline em sessão longa (criança suando, roupa larga) | média | médio | Botão "Recalibrar" sempre disponível (já no doc); auto-sugestão de recalibração se confiança média cai por 10s contínuos |
| Phaser 4 ainda novo, bugs em mobile pós-release | baixa-média | médio | Acompanhar issues Phaser; se bater problema bloqueante, fallback pra Phaser 3 LTS (custo ~1 dia) |
| Detecção de evento "jump" gera falso positivo quando criança mexe os braços animada | média | baixo | Cooldown de 400ms já no doc; histerese adicional no quadril |

### Riscos arquiteturais — não-issues

Itens que pareciam ameaças mas a pesquisa rebaixou:
- **Multi-pessoa Fase 3** — antes parecia "investigar/pesquisar"; com MoveNet MultiPose fica como troca local de driver de pose. Sem refator estrutural.
- **MediaPipe descontinuado** — não há sinal disso; pacote ativo, atualizado em mar/2026.

---

## ADRs (decisões em aberto fechadas)

### ADR-1 — i18n: começar PT-BR-only com layout i18n-ready, sem framework de runtime na Fase 0

**Decisão:** todos os textos visíveis vivem em um arquivo `src/i18n/strings.ts` exportando funções/constantes nomeadas, mesmo enquanto só existe locale `pt-BR`. **Não** adicionar `lingui` ou `i18next` na Fase 0/1. Adicionar `@lingui/core` (~8KB) na Fase 2 quando o narrador motivador entrar (Seção 6.1) — aí faz sentido extrair de verdade.

**Por quê:**
- Pôr framework de i18n pra um locale só queima budget de bundle e adiciona complexidade.
- A disciplina de centralizar strings em arquivo dedicado já cobre 90% do trabalho de "preparar pra i18n" — depois é trocar `strings.greeting` por `t\`greeting\`` mecanicamente.
- Lingui ganha por bundle (~10KB vs ~22KB i18next) e por compile-time extraction — bom fit pra PWA infantil.

**Rejeitado:** adicionar i18next desde o começo (sugestão da 10.2.1). Heavy demais pra ganho zero enquanto há um locale só.

### ADR-2 — Tipografia: system fonts pro HTML, bitmap font pixel art dentro do canvas desde Fase 1

**Decisão:** usar pilha `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` para todo texto **HTML fora do canvas** (telas de calibração, tutorial popup, configurações). Dentro do canvas Phaser, **bitmap font pixel art alinhada com o ADR-6 desde a Fase 1** (logo, score, mensagens HUD). Candidatos: PixelOperator, Press Start 2P, ou bitmap font derivada dos packs Kenney.

**Por quê:**
- HTML fora do canvas é raro e curto — system fonts evitam flash of unstyled text e custo de download (até 200KB economizados nesse caminho).
- Dentro do canvas, system fonts não combinam com pixel art — renderizam suavizadas, quebram a estética do ADR-6. Bitmap font pixel art é **obrigatória** pra coerência visual.
- Bitmap font tem render mais rápido que webfont em canvas — bom pra performance budget.

**Rejeitado:** custom webfont global (vetorial) — perde coerência com pixel art e custa boot. System fonts dentro do canvas — quebra a estética. Adiar bitmap font pra Fase 3 (versão anterior deste ADR) — incoerente com adoção de estética pixel desde Fase 1.

### ADR-3 — Multi-pessoa Fase 3: MoveNet MultiPose (TensorFlow.js), não MediaPipe Holistic

**Decisão:** quando a Fase 3 implementar modo dois jogadores (Seção 7.1), trocar o backend de pose dentro do `pose/poseDetector.ts` para `@tensorflow-models/pose-detection` rodando MoveNet MultiPose Lightning, mantendo a mesma interface de eventos.

**Por quê:**
- MoveNet MultiPose detecta até 6 pessoas, 30+ FPS, mantido pelo TF.js, único pacote.
- Alternativa "duas instâncias de MediaPipe" gasta o dobro de inferência e MediaPipe Tasks single-pose foca no corpo mais proeminente — disputa entre os jogadores leva a oscilação.
- 17 keypoints (COCO/MoveNet) vs 33 (MediaPipe) — todos os keypoints usados nas heurísticas da Seção 3.3 estão no COCO. Sem perda funcional.
- Como `events.ts` é abstrato sobre keypoints, a troca é localizada.

**Rejeitado:** YOLOv8/YOLO11 Pose web — pacote maior (~6–10MB), generalista demais, custo de bundle inaceitável dado o budget. MediaPipe Holistic com múltiplas instâncias — pesado e instável.

### ADR-4 — Engine: começar direto em Phaser 4, não Phaser 3

**Decisão:** adotar `phaser@^4.0.0` desde a Fase 1, mesmo o `EXERGAME_PROJETO.md` apontando v3.

**Por quê:**
- Phaser 4 ficou estável em abril/2026. Phaser 3 é declaradamente "último da linha" — começar nele significa migrar em 6–12 meses.
- Migração v3→v4 declarada como "few hours of work" para uso padrão (sprites, text, tilemaps) — exatamente o caso do exergame. Mesmo que houvesse bug bloqueante, o custo de voltar pra v3 LTS é baixo.
- v4 traz ganhos relevantes pra mobile: novo renderer WebGL, SpriteGPULayer, sistema de Filter unificado.

**Rejeitado:** Phaser 3 conservador. Custo de migração futura > custo de começar em v4.

### ADR-5 — Filtro de suavização: EMA até Fase 2, One Euro Filter na Fase 2 se necessário, Kalman fica out

**Decisão:** Fase 0 e 1 usam EMA simples (Seção 3.2 do doc, α≈0.5 como ponto de partida, tunável). Se latência ou jitter virarem problema concreto na Fase 2 (movimentos rápidos como polichinelo), avaliar **One Euro Filter** — não Kalman.

**Por quê:**
- One Euro Filter é praticamente o padrão em pose estimation interativa, especificamente desenhado pra equilibrar latência vs jitter; código <100 linhas; sem dependência.
- Kalman pra keypoints 2D requer modelar dinâmica do corpo — overengineering pro problema.
- EMA é suficiente pra heurísticas grosseiras (jump, duck, lane); só vira gargalo em detecção de cadência rápida.

**Rejeitado:** Kalman. Complexidade que não paga.

### ADR-6 — Estética visual: pseudo-3D estilo Enduro/Out Run em pixel art 16/32-bit moderno

**Decisão:** o jogo adota visual **pseudo-3D com perspectiva e sprite scaling**, inspirado em **Enduro (Atari 2600, 1983)** e **Out Run (Sega, 1986)**, em **pixel art com paleta e detalhe de 16/32-bit moderno** (Drift Stage, Hyper Light Drifter como referência de polimento). Implementação 100% em Phaser 2D, sem Three.js.

**Mecânica visual:**
- Estrada com 3 lanes desenhadas como linhas convergentes pro horizonte (perspectiva afim simples).
- Obstáculos têm campo `z` (distância) e escalam de ~0.1 (longe) a ~2.0 (em cima do jogador).
- Paralax de fundo em 3+ camadas com velocidades diferentes.
- Mudança de ambiente por mundo da Fase 3 segue a tradição Enduro (dia → noite → neblina → neve) — para o exergame, vira cidade/floresta/espaço/oceano/deserto.

**Assets como ponto de partida (todos avaliados em "Referências visuais e estética"):**
- Kenney Pixel Platformer + Pixel Platformer Redux (CC0) — chars, tiles, blocos.
- edermunizz Pixel Art Infinite Runner Pack (itch.io — verificar licença comercial antes da Fase 1).
- SNES.css (MIT) pro HTML fora do canvas (calibração, tutorial, game over).
- CraftPix Free Basic Pixel Art UI for RPG — botões, painéis, health bars.

**Por quê:**
- **Phaser-friendly:** SpriteGPULayer do Phaser 4 (ADR-4) renderiza milhares de sprites escalados sem suar. ~200 linhas de TypeScript dão a base de pseudo-3D.
- **Legibilidade infantil:** profundidade ajuda criança a antecipar obstáculo (cresce na tela = vai chegar). Lane horizontal direta. Heurísticas da Seção 3.3 do doc têm tempo de detectar.
- **Estética retrô envelhece bem:** Out Run/Drift Stage provam. Pixel art moderna evita o "tosco" do Atari 2600 puro mantendo o charme 8-bit.
- **Aderente ao roadmap:** "mudança de ambiente" do Enduro casa naturalmente com Fase 3 (Seção 7.1) — basicamente troca de paleta + sprites, não redesenho de cenário.

**Rejeitado:**
- **Doom-like pseudo-3D first-person.** Visual hostil pra criança 5–12; FOV largo confunde leitura de obstáculo; Phaser não é engine pra raycasting.
- **Subway Surfers 3D estilizado real.** Sai de Phaser; precisa Three.js ou Unity. Quebra a stack do doc.
- **2D side-scroller puro estilo Sonic/Mega Man.** Funciona mas perde a profundidade que faz endless runner ler bem.
- **Pixel art puro 16-bit sem pseudo-3D.** Faz parte do leque, mas perde escalabilidade entre fases (mundos da Fase 3 viram redesenho ao invés de troca de paleta).
- **Atari 2600 Enduro puro.** Tosco demais pro padrão 2026; criança hoje espera mais paleta e animação.

---

## Roadmap Fases 0–3

Cada fase aqui é uma **futura issue de `feat:`**, criada via `/sdd-plan` quando chegar a hora. Este study é o pai conceitual — cada fase linka este doc.

### Fase 0 — PoC de detecção (próxima issue a criar)

- **Entrega:** página solta com câmera + MediaPipe + as 6 heurísticas + tela de calibração + painel de debug. Sem jogo.
- **Decisões já tomadas neste estudo:** Vite + TS + `@mediapipe/tasks-vision` com modelo `lite` em 480p; EMA α=0.5; flag `?debug=1` com keyboard fallback desde o dia 1.
- **Marco de validação:** filho do dev consegue executar jump/duck/lane com >85% de acerto subjetivo no celular alvo.
- **Dependências:** nenhuma (é o ponto de partida).
- **Tamanho relativo:** P (1 fim de semana, conforme Seção 10.4).

### Fase 1 — Endless runner mínimo

- **Entrega:** PWA jogável com 3 lanes, obstáculos, moedas, scroll infinito, calibração polida, mini-preview da câmera.
- **Decisões já tomadas:** **Phaser 4** desde o começo (ADR-4); system fonts pro HTML + bitmap font pixel art dentro do canvas (ADR-2); strings centralizadas em `src/i18n/strings.ts` sem framework (ADR-1); EMA mantido (ADR-5); **estética pseudo-3D Enduro/Out Run com sprites Kenney Pixel Platformer Redux + edermunizz Infinite Runner como base** (ADR-6).
- **Marco de validação:** filho do dev joga sessão completa de 10 min sem ajuda, sem crash, sem drift.
- **Dependências:** Fase 0 validada empiricamente.
- **Tamanho relativo:** M.

### Fase 2 — Camada de exercício saudável

- **Entrega:** cadência de corrida medida, polichinelos como power-up, braços-pra-cima como escudo, música ritmada, narrador opcional, missões diárias, intervalo da água, resumo pós-partida.
- **Decisões já tomadas:** introduzir `@lingui/core` aqui (ADR-1) por causa do narrador; reavaliar EMA→One Euro se cadência rápida der jitter (ADR-5); persistência de missões em IndexedDB via `idb-keyval`.
- **Marco de validação:** filho joga 15 min seguidos, fica fisicamente cansado, quer voltar.
- **Dependências:** Fase 1 jogável e estável.
- **Tamanho relativo:** M-G.

### Fase 3 — Conteúdo, progressão e dois jogadores

- **Entrega:** múltiplos personagens, mundos, modos (corrida livre / cardio guiado / desafio diário), avatar customizável, modo dois jogadores local, conquistas.
- **Decisões já tomadas:** swap pra MoveNet MultiPose para o modo 2P (ADR-3); refator de cenários pra config JSON; reconsiderar tipografia custom (ADR-2 prevê esta janela).
- **Marco de validação:** 5+ partidas seguidas sem repetição visual cansativa; modo 2P funciona com criança + adulto.
- **Dependências:** Fase 2 entregue; refator de schema de save (versionar) feito antes de mexer em progressão.
- **Tamanho relativo:** G.

### Reuso transversal (o que sobrevive de fase em fase)

A camada `pose/` (poseDetector, smoother, calibration, events) e o bus de eventos (Seção 2.4) são **invariantes** entre as fases. Cuidar disso desde a Fase 0:
- `pose/events.ts` emite eventos abstratos; jogo nunca lê keypoints crus.
- Bus de eventos único (`mitt` ou `EventEmitter` simples); sem múltiplos.
- `src/game/config.ts` centraliza thresholds/cores/velocidades — alterações de balanceamento entre fases são edição de config, não código.
- Modo debug com keyboard fallback — sempre presente, em todas as fases. Tudo desenvolvido sem precisar pular na frente do laptop.

Quebrar essas invariantes é o caminho mais provável pra retrabalho.

---

## Reuso do CODEMAP

Não se aplica — o repositório ainda não existe. Este estudo passa a ser a **referência inicial** que o `/sdd-plan` de cada fase consulta no lugar de um CODEMAP. Quando o repositório for criado e a Fase 0 entregar a estrutura inicial de `src/`, gerar `docs/CODEMAP.md` na sequência (sub-tarefa da Fase 0).

## Impacto arquitetural

- **Backend:** nenhum nas Fases 0–3 (princípio 1.3.1 do doc — privacidade primeiro, frames nunca saem do device).
- **Frontend:** estrutura de pastas conforme Seção 2.3 do `EXERGAME_PROJETO.md` — `src/pose/`, `src/game/`, `src/ui/`, `src/storage/`, `src/i18n/strings.ts` (adição deste estudo, não no doc original).
- **AI service:** nenhum agente IA serverside. MediaPipe roda 100% no cliente.
- **Schema (IndexedDB):** começa vazio, ganha forma na Fase 2 (perfil, missões, recordes); evoluir com versionamento de schema desde a Fase 2 — não adiar.
- **Docs canônicas a criar (após Fase 0):** `docs/CODEMAP.md`, `docs/ARCHITECTURE.md` (resumo de pose layer × game layer × event bus). `docs/sdd/ISSUE_{este}/` mora aqui mesmo.

## Critérios de sucesso (o que prova que este estudo funcionou)

- [ ] Cada uma das 6 ADRs (1 a 6) tem decisão clara, com "por quê" e alternativa rejeitada.
- [ ] Os 4 números do performance budget (FPS, latência, boot, bundle) têm avaliação plausível/não-plausível com mitigação caso "apertado".
- [ ] O risco "iOS PWA + getUserMedia" está visível e tem plano B documentado.
- [ ] Roadmap das 4 fases consegue responder, pra cada fase, "qual a próxima dependência?" e "qual o marco que diz que terminou?".
- [ ] Quando o `/sdd-plan {Fase 0}` for invocado, ele encontra neste doc todas as decisões transversais já fechadas (não precisa re-perguntar i18n, fontes, engine, filtro, multi-pessoa, estética).

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Bundle estourar 5MB com `lite` + Phaser 4 + runtime MediaPipe | média | Lazy-load Phaser e MediaPipe em paralelo; medir cedo na Fase 0 |
| iOS PWA standalone quebrar câmera | alta | Não usar `display: standalone` até Fase 3; aviso na tela de calibração |
| FPS abaixo de 30 no Android mid-range alvo | média | Plano B = aceitar 24 FPS; reduzir resolução de entrada pra 360p se preciso |
| Phaser 4 com bug bloqueante pós-release | baixa | Fallback pra Phaser 3 LTS (custo ~1 dia) |
| Estudo ficar desatualizado quando as fases começarem | média (se demorar) | Marcar com `**Data:**` no header; rever ADRs no início de cada fase via `/sdd-refine` |

---

## Próximo passo

→ Após aprovação e criação desta issue, o próximo comando é:

```
/sdd-plan {n_da_issue_da_fase_0}
```

…onde `{n_da_issue_da_fase_0}` é uma **nova issue de `feat:`** (criada por `/sdd-brainstorm` ou direto) que cite este estudo como referência. Este study não vira tarefa de código por si só.

*Fim do design.*
