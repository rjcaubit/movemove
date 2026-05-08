# Pesquisa — Fase 3: conteúdo, progressão e modo dois jogadores

**Issue:** #5
**Data:** 2026-04-27
**Tipo:** feature
**Baseado em:** `00-design.md` + body da issue

---

## Problema / Necessidade

O jogo atualmente é um único loop de corrida sem progressão de longo prazo. Uma criança que joga pela segunda vez vê exatamente a mesma experiência que na primeira — sem desbloqueáveis, sem variação visual, sem recordes comparáveis entre sessões.

A Fase 3 cobre os pilares que fazem o produto ser compartilhável: variedade visual (5 mundos), customização do personagem (3 personagens + cosméticos), progressão mensurável (XP/nível/conquistas), novos modos (cardio guiado estilo YouTube + desafio diário) e modo 2 jogadores local com câmera única. É a versão 1.0.

---

## Análise de Dependências

### O que já existe e reuso (fonte: CODEMAP)

| Item | Localização | Como uso |
|------|-------------|----------|
| `PoseDetector` | `src/pose/poseDetector.ts` | Reescrever para MoveNet MultiPose; manter mesma interface `onFrame` |
| `KP` enum (keypoint indices) | `src/pose/types.ts` | Atualizar índices de BlazePose-33 para COCO-17 (MoveNet) |
| `PoseFrame` / `Keypoint` | `src/pose/types.ts` | Reusar; atualizar comentário de 33 para 17 keypoints |
| `EventDetector` | `src/pose/events.ts` | Instanciar 2x para 2P; lógica interna inalterada (usa KP enum) |
| `Calibrator` | `src/pose/calibration.ts` | Instanciar 2x para 2P; lógica inalterada (usa KP enum) |
| `EmaSmoother` | `src/pose/smoother.ts` | Instanciar 2x para 2P; inalterado |
| `ProfileStore` | `src/game/storage/profile.ts` | Estender schema v1→v2 (XP, level, char, world, inventory, achievements) |
| `RunHistoryStore` | `src/game/storage/runHistory.ts` | Estender `RunEntry` com campo `worldId` |
| `AppRefs` | `src/game/orchestrator.ts` | Adicionar refs de 2P: `eventDetector2`, `calibrator2`, `onSmoothedFrame2` |
| `GAME_CONFIG` | `src/game/config.ts` | Adicionar `numPlayers: 1 \| 2` e refs de viewport |
| `POSE_CONFIG` | `src/pose/config.ts` | Alterar `numPoses: 1` → `2` para 2P |
| `Play` scene | `src/game/scenes/Play.ts` | Adicionar injeção de `worldTheme` e `characterDef` ativos |
| `MiniGamesHub` | `src/game/scenes/MiniGamesHub.ts` | Adicionar botão para modo Desafio Diário |
| `Summary` scene | `src/game/scenes/Summary.ts` | Exibir XP ganho + nível atual |
| `Road` / `Parallax` / `Spawner` | `src/game/systems/` | Injetar `WorldTheme` para trocar paleta procedural |
| `HUD` | `src/game/ui/hud.ts` | Adicionar display de nível e notificação de achievement |
| `src/i18n/strings.ts` | strings PT-BR | Adicionar keys para mundos, personagens, loja, conquistas, modos |
| `exerciseRepDetectors.ts` | `src/game/systems/` | Inalterado após atualizar enum KP |
| `spatialQueries.ts` | `src/pose/` | Inalterado após atualizar enum KP |
| `Parallax` | `src/game/systems/parallax.ts` | Passar `worldTheme.bgColor`/`horizonColor` |
| `Road` | `src/game/systems/road.ts` | Passar `worldTheme.roadColor` |
| `Player` entity | `src/game/entities/Player.ts` | Injetar `CharacterDef` para trocar cor do personagem |
| Playwright E2E infra | `e2e/` | Adicionar specs de 2P e novos modos |

### O que preciso criar (porque não existe)

| Item | Tipo | Onde viverá | Por que não reuso nada |
|------|------|-------------|------------------------|
| `WorldTheme` type + 5 definições | dados + tipo | `src/game/systems/worldTheme.ts` | Não existe sistema de temas |
| `CharacterDef` type + 3 definições | dados + tipo | `src/game/systems/characterDef.ts` | Não existe sistema de personagens |
| `CosmeticItem` type + catálogo | dados + tipo | `src/game/systems/cosmeticDef.ts` | Não existe sistema de cosméticos |
| `InventoryStore` (IndexedDB) | storage | `src/game/storage/inventory.ts` | Inventário não existe; profile v1 só tem `totalCoins` |
| `AchievementsStore` | storage | `src/game/storage/achievements.ts` | Não existe |
| `DailyChallengeStore` | storage | `src/game/storage/dailyChallenge.ts` | Não existe |
| `ProfileV2` migration | migração | `src/game/storage/profile.ts` (estender) | v1 não tem XP/level/inventory refs |
| `XPSystem` | sistema | `src/game/systems/xp.ts` | Não existe |
| `AchievementSystem` | sistema | `src/game/systems/achievements.ts` | Não existe |
| `CharacterSelect` scene | cena Phaser | `src/game/scenes/CharacterSelect.ts` | Não existe tela de seleção |
| `ShopScene` | cena Phaser | `src/game/scenes/Shop.ts` | Não existe loja |
| `CardioGuided` scene | cena Phaser | `src/game/scenes/CardioGuided.ts` | `GuidedSession` (issue #4) é exercícios livres; CardioGuided é modo de corrida com treinador |
| `DailyChallenge` scene | cena Phaser | `src/game/scenes/DailyChallenge.ts` | Não existe |
| `Play2P` scene | cena Phaser | `src/game/scenes/Play2P.ts` | `Play` é 1P; 2P requer 2 pipelines de pose + split-screen |

### Padrões canônicos que vou seguir

- `import * as Phaser from 'phaser'` (ESM, sem default export)
- Poses layer abstrai keypoints — cenas não leem KP diretamente; usam `EventDetector`
- Refs compartilhadas via `game.registry` / `AppRefs`
- Strings centralizadas em `src/i18n/strings.ts`
- Persistência: `idb-keyval` para profile/inventory; `localStorage` para settings/flags
- Imports com extensão explícita (`.ts`)
- Sons gated por `cache.audio.exists()`
- Bundle deve permanecer <15MB gzip (acréscimo TF.js ~2MB gzip estimado)

---

## Código existente relacionado

| Arquivo | O que faz | Relevância | Ação |
|---------|-----------|------------|------|
| `src/pose/poseDetector.ts` | Detecta pose MediaPipe, emite PoseFrame | Alta | Reescrever para MoveNet MultiPose async |
| `src/pose/types.ts` | KP enum (BlazePose-33) + PoseFrame | Alta | Atualizar KP para COCO-17 |
| `src/pose/events.ts` | EventDetector — 6 heurísticas via KP enum | Alta | Instanciar 2x; lógica inalterada |
| `src/pose/calibration.ts` | Calibrator via KP enum | Alta | Instanciar 2x; lógica inalterada |
| `src/game/storage/profile.ts` | ProfileStore, schema v1 | Alta | Adicionar migração v2 |
| `src/game/scenes/Play.ts` | Loop principal do corredor | Alta | Injetar WorldTheme + CharacterDef |
| `src/game/systems/parallax.ts` | 3+ camadas de paralax procedural | Média | Aceitar cor de fundo por WorldTheme |
| `src/game/systems/road.ts` | Pista pseudo-3D procedural | Média | Aceitar roadColor por WorldTheme |
| `src/game/systems/spawner.ts` | Spawn de obstáculos/moedas | Média | Aceitar cor de obstáculo/moeda por WorldTheme |
| `src/game/scenes/Summary.ts` | Tela de resumo pós-run | Média | Adicionar linha de XP ganho + nível |
| `src/game/ui/hud.ts` | HUD durante o jogo | Média | Adicionar badge de nível + toast de achievement |
| `src/game/scenes/MiniGamesHub.ts` | Hub dos mini-jogos | Baixa | Adicionar cartão "Desafio Diário" |

---

## Decisões tomadas

| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| MoveNet MultiPose-Lightning (`@tensorflow-models/pose-detection`) | Continuar MediaPipe com `numPoses: 2` | ADR-3 fechado no study #1; MoveNet MultiPose tem latência menor para 2 corpos simultâneos |
| PoseDetector async RAF com flag `detecting` | `await` bloqueante no RAF | RAF não pode ser assíncrono; flag garante no-overlap sem pular frames |
| KP enum COCO-17 (mesmo objeto `KP`, novos valores) | Novo objeto `KP_MOVENET` em paralelo | Muda num único lugar; todos os consumidores (events, calibration, spatialQueries) usam o mesmo `KP` |
| `Play2P` scene separada | Modificar `Play` para suportar 2P via flag | `Play` já tem 350+ linhas; duplicar sistemas dentro dela seria inviável. `Play2P` reutiliza funções helpers extraídas |
| Inventário como store separado (`InventoryStore`) | Embutir no ProfileStore | Profile v1 já tem campos acumulados; separar por responsabilidade evita race conditions entre runs |
| Temas de mundo = objetos com cores procedurais (ADR-6) | Assets sprite novos por mundo | ADR-6 resolve visualmente barato; sprites reais ficam para issue de polish |
| 3 personagens na v1.0 | 5 personagens | Reduz tempo de design; pode expandir pós-lançamento |
| Split-screen: viewport Phaser (`cameras.add`) | 2 instâncias Phaser separadas | Phaser multi-câmera é nativo e compartilha recursos; 2 instâncias dobrariam WASM/TF.js |

---

## Riscos técnicos

- **MoveNet bundle size**: `@tensorflow-models/pose-detection` + `@tensorflow/tfjs-backend-webgl` + `@tensorflow/tfjs-core` + `@tensorflow/tfjs-converter` adicionam ~2-3MB gzip. Verificar após build; se >3MB, avaliar usar CDN vs bundle (Vite `build.rollupOptions.external`).
- **MoveNet em iOS Safari**: WebGL backend pode ter quirks; testar com `--use-fake-device` no CI e com dispositivo real se disponível.
- **Latência async MoveNet**: detecção leva 15-30ms. Com flag `detecting`, o RAF não bloqueia mas a taxa efetiva de detecção cai de ~60fps para ~30-40fps. Aceitável para o jogo.
- **Calibração 2P**: dois jogadores na mesma câmera podem se sobrepor. Estratégia: sortear poses por posição X do quadril (esquerda = P1, direita = P2) antes de alimentar calibradores.
- **IndexedDB v2**: se usuário tiver perfil v1, migrar sem perda de `totalCoins`, `totalRuns`, `totalDistance`. Chave nova `movemove.profile.v2`; seed a partir de v1.
- **Playwright E2E para 2P**: `--use-fake-device` injeta 1 body; 2P requer mock de `PoseDetector` no teste. Usar `?debug=1` keyboard fallback para simular 2 jogadores.
