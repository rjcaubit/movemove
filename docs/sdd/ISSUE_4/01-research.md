# Pesquisa — Fase 2: camada de exercício saudável (cadência, polichinelos, missões, narrador)

**Issue:** #4
**Data:** 2026-04-27
**Tipo:** feature
**Baseado em:** `00-design.md` (esta issue) + study #1 (ADRs 1, 5) + `EXERGAME_PROJETO.md` Seção 6

---

## Problema / Necessidade

A Fase 1 entregou jogo jogável com pose layer + Phaser 4 + 3 lanes + obstáculos. Funciona como entretenimento mas o gameplay **não exige esforço físico** — criança pode jogar sentada na cama mexendo só os ombros, e o jogo segue. O propósito original do projeto (`EXERGAME_PROJETO.md` Seção 1.1: "substituir tempo de tela passivo por ativo") só é cumprido quando movimento real virar **input crítico** pra avançar.

A Fase 2 transforma "jogo divertido" em "jogo divertido **que faz exercício de verdade**". A criança precisa correr no lugar pra avançar, fazer polichinelos pra coletar bônus, levantar braços pra defender. Sem isso, o jogo desacelera, perde combo, perde missão.

Adicionalmente, esta é a primeira fase com **persistência** (missões diárias, recorde, perfil) — entra `idb-keyval` (do study #1). E o **narrador motivador** dispara a adoção de `@lingui/core` previsto em ADR-1 (extração séria de strings com plurais/interpolação).

Critério de validação subjetivo (Seção 6.4): filho do dev joga 15 min seguidos, fica fisicamente cansado, resumo pós-partida desperta vontade de jogar de novo.

---

## Análise de Dependências

### O que já existe e reuso (fonte: CODEMAP.md atualizado pós-#3)

| Item | Localização | Como uso |
|------|-------------|----------|
| `EventDetector` com 6 heurísticas + bus `EventTarget` | `src/pose/events.ts` | **Estendo** o `cadence` pra emitir BPM/intensidade; `jumping_jack` e `arms_up` ganham handlers no Play scene (até agora ignorados) |
| `POSE_CONFIG` thresholds | `src/pose/config.ts` | Adiciono novos campos pra zonas especiais (duração, alcance) |
| `Calibrator` (4 baselines) | `src/pose/calibration.ts` | Inalterado |
| `EmaSmoother` α=0.5 | `src/pose/smoother.ts` | **Pode trocar por OneEuroSmoother** se cadência rápida der jitter (ADR-5) — decisão empírica na Fase E |
| `KeyboardDebug` | `src/debug/keyboard.ts` | **Estendo** `J` (jumping_jack) e adiciono nova combo pra simular cadência variável e armas-up |
| `AppRefs` + `getRefs(scene)` (registry) | `src/game/orchestrator.ts` | Reuso pra compartilhar novos serviços (audio, missions, profile) entre cenas |
| Cenas Phaser existentes | `src/game/scenes/*` | `Play` ganha energia/zonas/escudo/water-break overlay; `GameOver` vira ponte pra novo `Summary`; `Boot` carrega novos assets |
| `HUD` bitmap-like (Text monoespace) | `src/game/ui/hud.ts` | **Estendo** com barra de energia + indicador de combo + ícones de missão progresso |
| `localStorage` (recorde/mute/tutorialDone) | `src/game/scenes/GameOver.ts`, `Play.ts`, `Tutorial.ts` | **Migra** pra `idb-keyval` os dados que crescem (perfil, histórico de partidas, missões) — recorde/mute ficam em localStorage por simplicidade |
| `Spawner` system | `src/game/systems/spawner.ts` | **Estendo** pra emitir zonas especiais (jacks, arms-up) intercaladas com obstáculos normais |
| `strings.ts` PT-BR sem framework | `src/i18n/strings.ts` | **Migra** pra `@lingui/core` com catálogos `.po` (gatilho ADR-1: narrador motivador) |
| `?debug=1` keyboard fallback | `src/debug/keyboard.ts` | Reuso. Adiciono `B` (boost cadence pra teste rápido), `S` (shield arms-up direto) |
| Playwright HTTPS + mkcert | `playwright.config.ts` | Reuso pra novos CTs |
| `cameraPreview` | `src/game/ui/cameraPreview.ts` | Inalterado |

### O que preciso criar (porque não existe)

| Item | Tipo | Onde viverá | Por que não reuso |
|------|------|-------------|-------------------|
| Dep `idb-keyval@^6` | dependência npm | `package.json` | persistência rica; localStorage não escala pra histórico de partidas + perfil |
| Dep `@lingui/core@^4` | dependência npm | `package.json` | ADR-1: narrador exige plurais/contexto/interpolação que `strings.ts` raw não cobre |
| `OneEuroSmoother` | classe TS | `src/pose/oneEuroSmoother.ts` | EMA tem latência alta em sinais rápidos (cadência); One Euro tem cutoff adaptativo. **Criação condicional**: só substitui o EMA se o jitter empírico justificar (decisão Fase E) |
| Cadência → `bpm` + `intensity` | extensão | `src/pose/events.ts` (emit já existente expandido) | Hoje `cadence` só carrega `stepsPerSec`; jogo precisa de tier (none/walking/jogging/running) pra modular velocidade |
| `EnergySystem` | módulo TS | `src/game/systems/energy.ts` | Barra de energia: enche com cadência, esvazia parado. Centraliza math + listeners do `cadence` event |
| `ZoneManager` | módulo TS | `src/game/systems/zones.ts` | Spawn de zonas especiais (`jacks_zone`, `arms_zone`) em meio aos obstáculos; valida conclusão (X polichinelos em N segundos) |
| `JackZone` entity | classe TS | `src/game/entities/JackZone.ts` | Zona visual com contador "0/5"; passa pelo player como obstáculo neutro mas ativa lógica de contagem |
| `ArmsZone` entity | classe TS | `src/game/entities/ArmsZone.ts` | Igual, mas exige `arms_up` durante a passagem |
| `ShieldEffect` | módulo TS | `src/game/systems/shield.ts` | Estado "escudo ativo" do player; obstáculo pega 1 cargas em vez de matar |
| `MissionSystem` | módulo TS | `src/game/systems/missions.ts` | 3 missões diárias renovadas à meia-noite local; tipos: corrida única, agregada, diária; persistência idb |
| `MissionDef` JSON | arquivo | `public/data/missions.json` | Catálogo de missões (separado de código pra facilitar tuning) |
| `ProfileStore` (idb) | módulo TS | `src/game/storage/profile.ts` | Wrapper `idb-keyval` com schema versionado: `{ version: 1, ageGroup, totalRuns, totalDistance, totalCoins, totalJacks, totalArmsUp, missionState }` |
| `RunHistoryStore` (idb) | módulo TS | `src/game/storage/runHistory.ts` | Últimas 30 partidas (distância, moedas, jacks, jumps, ducks, duração, BPM médio) — alimenta resumo agregado |
| `AudioBus` | módulo TS | `src/game/systems/audioBus.ts` | Música em loop + ducking quando narrador fala; gain por canal (music/sfx/voice); persistência via idb |
| `Narrator` | módulo TS | `src/game/systems/narrator.ts` | Toca frases pré-definidas em momentos-gatilho (1º polichinelo / combo 5 / energia baixa / recorde / GameOver). Web Speech API TTS pt-BR (zero asset, fallback bom; voz neural pode entrar depois) |
| `WaterBreakOverlay` | módulo TS | `src/game/scenes/WaterBreak.ts` | Cena Phaser modal sobre Play. Pausa game, conta 30s, animação fofa, dispensa via tap/movimento |
| Cena `Summary` | Phaser.Scene | `src/game/scenes/Summary.ts` | Substitui GameOver: distância + moedas + jacks + jumps + ducks + tempo cardio (s) + gráfico simples + missões progresso. Antes do botão "Jogar de novo" |
| Cena `Settings` | Phaser.Scene | `src/game/scenes/Settings.ts` | Volume música/sfx/narrador, faixa etária (5-7/8-10/11-12), narrador on/off |
| `chartSparkline` (SVG manual) | módulo TS | `src/game/ui/sparkline.ts` | SVG inline de BPM ao longo da partida (Chart.js seria 60KB+; sparkline manual ~80 linhas) |
| Catálogos i18n | `.po` | `src/i18n/locales/pt-BR.po` | Output `@lingui` extract |
| `lingui.config.ts` | config | repo root | Configura locale `pt-BR`, format `po`, paths |
| `narrator-lines.ts` | módulo TS | `src/game/i18n/narratorLines.ts` | Mapa `event → frases candidatas[]` (ex: `firstJack: ['Boa!', 'Manda ver!']`) — usa `@lingui/core` `t\`...\`` |
| Sons de música | OGG | `public/assets/sounds/music/run-loop.ogg` | Pista de música ritmada (loop 60s, ~120 BPM). Buscar Kenney/Free-PD; se não, usar geração via Tone.js (rejeitado: bundle pesado) — **placeholder oggs em silêncio gerados; música real fica pra issue de polish A/V** |
| Sons de SFX adicionais | OGG | `public/assets/sounds/{shield_on, jack_done, water_break, mission_complete}.ogg` | Mesmas considerações; placeholders no-op gated por `cache.audio.exists()` |
| `e2e/issue-4-*.spec.ts` | Playwright | `e2e/` | CTs novos da Fase 2 |

### Padrões canônicos que vou seguir

- **Pose layer ainda invariante por consumo de keypoints**: `EventDetector` continua sendo o único produtor de `GameEvent`. Adição de `bpm`/`intensity` em `cadence` mantém compat com Fase 1 (campo opcional).
- **Refs via `game.registry`**: novos serviços (`audioBus`, `missions`, `profile`, `narrator`) registrados no `orchestrator.ts` como `AppRefs`.
- **Strings via `@lingui/core`** (substitui import direto de `strings.ts`); fallback mínimo se catálogo não carrega (string inline em código).
- **IndexedDB schema versionado**: `ProfileStore.VERSION = 1`; migração `v0 (localStorage) → v1 (idb)` faz "best effort" de leitura do localStorage no primeiro boot pós-Fase 2 (recorde + tutorialDone).
- **Sons gated por `cache.audio.exists()`** (mesmo guard da Fase 1).
- **`?debug=1` keyboard fallback estendido**: novas teclas `B` (boost cadência simulada → 3 passos/s), `S` (toggle shield), `M` (skip pra Summary com dados mock).
- **`?seed=N`** continua afetando spawner (incluindo zonas especiais).
- **A11y**: Settings tem labels; HUD tem `aria-label` no canvas via `<canvas aria-label>`; narrador respeita `prefers-reduced-motion` do user agent (não rebaixar volume música além do default).
- **Sem PWA standalone** (mantém risco iOS getUserMedia da Fase 0).

---

## Código existente relacionado

| Arquivo | O que faz | Relevância | Ação |
|---------|-----------|------------|------|
| `src/pose/events.ts:124-148` | `detectCadence` emite `stepsPerSec` por novo passo | **Alta** | Estende: campo `bpm` (passos/min) e `intensity: 'none'|'walking'|'jogging'|'running'` no payload do GameEvent. Mantém compat: campos novos opcionais |
| `src/pose/types.ts:46-52` | `GameEvent` discriminated union | Alta | Adiciono `bpm?` + `intensity?` ao variant `cadence` |
| `src/game/scenes/Play.ts:99-111` | event listener no bus (jump/duck/lane); jacks/arms ignorados | Alta | Roteia `cadence` → `EnergySystem`; `jumping_jack` → `ZoneManager.tickJack()`; `arms_up` → `ShieldEffect.activate()` |
| `src/game/systems/spawner.ts` | spawna obstáculos + clusters de moedas | Alta | Estende: a cada N metros (configurável) injeta uma `JackZone` ou `ArmsZone` no fluxo |
| `src/game/scenes/GameOver.ts` | tela de fim com recorde local | Média | Vira ponte pra `Summary`. Mantida como fallback rápido se Summary falhar carregar |
| `src/game/config.ts` | constantes do jogo | Alta | Adiciona blocos `energy.*`, `zones.*`, `audio.*`, `mission.*`, `waterBreak.*` |
| `src/i18n/strings.ts` | strings PT-BR centralizadas | Alta | Convertido pra import do `@lingui/core`; arquivo vira camada de exportação que chama `t\`...\`` (ou removido completamente, todos os calls trocados pra `t\`...\`` direto) |
| `src/main.ts` (`__movemoveDebug`) | helpers Playwright | Média | Adiciona `forceCadence(stepsPerSec)`, `triggerWaterBreak()`, `forceMissionState({...})` pra test E2E |
| `vite.config.ts` | build/dev | Baixa | Adicionar `@lingui/vite-plugin` se necessário (ou usar babel macro — Lingui suporta ambos) |

---

## Decisões tomadas

| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| `idb-keyval` (Fase 2) ao invés de Dexie ou IndexedDB raw | Dexie (~30KB) ou IDB direto | Padrão do study #1 — só quando schema rico aparecer trocamos. Fase 2 ainda é "1 store por entidade" |
| `@lingui/core` sem `@lingui/react` (não há React) | i18next (~22KB) ou react-intl | Study #1 ADR-1 selou; só adiciona ~8KB; gera catálogos compile-time |
| **Web Speech API (TTS nativo do browser) pra narrador** ao invés de áudio gravado | Áudio pré-gravado | Zero bundle adicional; pt-BR cobre Android/iOS modernos; latência baixa; voz "robótica" é aceitável pro tom infantil/divertido. Áudio gravado vira polish issue (issue separada) |
| Web Speech API com fallback **silencioso** quando `speechSynthesis` indisponível | Mostrar legenda na tela | Legenda só aparece como **complemento opcional** controlado por Settings (acessibilidade). Default narrator off em devices sem TTS |
| Cadência discreta em **4 tiers** (`none < 0.5 / walking 0.5-1.5 / jogging 1.5-3 / running > 3 passos/s`) ao invés de contínua | Velocidade contínua linear na cadência | Tiers são mais robustos a flutuações de detecção; fáceis de comunicar visualmente (cor da barra de energia + ícone) |
| `Energy` no range [0, 100]; cresce 25/s em `running`, 12/s em `jogging`, 5/s em `walking`, decai 8/s em `none` | Modelo proporcional contínuo | Numbers fáceis de ajustar; debug visual claro (porcentagem) |
| Personagem desacelera a partir de `energy < 30`; para totalmente em `energy = 0` (não morre — só fica parado vendo o cenário desaparecer e GameOver naturalmente) | Game over imediato em energy=0 | Zero-energy não é falha, é descanso; ainda perde combo/score acumulado por morte natural se obstáculo bater |
| Zonas especiais aparecem **a cada ~80m** (mais raras que cluster de moedas — cluster a cada 50m); 4s de duração no campo de visão | A cada N segundos | Distância é mais consistente com a sensação do gênero |
| `JackZone` exige **5 polichinelos em 4s** pra completar; falha não pune (só perde bônus) | 3 polichinelos | 5 garante que é exercício real; 4s é o tempo médio de passagem em velocidade média |
| `ArmsZone` exige `arms_up` sustentado durante a janela; quem completa ganha **escudo** com 1 carga | Quem completa ganha multiplicador de score | Escudo é mais palpável e usado nos próximos 10s (combina com gameplay) |
| 3 missões diárias geradas a partir de **template + RNG seedado pelo dia** | Pool grande randômico | Determinismo facilita debug; "missão do dia" igual pra mesma data em devices diferentes (futura coop) |
| **Reset diário à meia-noite local** (`Date#getDate` change) — não baseado em UTC | UTC | Criança joga no fuso dela; UTC pode resetar no meio do dia em SP |
| Schema IDB `Profile v1` com migração soft do localStorage | Migração hard (apaga localStorage) | Mantém recorde/mute/tutorialDone funcionando se ficar parado em Fase 1 |
| `Summary` antes de `GameOver` (rebatizado): vira a tela principal de fim de partida | Manter `GameOver` como tela única | Summary é o **resumo motivador**; "GameOver" como nome é punitivo (já trocamos copy "GAME OVER" → "FIM!") |
| Water break **a cada 8 min de partida cumulativo na sessão** (não só na atual) | Por partida individual | Criança pode reiniciar várias vezes sem hidratar |
| Settings persiste em `localStorage` (não idb) | tudo no idb | Settings precisam estar disponíveis ANTES do idb abrir (race no boot); `localStorage` é síncrono |
| Cadência mantém `EmaSmoother` (não troca pra OneEuro) **por default**; trocamos só se a Fase E observar jitter empiricamente | Trocar preventivamente | Iron Law: não fix sem root cause. Se teste manual mostrar BPM oscilando, daí trocamos no fix-pass |
| Música em loop short (60s) com gain baixo default 0.4; ducking pra 0.15 quando narrador fala | Música única longa | Loop curto evita "música chata" + permite swap por mundo na Fase 3 |
| **Asset música real fica pra polish issue separada**; placeholder vazio (silent OGG) | Bloquear merge esperando asset | Mesma decisão da Fase 1 (sons placeholder) — valida arquitetura, não a curadoria de áudio |

---

## Riscos técnicos

- **Web Speech API instável em iOS Safari** — `speechSynthesis.getVoices()` retorna vazio na 1ª chamada; voz pt-BR às vezes ausente sem download manual. *Mitigação:* fallback silencioso + flag `Settings.narratorEnabled = false` por default no iOS detectado; legenda visual opcional.
- **Cadência com falsos positivos** quando criança fica no lugar mexendo só os ombros. *Mitigação:* heurística atual exige alternância de joelho L↔R com altura mínima; se ainda errar, aumentar `cadenceKneeRaiseFracHCorpo` de 0.08 pra 0.12.
- **Cadência com falsos negativos** quando criança "trota" levemente. *Mitigação:* tier `walking` aceita até 0.5 passos/s; energia cresce devagar mas cresce.
- **IndexedDB indisponível em modo privado** (Safari). *Mitigação:* `idb-keyval` falha gracioso; fallback memory-only com aviso. Missões diárias funcionam no run mas não persistem.
- **Bundle estoura ainda mais** com Lingui + idb-keyval + sparkline. *Mitigação:* `@lingui/core` (~8KB) + `idb-keyval` (~600B) + sparkline manual (~2KB) = ~10KB extra. Aceitável.
- **Lingui macro vs runtime** — config errada quebra build. *Mitigação:* usar `@lingui/core` runtime API direto (sem macro/babel); um pouco mais verboso mas zero config Vite.
- **Mission seed determinístico**: se a definição mudar entre versões, missões da mesma data divergem entre devices que atualizaram. *Mitigação:* missions.json é versionado; usa `version + date` como seed.
- **Zonas especiais conflitando com obstáculos** (overlap). *Mitigação:* `Spawner` mantém um buffer mínimo de 1.5s entre items spawn (já tem; ajustar pra não criar zona em cima de obstáculo).
- **Narrador sobreposto** (várias frases em sequência rápida). *Mitigação:* `Narrator.speak()` cancela fala anterior se nova prioridade > anterior; cooldown de 3s entre falas de mesma prioridade.
- **Tela de Summary lenta** se SVG inline ficar grande (BPM por segundo numa partida de 5 min = 300 pontos). *Mitigação:* downsample pra 60 pontos no máximo; sparkline simples.

---

## Histórico relacionado

- Issue #1 (study) — fixou ADR-1 (Lingui aqui), ADR-5 (One Euro como opção).
- Issue #2 (Fase 0) — pose layer com `cadence` event já existente.
- Issue #3 (Fase 1) — gameplay base; CT01 manual humano + RNF01-03 numéricos reagendados pra esta Fase 2 quando tem cardio (mais carga de inferência → métricas mais realistas).

*Fim do research.*
