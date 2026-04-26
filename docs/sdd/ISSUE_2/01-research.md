# Pesquisa — Fase 0: PoC de detecção de pose

**Issue:** #2
**Data:** 2026-04-26
**Tipo:** feature (greenfield)
**Baseado em:** `00-design.md` (este diretório) + `docs/sdd/ISSUE_1/00-design.md` (study transversal) + `EXERGAME_PROJETO.md` Seção 3 e 4

---

## Contexto da adaptação

Esta é a **primeira issue de código** do repositório. Não existe `docs/CODEMAP.md`, `docs/MODULES.md`, `prisma/schema.prisma`, backend, frontend, AI service ou qualquer artefato canônico — o repositório só contém o doc-base e os designs SDD.

Implicação direta: **dependency analysis é trivial** ("projeto greenfield, criar tudo do zero, sem reuso interno"). A análise abaixo foca em **dependências externas** (pacotes npm) e **decisões transversais já fechadas** no study #1.

---

## Problema / Necessidade

Validar empiricamente, **antes** de gastar uma linha de código de jogo (Fase 1+), que o coração da arquitetura proposta funciona no celular do filho do desenvolvedor:

1. MediaPipe Tasks Vision Pose Landmarker (modelo `lite`) carrega em <5s, executa a 30+ FPS num iPhone SE 2020 ou Android mid-range, em 480p.
2. As 6 heurísticas de evento da Seção 3.3 do `EXERGAME_PROJETO.md` (jump, duck, lane change, running cadence, jumping jack, arms up) detectam movimento real com taxa de acerto subjetiva >85%.
3. Latência percebida do movimento até o indicador na tela < 150ms.
4. Calibração por proporção (`H_corpo`) funciona pra criança e adulto sem mudar código.
5. iOS PWA + getUserMedia (risco crítico do study) fica controlado — testar em modo browser (não home-screen) pra evitar re-prompts.

Se algum desses falhar, **o `EXERGAME_PROJETO.md` precisa de plano B** antes da Fase 1 começar. Por isso a Fase 0 é deliberadamente isolada (sem motor de jogo) e descartável.

---

## Análise de Dependências

### O que já existe e reuso (fonte: artefatos SDD + repo)

| Item | Localização | Como uso |
|------|-------------|----------|
| `EXERGAME_PROJETO.md` Seção 3.1 | repo root | Algoritmo de calibração (H_corpo, Y_quadril_base, X_centro_base, Largura_ombros) — implementação literal |
| `EXERGAME_PROJETO.md` Seção 3.2 | repo root | Fórmula EMA (`α * cru[t] + (1-α) * suavizado[t-1]`) — implementação literal |
| `EXERGAME_PROJETO.md` Seção 3.3 | repo root | 6 heurísticas com thresholds em fração de H_corpo — copia-cola das fórmulas |
| `EXERGAME_PROJETO.md` Seção 3.4 | repo root | Estados especiais (no body / multiple bodies / low confidence) — implementação literal |
| `EXERGAME_PROJETO.md` Seção 3.5 | repo root | Mapeamento keyboard fallback debug (←→↓ / espaço / J / R) |
| `docs/sdd/ISSUE_1/00-design.md` ADR-5 | study | Filtro = EMA α=0.5 ponto de partida (Kalman descartado) |
| `docs/sdd/ISSUE_1/00-design.md` Pesquisa externa | study | Modelo MediaPipe = `pose_landmarker_lite.task` (~3MB), 480p |
| `docs/sdd/ISSUE_1/00-design.md` Risco iOS | study | NÃO usar `display: standalone` — sem manifest PWA nesta fase |

### O que preciso criar (porque projeto é greenfield)

| Item | Tipo | Onde viverá | Por que não reuso nada |
|------|------|-------------|------------------------|
| Setup do projeto | tooling | `package.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore` | Repo vazio, primeiro commit |
| `index.html` | HTML | repo root (Vite default) | Não há entry point ainda |
| `src/main.ts` | TS entry | `src/main.ts` | — |
| `src/styles.css` | CSS | `src/styles.css` | — |
| `src/pose/poseDetector.ts` | módulo TS | `src/pose/` | Wrapper sobre MediaPipe + getUserMedia |
| `src/pose/smoother.ts` | módulo TS | `src/pose/` | EMA configurável |
| `src/pose/calibration.ts` | módulo TS | `src/pose/` | Captura de baselines |
| `src/pose/events.ts` | módulo TS | `src/pose/` | 6 heurísticas + bus de eventos |
| `src/pose/types.ts` | módulo TS | `src/pose/` | Tipos compartilhados (Keypoint, Baseline, GameEvent) |
| `src/ui/debugPanel.ts` | módulo TS | `src/ui/` | Painel lateral de debug |
| `src/ui/calibrationScreen.ts` | módulo TS | `src/ui/` | Tela de countdown 3-2-1 |
| `src/ui/eventOverlay.ts` | módulo TS | `src/ui/` | Quadradinho colorido por evento detectado |
| `src/debug/keyboard.ts` | módulo TS | `src/debug/` | Fallback de teclado para `?debug=1` |
| `public/models/pose_landmarker_lite.task` | asset | `public/models/` | Cache local do modelo MediaPipe |
| `docs/CODEMAP.md` | doc | `docs/` | **Iron Law SDD** — criar inicial nesta issue (sub-tarefa prevista no study) |
| `docs/ARCHITECTURE.md` | doc | `docs/` | Resumo curto pose-layer × event-bus (referência das próximas fases) |
| `load-tests/results/issue-2-journey/README.md` | doc | `load-tests/results/issue-2-journey/` | Log das observações empíricas (FPS medidos, falsos positivos) |
| Deploy Cloudflare Pages | infra | externo | Link compartilhável (Seção 4.6) |

### Pacotes npm a adicionar (dependências externas)

| Pacote | Versão | Uso | Justificativa |
|--------|--------|-----|---------------|
| `vite` | latest 6.x ou 7.x | bundler + dev server | Study confirma como padrão maduro |
| `typescript` | latest 5.x | tipagem | Stack do study |
| `@mediapipe/tasks-vision` | latest (mar/2026 ou superior) | Pose Landmarker Web | ADR transversal — pacote vivo |
| `@types/node` | latest | tipagem Node pro Vite config | — |

**Nada além disso.** Sem React, sem Phaser, sem Lingui, sem mitt, sem idb-keyval — todos esses entram em fases posteriores conforme study/roadmap. Manter Fase 0 mínima.

### Padrões canônicos que vou seguir

- **Estrutura de pastas:** conforme `EXERGAME_PROJETO.md` Seção 2.3 (`src/pose/`, `src/ui/`, `src/main.ts`).
- **Pose layer abstrai keypoints:** módulos consumidores **nunca** leem keypoints crus (Seção 2.4 + ADR transversal). `events.ts` emite eventos abstratos via bus simples.
- **Configuração centralizada:** thresholds (frações de H_corpo) ficam em `src/pose/config.ts` ou no topo do `events.ts` como constantes nomeadas — não espalhadas.
- **Modo debug com keyboard fallback presente desde dia 1** (Seção 3.5 + invariante do study): nada de "adicionar depois".
- **Strings em PT-BR centralizadas:** `src/i18n/strings.ts` exportando constantes nomeadas (ADR-1) — sem framework.
- **Sem framework PWA nesta fase** (ADR risco iOS): sem `manifest.json`, sem service worker.
- **Sem auth, sem persistência, sem rede além do MediaPipe model fetch.**

---

## Código existente relacionado

| Arquivo | O que faz | Relevância | Ação |
|---------|-----------|------------|------|
| `EXERGAME_PROJETO.md` | Doc-base do projeto | Crítica | Implementação literal das Seções 3.1, 3.2, 3.3, 3.4, 3.5, 4 |
| `docs/sdd/ISSUE_1/00-design.md` | Study transversal | Alta | Fonte das ADRs aplicáveis (ADR-5 nesta fase; outras dormem) |
| `docs/sdd/ISSUE_2/00-design.md` | Design desta fase | Crítica | Escopo, tarefas-base e marcos de validação |
| (nenhum arquivo `.ts` ou `.html` no repo) | — | — | — |

---

## Decisões tomadas

| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| Vite 7+ com template `vanilla-ts` | Webpack / Parcel / Bun | Vite é a stack do doc; HMR rápido; setup mínimo |
| Modelo `pose_landmarker_lite.task` (~3MB) | `full` (~9MB) ou `heavy` (~29MB) | Budget de bundle 5MB do study; lite cabe |
| Resolução de entrada 480p (854×480 ou 640×480) | 720p ou nativa | Performance budget; pesquisa externa do study indica ganho real de 30+FPS |
| EMA α=0.5 fixa nesta PoC | EMA tunável runtime | Tunar empiricamente é objetivo de fase 0; α=0.5 é ponto de partida do doc |
| Bus de eventos = `EventTarget` nativo | `mitt` ou EventEmitter custom | Standard, zero dep, suficiente pra 6 eventos. Trocar por `mitt` na Fase 1 se houver razão |
| Keypoints crus dentro do `pose/` apenas | expostos globalmente | Disciplina arquitetural do study — futuro swap MoveNet (ADR-3) só toca pose/ |
| Sem `manifest.json` nesta fase | PWA standalone | Risco iOS getUserMedia (study) — abrir como página normal |
| Hospedar modelo `.task` em `public/models/` (servir do mesmo origin) | CDN externa do Google | Evitar CORS, garantir disponibilidade offline pós-cache, controlar versão |
| Strings PT-BR em `src/i18n/strings.ts` sem framework | Lingui já na Fase 0 | ADR-1 explícito: framework só na Fase 2 |
| Logger simples em `console.*` para debug, sem lib | pino/winston | Greenfield, sem precisar de produção; o painel debug é a UI primária |
| Layout: vídeo full-screen com painel debug toggle (canto superior direito) | dois painéis lado-a-lado fixos | Mobile precisa de espaço pro vídeo; debug é "puxar como cortina" |

---

## Riscos técnicos

| Risco | Mitigação concreta |
|-------|---------------------|
| iOS Safari pede permissão de câmera repetidas vezes | Não usar PWA standalone; instruir abrir em browser comum; tentar `await navigator.mediaDevices.getUserMedia` em resposta a clique do usuário (gesto explícito) |
| `pose_landmarker_lite.task` falha download (4G ruim) | Tela de loading com retry manual + mensagem de erro acionável |
| getUserMedia bloqueado por permissão negada | Mensagem clara em PT-BR explicando como dar permissão; link pra ajuda mobile |
| Câmera frontal vs traseira no mobile | Default `facingMode: "user"` (frontal); selector simples se falhar |
| Falso positivo de "jump" quando criança balança o corpo animada | Cooldown 400ms já no doc; histerese adicional: requer derivada negativa (subindo) **e** Y_quadril sustentado por 2 frames |
| Drift de baseline durante uso (criança suando, roupa larga) | Auto-sugestão de recalibração se confiança média < 0.6 por 10s; botão "Recalibrar" sempre visível |
| Câmera em paisagem vs retrato muda dimensões | Detectar `videoWidth`/`videoHeight` e ajustar canvas overlay; thresholds proporcionais ao H_corpo já são imunes |
| Modelo carrega mas detecção tem confiança baixa em iluminação ruim | Aviso "iluminação fraca" quando confiança média < 0.6 (Seção 3.4) |
| Bundle estoura 5MB com runtime MediaPipe + WASM | Verificar via `vite build --mode production`, ler dist/ size; se exceder, usar dynamic import pra mediapipe |
| Cloudflare Pages não serve `.task` files corretamente | Configurar headers MIME-type `application/octet-stream` ou usar `.bin` extension via Vite asset config |
