# Especificação — Fase 2: camada de exercício saudável

**Issue:** #4
**Data:** 2026-04-27
**Status:** Aguardando implementação
**Baseado em:** `01-research.md` + ADR-1, ADR-5 (study #1) + `EXERGAME_PROJETO.md` Seção 6

## Objetivo

Transformar o endless runner da Fase 1 em **jogo que faz exercício real**: cadência de corrida controla velocidade do personagem, polichinelos viram power-up em zonas dedicadas, braços-pra-cima criam escudo. Adiciona narrador motivador, missões diárias persistidas, intervalo da água automático, resumo pós-partida com gráfico. Versão 0.5 — primeira "completa" no propósito.

## Requisitos Funcionais

- [ ] **RF01** Cadência detectada (`pose/events.ts`) emite GameEvent `cadence` com campos novos: `bpm: number` (passos/min) e `intensity: 'none' | 'walking' | 'jogging' | 'running'`. Backwards-compat: `stepsPerSec` mantido.
- [ ] **RF02** `EnergySystem` mantém valor [0, 100]: cresce 25/s em `running`, 12/s em `jogging`, 5/s em `walking`, decai 8/s em `none`. Inicia em 50 ao começar Play.
- [ ] **RF03** Velocidade do personagem é **multiplicada** por fator `f(energy)`:
  - `energy ≥ 30` → fator 1.0 (velocidade total da Fase 1: 5-15 m/s)
  - `0 ≤ energy < 30` → fator linear de 0.0 a 1.0 (`f = energy / 30`)
  - `energy = 0` → personagem para; cenário não anda; obstáculos não chegam
- [ ] **RF04** HUD ganha **barra de energia** (~200×16 px, canto superior direito) com cor por tier: cinza (none), azul (walking), verde (jogging), laranja-pulsando (running). Mostra também ícone de cadência (sapatilha) + BPM atual.
- [ ] **RF05** `ZoneManager` injeta zonas especiais a cada 80m (configurável). 2 tipos: `JackZone` (5 polichinelos em 4s → +50 score + chance de missão) e `ArmsZone` (manter braços-pra-cima durante a passagem ~3s → +50 score + escudo 1 carga).
- [ ] **RF06** `JackZone` visualmente: anel pulsante amarelo no chão (3 lanes simultâneo — passa por todas), com texto "POLI 0/5" sobre o player. Contagem zera ao sair da zona.
- [ ] **RF07** `ArmsZone` visualmente: arco roxo no alto (player passa por baixo); texto "BRAÇOS!" durante a janela. Falha não pune; sucesso ativa escudo.
- [ ] **RF08** `ShieldEffect` quando ativo: aura azul ao redor do player; próximo obstáculo detectado consome a carga em vez de matar; fade-out 200ms; disponível só 1 carga por vez (acumulativa? não — substitui).
- [ ] **RF09** `MissionSystem` carrega 3 missões/dia de `public/data/missions.json` usando seed = `versão_catálogo + YYYY-MM-DD` (determinístico mesmo dia). Missão tem `id`, `title`, `desc`, `target`, `progressKey` (`run.distance` | `daily.jacks` | `daily.coins` | `run.duration_s`).
- [ ] **RF10** Progresso de missão atualizado em tempo real durante Play (HUD mostra ícone + barra mini); ao bater target, animação "completed!" + persiste em idb.
- [ ] **RF11** Missões resetam à meia-noite local (verificação no boot da app + na entrada de Play): se `lastSeenDate !== today`, limpa progresso e gera novo set.
- [ ] **RF12** `AudioBus` carrega música de loop (`public/assets/sounds/music/run-loop.ogg`); toca em loop durante Play em volume default 0.4. **Placeholder OGG silencioso** se asset real não existir (não crashar).
- [ ] **RF13** `AudioBus` faz **ducking** automático: quando narrador fala, music gain → 0.15; volta pra 0.4 após 500ms da fala terminar.
- [ ] **RF14** `Narrator` usa `window.speechSynthesis` (Web Speech API) com voz pt-BR. Fala em momentos-gatilho:
  - 1º polichinelo do dia: "Boa! Manda ver!"
  - Combo 5 polichinelos: "Cinco polichinelos! Tá voando!"
  - Energy < 20 por 3s contínuos: "Vamos lá! Acelera!"
  - Missão completada: "Missão concluída!"
  - GameOver: variantes ("Foi nada!", "Tenta de novo!")
  Frases via `@lingui/core` `t\`...\`` em `src/game/i18n/narratorLines.ts`.
- [ ] **RF15** `Narrator` falha gracioso: se `speechSynthesis` indisponível ou `getVoices()` vazio, **não bloqueia gameplay**; legenda inline opcional via Settings.
- [ ] **RF16** `WaterBreak` cena modal: a cada 8 min cumulativos de Play (acumulado entre partidas da sessão), pausa o jogo, mostra animação de copo d'água + countdown 30s + texto "Hora da água!". Pode dispensar com tap após 10s mínimos (não pode pular antes).
- [ ] **RF17** Cena `Summary` substitui `GameOver` como destino padrão da colisão. Mostra: distância (m), moedas, polichinelos no run, jumps, ducks, tempo total cardio (s gastos em jogging+running), BPM médio, sparkline de BPM ao longo da partida (SVG inline manual, downsample pra 60 pontos), missões completadas (✓/3), recorde local, botões "Jogar de novo" / "Recalibrar" / "Configurações".
- [ ] **RF18** Cena `Settings` (acessível do `Welcome` e do `Summary`): sliders volume música/sfx/voz [0-100]; toggles narrator on/off + legenda visual; faixa etária (5-7 / 8-10 / 11-12). Persiste em `localStorage` (síncrono no boot).
- [ ] **RF19** Faixa etária ajusta:
  - Velocidade base inicial (5-7: 4 m/s; 8-10: 5; 11-12: 6)
  - Intervalo do water break (5-7: 6 min; 8-10: 8 min; 11-12: 10 min)
  - Threshold da cadência (5-7: knee raise menor — passos curtos contam mais)
- [ ] **RF20** `ProfileStore` (idb): schema v1 — `{ version: 1, ageGroup, totalRuns, totalDistance, totalCoins, totalJacks, totalArmsUp, missionState: { date, missions[] } }`. Migra do localStorage no 1º boot pós-Fase 2 (lê `bestDistance/tutorialDone/muted`, mantém recorde no localStorage por simplicidade do hot-path).
- [ ] **RF21** `RunHistoryStore` (idb): últimas 30 partidas. Cada entrada: `{ id, startedAt, durationS, distance, coins, jacks, armsUp, jumps, ducks, bpmAvg, bpmTrack: number[] }`. Auto-rotaciona FIFO.
- [ ] **RF22** `?debug=1` ganha teclas: **B** → boost cadência simulada (3 passos/s por 5s); **S** → ativa shield direto; **M** → skip pra Summary com dados mock; **W** → triggera water break agora.
- [ ] **RF23** `__movemoveDebug` ganha helpers: `forceCadence(stepsPerSec)`, `triggerWaterBreak()`, `forceMissionState({date, missions})`, `clearProfile()`.
- [ ] **RF24** Migração do `strings.ts` para `@lingui/core`: substituir todos os usos `strings.welcome.headline` por `t\`Olá! Vamos detectar seus movimentos.\`` (ou `i18n._\`...\``) usando catálogo `pt-BR.po`. `lingui.config.ts` configurado, build extract gera o `.po`.

## Requisitos Não-Funcionais

- [ ] **RNF01** FPS ≥ 30 sustentado durante Play **com cadência ativa + música tocando + narrador eventual** no celular alvo. Meta: 60 FPS. (CT01 manual.)
- [ ] **RNF02** Latência cadência → resposta da barra de energia < 200ms. Inferência MediaPipe + EMA + EnergySystem update no próximo frame Phaser.
- [ ] **RNF03** Boot Welcome → Play < 8s rede 4G real, < 2s pós-cache.
- [ ] **RNF04** Bundle final ≤ 12MB gzip (Fase 1 ~10MB + Lingui ~8KB + idb ~600B + sparkline ~2KB + assets opcionais). Documentar nova baseline em CHANGELOG.
- [ ] **RNF05** Privacidade: zero telemetria; perfil só local (idb). Frames continuam locais.
- [ ] **RNF06** Sem PWA standalone (mantido).
- [ ] **RNF07** A11y: Settings tem labels acessíveis; legenda do narrador disponível como toggle; foco visível em todos os botões HTML; canvas tem `aria-label`.
- [ ] **RNF08** Responsivo: barra de energia, botões e overlay de water break legíveis em retrato (390×844) e paisagem (854×480).
- [ ] **RNF09** Robustez: idb indisponível (modo privado Safari) → fallback memory-only com aviso (`Settings → "Histórico não está sendo salvo"`).
- [ ] **RNF10** Offline pós-cache: `_headers` cobre missions.json + áudios + catálogo i18n.
- [ ] **RNF11** 15 min sem crash, freeze ou drift de calibração (Fase 6.4 critério).

## Modelo de Dados

### IndexedDB (via `idb-keyval`)

Cada entry é uma chave única no store padrão do `idb-keyval`:

| Chave | Conteúdo | Schema |
|-------|----------|--------|
| `movemove.profile.v1` | Perfil agregado | `{ version: 1, ageGroup: '5-7'|'8-10'|'11-12', totalRuns, totalDistance, totalCoins, totalJacks, totalArmsUp, missionState: { date: 'YYYY-MM-DD', missions: MissionInstance[] } }` |
| `movemove.runHistory.v1` | Lista FIFO de últimas 30 partidas | `Array<{ id, startedAt: ms, durationS, distance, coins, jacks, armsUp, jumps, ducks, bpmAvg, bpmTrack: number[] }>` |

### `MissionInstance`

```ts
interface MissionInstance {
  defId: string;       // referência à missions.json
  target: number;      // valor concreto (ex: 100)
  progress: number;    // valor atual
  completed: boolean;
  completedAt?: number; // ms
}
```

### `MissionDef` (em `public/data/missions.json`)

```ts
interface MissionDef {
  id: string;
  title: string;        // PT-BR
  desc: string;         // PT-BR
  progressKey: 'run.distance' | 'daily.jacks' | 'daily.coins' | 'run.duration_s' | 'daily.armsUp';
  targetMin: number;
  targetMax: number;    // RNG escolhe target ∈ [min, max] via seed do dia
}
```

### localStorage (mantém)

| Chave | Tipo | Notas |
|-------|------|-------|
| `movemove.bestDistance` | number | Recorde local — hot-path no boot do GameOver/Summary |
| `movemove.tutorialDone` | boolean | Mantido |
| `movemove.muted` | boolean | Substituído por `movemove.audio.{music,sfx,voice}` (3 chaves) |
| `movemove.audio.music` | number 0-100 | Volume música |
| `movemove.audio.sfx` | number 0-100 | Volume SFX |
| `movemove.audio.voice` | number 0-100 | Volume narrador |
| `movemove.narrator.enabled` | boolean | Settings toggle |
| `movemove.narrator.captions` | boolean | Legenda visual on/off |
| `movemove.ageGroup` | string | '5-7' / '8-10' / '11-12' |

### Sem tabelas SQL (sem backend)

## API

Sem endpoints HTTP. Sem AI service. 100% client-side.

### Comunicação interna nova

| Origem | Destino | Mecanismo | Payload |
|--------|---------|-----------|---------|
| `EventDetector` | `EnergySystem` (Play subscribe) | bus `cadence` event | `{ stepsPerSec, bpm, intensity }` |
| `EventDetector` | `ZoneManager` (Play subscribe) | bus `jumping_jack` event | `{ t }` (existente) |
| `EventDetector` | `ShieldEffect` (Play subscribe) | bus `arms_up` event | `{ t }` (existente) |
| `Narrator` | `AudioBus` | call direto `audioBus.duck()/restore()` | — |
| `MissionSystem` | `ProfileStore` | call `idb-keyval` `set/get` | `MissionInstance[]` |
| `Play.update` | `MissionSystem.tick` | call direto | `{ delta_distance, delta_coins, delta_jacks, delta_armsUp, delta_durationS }` |
| `Settings` | `localStorage.setItem` | sync | volumes, age, toggles |

## Frontend — cenas e componentes

### Cenas Phaser a criar/alterar

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `src/game/scenes/Settings.ts` | **novo** | Sliders volume + faixa etária + toggles narrador/legenda. Acessível do Welcome e do Summary |
| `src/game/scenes/Summary.ts` | **novo** | Resumo pós-partida (substitui GameOver como destino default) |
| `src/game/scenes/WaterBreak.ts` | **novo** | Modal sobre Play: pausa + animação + countdown 30s |
| `src/game/scenes/Welcome.ts` | **modifica** | Adiciona botão "Configurações" |
| `src/game/scenes/Play.ts` | **modifica** | Roteia cadence/jacks/arms_up; integra EnergySystem, ZoneManager, MissionSystem, Narrator, AudioBus, water break check; redireciona pra `Summary` em vez de `GameOver` |
| `src/game/scenes/GameOver.ts` | **mantém** | Vira fallback em caso de erro no Summary (defensivo) |

### Sistemas e entidades novos

| Arquivo | Propósito |
|---------|-----------|
| `src/pose/oneEuroSmoother.ts` | One Euro Filter (criação preparada; só substitui EMA se Fase E observar jitter) |
| `src/game/systems/energy.ts` | EnergySystem: state machine de tier + valor 0-100; emite `energyChanged` event interno |
| `src/game/systems/zones.ts` | ZoneManager: spawn de JackZone/ArmsZone, validação de conclusão |
| `src/game/systems/shield.ts` | ShieldEffect: estado + consumo em colisão |
| `src/game/systems/missions.ts` | MissionSystem: load missions.json, seed RNG por dia, tick progresso, persist |
| `src/game/systems/audioBus.ts` | AudioBus: load music/sfx, ducking, gain por canal |
| `src/game/systems/narrator.ts` | Narrator: speechSynthesis wrapper + cooldown + cancelamento por prioridade |
| `src/game/storage/profile.ts` | ProfileStore: idb-keyval wrapper schema v1 + migração soft do localStorage |
| `src/game/storage/runHistory.ts` | RunHistoryStore: últimas 30 partidas FIFO |
| `src/game/entities/JackZone.ts` | Sprite + lógica do anel pulsante + contador |
| `src/game/entities/ArmsZone.ts` | Sprite + lógica do arco + janela de validação |
| `src/game/ui/energyBar.ts` | Barra de energia HUD (200×16, cor por tier) |
| `src/game/ui/missionsPanel.ts` | 3 ícones + barras de progresso mini no canto da tela |
| `src/game/ui/sparkline.ts` | SVG inline manual de BPM (downsample) |
| `src/game/i18n/narratorLines.ts` | Mapa `event → frases candidatas[]` via `t\`...\`` |

### Componentes Fase 1 reusados

- `Player`, `Obstacle`, `Coin`, `Spawner`, `Scoring`, `collision`, `Road`, `Parallax`, `pseudo3d`, `rng`, `HUD`, `cameraPreview`, `orientationGuard` — todos mantidos.
- `KeyboardDebug` — estendido com B/S/M/W.
- Pose layer (`PoseDetector`, `EmaSmoother`, `Calibrator`, `EventDetector`) — todos mantidos. EMA pode ser substituído por OneEuro condicionalmente.
- `errorScreen.ts` HTML, `debugPanel.ts` HTML, `KeypointOverlay` — mantidos.

## i18n — migração `strings.ts` → `@lingui/core`

| Arquivo | Status |
|---------|--------|
| `src/i18n/strings.ts` | **substitui conteúdo**: agora exporta funções helper `t(key, vars?)` que delegam pra `i18n._\`...\`` do `@lingui/core`; mantém os mesmos nomes (`strings.welcome.headline`) pra minimizar diff |
| `lingui.config.ts` (root) | **novo**: configura locale `pt-BR`, format `po`, paths |
| `src/i18n/locales/pt-BR.po` | **novo**: gerado via `npx lingui extract` |
| `src/i18n/locales/pt-BR.ts` | **novo**: compilado via `npx lingui compile` (importado pelo `i18n.load()`) |
| `package.json` scripts | adiciona `i18n:extract` e `i18n:compile` |

## Áudio — assets

| Asset | Local | Origem | Status |
|-------|-------|--------|--------|
| Música loop ~60s | `public/assets/sounds/music/run-loop.ogg` | _Buscar Free-PD_ — placeholder silent OGG | **pendente issue polish A/V** |
| `shield_on.ogg`, `jack_done.ogg`, `water_break.ogg`, `mission_complete.ogg` | `public/assets/sounds/` | Kenney UI Audio | **placeholders silent** |
| Vozes pt-BR | navegador (Web Speech API) | sistema | sem download |

## Cenários de Teste (OBRIGATÓRIOS)

> Esta issue mexe em UI (criar 3 cenas Phaser novas: Settings, Summary, WaterBreak; modifica Play; novos botões no Welcome). **CT11 marcado `[E2E click-by-click]` é obrigatório.**

### CT01 — Cardio session 15min completa (manual humano)

```
DADO QUE filho do dev abre https://movemove.pages.dev no celular alvo
QUANDO ele faz onboarding completo + joga 15 min reais (com pausa do water break)
ENTÃO observações:
- FPS médio ≥ 30 com música + narrador
- Cadência detectada coerente com esforço subjetivo (corre rápido → barra enche)
- 5+ polichinelos completados em zonas
- 3+ escudos ativados
- 1 missão diária completada
- Resumo pós-partida bate com observação manual (distância, jacks, etc)
- Criança fisicamente cansada
```

Resultados em `load-tests/results/issue-4-journey/README.md`.

### CT02 — Cadência → tier muda EnergySystem

```
DADO usuário em Play (debug=1, baseline forçada)
QUANDO __movemoveDebug.forceCadence(3.5) — running tier
ENTÃO EnergySystem.tier === 'running' E energy cresce a 25/s
QUANDO __movemoveDebug.forceCadence(0)
ENTÃO tier === 'none' E energy decai a 8/s
```

Cobertura via Playwright: assert via `evaluate(() => __movemoveDebug.getRefs().energy.getValue())`.

### CT03 — Energy < 30 desacelera personagem

```
DADO usuário em Play
QUANDO energy = 15 (force via debug)
ENTÃO velocidade do mundo = 0.5 * speedBase
QUANDO energy = 0
ENTÃO velocidade = 0
```

### CT04 — JackZone exige 5 polichinelos em 4s

```
DADO zona ativa (force via spawner)
QUANDO 5 jumping_jack events em 4s
ENTÃO contador 5/5 + bônus +50 score + missão `daily.jacks` += 5
QUANDO só 3 polichinelos em 4s
ENTÃO sem bônus, sem penalidade, missão += 3
```

### CT05 — ArmsZone gera escudo

```
DADO ArmsZone passando pelo player
QUANDO arms_up sustentado por 3s (debug pode forçar 'S')
ENTÃO ShieldEffect ativa, 1 carga
E próxima colisão consome a carga em vez de matar
E carga zera
```

### CT06 — Missão diária reseta à meia-noite local

```
DADO missions.profile.missionState.date = '2026-04-26'
E hoje = '2026-04-27' (Date local)
QUANDO Play scene inicializa
ENTÃO MissionSystem detecta mudança E gera novo set + persiste
```

Cobertura: Playwright + `Date` mockado via `addInitScript`.

### CT07 — Water break a cada 8 min cumulativos

```
DADO sessão atual com 7 min 50s de Play acumulado
QUANDO 10s mais de Play
ENTÃO WaterBreak scene aparece, pausa Play
E countdown 30s
E só pode dispensar após 10s mínimos
```

Cobertura via debug `__movemoveDebug.triggerWaterBreak()` + Playwright.

### CT08 — Narrator ducks música automaticamente

```
DADO música tocando em volume 0.4
QUANDO Narrator.speak() dispara
ENTÃO music gain → 0.15 imediatamente
E volta pra 0.4 após 500ms da fala terminar
```

Cobertura: Playwright + assert `audioBus.musicGain` via debug.

### CT09 — Settings persiste em localStorage e é aplicado no boot

```
DADO Settings.ageGroup = '5-7' (set via Settings UI)
QUANDO recarrega a página E entra em Play
ENTÃO velocidade base inicial = 4 m/s (não 5)
E water break interval = 6 min
```

### CT10 — Profile migra do localStorage no 1º boot pós-Fase 2

```
DADO localStorage.bestDistance = '250'
E idb sem chave 'movemove.profile.v1'
QUANDO app boot
ENTÃO profile.totalDistance ≥ 250 (importado)
E recorde continua funcionando no GameOver/Summary
```

### CT11 — E2E click-by-click [E2E click-by-click]

**Pré-condições:** stack local rodando (`npm run dev`), Playwright HTTPS via mkcert, helpers `__movemoveDebug` disponíveis.

**Sequência (Playwright):**
1. Acessar `https://localhost:5173/?debug=1&seed=42`
2. Clear localStorage + idb (via debug helper)
3. Welcome → verificar botão "Configurações" novo + botão "Começar"
4. Click "Configurações" → cena Settings carrega → ajustar slider música pra 50 → toggle narrator off → ageGroup '8-10' → "Voltar"
5. Welcome → "Começar" → Loading → (Tutorial pulado se done) → Calibration → Play
6. `forceCadence(3)` → energia sobe; verificar HUD barra cor verde (jogging) → laranja (running)
7. `__movemoveDebug.spawnJackZone()` → completar 5 polichinelos via `J` 5x rápido → verificar score + missão progresso
8. `__movemoveDebug.spawnArmsZone()` → `S` ativa shield → verificar aura visual
9. `triggerWaterBreak()` → cena modal aparece → tentar dispensar antes de 10s (não pode) → após 10s → tap dispensa → Play retoma
10. `forceMissionState({completed: true})` → assertain Summary mostra checkmark
11. `__movemoveDebug.skipToScene('Summary', { ... mock })` → ver resumo: distância, moedas, sparkline SVG, missões, botões
12. Click "Configurações" do Summary → Settings → "Voltar" → Summary
13. Click "Jogar de novo" → Play (com get-ready 3-2-1)
14. Click "Recalibrar" → Calibration

**Saída obrigatória:**
- Screenshots numerados em `load-tests/results/issue-4-journey/screenshots/` (`01-welcome.png`...`14-recalibrate.png`)
- README.md no mesmo diretório listando o que foi testado
- Comentário na issue com link

**Critério:** zero botão silencioso, todas as transições funcionam, settings persiste após reload, sparkline renderiza no Summary, water break trava < 10s.

### CT12 — Speech API indisponível não bloqueia gameplay

```
DADO Object.defineProperty(window, 'speechSynthesis', { value: undefined })
QUANDO Play executa Narrator.speak()
ENTÃO sem erro no console; gameplay continua
E se Settings.captionsEnabled, legenda HTML aparece embaixo da tela
```

## Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Web Speech API (TTS browser) ao invés de áudio gravado pro narrador | Zero bundle; pt-BR no Android/iOS modernos; voz "robótica" combina com tom infantil divertido. Áudio gravado vira issue de polish vocal |
| `idb-keyval` ao invés de Dexie | Padrão study #1; ainda escala pra Fase 3 (multi-mundo) |
| `@lingui/core` direto (sem macro/babel) | Zero config Vite; um pouco mais verboso (`i18n._\`...\``) mas estável |
| Cadência discreta em 4 tiers | Robustez a flutuação; visualmente comunicável (cor da barra) |
| Energy bar como **multiplicador** (não barra de vida) | Não adiciona morte por inatividade — a inércia natural (sem velocidade → sem GameOver, mas também sem progresso) é punição suficiente |
| ZoneManager separado do Spawner | Spawner cuida de obstáculos/moedas; zonas têm timing/contagem próprios — separação preserva spawner intacto |
| Profile em idb mas recorde+settings em localStorage | localStorage é síncrono no boot; settings precisam estar prontos antes do Phaser config (idle timeouts, sound mute) |
| `Summary` substitui `GameOver` como destino padrão | "GameOver" tem conotação punitiva; Summary motiva ("você fez X polichinelos!") |
| Reset diário local (`Date#getDate`) ao invés de UTC | Criança joga no fuso dela |
| `OneEuroSmoother` preparado mas não ativado por padrão | Iron Law: não fix preventivo. Troca só se Fase E observar jitter |
| Mission seed = `version + date` | Determinismo; permite missão coletiva no futuro |
| `WaterBreak` é Phaser scene modal (não overlay HTML) | Pausa nativa do scene system; consistência visual com o resto do jogo |

## Fora do Escopo

- Música real curada — vira issue de polish A/V (junto com sons da Fase 1).
- Voz neural pré-gravada — polish issue.
- Multiplayer / contas / leaderboard — Fase 4.
- Múltiplos personagens / mundos — Fase 3.
- Smartwatch / heart rate real — fora pra sempre (privacidade).
- Telemetria — fora pra sempre (privacidade).
- Service worker / cache offline custom — Fase 3 ou nunca.

## Docs canônicas a atualizar (após implementação)

- [x] `/docs/CODEMAP.md` — Fase 2, novos módulos `src/game/storage/`, `src/game/systems/{energy,zones,shield,missions,audioBus,narrator}.ts`, novas cenas, idb-keyval + lingui adotados, polish A/V pendente.
- [x] `/docs/ARCHITECTURE.md` — adiciona camada Storage (idb-keyval) + Audio (Web Audio + Speech) + Mission/Energy lógica.
- [x] `/docs/CHANGELOG.md` — entrada `2026-XX-XX — #4 — Fase 2`.
- [x] `EXERGAME_PROJETO.md` — Seção 6.5 marca implementação base entregue.
- [ ] `/docs/MODULES.md` — N/A (sem módulos backend múltiplos).
- [ ] `/docs/database-documentation.md` — N/A (sem SQL).

## Próximos passos

1. `/sdd-execute 4` (cadenciado) ou `/sdd-execute 4 --auto` (batch).
2. Após merge: validação manual humana CT01 (15 min) → atualizar `04-acceptance.md`.
3. `/sdd-plan 5` para Fase 3.

---

## Refinamentos

### 2026-04-27 — Modo Mini-jogos (suite de exercícios lúdicos)

**Pedido do usuário:**
> Cria jogos como "pegar" o bicho na tela (com 1 mão ou alternando — pra treinar movimentos de braço); rotação de tronco; etc. Inspirado em vídeos de exercício infantil (https://youtu.be/m1QV6EAyuaw). Pegada lúdica.

**Decisão:** adicionar **modo paralelo ao Endless Runner** chamado "Mini-jogos" — hub com 3 jogos curtos (~60-90s cada) focados em movimentos específicos de braço/tronco, estilo "vídeo de exercício infantil". Não substitui o endless runner; coexiste como segundo modo, acessível pelo Welcome.

Isso traz parte do "Cardio guiado" da Fase 3 (Seção 7.1 do doc base) **antecipado** pra Fase 2 — justifica-se porque a infraestrutura de áudio/narrador/missões/energy/profile da Fase 2 cai bem aí, e o usuário quer testar com a criança o quanto antes.

#### Novos Requisitos Funcionais

- [ ] **RF25** Cena nova `MiniGamesHub` (acessível do Welcome via botão "Mini-jogos") lista 3 jogos com card visual + descrição curta + botão "Jogar". Botão "Voltar" pra Welcome.
- [ ] **RF26** Mini-jogo **"Pega o Bicho"**: bichos (sprites animados simples — borboleta, peixinho, abelha) aparecem em posições aleatórias na tela; player toca com a mão (esquerda OU direita, definido por sub-modo) levando o pulso até a posição do bicho. Janela de 3s por bicho. Score = bichos pegos em 60s. Sub-modos: `same_hand` (só direita), `same_hand_left` (só esquerda), `alternating` (intercala — bicho azul = mão esquerda, vermelho = direita).
- [ ] **RF27** Mini-jogo **"Roda Tronco"**: alvos aparecem alternadamente à esquerda E à direita (acima da linha do ombro); player gira o tronco (rotação) pra alcançar. Detecção: ângulo da linha entre ombros vs neutro > 25°. 90s de partida. Score = alvos atingidos.
- [ ] **RF28** Mini-jogo **"Toca o Sino"**: variante do "Pega o Bicho" focada em **alternância**. Sinos pulsam em ritmo (BPM da música); player precisa tocar com a mão correta (cor do sino) no tempo. Combo cresce com acertos seguidos. 75s de partida.
- [ ] **RF29** Pose layer ganha **`spatialQueries`** helper (`src/pose/spatialQueries.ts`): funções puras `handAt(frame, hand, target, radius)`, `trunkRotationAngle(frame)`, `bothHandsAbove(frame, yLine)`. Mini-jogos consomem essas queries em vez de ler keypoints crus diretamente.
- [ ] **RF30** Cada mini-jogo tem narrador motivador específico (catálogo i18n estendido: "Boa! Pegou!", "Vai esse!", "Mais um lado!", etc).
- [ ] **RF31** Cada mini-jogo termina com tela de resultado (mini-Summary): score + missão progresso + botão "Jogar de novo" + "Voltar pro Hub".
- [ ] **RF32** Tracking pra missions: novos tipos de progresso `daily.bichosCaught`, `daily.trunkRotations`, `run.miniGameCompleted`. Adicionar 2-3 missões novas em `missions.json` que usam essas keys.
- [ ] **RF33** Faixa etária (RF19) também afeta mini-jogos:
  - 5-7: bichos andam mais devagar, alvos maiores, threshold de rotação 20°
  - 8-10: padrão (25°)
  - 11-12: bichos mais rápidos, alvos menores, threshold 30°
- [ ] **RF34** Modo opcional **"Sessão Guiada"** (botão extra no Hub): roda os 3 mini-jogos em sequência (~4 min total) com transição automática + narrador "Próximo: Roda Tronco!" entre eles. Resumo agregado no fim. *MVP: implementar como concatenação simples; UX polida vira polish issue.*
- [ ] **RF35** `__movemoveDebug` ganha helpers: `forceHandTarget(hand, x, y)`, `forceTrunkRotation(angleDeg)`, `skipMiniGame(name)`.

#### Novos arquivos a criar

| Arquivo | Tipo | Propósito |
|---------|------|-----------|
| `src/pose/spatialQueries.ts` | módulo TS puro | Funções `handAt`, `trunkRotationAngle`, `bothHandsAbove` consumindo `PoseFrame` |
| `src/game/scenes/MiniGamesHub.ts` | Phaser.Scene | Lista os 3 mini-jogos + botão "Sessão Guiada" |
| `src/game/scenes/CatchBicho.ts` | Phaser.Scene | "Pega o Bicho" — 3 sub-modos (same_R, same_L, alternating) |
| `src/game/scenes/TrunkTwist.ts` | Phaser.Scene | "Roda Tronco" |
| `src/game/scenes/BellRinger.ts` | Phaser.Scene | "Toca o Sino" |
| `src/game/scenes/MiniGameResult.ts` | Phaser.Scene | Mini-Summary genérico (score + missões + botões) |
| `src/game/entities/Bicho.ts` | classe TS | Sprite + animação + posição target + lifetime |
| `src/game/entities/TrunkTarget.ts` | classe TS | Alvo lateral (esquerda/direita) com pulse |
| `src/game/entities/Bell.ts` | classe TS | Sino colorido com pulse no ritmo |
| `src/game/systems/miniGameSession.ts` | módulo TS | Orquestra "Sessão Guiada" (sequencia 3 jogos + resumo agregado) |

#### Novas chaves i18n (extensão de `strings.ts`)

```ts
strings.miniGames = {
  hubTitle: t('Mini-jogos'),
  hubSubtitle: t('Joguinhos rapidinhos pra mexer o corpo!'),
  catchTitle: t('Pega o Bicho'),
  catchDesc: t('Toca os bichos com a mão. Use a mão certa!'),
  catchModeRight: t('Mão direita'),
  catchModeLeft: t('Mão esquerda'),
  catchModeAlternating: t('Alternando'),
  trunkTitle: t('Roda Tronco'),
  trunkDesc: t('Gira o tronco pros lados pra alcançar os alvos.'),
  bellTitle: t('Toca o Sino'),
  bellDesc: t('Toca os sinos no ritmo da música, com a mão certa!'),
  guidedSession: t('Sessão Guiada'),
  guidedSessionDesc: t('Os 3 jogos em sequência, ~4 min.'),
  back: t('Voltar'),
  playAgain: t('Jogar de novo'),
  hubBack: t('Voltar pro Hub'),
  result: t('Resultado'),
  score: t('Pontos'),
  bichosCaught: t('Bichos pegos'),
  rotations: t('Rotações'),
  combo: t('Combo'),
  bestCombo: t('Maior combo'),
  next: t('Próximo'),
};
narratorLines.bichoCaught = (): string => pick([t('Pegou!'), t('Boa!'), t('Mais um!')]);
narratorLines.trunkHit = (side: 'L'|'R'): string => side === 'L' ? t('Esquerda!') : t('Direita!');
narratorLines.bellOnBeat = (): string => pick([t('No tempo!'), t('Boa!'), t('Manda ver!')]);
narratorLines.guidedNext = (game: string): string => `${t('Próximo:')} ${game}`;
```

#### Novos cenários de teste

- [ ] **CT13 — Pega o Bicho com mão direita (manual + parcial Playwright)**
  ```
  DADO MiniGamesHub aberto
  QUANDO seleciona "Pega o Bicho" sub-modo "Mão direita"
  E pulso direito move até posição do bicho dentro de 3s
  ENTÃO score += 1, bicho some com animação
  E narrador fala "Pegou!" no 1º acerto
  ```
  Cobertura Playwright: força frames via `__movemoveDebug.forceHandTarget('R', x, y)`.

- [ ] **CT14 — Roda Tronco detecta giro lateral**
  ```
  DADO TrunkTwist em andamento
  QUANDO ângulo entre ombros > 25° pra esquerda por > 200ms (sustentado)
  ENTÃO alvo esquerdo é "atingido", score += 1
  E targets alternam direção
  ```

- [ ] **CT15 — Toca o Sino em ritmo**
  ```
  DADO BellRinger com música em 120 BPM
  QUANDO sino vermelho pulsa E player toca com mão direita dentro da janela ±200ms do beat
  ENTÃO combo += 1, narrador fala "No tempo!" em combo 5
  QUANDO erra mão (toca com esquerda no sino vermelho)
  ENTÃO combo zera
  ```

- [ ] **CT16 — Sessão Guiada roda 3 jogos em sequência**
  ```
  DADO MiniGamesHub
  QUANDO clica "Sessão Guiada"
  ENTÃO entra em CatchBicho → MiniGameResult auto-skip 5s → TrunkTwist → MiniGameResult → BellRinger → MiniGameResult agregado
  E narrador anuncia transições
  ```

#### Decisões arquiteturais adicionais

| Decisão | Justificativa |
|---------|---------------|
| Mini-jogos consomem `spatialQueries` em vez de `kp[KP.X]` direto | Mantém invariante "scenes não leem keypoints crus" — queries encapsulam a math; pose layer continua a fonte autoritativa |
| Sem detector novo no `EventDetector` (não vira heurística com cooldown global) | Mini-jogos têm timing próprio (target hit é estado momentâneo, não evento). Heurísticas globais (jump/duck/etc) são pra gameplay contínuo do endless runner; mini-jogos são "snapshots" |
| Bichos como sprites procedurais (mesma técnica do Boot.ts) | Coerente com decisão autônoma da Fase 1; arte real vai pra polish issue |
| Sessão Guiada como concatenação simples (MVP) | Versão polida (transições com tela, voz "preparem-se", contagem 3-2-1 entre jogos) vira polish issue. Aqui o MVP comprova arquitetura |
| Adiamento parcial Fase 3 → Fase 2 (Cardio guiado) | Atendendo pedido explícito do usuário; Fase 3 fica focada em mundos/personagens/2P |

#### Novos itens "Fora do escopo" (movidos pra polish/futuro)

- Sprites animados detalhados de bichos (placeholder serve)
- Música tematizada por mini-jogo (mesma run-loop usada)
- Voz "preparem-se" entre jogos da Sessão Guiada (texto e narrador básico bastam)
- Salvar high-score por mini-jogo individual (versão Fase 3 com leaderboard local)
- Animações de transição polidas entre jogos da sessão guiada
- Modo dois jogadores (Fase 3)

#### Atualizações em arquivos existentes

| Arquivo | Mudança |
|---------|---------|
| `src/game/scenes/Welcome.ts` | adicionar 2º botão grande "Mini-jogos" abaixo do "Começar" |
| `src/game/orchestrator.ts` | registrar 5 cenas novas no array de scenes |
| `public/data/missions.json` | adicionar 2 templates: `daily_30_bichos`, `daily_30_rotations` |
| `src/i18n/strings.ts` | bloco `miniGames` |
| `src/game/i18n/narratorLines.ts` | bloco `bichoCaught/trunkHit/bellOnBeat/guidedNext` |
| `src/main.ts` | helpers debug |

#### Estimativa de impacto

- ~+15 tasks em `03-tasks.md` (nova **Fase F — Mini-jogos**, depois da E)
- ~+8KB no bundle (sprites procedurais + lógica das cenas)
- Zero novas deps
- E2E ganha 4 testes (CT13-CT16); CT11 da Fase D continua válido

#### Mudanças aplicadas

- [x] Adicionado bloco "Modo Mini-jogos" em `02-spec.md` com RF25-RF35
- [x] Adicionado CT13-CT16
- [x] Atualizada seção "Fora do Escopo" com novos itens
- [x] Tasks novas (Fase F) adicionadas em `03-tasks.md`
- [x] Body da issue atualizado via comentário com resumo do refinamento

*Fim da spec.*
