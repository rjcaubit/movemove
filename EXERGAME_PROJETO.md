# Exergame Infantil com Detecção de Pose — Documento de Projeto

> Documento-base para refinamento e implementação via Claude Code.
> Versão inicial — Abril 2026.

---

## 1. Visão Geral

### 1.1. O quê

Um jogo do estilo *endless runner* (inspirado em Subway Surfers) onde o personagem é controlado **exclusivamente pelo movimento físico do jogador**, capturado pela câmera do celular ou do computador, sem necessidade de controles, joystick ou botões. O objetivo é unir entretenimento e atividade física para crianças, substituindo parte do tempo de tela passivo (vídeos no YouTube) por tempo de tela ativo.

### 1.2. Para quem

- **Usuário primário:** crianças de 5 a 12 anos.
- **Usuário secundário:** pais que querem incentivar atividade física e adultos jogando junto.
- **Possível evolução:** professores e escolas (educação física, recreação).

### 1.3. Princípios norteadores (não negociáveis)

1. **Privacidade primeiro.** Frames de vídeo nunca saem do dispositivo. Tudo o que envolve a câmera é processado localmente.
2. **Zero fricção de instalação.** Tem que abrir num link e funcionar. PWA, não app de loja (nas fases iniciais).
3. **Falsos negativos > falsos positivos.** É melhor o jogo às vezes não detectar o pulo do que registrar pulos fantasmas. Frustração de "pulei e nada aconteceu" é menor que "tô parado e morri".
4. **Calibração por proporção, não por valor absoluto.** Threshold em pixels quebra quando a criança chega mais perto da câmera. Tudo deve ser proporcional ao corpo detectado.
5. **Diversão antes de polimento.** Game feel é arte. Iterar com o usuário real (criança) é mais importante que arte bonita.
6. **Movimento seguro.** Pedir espaço livre antes de iniciar; pausar para água; intensidade adequada à idade.

### 1.4. Não-objetivos (escopo NÃO incluído)

- Não é um app de fitness profissional (sem prescrição de exercício, sem contagem precisa de calorias).
- Não é um jogo competitivo online em tempo real (multiplayer só na Fase 4, e assíncrono).
- Não é um substituto para educação física com profissional.
- Não é monetizado nas fases iniciais.

---

## 2. Stack Técnica e Decisões de Arquitetura

### 2.1. Decisões de alto nível

| Decisão | Escolha | Justificativa |
|---|---|---|
| Plataforma | Web (PWA) | Zero instalação, multiplataforma, distribuição por link |
| Backend (Fases 0–3) | **Nenhum** | Tudo client-side; reduz custo, fricção e risco de privacidade |
| Backend (Fase 4) | Cloudflare Workers + D1 ou Supabase | Serverless, plano gratuito generoso |
| Modelo de pose | MediaPipe Pose Landmarker (Tasks API) | 33 keypoints 3D, maduro, otimizado pra mobile |
| Engine 2D | Phaser 3 | Madura, MIT, ótima pra endless runner |
| Linguagem | JavaScript (TypeScript a partir da Fase 1) | Padrão web, ecossistema enorme |
| Bundler | Vite | Build rápido, dev server com HMR |
| Estilo | CSS puro + variáveis (sem framework pesado) | Simplicidade, performance |
| Persistência local | IndexedDB via `idb-keyval` | Leve, padrão moderno |
| Deploy | Cloudflare Pages ou Vercel | Free tier, deploy via Git |

> **Nota para Claude Code:** verificar versões mais recentes das bibliotecas no momento da implementação. As versões abaixo são uma referência inicial — buscar o que estiver atual nas docs oficiais (https://ai.google.dev/edge/mediapipe e https://phaser.io).

### 2.2. Bibliotecas principais

- `@mediapipe/tasks-vision` — Pose Landmarker.
- `phaser` — engine de jogo.
- `idb-keyval` — wrapper simples sobre IndexedDB.
- `vite` — build/dev.
- `typescript` — a partir da Fase 1.

### 2.3. Estrutura de arquivos sugerida

```
exergame/
├─ public/
│  ├─ models/                  # modelos MediaPipe (cache local)
│  ├─ assets/                  # sprites, sons
│  └─ icons/                   # ícones PWA
├─ src/
│  ├─ pose/
│  │  ├─ poseDetector.ts       # wrapper sobre MediaPipe
│  │  ├─ smoother.ts           # filtro/média móvel sobre keypoints
│  │  ├─ calibration.ts        # baseline do corpo do jogador
│  │  └─ events.ts             # heurísticas → eventos (jump, duck, lane, etc.)
│  ├─ game/
│  │  ├─ scenes/               # cenas do Phaser (Boot, Calibration, Play, GameOver)
│  │  ├─ entities/             # player, obstáculos, coletáveis
│  │  ├─ systems/              # spawning, scoring, dificuldade
│  │  └─ config.ts
│  ├─ ui/
│  │  ├─ overlay.ts            # HUD, contador de combo, tutorial
│  │  └─ camera-preview.ts     # mini-preview da câmera com keypoints
│  ├─ storage/
│  │  └─ profile.ts            # perfil local (idade, recordes, configurações)
│  ├─ telemetry/               # opcional, anônimo, opt-in
│  ├─ main.ts
│  └─ index.html
├─ tests/
├─ vite.config.ts
├─ package.json
└─ README.md
```

### 2.4. Padrões de código

- **Pose layer separada do game layer.** A camada de pose emite eventos abstratos (`onJump`, `onDuck`, `onLaneChange`); o jogo nunca lê keypoints crus. Isso permite trocar o modelo de pose sem mexer no jogo, e até substituir por teclado para debug.
- **Bus de eventos central** entre as camadas (pode ser `EventEmitter` simples ou `mitt`).
- **Configuração centralizada** em `src/game/config.ts` para tudo que é tunável (thresholds, velocidades, cores).
- **Modo debug com keyboard fallback** desde a Fase 0: setas substituem movimento corporal, pra permitir desenvolvimento sem ficar pulando na frente do laptop.

### 2.5. Performance budget

- **30+ FPS** em iPhone SE 2020 e Android mid-range (Snapdragon 6xx ou superior).
- **Latência pose → ação no jogo:** menor que 100ms.
- **Tempo de boot até jogo jogável:** menor que 5 segundos em rede 4G.
- **Tamanho total inicial:** menor que 5 MB (modelo de pose + bundle).

---

## 3. Núcleo: Detecção de Movimento

Esta é a parte mais sensível do projeto. Ela é compartilhada por todas as fases.

### 3.1. Calibração

Antes de jogar, peça à criança para ficar **parada de pé, de frente, braços ao lado do corpo**, por ~2 segundos. Capture:

- `H_corpo` = distância vertical entre média dos olhos e média dos tornozelos.
- `Y_quadril_base` = posição vertical média do quadril.
- `X_centro_base` = posição horizontal média do quadril.
- `Largura_ombros` = distância horizontal entre ombros.

Todos os thresholds subsequentes são definidos como **fração de `H_corpo`**, não em pixels.

### 3.2. Suavização

Aplicar média móvel exponencial (EMA) sobre cada keypoint:

```
keypoint_suavizado[t] = α * keypoint_cru[t] + (1 - α) * keypoint_suavizado[t-1]
```

Com `α` ≈ 0.5 para começar (tunar empiricamente). Filtros mais sofisticados (Kalman) podem entrar na Fase 2 se houver tempo.

### 3.3. Heurísticas de eventos

| Evento | Detecção |
|---|---|
| **Jump (pular)** | `Y_quadril_atual` sobe acima de `Y_quadril_base − 0.10 * H_corpo` E está em movimento ascendente (derivada negativa em coordenadas de tela). Cooldown de 400ms. |
| **Duck (agachar)** | `Y_quadril_atual` desce abaixo de `Y_quadril_base + 0.15 * H_corpo` por pelo menos 200ms contínuos. |
| **Lane change esquerda/direita** | `X_centro_atual` desloca para fora de `X_centro_base ± 0.20 * Largura_ombros`. Estado discreto: lane −1, 0, +1. Histerese de 5% para evitar oscilação. |
| **Running cadence (correr no lugar)** | Alternância de `Y_joelho_esq` e `Y_joelho_dir` acima de `Y_quadril_base − 0.08 * H_corpo`. Conta passos por segundo. |
| **Jumping jack (polichinelo)** | Distância entre tornozelos > `1.5 * Largura_ombros` E ambos punhos acima do topo da cabeça, simultaneamente. |
| **Arms up (braços pra cima)** | Ambos punhos com `Y` acima de `Y_olhos`. |

### 3.4. Estados especiais

- **No body detected:** se nenhum corpo for detectado por 1.5s, pausa o jogo e mostra "Apareça pra câmera".
- **Multiple bodies:** o modelo já foca no mais proeminente, mas se a confiança baixar muito, pausa.
- **Low confidence:** se a confiança média dos keypoints relevantes cair abaixo de 0.6, mostra alerta de iluminação.

### 3.5. Fallback de teclado (modo debug)

Sempre presente, ativado por flag de URL `?debug=1`:

- Setas ←/→ = lane change
- Espaço = jump
- Seta ↓ = duck
- Tecla `J` = jumping jack
- Tecla `R` = toggle running cadence

---

## 4. FASE 0 — Prova de Conceito

> **Objetivo:** validar que detecção de pose + heurísticas de evento funcionam de forma confiável e com baixa latência no celular do filho do desenvolvedor. **Sem jogo ainda.**

### 4.1. Escopo

- Página HTML simples que abre a câmera.
- Carrega MediaPipe Pose Landmarker.
- Sobrepõe keypoints na imagem da câmera (debug visual).
- Implementa as 6 heurísticas da Seção 3.3.
- Mostra na tela um quadradinho colorido por evento detectado e um log de eventos.
- Tela de calibração inicial (3.1) com countdown.

### 4.2. Fora do escopo

- Sem motor de jogo.
- Sem sprites, sons, score.
- Sem persistência de dados.
- Sem PWA.

### 4.3. Tarefas

1. Setup de projeto Vite + TypeScript.
2. Página `index.html` com `<video>`, `<canvas>` overlay, painel de debug lateral.
3. Módulo `pose/poseDetector.ts` que inicializa MediaPipe, conecta com `getUserMedia` e expõe um stream de frames com keypoints.
4. Módulo `pose/smoother.ts` com EMA configurável.
5. Módulo `pose/calibration.ts`: tela de countdown 3-2-1, captura `H_corpo`, `Y_quadril_base`, `X_centro_base`, `Largura_ombros`.
6. Módulo `pose/events.ts` implementando todas as heurísticas da 3.3.
7. UI de debug: painel com FPS, confiança, valores de baseline, lane atual, log dos últimos 20 eventos com timestamp.
8. Botão "Recalibrar".

### 4.4. Critérios de aceitação

- [ ] Roda no Chrome/Safari de iPhone do desenvolvedor a 30+ FPS.
- [ ] Detecta jump, duck e lane change do filho do desenvolvedor com taxa de acerto subjetiva > 85%.
- [ ] Latência percebida entre movimento e indicador na tela < 150ms.
- [ ] Calibração funciona em diferentes alturas (criança e adulto sem mudar código).
- [ ] Não falha catastroficamente quando há baixa luz ou quando alguém entra no fundo.

### 4.5. Métricas a observar (anotação manual)

- FPS médio em 3 dispositivos diferentes.
- Quantos falsos positivos de jump em 1 minuto parado em pé.
- Quantos jumps reais o sistema perde em 20 tentativas.

### 4.6. Entregável

Um link compartilhável (Cloudflare Pages) que abre no celular e executa o protótipo.

---

## 5. FASE 1 — Endless Runner Mínimo

> **Objetivo:** transformar a PoC em jogo de verdade, com personagem, obstáculos e core loop funcional. Estilo Subway Surfers simplificado.

### 5.1. Escopo

- 3 lanes (esquerda, centro, direita).
- Personagem com animações básicas: correr, pular, deslizar, virar.
- Obstáculos que vêm da frente: barreira (pular), barreira baixa (deslizar), parede em uma das lanes (mudar de lane).
- Coletáveis: moedas espalhadas pelas lanes.
- Cenário com scroll infinito (textura ou tilemap).
- HUD básico: distância percorrida, moedas, FPS.
- Game over ao bater em obstáculo, com tela de "Tente de novo".
- Mini-preview da câmera no canto da tela (com bonequinho de keypoints), pra criança ver que está sendo "lida".

### 5.2. Fora do escopo

- Sem múltiplos personagens.
- Sem mundos diferentes (um cenário só).
- Sem música por enquanto (efeitos sonoros simples sim).
- Sem missões diárias, sem desbloqueáveis.

### 5.3. Tarefas

1. Adicionar Phaser 3 ao projeto.
2. Cena `Boot` que carrega assets.
3. Cena `Calibration` (refinamento da que veio da Fase 0, agora com arte minimamente decente).
4. Cena `Play`:
   - sistema de spawning de obstáculos por dificuldade crescente
   - sistema de scoring (distância + moedas)
   - sistema de detecção de colisão
   - reaproveita os eventos do `pose/events.ts`
5. Cena `GameOver` com botão "Jogar de novo" e "Recalibrar".
6. Sprites placeholder (pode usar formas geométricas coloridas — a arte vem depois).
7. Sons: pulo, moeda, colisão, game over (efeitos curtos, livres de licença, ex: Kenney.nl).
8. Tela de tutorial inicial mostrando os 3 movimentos com animação simples.

### 5.4. Decisões de game design

- **Velocidade inicial baixa.** Aumenta gradualmente a cada 30 segundos.
- **Obstáculos previsíveis no início.** Primeiros 20 segundos só têm barreiras de pular.
- **Lane change instantânea, não animada.** Mais responsiva. Animação é só o personagem inclinando.
- **Distância vence, não tempo.** Score em metros é mais palpável pra criança.
- **Cair = recomeçar imediatamente.** Sem tela de loading. Botão grande "Jogar de novo".

### 5.5. Critérios de aceitação

- [ ] Filho do desenvolvedor consegue jogar uma partida completa sem ajuda depois de 1 minuto de tutorial.
- [ ] Roda a 60 FPS no celular alvo (a 30 FPS aceita-se temporariamente).
- [ ] Funciona em retrato e paisagem (recomendado: paisagem, mas detectar e avisar).
- [ ] Game feel: jogador sente que controla o personagem (responsividade ok).
- [ ] Test session de 10 minutos sem crash, freeze ou drift de calibração.

### 5.6. Entregável

PWA jogável publicada com link curto. Versão 0.1. **Implementação base entregue 2026-04-26 (Issue #3, PR pendente). Validação humana CT01 reagendada para pós-merge.**

---

## 6. FASE 2 — Camada de Exercício Saudável

> **Objetivo:** transformar de "jogo divertido" em "jogo divertido que faz exercício de verdade". Aproximar do formato dos vídeos de exercício infantil que o filho assiste no YouTube.

### 6.1. Escopo novo

- **Cadência de corrida medida.** Personagem só avança se o jogador estiver correndo no lugar (ou andando no lugar, ajustável). Parou de correr → personagem desacelera.
- **Polichinelos como power-up.** Aparecem zonas no caminho onde precisa fazer X polichinelos para coletar bônus.
- **Braços pra cima como ataque/escudo.** Cria escudo temporário ou destrói obstáculo.
- **Música ritmada** durante a corrida; intensidade da música acompanha a velocidade.
- **Narrador motivador opcional.** Frases curtas pré-gravadas ("Boa! Continua!", "Cinco polichinelos! Manda ver!"). Pode ser TTS ou áudio gravado.
- **Resumo pós-partida:** "Você correu 1.250 metros, fez 23 polichinelos, pulou 47 obstáculos, seu coração trabalhou por 6 minutos." Visual divertido com mascote.
- **Missões diárias:** 3 missões simples renovadas a cada dia ("hoje: 100 polichinelos no total, 500m em uma corrida só, coletar 50 moedas").
- **Modo "intervalo da água"** automático a cada 8 minutos: pausa de 30 segundos com animação fofa e contagem regressiva.

### 6.2. Fora do escopo

- Sem integração com smartwatch ainda.
- Sem login/conta.
- Sem leaderboard.
- Sem multiplayer.

### 6.3. Tarefas

1. Adicionar contador de cadência no `pose/events.ts`. Expor BPM/passos por segundo.
2. Sistema de "energia de corrida" no jogo: barra que enche com cadência e esvazia com inatividade. Personagem desacelera quando a barra esvazia.
3. Sistema de zonas especiais (polichinelo, braços pra cima).
4. Sistema de missões: definição em JSON, persistência em IndexedDB, reset diário.
5. Tela de resumo pós-partida com gráficos simples (Chart.js ou SVG manual).
6. Camada de áudio: música em loop, ducking quando narrador fala, efeitos.
7. Sistema de pause automático ("intervalo da água").
8. Configurações: volume, idade da criança (afeta dificuldade base e duração antes do intervalo), idioma do narrador.

### 6.4. Critérios de aceitação

- [ ] Filho do desenvolvedor joga 15 minutos seguidos sem ficar entediado.
- [ ] No final, a criança está fisicamente cansada (suor, respiração mais forte).
- [ ] Resumo pós-partida desperta vontade de jogar de novo.
- [ ] Cadência detectada corresponde subjetivamente à intensidade percebida.
- [ ] Missões parecem alcançáveis mas não triviais.

### 6.5. Entregável

Versão 0.5 — primeira versão "completa" no sentido de que cumpre o propósito original do projeto. **Implementação base entregue 2026-04-27 (Issue #4, PR pendente). Validação humana CT01 reagendada para pós-merge.**

---

## 7. FASE 3 — Conteúdo e Progressão

> **Objetivo:** dar motivos pra voltar todo dia. Variedade visual, customização, progressão de longo prazo.

### 7.1. Escopo novo

- **Múltiplos personagens** desbloqueáveis com moedas. 3-5 inicialmente.
- **Múltiplos mundos:** cidade, floresta, espaço, oceano, deserto. Cada um com paleta, obstáculos e coletáveis temáticos.
- **Sistema de níveis** com XP por partida.
- **Avatar customizável:** chapéu, mochila, trilha de partículas. Comprado com moedas.
- **Modos de jogo:**
  - **Corrida livre** (o atual): endless.
  - **Cardio guiado:** sequência fixa de exercícios, estilo "siga o personagem treinador" (puxa do estilo dos vídeos do YouTube).
  - **Desafio diário:** mapa fixo do dia, mesmo pra todos os jogadores, com recorde local.
- **Modo dois jogadores local** (mesma câmera, dois corpos detectados, lanes separadas em duas metades da tela). Fica natural se a criança quiser jogar com pai/mãe/irmão.
- **Conquistas/badges.**

### 7.2. Tarefas técnicas relevantes

1. Refator do sistema de cenários para suportar temas plugáveis (config JSON + assets).
2. Sistema de inventário e loja in-game (moedas locais, sem dinheiro real).
3. Refator do `poseDetector.ts` para suportar 2 corpos simultâneos no modo dois jogadores. MediaPipe Pose padrão é single-person; pode ser necessário trocar para um modelo multi-person (YOLO-pose ou MediaPipe Holistic com múltiplas instâncias) — investigar.
4. Sistema de progressão e save robusto (versionar schema do save).
5. Tela de seleção de modo, mundo, personagem.
6. Conteúdo: arte minimamente coerente (pode contratar um ilustrador freelancer ou usar pacotes como Kenney/itch.io).

### 7.3. Decisões de design abertas

- A loja deve funcionar puramente com moedas in-game (sem microtransações)? **Sim, durante a Fase 3.**
- Quanto de XP por partida? Tunar com testes.
- Modo dois jogadores divide tela ou compartilha lanes? **Investigar; provavelmente divide tela.**

### 7.4. Critérios de aceitação

- [ ] 5+ partidas seguidas sem repetição visual cansativa.
- [ ] Criança verbaliza desejo específico ("quero o chapéu de pirata!") — sinal de engajamento com progressão.
- [ ] Modo cardio guiado parece um vídeo de YouTube interativo.
- [ ] Modo dois jogadores funciona com criança e adulto na mesma câmera.

### 7.5. Entregável

Versão 1.0. Esse é o ponto onde o produto pode ser compartilhado mais amplamente (família, amigos, escola do filho).

---

## 8. FASE 4 — Plataforma e Backend Mínimo

> **Objetivo:** tirar do "jogo no celular do filho" e virar plataforma com presença persistente, social e potencial educacional. Aqui entra backend pela primeira vez.

### 8.1. Escopo novo

- **Conta de usuário opcional.** Email/senha simples, ou OAuth (Google). Login não é obrigatório para jogar — o jogo continua funcionando offline.
- **Sync entre dispositivos.** Recordes, progresso, customização sincronizam.
- **Leaderboard de família.** Grupos privados com convite por link.
- **Modo escola/professor:**
  - Conta de professor cria turma.
  - Alunos entram com código.
  - Professor vê painel agregado (anônimo se quiser): minutos de atividade da turma, exercícios mais feitos, distribuição de esforço.
  - Professor pode propor desafio da semana.
- **Conteúdo dinâmico via CMS.** Novos mundos, missões e desafios diários sem republicar o app.
- **Telemetria opt-in anônima** para entender uso real e melhorar o jogo.
- **App nativo (opcional)** — wrapper Capacitor sobre o PWA para listar nas lojas, se fizer sentido.

### 8.2. Backend — escolha e arquitetura

**Opção recomendada inicial:** **Supabase**.
- Auth pronto.
- Postgres + Row Level Security cobre o modelo de turma/professor/aluno bem.
- Realtime (caso queira leaderboard ao vivo).
- Storage para avatares ou áudios customizados.
- Plano gratuito generoso.

**Alternativa enxuta:** **Cloudflare Workers + D1 + R2**. Mais barato em escala, mais trabalho de implementação.

#### Modelo de dados mínimo

- `users` — id, email, nome de exibição, idade aproximada (faixa), idioma.
- `profiles` — id, user_id, avatar_config, total_xp, level.
- `runs` — id, user_id, started_at, duration_s, distance_m, jumps, ducks, jacks, mode, world.
- `daily_missions` — id, user_id, date, mission_id, progress, completed.
- `groups` — id, name, type (family/class), invite_code, owner_id.
- `group_members` — group_id, user_id, role (owner/member/student/teacher).
- `leaderboard_entries` — group_id, user_id, period (daily/weekly/all), metric, value.

### 8.3. Privacidade e LGPD (atenção redobrada — produto infantil)

- **Consentimento explícito dos pais** para criação de conta de menor.
- **Minimização de dados.** Não pedir mais do que necessário. Não coletar localização, não coletar contatos.
- **Frames de câmera permanecem locais.** Reforçar isso no consentimento e na arquitetura.
- **Dados telemétricos opt-in,** anonimizados, agregados.
- **Direito ao esquecimento** funcional desde o dia 1: botão "Apagar minha conta e meus dados" que apaga de verdade.
- **Aviso de privacidade infantil** redigido em linguagem acessível também para crianças.
- **Termo separado para professores** com responsabilidades sobre dados de alunos menores.

### 8.4. Tarefas

1. Setup do Supabase (ou alternativa).
2. Modelagem do banco com RLS por papel.
3. Endpoint de sync (POST `/runs` ao final de cada partida; GET `/profile`).
4. Auth flow no cliente, mantendo o jogo jogável sem login.
5. Tela de "Convide a família" com link mágico.
6. Painel do professor (web, separado do jogo).
7. CMS leve para conteúdo (pode ser apenas tabelas Supabase com interface admin).
8. Política de privacidade, ToS, fluxo de consentimento parental.
9. Wrapper Capacitor (opcional).

### 8.5. Critérios de aceitação

- [ ] Sync funciona entre celular e tablet do mesmo usuário.
- [ ] Família com 4 membros consegue ver leaderboard correto.
- [ ] Professor de escola consegue criar turma, alunos entram, painel mostra dados.
- [ ] Auditoria de privacidade interna passa (sem dados desnecessários, com fluxo de delete).
- [ ] Custo mensal de infra menor que R$ 50 com até 1.000 usuários ativos.

### 8.6. Entregável

Versão 2.0. Produto.

---

## 9. Considerações Transversais

### 9.1. Acessibilidade infantil

- Texto grande, ícones grandes, botões grandes.
- Linguagem simples, leitura fácil. Pictogramas onde possível.
- Modo "leitor de instruções por voz" para pré-alfabetizados.
- Daltonismo: nunca usar só cor para sinalizar (sempre cor + forma + texto).
- Contraste mínimo 4.5:1.

### 9.2. Segurança física do jogador

- Tela de "Limpe a área" antes de iniciar, com checklist visual.
- Detecção de proximidade excessiva da câmera (bounding box muito grande): "Afaste-se um pouco".
- Pausa automática se o jogador sair do enquadramento.
- Modo "espaço pequeno" que reduz movimentos exigidos (sem polichinelo, ducks suaves) — fundamental para apartamentos.

### 9.3. Privacidade e conformidade

- LGPD (Brasil) e, se houver intenção de vender fora, GDPR-K (UE) e COPPA (EUA).
- DPO ou figura equivalente quando virar produto comercial.
- Política de retenção de dados curta por padrão.
- Logs sem PII.

### 9.4. Testes

- **Devices alvo:** iPhone SE 2020, iPhone 13, Galaxy A54, Xiaomi Redmi mid-range, MacBook Air M1, notebook Windows com webcam comum.
- **Iluminações:** sala normal (dia), sala normal (noite com luz acesa), sala com contraluz (janela atrás), sala com pouca luz.
- **Roupas:** roupa colada, roupa larga, com casaco, com chapéu.
- **Idades:** mínimo 5 anos, máximo 12 anos (alvo). Testar também com adulto para validar adaptabilidade.
- **Espaços:** quarto pequeno, sala média, espaço amplo.

### 9.5. Performance e bateria

- Reduzir resolução do vídeo de entrada para o modelo (480p costuma ser suficiente).
- Pause completo do modelo quando o jogo está pausado.
- Avisar quando o device está esquentando demais (Battery Status API onde disponível).

### 9.6. Tom e marca

- Visual lúdico, colorido, mas não infantilizado a ponto de afastar criança de 10-12.
- Mascote único reconhecível.
- Reforço positivo, nunca punitivo. Game over é "tenta de novo!", não "você falhou".

---

## 10. Apêndices

### 10.1. Projetos open-source de referência

| Projeto | URL | Para quê |
|---|---|---|
| MediaPipe (Google) | https://github.com/google-ai-edge/mediapipe | Biblioteca de pose |
| MediaPipe Tasks Vision (web) | https://www.npmjs.com/package/@mediapipe/tasks-vision | API JS do MediaPipe |
| Phaser 3 | https://github.com/phaserjs/phaser | Engine 2D |
| Endless-Game-automation-using-mediapipe | https://github.com/AdityaWadkar/Endless-Game-automation-using-mediapipe | Heurísticas de pose para Subway/Temple Run |
| SUcy6/mediapipe-game | https://github.com/SUcy6/mediapipe-game | Coleção de mini-jogos |
| yakupzengin/fitness-trainer-pose-estimation | https://github.com/yakupzengin/fitness-trainer-pose-estimation | Contagem de repetições |
| yo-WASSUP/Good-GYM | https://github.com/yo-WASSUP/Good-GYM | Assistente de exercícios |
| Kenney.nl | https://kenney.nl/assets | Sprites e sons CC0 |
| InteractiveEdu (UTFPR-BR) | https://arxiv.org/pdf/2503.15523 | Inspiração acadêmica brasileira |

### 10.2. Decisões em aberto

1. **Linguagem do jogo:** começar só PT-BR ou já preparar i18n? *Sugestão: i18n desde o começo, com um único locale ativo.*
2. **Tipografia:** fonte custom ou system fonts? *Sugestão: system fonts até a Fase 3.*
3. **Telemetria:** Plausible, PostHog ou rolar simples? *Decidir na Fase 4.*
4. **Multi-pessoa:** trocar de modelo na Fase 3 ou implementar gambiarra com duas instâncias do MediaPipe? *Investigar.*
5. **Versão nativa:** Capacitor ou esperar React Native depois? *Decidir na Fase 4 com base em métricas reais.*

### 10.3. Glossário rápido

- **Endless runner:** gênero de jogo onde o personagem corre infinitamente e o jogador apenas desvia/coleta.
- **Pose estimation:** detecção dos pontos articulados do corpo (joelhos, ombros, etc.) a partir de imagem.
- **Keypoint:** um ponto detectado (ex.: ombro esquerdo).
- **EMA:** Exponential Moving Average — filtro de suavização simples.
- **PWA:** Progressive Web App — site instalável como app, sem precisar de loja.
- **RLS:** Row Level Security — controle de acesso por linha no banco (Postgres).
- **Game feel:** sensação subjetiva de controle e responsividade do jogo.
- **Histerese:** zona morta entre estados para evitar oscilação.

### 10.4. Próximos passos imediatos sugeridos

1. Criar o repositório.
2. Implementar Fase 0 conforme Seção 4. Estimativa: 1 fim de semana.
3. Testar com o filho, anotar observações em um log.
4. Iterar nas heurísticas da Seção 3.3 antes de seguir para Fase 1.
5. Só então avançar.

---

*Fim do documento. Versão para refinamento via Claude Code.*
