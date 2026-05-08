# Especificação — Fase 3: conteúdo, progressão e modo dois jogadores

**Issue:** #5
**Data:** 2026-04-27
**Status:** Aguardando implementação
**Baseado em:** `01-research.md`

---

## Objetivo

Transformar o corredor num produto 1.0 compartilhável, adicionando variedade visual (5 mundos), personalização (3 personagens + cosméticos), progressão de longo prazo (XP/nível/conquistas), dois novos modos de jogo (cardio guiado + desafio diário) e modo local para 2 jogadores na mesma câmera.

---

## Requisitos Funcionais

### Pose Layer
- [ ] RF01: `PoseDetector` migrado para `@tensorflow-models/pose-detection` com MoveNet MultiPose-Lightning; interface `onFrame(cb)` preservada para 1P
- [ ] RF02: `KP` enum atualizado para índices COCO-17 (MoveNet); todos os consumidores (`events.ts`, `calibration.ts`, `exerciseRepDetectors.ts`, `spatialQueries.ts`) continuam funcionando sem alteração lógica
- [ ] RF03: Em modo 2P, `PoseDetector` emite frames para dois jogadores via `onMultiFrame(cb)` — poses ordenadas por posição X do quadril (menor X = P1)

### Mundos
- [ ] RF04: 5 temas de mundo definidos (`cidade`, `floresta`, `espaco`, `oceano`, `deserto`) — cada um com `bgColor`, `roadColor`, `obstacleColor`, `coinColor`, `horizonColor`, `fogColor`, `particleColor`
- [ ] RF05: `Road`, `Parallax` e `Spawner` aceitam `WorldTheme` injetado e aplicam as cores do tema proceduralmente (zero assets novos)
- [ ] RF06: Mundo ativo persiste em `InventoryStore.activeWorld`; alterado na `CharacterSelect` scene

### Personagens e cosméticos
- [ ] RF07: 3 personagens (`heroi`, `ninja`, `robo`) definidos — cada um com `name`, `cost` (moedas), `bodyColor`, `accentColor`, `trailColor`
- [ ] RF08: `Player` aceita `CharacterDef` injetado e aplica `bodyColor`/`accentColor` na textura procedural; `trailColor` aplicado no sistema de partículas
- [ ] RF09: Loja (`ShopScene`) lista personagens e cosméticos disponíveis, mostra custo em moedas e status (bloqueado/desbloqueado); compra debita `totalCoins` do perfil e grava item em `InventoryStore`
- [ ] RF10: Personagem ativo persiste em `InventoryStore.activeCharacter`; cosmético ativo persiste em `InventoryStore.activeCosmetics`
- [ ] RF11: 3 tipos de cosmético (`chapeu`, `mochila`, `trilha`) com 2 variações cada — total de 6 itens compráveis

### Progressão
- [ ] RF12: XP ganho por run = `floor(distancia_metros * 0.5 + coins * 2 + jacks * 1)` — calculado em `XPSystem.xpForRun(entry)`
- [ ] RF13: Nível calculado por `XPSystem.levelFromXp(xp)` — fórmula: `floor(Math.sqrt(xp / 50))` (nível 1 em 50xp, nível 10 em 5000xp)
- [ ] RF14: XP e nível exibidos em `Summary` ("+N XP · Nível K") e no topo do `CharacterSelect`
- [ ] RF15: HUD mostra nível atual do jogador no canto superior esquerdo (texto estático; atualizado no `create`)
- [ ] RF16: Toast de "subiu de nível!" aparece no HUD quando `profile.level` aumenta após Summary salvar perfil

### Conquistas
- [ ] RF17: 6 conquistas iniciais: `primeira_partida`, `100m`, `1000m`, `100_moedas`, `10_polichinelos`, `2p_modo` — definidas em `ACHIEVEMENT_DEFS`
- [ ] RF18: `AchievementSystem.check(profile, runEntry)` retorna array de IDs de conquistas desbloqueadas naquela run
- [ ] RF19: Conquistas desbloqueadas gravadas em `InventoryStore.achievements`; não duplicadas
- [ ] RF20: Toast de conquista aparece no `Summary` para cada conquista nova desbloqueada

### Seleção de modo/mundo/personagem
- [ ] RF21: Cena `CharacterSelect` exibe: personagem ativo (com preview colorido), seleção de mundo (5 botões com nome e cor de fundo), botão "Loja", botão "Jogar (1P)", botão "Jogar (2P)"
- [ ] RF22: Navegar para `CharacterSelect` a partir da tela `Welcome` (botão "Selecionar" ou rota após tela de boas-vindas — preservar fluxo atual "Jogar" que vai direto para `Play`)

### Modo Cardio Guiado
- [ ] RF23: Cena `CardioGuided` é um modo de corrida em que um personagem treinador animado aparece no canto da tela executando o exercício do momento; ao completar o rep, o jogo emite partículas de feedback
- [ ] RF24: Sequência de `CardioGuided`: 3 ciclos de (30s corrida livre → exercício guiado de 15s); total ~2min30; encerra com Summary
- [ ] RF25: Exercícios no `CardioGuided` reutilizam `RepDetector` de `exerciseRepDetectors.ts` e `DemoFigure` de `demoFigure.ts`

### Modo Desafio Diário
- [ ] RF26: `DailyChallenge` scene usa seed = `YYYYMMDD` (data do dia) para gerar mapa determinístico via `getRng(seed)`; todos os jogadores têm o mesmo mapa no mesmo dia
- [ ] RF27: Recorde do dia por mundo persiste em `DailyChallengeStore` como `{ date: string; distance: number }`
- [ ] RF28: `DailyChallenge` exibe recorde do dia atual no HUD; ao superar, exibe "Novo Recorde!"

### Modo 2 Jogadores
- [ ] RF29: `Play2P` scene divide o canvas em 2 metades verticais via `this.cameras.add(0, 0, 480, 540)` (P1) e `this.cameras.main.setViewport(480, 0, 480, 540)` (P2)
- [ ] RF30: Cada jogador tem pipeline completo independente: `EventDetector`, `Calibrator`, `EmaSmoother`, `Player` entity, HUD parcial (pontuação e vidas) na sua metade
- [ ] RF31: Calibração em `Play2P` aceita dois corpos simultaneamente; cada body é atribuído ao jogador mais próximo por posição X do quadril
- [ ] RF32: Partida 2P encerra quando ambos os jogadores perdem todas as vidas; `Summary2P` exibe placar lado a lado
- [ ] RF33: Achievement `2p_modo` desbloqueado ao completar primeira partida 2P

---

## Requisitos Não-Funcionais

- [ ] RNF01: Bundle gzip após adição do TF.js ≤ 15MB (medir com `vite build && du -sh dist/assets/*.js`)
- [ ] RNF02: Latência de detecção MoveNet não deve bloquear RAF; flag `detecting` garante no-overlap
- [ ] RNF03: Migração ProfileV1→V2 sem perda de `totalCoins`, `totalRuns`, `totalDistance`, `totalJacks`, `totalArmsUp`
- [ ] RNF04: Toda string PT-BR nova em `src/i18n/strings.ts` (zero strings hardcoded em cenas)
- [ ] RNF05: Tela de seleção renderiza em 960×540 sem overflow (responsivo com `setOrigin(0.5)`)

---

## Modelo de Dados

### IndexedDB — schema v2

**Nova chave:** `movemove.profile.v2`

```ts
// ProfileV2 (estende Profile de storage/profile.ts)
interface ProfileV2 {
  version: 2;
  ageGroup: AgeGroup;
  totalRuns: number;
  totalDistance: number;
  totalCoins: number;
  totalJacks: number;
  totalArmsUp: number;
  missionState: { date: string; missions: MissionInstance[] };
  xp: number;
  level: number;
}
```

**Nova chave:** `movemove.inventory.v1`

```ts
interface Inventory {
  version: 1;
  activeCharacter: string;    // 'heroi' | 'ninja' | 'robo'
  activeWorld: string;        // 'cidade' | 'floresta' | 'espaco' | 'oceano' | 'deserto'
  activeCosmetics: {
    hat?: string;
    backpack?: string;
    trail?: string;
  };
  unlockedItems: string[];    // ids de char + cosméticos comprados
  achievements: string[];     // ids de conquistas desbloqueadas
}
```

**Nova chave:** `movemove.dailyChallenge.v1`

```ts
// Record<worldId, { date: string; distance: number }>
// Ex: { "cidade": { date: "2026-04-27", distance: 342.5 } }
```

### Alterações em tipos existentes

```ts
// RunEntry (runHistory.ts) — adicionar campo:
interface RunEntry {
  // ...campos v1...
  worldId: string;  // 'cidade' por default se não especificado
}
```

```ts
// PoseFrame (types.ts) — adicionar campo opcional:
interface PoseFrame {
  keypoints: Keypoint[];
  confidence: number;
  timestamp: number;
  playerId?: 0 | 1;  // presente apenas em modo 2P
}
```

---

## Novos tipos de dados (não-storage)

```ts
// src/game/systems/worldTheme.ts
export interface WorldTheme {
  id: 'cidade' | 'floresta' | 'espaco' | 'oceano' | 'deserto';
  name: string;
  bgColor: number;
  roadColor: number;
  obstacleColor: number;
  coinColor: number;
  horizonColor: number;
  particleColor: number;
}

export const WORLD_THEMES: Record<string, WorldTheme> = {
  cidade:   { id: 'cidade',   name: 'Cidade',   bgColor: 0x1a1a2e, roadColor: 0x374151, obstacleColor: 0xe74c3c, coinColor: 0xf1c40f, horizonColor: 0x2c3e50, particleColor: 0x3498db },
  floresta: { id: 'floresta', name: 'Floresta', bgColor: 0x0d1f0d, roadColor: 0x2d5016, obstacleColor: 0x8b4513, coinColor: 0x27ae60, horizonColor: 0x1a4a1a, particleColor: 0x2ecc71 },
  espaco:   { id: 'espaco',   name: 'Espaço',   bgColor: 0x000011, roadColor: 0x1a1a3a, obstacleColor: 0x9b59b6, coinColor: 0xecf0f1, horizonColor: 0x000033, particleColor: 0xe74c3c },
  oceano:   { id: 'oceano',   name: 'Oceano',   bgColor: 0x001133, roadColor: 0x0a2a5a, obstacleColor: 0x16a085, coinColor: 0xf39c12, horizonColor: 0x003366, particleColor: 0x1abc9c },
  deserto:  { id: 'deserto',  name: 'Deserto',  bgColor: 0x3d2b1f, roadColor: 0x8b6914, obstacleColor: 0xc0392b, coinColor: 0xf39c12, horizonColor: 0x5d4037, particleColor: 0xe67e22 },
};
```

```ts
// src/game/systems/characterDef.ts
export interface CharacterDef {
  id: string;
  name: string;
  cost: number;      // 0 = grátis/padrão
  bodyColor: number;
  accentColor: number;
  trailColor: number;
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 'heroi',  name: 'Herói',  cost: 0,    bodyColor: 0x4cd964, accentColor: 0xffffff, trailColor: 0x4cd964 },
  { id: 'ninja',  name: 'Ninja',  cost: 200,  bodyColor: 0x2c2c2c, accentColor: 0xe74c3c, trailColor: 0xe74c3c },
  { id: 'robo',   name: 'Robô',   cost: 350,  bodyColor: 0x3498db, accentColor: 0xecf0f1, trailColor: 0x3498db },
];
```

```ts
// src/game/systems/cosmeticDef.ts
export interface CosmeticItem {
  id: string;
  type: 'hat' | 'backpack' | 'trail';
  name: string;
  cost: number;
  color: number;
}

export const COSMETIC_DEFS: CosmeticItem[] = [
  { id: 'hat_pirata',   type: 'hat',      name: 'Chapéu Pirata',   cost: 150, color: 0x2c2c2c },
  { id: 'hat_corona',   type: 'hat',      name: 'Coroa',           cost: 300, color: 0xf1c40f },
  { id: 'back_mochila', type: 'backpack', name: 'Mochila Espacial',cost: 200, color: 0x9b59b6 },
  { id: 'back_asas',    type: 'backpack', name: 'Asas',            cost: 250, color: 0xecf0f1 },
  { id: 'trail_fogo',   type: 'trail',    name: 'Trilha de Fogo',  cost: 180, color: 0xe74c3c },
  { id: 'trail_gelo',   type: 'trail',    name: 'Trilha de Gelo',  cost: 180, color: 0x3498db },
];
```

---

## Cenas Phaser — modificar e criar

### Cenas a criar

| Arquivo | Descrição | Acesso via |
|---------|-----------|------------|
| `src/game/scenes/CharacterSelect.ts` | Seleção de personagem, mundo, modo de jogo e atalho para loja | `Welcome` → "Personalizar" |
| `src/game/scenes/Shop.ts` | Loja in-game com personagens e cosméticos | `CharacterSelect` → "Loja" |
| `src/game/scenes/CardioGuided.ts` | Corrida em blocos com exercícios guiados intercalados | `CharacterSelect` → "Cardio Guiado" |
| `src/game/scenes/DailyChallenge.ts` | Corrida com mapa seed=data; recorde local por mundo | `CharacterSelect` → "Desafio Diário" |
| `src/game/scenes/Play2P.ts` | Corrida 2 jogadores, split-screen, 2 pipelines de pose | `CharacterSelect` → "Jogar (2P)" |
| `src/game/scenes/Summary2P.ts` | Placar pós-partida 2P, lado a lado | Encerramento de `Play2P` |

### Cenas a modificar

| Arquivo | O que muda |
|---------|------------|
| `src/game/scenes/Welcome.ts` | Adicionar botão "Personalizar" que vai para `CharacterSelect` |
| `src/game/scenes/Play.ts` | Receber `worldTheme` e `characterDef` via `init(data)` |
| `src/game/scenes/Summary.ts` | Exibir linha "+N XP · Nível K" + toasts de conquistas |
| `src/game/scenes/MiniGamesHub.ts` | Adicionar card "Desafio Diário" |
| `src/game/orchestrator.ts` | Adicionar `eventDetector2`, `calibrator2`, `onSmoothedFrame2` a `AppRefs` |

### Sistemas a criar

| Arquivo | Propósito |
|---------|-----------|
| `src/game/systems/worldTheme.ts` | `WorldTheme` type + `WORLD_THEMES` record + `getActiveTheme(inventory)` |
| `src/game/systems/characterDef.ts` | `CharacterDef` type + `CHARACTER_DEFS` array + `getActiveCharacter(inventory)` |
| `src/game/systems/cosmeticDef.ts` | `CosmeticItem` type + `COSMETIC_DEFS` array |
| `src/game/systems/xp.ts` | `xpForRun(entry)` + `levelFromXp(xp)` + `xpToNextLevel(level)` |
| `src/game/systems/achievements.ts` | `ACHIEVEMENT_DEFS` + `check(profile, runEntry, inventory)` |

### Storage a criar

| Arquivo | Propósito |
|---------|-----------|
| `src/game/storage/inventory.ts` | `InventoryStore` (idb-keyval, key `movemove.inventory.v1`) com migração de v1 |
| `src/game/storage/dailyChallenge.ts` | `DailyChallengeStore` (idb-keyval, key `movemove.dailyChallenge.v1`) |

---

## Cenários de Teste (OBRIGATÓRIOS)

> UI = sim (cria CharacterSelect, Shop, CardioGuided, DailyChallenge, Play2P, Summary2P)

### CT01: Fluxo de seleção → corrida com tema
```
DADO QUE usuário está na tela Welcome
QUANDO clica "Personalizar"
ENTÃO navegação para CharacterSelect
QUANDO seleciona mundo "Floresta" e clica "Jogar (1P)"
ENTÃO Play inicia com bgColor=0x0d1f0d e roadColor=0x2d5016
```

### CT02: Comprar personagem na loja
```
DADO QUE perfil tem totalCoins ≥ 200
QUANDO usuário abre Shop e compra Ninja (custo 200)
ENTÃO totalCoins decresce 200
E 'ninja' aparece em inventory.unlockedItems
E personagem Ninja fica disponível para seleção
```

### CT03: XP e nível — cálculo correto
```
DADO QUE run registra: distância=100m, coins=10, jacks=5
QUANDO XPSystem.xpForRun(entry) é chamado
ENTÃO retorna floor(100*0.5 + 10*2 + 5*1) = 75 XP
QUANDO profile.xp = 75 e levelFromXp(75) é chamado
ENTÃO retorna floor(sqrt(75/50)) = 1
```

### CT04: Conquista desbloqueada
```
DADO QUE usuário completa primeira partida (totalRuns=0 antes do run)
QUANDO AchievementSystem.check(profile, runEntry, inventory) é chamado
ENTÃO retorna ['primeira_partida']
E achievement aparece como toast no Summary
E inventory.achievements inclui 'primeira_partida' (não duplicado em runs seguintes)
```

### CT05: Desafio Diário — mapa determinístico
```
DADO QUE data = "2026-04-27"
QUANDO DailyChallenge scene inicia com seed=20260427 (worldId="cidade")
E QUANDO a mesma cena inicia novamente na mesma data
ENTÃO spawner produz exatamente a mesma sequência de obstáculos
```

### CT06: 2P — dois jogadores, dois pipelines
```
DADO QUE Play2P scene inicia
ENTÃO canvas tem viewport P1 (x=0, w=480) e viewport P2 (x=480, w=480)
E existem dois Player entities em cenas separadas (um por viewport)
E EventDetector P1 e P2 são instâncias independentes
```

### CT07: 2P — conquista desbloqueada
```
DADO QUE usuário completa primeira partida no modo 2P
QUANDO Summary2P salva perfil
ENTÃO '2p_modo' está em inventory.achievements
```

### CT08: Migração ProfileV1 → V2
```
DADO QUE idb-keyval tem 'movemove.profile.v1' com totalCoins=50, totalRuns=3
QUANDO ProfileStore.load() é chamado pela primeira vez com v2
ENTÃO perfil v2 tem xp=0, level=0, totalCoins=50, totalRuns=3
E chave 'movemove.profile.v2' existe no IndexedDB
```

### CT09: E2E click-by-click [E2E click-by-click]

**Pré-condições:** `npm run dev` rodando em `https://localhost:5173`, Playwright com `--use-fake-device`.

**Sequência:**

1. Abrir `https://localhost:5173`
2. Aguardar `Welcome` scene carregar (botão "Jogar" visível)
3. Clicar botão "Personalizar" → verificar `CharacterSelect` renderiza (título e 5 botões de mundo visíveis)
4. Clicar botão "Floresta" → verificar botão fica destacado (selecionado)
5. Clicar botão "Loja" → verificar `Shop` scene renderiza (lista de personagens e cosméticos visível)
6. Verificar que personagem Herói tem status "Ativo" e Ninja tem "200 moedas"
7. Clicar ← Voltar → verificar retorno a `CharacterSelect`
8. Clicar "Jogar (1P)" → verificar `Play` scene inicia com fundo verde-escuro (Floresta: `bgColor=0x0d1f0d`)
9. Aguardar 3s (countdown) → verificar corrida em andamento (Player se move)
10. Acionar GameOver (deixar energia zerar via `?debug=1` → tecla `D`) → verificar `Summary` aparece com linha "XP" visível
11. Clicar "Jogar de Novo" → verificar reinício correto
12. Clicar ← para voltar ao Welcome → verificar sem erros no console

**Saída obrigatória:**
- Screenshots em `load-tests/results/issue-5-journey/`
- `README.md` com lista de elementos testados e bugs encontrados
- Comentário na issue #5 com link dos screenshots

---

## Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| MoveNet MultiPose-Lightning (não MoveNet SinglePose) | Suporta 2 corpos sem troca de modelo em runtime; Lightning tem latência < Thunder em mobile |
| RAF async com flag `detecting` (não `await` no tick) | `requestAnimationFrame` não aceita callback async; flag evita runs sobrepostos sem descartar frames |
| `Play2P` como cena separada, não flag `isMultiplayer` em `Play` | `Play.ts` já tem ~350 linhas; adicionar 2P como flag criaria código morto condicional por toda a cena |
| Temas de mundo = paleta procedural (zero assets) | ADR-6 fecha essa decisão; sprite art real é follow-up issue |
| `InventoryStore` separado de `ProfileStore` | Separação de responsabilidade; `ProfileStore` acumula métricas de corrida (escrita frequente); `InventoryStore` é escrito apenas na compra/unlock (escrita rara) |
| `DailyChallengeStore` separado | Evita crescimento ilimitado de `ProfileStore` com recordes por mundo por dia |
| XP fórmula `floor(sqrt(xp/50))` | Progresso não-linear: primeiros níveis rápidos, níveis altos demandam mais tempo; curva comum em jogos para crianças |

---

## Fora do Escopo

- Sprites reais de personagens (ADR-2/ADR-6 pendentes — issue de polish separada)
- Bitmap font pixel art (ADR-2 pendente)
- Multiplayer online / sync de recordes via servidor
- Microtransações (confirmado: loja só com moedas in-game)
- Suporte a mais de 2 jogadores simultâneos
- Importação de recordes de perfis diferentes (sem conta de usuário)
- iOS PWA (`display: standalone`) — adiado conforme achado do CODEMAP

---

## Docs canônicas a atualizar (após implementação)

- [x] `/docs/CODEMAP.md` — atualizar status do projeto para Fase 3, adicionar novos sistemas e cenas
- [x] `/docs/CHANGELOG.md` — entrada da feature
- [ ] `/docs/ARCHITECTURE.md` — não muda (nenhum container novo)
- [ ] `/docs/MODULES.md` — não existe no projeto (não aplicável)
- [ ] `/docs/database-documentation.md` — não existe (não aplicável)
