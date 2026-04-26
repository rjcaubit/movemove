# Especificação — Fase 0: PoC de detecção de pose

**Issue:** #2
**Data:** 2026-04-26
**Status:** Aguardando implementação
**Baseado em:** `01-research.md` (este diretório), `00-design.md` (este diretório), `docs/sdd/ISSUE_1/00-design.md` (study), `EXERGAME_PROJETO.md` Seções 3 e 4

---

## Objetivo

Entregar uma página HTML solta (Vite + TS + `@mediapipe/tasks-vision`) que abre câmera, detecta pose, executa as 6 heurísticas de evento da Seção 3.3 e mostra um painel de debug — pra validar empiricamente que o coração da arquitetura proposta funciona no celular do filho do desenvolvedor antes de investir na Fase 1 (jogo).

---

## Requisitos Funcionais

- [ ] **RF01** — Aplicação carrega no Chrome/Safari mobile via link público (Cloudflare Pages) com tela inicial mostrando botão "Ligar câmera" (gesto explícito antes de `getUserMedia`).
- [ ] **RF02** — Ao clicar "Ligar câmera", solicita permissão e exibe stream de vídeo da câmera frontal em 480p (`facingMode: "user"`, ideal 854×480).
- [ ] **RF03** — Após permitir câmera, app baixa `pose_landmarker_lite.task` (~3MB) com tela de "Carregando detector de movimento" e barra de progresso (ou indicador indeterminado).
- [ ] **RF04** — Tela de calibração: countdown visual 3-2-1, instrução em PT-BR "Fique parado, de frente, braços ao lado do corpo", captura de baselines durante 2s contínuos com confiança média ≥ 0.6: `H_corpo`, `Y_quadril_base`, `X_centro_base`, `Largura_ombros` (Seção 3.1 do doc base).
- [ ] **RF05** — Após calibrar, exibe vídeo + sobreposição de keypoints (33 pontos do MediaPipe) desenhados em canvas overlay (cor + raio configurável).
- [ ] **RF06** — Em paralelo, executa as 6 heurísticas da Seção 3.3 sobre keypoints suavizados (EMA α=0.5):
  - **jump** — `Y_quadril_atual` < `Y_quadril_base − 0.10*H_corpo` E em movimento ascendente (Δy negativo). Cooldown 400ms.
  - **duck** — `Y_quadril_atual` > `Y_quadril_base + 0.15*H_corpo` por ≥ 200ms contínuos.
  - **lane_change** — `X_centro` fora de `X_centro_base ± 0.20*Largura_ombros`. Estado discreto −1 / 0 / +1. Histerese 5%.
  - **cadence** — alternância `Y_joelho_esq`/`Y_joelho_dir` < `Y_quadril_base − 0.08*H_corpo`. BPM/passos por segundo.
  - **jumping_jack** — distância tornozelos > 1.5×Largura_ombros E ambos punhos com `Y < Y_topo_cabeça`.
  - **arms_up** — ambos punhos com `Y < Y_olhos`.
- [ ] **RF07** — Quando uma heurística dispara, indicador visual (quadrado colorido distinto por tipo) pisca por 500ms na sobreposição.
- [ ] **RF08** — Painel de debug (toggle no canto superior direito) mostra:
  - FPS médio (janela de 1s)
  - Confiança média dos keypoints relevantes (visibility/presence)
  - Valores correntes de baseline (H_corpo, Y_quadril_base, X_centro_base, Largura_ombros)
  - Lane atual (−1/0/+1)
  - Cadência atual (passos/segundo)
  - Log dos últimos 20 eventos com timestamp HH:MM:SS.mmm
- [ ] **RF09** — Botão "Recalibrar" sempre visível durante uso normal — limpa baselines e volta pra tela de calibração.
- [ ] **RF10** — Estados especiais (Seção 3.4):
  - **No body** — se nenhum keypoint detectado por 1.5s contínuos, pausa detecção e exibe "Apareça pra câmera".
  - **Low confidence** — se confiança média < 0.6 por 3s contínuos, exibe banner amarelo "Iluminação fraca — chegue mais perto da janela".
  - **Auto-sugestão de recalibração** — se confiança média < 0.6 por 10s contínuos, exibe banner "Sua calibração pode estar errada. Recalibrar?" com botão direto.
- [ ] **RF11** — Modo debug `?debug=1` ativa keyboard fallback (Seção 3.5):
  - Setas ←/→ = lane change −1 / +1
  - Espaço = jump
  - Seta ↓ = duck
  - Tecla `J` = jumping jack
  - Tecla `R` = toggle running cadence on/off (cadência fixa 2.5 passos/s quando on)
  - Eventos disparados via teclado aparecem no painel debug com prefixo `[KBD]`.
- [ ] **RF12** — Erros tratados com mensagens em PT-BR acionáveis:
  - Câmera negada → "Você precisa permitir a câmera. Clique no cadeado ↗︎ na barra do navegador."
  - Câmera não disponível → "Não encontramos câmera. Conecte uma webcam ou abra no celular."
  - Falha download modelo → "Não conseguimos baixar o detector. Verifique sua internet e tente de novo." + botão Tentar de novo.

---

## Requisitos Não-Funcionais

- [ ] **RNF01** — **Performance — FPS ≥ 30** no Chrome/Safari de iPhone SE 2020 com `pose_landmarker_lite` em 480p (Seção 4.4 do doc base; aceita-se 24 FPS como mínimo absoluto com aviso visual).
- [ ] **RNF02** — **Latência percebida < 150ms** entre movimento real do jogador e indicador visual do evento na tela.
- [ ] **RNF03** — **Boot até calibração jogável < 8s** em rede 4G real (modelo + bundle); meta < 5s, aceitável < 8s na primeira visita; < 2s em revisita (cache do navegador).
- [ ] **RNF04** — **Bundle inicial < 5MB total** (modelo + JS/CSS + assets), medido via `vite build` e `ls -lh dist/`.
- [ ] **RNF05** — **Privacidade** — `getUserMedia` chamado **apenas em resposta a clique** do usuário; nenhum frame de vídeo sai do dispositivo; nenhuma chamada de rede fora do download inicial do modelo (servido do mesmo origin).
- [ ] **RNF06** — **Sem PWA standalone** — sem `manifest.json` `display: standalone`, sem service worker registrando rotas; abrir como página normal pra evitar bug WebKit (risco crítico do study).
- [ ] **RNF07** — **Acessibilidade básica** — botões com `aria-label`, contraste mínimo 4.5:1, foco visível, instruções em PT-BR claras pra criança/leitor pré-alfabetizado (texto curto + pictograma onde possível).
- [ ] **RNF08** — **Responsivo** — funciona em retrato e paisagem; canvas e painel se adaptam a `videoWidth`/`videoHeight` reais.
- [ ] **RNF09** — **Robustez** — não quebra em baixa luz; degrada visualmente (banner) sem travar.
- [ ] **RNF10** — **Sem dependência de rede após primeiro carregamento** — uma vez que o modelo está em cache, app deve funcionar offline (browser mantém dist/ + modelo).

---

## Modelo de Dados

**Não aplicável.** Esta fase não persiste nada (sem IndexedDB, sem localStorage, sem cookies, sem backend). Todo estado é em memória durante a sessão. Recalibração reseta. Refresh = começa do zero.

---

## API

**Não aplicável.** Não há backend nesta fase. As únicas chamadas de rede são:

| Método | URL | Quando | Resposta esperada |
|--------|-----|--------|-------------------|
| GET | `/models/pose_landmarker_lite.task` | Boot, após "Ligar câmera" | binário ~3MB do modelo, `Content-Type: application/octet-stream` |
| GET | `/wasm/vision_wasm_internal.{wasm,js}` | Inicialização do MediaPipe | runtime WASM SIMD do `@mediapipe/tasks-vision` (servido do bundle) |

Ambas devem ser servidas do mesmo origin que a página (Cloudflare Pages); nenhuma chamada externa.

---

## Frontend — páginas e componentes

### Páginas a criar
| Arquivo | Descrição | "Rota" |
|---------|-----------|--------|
| `index.html` | Single-page app (sem rotas; estados internos) | `/` |

### Telas (estados da página)
| Estado | Descrição | Disparada por |
|--------|-----------|---------------|
| `Welcome` | Botão "Ligar câmera" + 1 parágrafo de explicação | Boot |
| `Loading` | "Carregando detector de movimento…" + barra | Pós-clique, durante download |
| `Calibration` | Vídeo + countdown 3-2-1 + instrução de pose | Pós-load OK |
| `Active` | Vídeo + overlay keypoints + indicadores de evento + painel debug toggle | Pós-calibração OK |
| `Error` | Mensagem PT-BR acionável + botão Tentar de novo | Falha em qualquer passo |
| `NoBody` | Overlay "Apareça pra câmera" | 1.5s sem keypoints |

### Componentes (módulos TS, sem framework de UI)
| Arquivo | Propósito |
|---------|-----------|
| `src/main.ts` | Orquestração: boot → estado → render |
| `src/ui/welcomeScreen.ts` | Tela inicial com botão "Ligar câmera" |
| `src/ui/loadingScreen.ts` | Tela de carregamento do modelo |
| `src/ui/calibrationScreen.ts` | Countdown 3-2-1 + captura |
| `src/ui/debugPanel.ts` | Painel lateral toggle (FPS, confiança, baselines, lane, cadência, log) |
| `src/ui/eventOverlay.ts` | Quadrado colorido por evento detectado (500ms) |
| `src/ui/keypointOverlay.ts` | Render de 33 keypoints sobre o vídeo |
| `src/ui/errorScreen.ts` | Tela de erro acionável com retry |
| `src/ui/noBodyScreen.ts` | Overlay "Apareça pra câmera" |
| `src/pose/poseDetector.ts` | Wrapper MediaPipe Tasks Vision + getUserMedia + frame loop |
| `src/pose/smoother.ts` | EMA configurável por keypoint |
| `src/pose/calibration.ts` | Captura de baselines durante 2s |
| `src/pose/events.ts` | 6 heurísticas + bus de eventos (EventTarget) |
| `src/pose/types.ts` | `Keypoint`, `Baseline`, `GameEvent`, `Lane`, etc |
| `src/pose/config.ts` | Thresholds (frações de H_corpo) e cooldowns |
| `src/debug/keyboard.ts` | Fallback de teclado (`?debug=1`) |
| `src/i18n/strings.ts` | Strings PT-BR centralizadas |
| `src/styles.css` | Layout + estados visuais |

### Componentes reutilizados
**Nenhum** — projeto greenfield, primeiro código.

---

## AI Service

**Não aplicável** nesta fase. MediaPipe roda 100% no cliente; sem agente IA serverside. Mantém princípio 1.3.1 do doc base (privacidade primeiro).

---

## Cenários de Teste (OBRIGATÓRIOS)

### Como decidir se UI = sim
Esta issue **cria página HTML nova** + componentes de UI dedicados → **UI = SIM**. Logo, CT de E2E click-by-click obrigatório (CT06 abaixo).

### CT01: Fluxo principal (manual humano — pose real do filho do dev)
```
DADO QUE o dev abre o link público (Cloudflare Pages) no Chrome do iPhone do filho
QUANDO clicar "Ligar câmera" e permitir
ENTÃO modelo carrega em < 8s
E QUANDO ficar parado em pé, frente pra câmera, braços ao lado, durante 2s do countdown
ENTÃO calibração captura baselines com sucesso
E ENTRA no estado Active com keypoints visíveis sobrepostos no vídeo
E QUANDO o filho pular, agachar, mover lateralmente
ENTÃO os indicadores correspondentes (jump/duck/lane) piscam na tela
E o log do painel debug registra os eventos com timestamp
```
**Critério de aceitação numérico (Seção 4.4 + 4.5 do doc base):**
- FPS médio ≥ 30 (medido pelo painel debug)
- Acerto subjetivo > 85% pra jump/duck/lane (em 20 tentativas, no máximo 3 perdas)
- Latência percebida < 150ms (julgamento subjetivo do dev)
- Falsos positivos de jump em 1 min parado em pé: ≤ 2

### CT02: Câmera negada
```
DADO QUE o usuário clicou "Ligar câmera"
E negou a permissão no prompt do navegador
ENTÃO app exibe Error screen com mensagem PT-BR:
  "Você precisa permitir a câmera. Clique no cadeado ↗︎ na barra do navegador."
E botão "Tentar de novo" reabre o prompt
```

### CT03: Falha de download do modelo
```
DADO QUE conexão cai depois de "Ligar câmera"
QUANDO `pose_landmarker_lite.task` falha com erro de rede
ENTÃO app exibe Error screen:
  "Não conseguimos baixar o detector. Verifique sua internet e tente de novo."
E botão "Tentar de novo" repete o fetch
```

### CT04: Modo debug — keyboard fallback
```
DADO QUE app está rodando em ?debug=1 num desktop com teclado
QUANDO usuário pressiona Espaço
ENTÃO indicador de jump pisca + log debug mostra "[KBD] jump"
QUANDO usuário pressiona ←
ENTÃO indicador de lane=−1 pisca + log debug mostra "[KBD] lane=-1"
QUANDO usuário pressiona ↓
ENTÃO indicador de duck pisca
QUANDO usuário pressiona J
ENTÃO indicador de jumping_jack pisca
QUANDO usuário pressiona R
ENTÃO contador de cadência alterna entre 0 e 2.5 passos/s no painel debug
```

### CT05: Estados degradados
```
CASO A: nenhum corpo
  DADO QUE app está em estado Active
  QUANDO ninguém aparece na câmera por > 1.5s
  ENTÃO overlay "Apareça pra câmera" aparece
  E QUANDO alguém volta ao quadro, overlay some

CASO B: iluminação fraca
  DADO QUE confiança média dos keypoints < 0.6 por > 3s
  QUANDO o estado persiste
  ENTÃO banner amarelo "Iluminação fraca — chegue mais perto da janela" aparece

CASO C: drift de calibração
  DADO QUE confiança média < 0.6 por > 10s
  ENTÃO banner "Sua calibração pode estar errada. Recalibrar?" aparece com botão
  E QUANDO o usuário clica, volta pra tela de calibração
```

### CT06: E2E click-by-click [E2E click-by-click] — adaptado pra contexto sem câmera real

**Pré-condições:** stack local rodando (`npm run dev`); navegador com flag `?debug=1` e mock de getUserMedia (ou Chrome com `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`).

**Sequência (executar via Playwright direto, não via agent-browser que é ferramenta de projeto maduro):**

1. Navegar pra `http://localhost:5173/?debug=1`
2. Verificar que `Welcome` screen renderiza com botão "Ligar câmera" e parágrafo explicativo.
3. Clicar "Ligar câmera"
4. Verificar transição pra `Loading` screen com texto "Carregando detector de movimento…"
5. Aguardar até `Calibration` screen aparecer (timeout 30s pra primeira visita)
6. Verificar countdown 3-2-1 visível
7. Aguardar transição pra `Active` (com fake camera, calibração pode falhar — esperar pelo menos a tela de erro acionável OU active screen)
8. Em modo `?debug=1` com keyboard fallback, simular pressionar `Space` → verificar indicador de jump pisca
9. Simular `ArrowLeft` → indicador lane=−1
10. Simular `ArrowDown` → indicador duck
11. Toggle painel debug: clicar no botão de toggle → painel aparece com log do `[KBD]`
12. Clicar "Recalibrar" → volta pra `Calibration`
13. Pressionar Esc/voltar → app não quebra; estado consistente.

**Saída obrigatória:**
- Screenshots numerados em `load-tests/results/issue-2-journey/screenshots/`
- `load-tests/results/issue-2-journey/README.md` listando passos executados, browser/device, FPS observado quando rodado em hardware real, bugs detectados.

**Critério de aceitação:**
- Zero botão silencioso (todos com handler).
- Zero estado quebrado quando passa por todos os caminhos.
- Pelo menos uma execução em **dispositivo real do filho do dev** documentada no README com screenshot final do painel debug.

---

## Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Vite vanilla-ts (sem framework UI) | Fase 0 não precisa de React/Vue; menos dependências, bundle menor, menos magia. Phaser entra na Fase 1 |
| `EventTarget` nativo como bus | Zero deps; `mitt` (Seção 2.4 do doc base) entra na Fase 1 quando houver mais consumidores |
| Keypoints crus encapsulados em `pose/` | Disciplina arquitetural ADR-3 (futuro swap MoveNet) — paga desde dia 1 |
| Modelo servido do `public/models/` | Mesmo origin, evita CORS, controle de versão |
| Sem testes unitários nesta fase | PoC empírica; validação é manual via marcos da Seção 4.4. Testes vêm a partir da Fase 1 quando há código a regredir |
| Sem CI/CD pipeline ainda | Deploy é via push manual no Cloudflare Pages; pipeline entra na Fase 1 |
| Painel debug é toggle, não fixo | Mobile precisa de área de vídeo grande; debug é "puxar como cortina" |
| Cor por evento: jump=verde, duck=azul, lane(-1)=laranja, lane(+1)=roxo, jack=amarelo, arms_up=rosa | Distinção visual rápida; daltonismo OK pois nunca depende só da cor (texto também aparece) |

---

## Fora do Escopo

- Nenhuma persistência (IndexedDB, cookies, localStorage).
- Nenhum motor de jogo (Phaser entra na Fase 1).
- Nenhum sprite/personagem/cenário/sound/score.
- Nenhuma UI gamificada (loja, missões, conquistas).
- Nenhum login, conta, sync, leaderboard.
- Nenhum service worker / PWA standalone.
- Nenhum suporte a multi-pessoa (ADR-3 entra na Fase 3).
- Nenhuma integração com `@lingui/core` (ADR-1 entra na Fase 2).
- Nenhuma bitmap font dentro de canvas (ADR-2 entra na Fase 1 com Phaser).
- Nenhum filtro além de EMA (One Euro Filter entra na Fase 2 se necessário; Kalman descartado pelo ADR-5).

---

## Docs canônicas a atualizar (após implementação)

- [x] `/docs/CODEMAP.md` — **criar inicial** (greenfield; primeira issue de código)
- [x] `/docs/ARCHITECTURE.md` — criar resumo curto: pose layer × event bus × UI states
- [ ] `/docs/MODULES.md` — adicionar (não existe ainda; criar quando Fase 1 introduzir módulos múltiplos)
- [ ] `/docs/MODULO_{NOME}.md` — não aplicável nesta fase
- [ ] `/docs/database-documentation.md` — não aplicável (sem persistência)
- [ ] `/docs/database-schema-reference.md` — não aplicável
- [x] `/docs/CHANGELOG.md` — criar com primeira entrada "Fase 0 — PoC de detecção de pose"
- [x] `EXERGAME_PROJETO.md` Seção 4.5 — anexar logs de métricas medidas (FPS por device, falsos positivos)
