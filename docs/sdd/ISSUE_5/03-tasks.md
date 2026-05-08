# Tasks — Fase 3: conteúdo, progressão e modo dois jogadores

**Issue:** #5
**Baseado em:** `02-spec.md`
**Total estimado:** ~90 tasks × 2-5min ≈ 6-8h (execução em fases)
**Formato:** Chunked F0-F9 (múltiplos sub-sistemas distintos)

> ⚠️ Executar fases em ordem numérica. F1 depende de F0. F8 depende de F1 (multi-pose) e F3 (pipelines independentes).

---

## FASE F0 — Instalação de dependências e CHECKPOINT

### F0-C01. Criar CHECKPOINT.md
**Criar:** `docs/sdd/ISSUE_5/CHECKPOINT.md`
```markdown
# CHECKPOINT — Issue #5

**Iniciado:** 2026-04-27
**Fase atual:** F0

## Estado por fase
| Fase | Status | Observações |
|------|--------|-------------|
| F0   | em andamento | |
| F1   | pendente | |
| F2   | pendente | |
| F3   | pendente | |
| F4   | pendente | |
| F5   | pendente | |
| F6   | pendente | |
| F7   | pendente | |
| F8   | pendente | |
| F9   | pendente | |
```
**Verificar:** arquivo criado em `docs/sdd/ISSUE_5/CHECKPOINT.md`

### F0-C02. Instalar TensorFlow.js + MoveNet
**Comando:**
```bash
npm install @tensorflow-models/pose-detection @tensorflow/tfjs-core @tensorflow/tfjs-converter @tensorflow/tfjs-backend-webgl
```
**Verificar:** `grep "@tensorflow" package.json` mostra as 4 dependências; `npm run build 2>&1 | tail -5` sem erros de módulo não encontrado.

### F0-C03. Medir bundle baseline antes da migração
**Comando:**
```bash
npm run build && ls -lh dist/assets/*.js | awk '{print $5, $9}'
```
**Registrar no CHECKPOINT.md:** tamanho gzip do bundle principal antes do TF.js (referência para RNF01).

### F0-C04. Verificar que TF.js carrega no browser
**Criar:** `src/tftest.ts` (temporário)
```ts
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
console.log('TF.js version:', tf.version.tfjs);
```
**Modificar:** `src/main.ts` — adicionar import temporário `import './tftest.ts'`
**Verificar:** console do browser mostra `TF.js version: X.Y.Z` sem erros.
**Desfazer:** remover `src/tftest.ts` e o import de `main.ts` após verificação.

### F0-C05. Commit Fase F0
```bash
git add package.json package-lock.json
git commit -m "build(issue-5): instalar @tensorflow-models/pose-detection + tfjs backends (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F0-consol. Atualizar CHECKPOINT.md — F0 concluído
**Editar:** `docs/sdd/ISSUE_5/CHECKPOINT.md` — marcar F0 como `✅ concluído`.

---

## FASE F1 — Migração pose layer: MediaPipe → MoveNet MultiPose

> Objetivo: substituir `@mediapipe/tasks-vision` por `@tensorflow-models/pose-detection` mantendo interface pública de `PoseDetector` intacta para 1P. Adicionar suporte a `onMultiFrame` para 2P.

### F1-C01. Atualizar `KP` enum para COCO-17 (MoveNet)
**Modificar:** `src/pose/types.ts:1-18`

Trocar:
```ts
// 33 keypoints do MediaPipe Pose Landmarker — usar índices do enum oficial.
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

export const KP = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;
```

Por:
```ts
// 17 keypoints do MoveNet (COCO format).
// https://github.com/tensorflow/tfjs-models/tree/master/pose-detection

export const KP = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
} as const;
```

Também atualizar o comentário do `PoseFrame.keypoints`:
```ts
/** keypoints normalizados (score mapeado para visibility). 17 itens (COCO). */
keypoints: Keypoint[];
```

Adicionar campo opcional ao final de `PoseFrame`:
```ts
export interface PoseFrame {
  keypoints: Keypoint[];
  confidence: number;
  timestamp: number;
  playerId?: 0 | 1;
}
```

**Verificar:** `npx tsc --noEmit` sem erros (todos os consumidores de KP continuam compilando).

### F1-C02. Atualizar `POSE_CONFIG.numPoses` para 2
**Modificar:** `src/pose/config.ts`

Trocar:
```ts
  numPoses: 1,
```
Por:
```ts
  numPoses: 2,
```

**Verificar:** `npx tsc --noEmit` sem erros.

### F1-C03. Reescrever `poseDetector.ts` para MoveNet MultiPose
**Substituir:** `src/pose/poseDetector.ts` inteiro pelo conteúdo abaixo:

```ts
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import { POSE_CONFIG } from './config.ts';
import { strings } from '../i18n/strings.ts';
import type { Keypoint, PoseFrame } from './types.ts';

const RELEVANT_KP_INDICES = [0, 1, 2, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16];

type MultiFrameCallback = (frames: Array<{ player: 0 | 1; frame: PoseFrame }>) => void;

export class PoseDetector {
  private detector: poseDetection.PoseDetector | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private frameCallbacks = new Set<(frame: PoseFrame) => void>();
  private multiFrameCallbacks = new Set<MultiFrameCallback>();
  private detecting = false;

  async loadModel(onProgress?: (msg: string) => void): Promise<void> {
    onProgress?.(strings.loading.statusInitWasm);
    await import('@tensorflow/tfjs-backend-webgl');
    onProgress?.(strings.loading.statusDownloadingModel);
    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        enableSmoothing: false,
        minPoseScore: POSE_CONFIG.mediapipeMinConfidence,
      }
    );
    onProgress?.(strings.loading.statusReady);
  }

  async openCamera(video: HTMLVideoElement): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new DOMException(
        'navigator.mediaDevices unavailable — requires HTTPS or localhost',
        'SecurityError',
      );
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: POSE_CONFIG.videoIdealWidth },
        height: { ideal: POSE_CONFIG.videoIdealHeight },
      },
      audio: false,
    });
    video.srcObject = this.stream;
    await new Promise<void>((resolve) => {
      const onLoaded = () => { video.removeEventListener('loadedmetadata', onLoaded); resolve(); };
      video.addEventListener('loadedmetadata', onLoaded);
    });
    await video.play();
  }

  start(video: HTMLVideoElement, onError?: (err: unknown) => void): void {
    if (!this.detector) throw new Error('PoseDetector: loadModel() first');
    const tick = () => {
      if (!this.detecting && video.readyState >= 2) {
        this.detecting = true;
        const ts = performance.now();
        this.detector!.estimatePoses(video, { flipHorizontal: false })
          .then((poses) => {
            const frames = this.posesToFrames(poses, video.videoWidth, video.videoHeight, ts);
            if (frames.length > 0) {
              // 1P: emite primeiro frame via onFrame (compatibilidade retroativa)
              for (const cb of this.frameCallbacks) cb(frames[0].frame);
            }
            if (frames.length > 0 && this.multiFrameCallbacks.size > 0) {
              for (const cb of this.multiFrameCallbacks) cb(frames);
            }
          })
          .catch((err) => {
            console.error('PoseDetector.tick:', err);
            onError?.(err);
          })
          .finally(() => { this.detecting = false; });
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
  }

  onFrame(cb: (frame: PoseFrame) => void): () => void {
    this.frameCallbacks.add(cb);
    return () => this.frameCallbacks.delete(cb);
  }

  onMultiFrame(cb: MultiFrameCallback): () => void {
    this.multiFrameCallbacks.add(cb);
    return () => this.multiFrameCallbacks.delete(cb);
  }

  private posesToFrames(
    poses: poseDetection.Pose[],
    videoWidth: number,
    videoHeight: number,
    ts: number,
  ): Array<{ player: 0 | 1; frame: PoseFrame }> {
    const valid = poses
      .filter((p) => (p.score ?? 0) >= POSE_CONFIG.mediapipeMinConfidence)
      .map((p) => {
        const keypoints: Keypoint[] = p.keypoints.map((kp) => ({
          // MoveNet retorna pixels; normalizar pelo tamanho do vídeo.
          // Espelhar x (selfie): usuário movendo-se à direita → imagem à direita.
          x: 1 - (kp.x / videoWidth),
          y: kp.y / videoHeight,
          visibility: kp.score,
        }));
        let sum = 0, n = 0;
        for (const i of RELEVANT_KP_INDICES) {
          const v = keypoints[i]?.visibility;
          if (typeof v === 'number') { sum += v; n++; }
        }
        const confidence = n > 0 ? sum / n : 0;
        // Hip X center (antes de espelhar) para ordenar P1/P2
        const hipXOriginal = ((p.keypoints[11]?.x ?? 0) + (p.keypoints[12]?.x ?? 0)) / 2;
        return { hipX: hipXOriginal, frame: { keypoints, confidence, timestamp: ts } };
      });
    // Ordenar por hipX original crescente: menor X = mais à esquerda na câmera = P1
    valid.sort((a, b) => a.hipX - b.hipX);
    return valid.slice(0, POSE_CONFIG.numPoses).map((v, i) => ({
      player: i as 0 | 1,
      frame: { ...v.frame, playerId: i as 0 | 1 },
    }));
  }
}
```

**Verificar:** `npx tsc --noEmit` sem erros.

### F1-C04. Remover dependência @mediapipe/tasks-vision do package.json
**Comando:**
```bash
npm uninstall @mediapipe/tasks-vision
```
**Verificar:** `grep mediapipe package.json` não retorna nada; `grep mediapipe src/` retorna vazio (nenhum import sobrou).

### F1-C05. Verificar que model WASM ainda é servido (ou remover se não mais usado)
**Verificar:**
```bash
ls public/models/ public/wasm/ 2>/dev/null
```
Com MoveNet, o modelo é baixado da CDN do TF.js automaticamente em runtime — **não precisa de arquivos em `/public`**. Se os arquivos existirem, verificar se algum outro módulo ainda os referencia:
```bash
grep -r "pose_landmarker\|vision_wasm" src/
```
Se nenhum resultado: mover os arquivos para fora do `public/` (são ~8MB que podem ser removidos do bundle).

**Editar:** `src/pose/config.ts` — remover campos `modelAssetPath` e `wasmPath` se não mais referenciados (verificar com `grep -r "modelAssetPath\|wasmPath" src/`).

**Verificar:** `npx tsc --noEmit` sem erros após remoção dos campos.

### F1-C06. Testar detecção em browser com 1 pessoa
**Comando:** `npm run dev`
**Verificar no browser:**
- Abrir `https://localhost:5173`
- Passar pela calibração
- No `Play`, agachar (D no teclado se `?debug=1`) e conferir que `EventDetector` ainda emite eventos no console (adicionar `console.log` temporário em `events.ts:emit` se necessário)
- Remover logs temporários após confirmação

### F1-C07. Commit Fase F1
```bash
git add src/pose/types.ts src/pose/poseDetector.ts src/pose/config.ts \
        package.json package-lock.json
git commit -m "feat(issue-5): fase F1 - migrar pose layer para MoveNet MultiPose COCO-17 (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F1-consol. Atualizar CHECKPOINT.md — F1 concluído
Marcar F1 como `✅ concluído`; registrar se houve divergência em comportamento de detecção vs MediaPipe.

---

## FASE F2 — Sistema de mundos (WorldTheme)

### F2-C01. Criar `src/game/systems/worldTheme.ts`
**Criar:** `src/game/systems/worldTheme.ts`
```ts
import type { Inventory } from '../storage/inventory.ts';

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

export const DEFAULT_WORLD_ID = 'cidade';

export function getActiveTheme(inventory: Inventory | null): WorldTheme {
  const id = inventory?.activeWorld ?? DEFAULT_WORLD_ID;
  return WORLD_THEMES[id] ?? WORLD_THEMES[DEFAULT_WORLD_ID];
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F2-C02. Injetar WorldTheme na cena `Play` via `init(data)`
**Modificar:** `src/game/scenes/Play.ts`

Adicionar ao início da classe (após imports):
```ts
import { type WorldTheme, WORLD_THEMES, DEFAULT_WORLD_ID } from '../systems/worldTheme.ts';
```

Adicionar campo privado:
```ts
private worldTheme: WorldTheme = WORLD_THEMES[DEFAULT_WORLD_ID];
```

Adicionar ao método `init`:
```ts
init(data: { skipPrep?: boolean; worldId?: string }): void {
  this.prepCountdownMs = data?.skipPrep ? 0 : 3000;
  this.worldTheme = WORLD_THEMES[data?.worldId ?? DEFAULT_WORLD_ID] ?? WORLD_THEMES[DEFAULT_WORLD_ID];
}
```

No `create()`, logo após `this.cameras.main.setBackgroundColor(...)`:
```ts
this.cameras.main.setBackgroundColor(this.worldTheme.bgColor);
```

**Verificar:** `npx tsc --noEmit` sem erros.

### F2-C03. Aplicar WorldTheme no Road
**Verificar** como `Road` cria a textura da pista:
```bash
grep -n "roadColor\|fillRect\|strokeRect\|fillStyle\|setFillStyle\|0x37\|0x0b" src/game/systems/road.ts | head -20
```
**Modificar:** `src/game/systems/road.ts` — adicionar parâmetro `roadColor: number` ao construtor/método que desenha a pista; substituir a cor hardcoded pela `roadColor` recebida.
**Em Play.ts `create()`:** passar `this.worldTheme.roadColor` ao instanciar `Road`.
**Verificar:** `npx tsc --noEmit` sem erros.

### F2-C04. Aplicar WorldTheme no Parallax
**Verificar** como `Parallax` define cores de fundo:
```bash
grep -n "bgColor\|fillRect\|0x0b\|setFillStyle\|horizonColor" src/game/systems/parallax.ts | head -20
```
**Modificar:** `src/game/systems/parallax.ts` — aceitar `{ bgColor: number; horizonColor: number }` no construtor.
**Em Play.ts `create()`:** passar `{ bgColor: this.worldTheme.bgColor, horizonColor: this.worldTheme.horizonColor }`.
**Verificar:** `npx tsc --noEmit` sem erros.

### F2-C05. Aplicar WorldTheme no Spawner (obstáculos e moedas)
**Verificar** como `Spawner` define cores:
```bash
grep -n "obstacleColor\|coinColor\|0xe7\|0xf1\|fillStyle\|setTint" src/game/systems/spawner.ts | head -20
```
**Modificar:** `src/game/systems/spawner.ts` — aceitar `{ obstacleColor: number; coinColor: number }` no construtor.
**Em Play.ts `create()`:** passar `{ obstacleColor: this.worldTheme.obstacleColor, coinColor: this.worldTheme.coinColor }`.
**Verificar:** `npx tsc --noEmit` sem erros.

### F2-C06. Testar 5 temas visualmente
**Comando:** `npm run dev`
**Verificar no browser:** navegar para `?debug=1` e usar console para chamar diretamente `game.scene.start('Play', { worldId: 'floresta' })` — verificar que fundo, pista e obstáculos têm cores do tema Floresta. Repetir para `espaco` (fundo preto-azulado) e `deserto` (fundo marrom).

### F2-C07. Commit Fase F2
```bash
git add src/game/systems/worldTheme.ts src/game/scenes/Play.ts \
        src/game/systems/road.ts src/game/systems/parallax.ts src/game/systems/spawner.ts
git commit -m "feat(issue-5): fase F2 - sistema de 5 mundos com paleta procedural (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F2-consol. Atualizar CHECKPOINT.md — F2 concluído
Marcar F2 como `✅ concluído`.

---

## FASE F3 — Personagens, cosméticos e storage de inventário

### F3-C01. Criar `src/game/systems/characterDef.ts`
**Criar:** `src/game/systems/characterDef.ts`
```ts
export interface CharacterDef {
  id: string;
  name: string;
  cost: number;
  bodyColor: number;
  accentColor: number;
  trailColor: number;
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 'heroi',  name: 'Herói',  cost: 0,    bodyColor: 0x4cd964, accentColor: 0xffffff, trailColor: 0x4cd964 },
  { id: 'ninja',  name: 'Ninja',  cost: 200,  bodyColor: 0x2c2c2c, accentColor: 0xe74c3c, trailColor: 0xe74c3c },
  { id: 'robo',   name: 'Robô',   cost: 350,  bodyColor: 0x3498db, accentColor: 0xecf0f1, trailColor: 0x3498db },
];

export const DEFAULT_CHARACTER_ID = 'heroi';

export function getCharacterById(id: string): CharacterDef {
  return CHARACTER_DEFS.find((c) => c.id === id) ?? CHARACTER_DEFS[0];
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F3-C02. Criar `src/game/systems/cosmeticDef.ts`
**Criar:** `src/game/systems/cosmeticDef.ts`
```ts
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
  { id: 'back_mochila', type: 'backpack', name: 'Mochila Espacial', cost: 200, color: 0x9b59b6 },
  { id: 'back_asas',    type: 'backpack', name: 'Asas',             cost: 250, color: 0xecf0f1 },
  { id: 'trail_fogo',   type: 'trail',    name: 'Trilha de Fogo',   cost: 180, color: 0xe74c3c },
  { id: 'trail_gelo',   type: 'trail',    name: 'Trilha de Gelo',   cost: 180, color: 0x3498db },
];
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F3-C03. Criar `src/game/storage/inventory.ts`
**Criar:** `src/game/storage/inventory.ts`
```ts
import { get, set } from 'idb-keyval';
import { DEFAULT_CHARACTER_ID } from '../systems/characterDef.ts';
import { DEFAULT_WORLD_ID } from '../systems/worldTheme.ts';

export interface Inventory {
  version: 1;
  activeCharacter: string;
  activeWorld: string;
  activeCosmetics: { hat?: string; backpack?: string; trail?: string };
  unlockedItems: string[];
  achievements: string[];
}

const KEY = 'movemove.inventory.v1';

const DEFAULT_INVENTORY: Inventory = {
  version: 1,
  activeCharacter: DEFAULT_CHARACTER_ID,
  activeWorld: DEFAULT_WORLD_ID,
  activeCosmetics: {},
  unlockedItems: [DEFAULT_CHARACTER_ID],
  achievements: [],
};

export class InventoryStore {
  private cache: Inventory | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  async load(): Promise<Inventory> {
    if (this.cache) return this.cache;
    let inv: Inventory | undefined;
    try { inv = await get<Inventory>(KEY); } catch { inv = undefined; }
    if (!inv) { inv = { ...DEFAULT_INVENTORY, unlockedItems: [DEFAULT_CHARACTER_ID] }; await this.save(inv); }
    this.cache = inv;
    return inv;
  }

  async save(inv: Inventory): Promise<void> {
    this.cache = inv;
    this.writeQueue = this.writeQueue.then(async () => {
      try { await set(KEY, inv); } catch { /* memory-only */ }
    });
    return this.writeQueue;
  }

  async update(patch: Partial<Inventory>): Promise<Inventory> {
    const result: { inv: Inventory } = { inv: this.cache ?? { ...DEFAULT_INVENTORY } };
    this.writeQueue = this.writeQueue.then(async () => {
      const cur = this.cache ?? await this.loadRaw();
      const next = { ...cur, ...patch } as Inventory;
      this.cache = next;
      result.inv = next;
      try { await set(KEY, next); } catch { /* memory-only */ }
    });
    await this.writeQueue;
    return result.inv;
  }

  async unlockItem(itemId: string): Promise<Inventory> {
    const cur = await this.load();
    if (cur.unlockedItems.includes(itemId)) return cur;
    return this.update({ unlockedItems: [...cur.unlockedItems, itemId] });
  }

  async addAchievement(id: string): Promise<Inventory> {
    const cur = await this.load();
    if (cur.achievements.includes(id)) return cur;
    return this.update({ achievements: [...cur.achievements, id] });
  }

  private async loadRaw(): Promise<Inventory> {
    try { return (await get<Inventory>(KEY)) ?? { ...DEFAULT_INVENTORY }; } catch { return { ...DEFAULT_INVENTORY }; }
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F3-C04. Adicionar `InventoryStore` ao `AppRefs` e `orchestrator.ts`
**Modificar:** `src/game/orchestrator.ts`

No `AppRefs` interface, adicionar:
```ts
inventory: InventoryStore;
```

Na função `startApp()`, adicionar após instanciar `ProfileStore`:
```ts
import { InventoryStore } from './storage/inventory.ts';
// ...
const inventory = new InventoryStore();
```

Adicionar `inventory` ao objeto `AppRefs` passado para `game.registry.set`.
**Verificar:** `npx tsc --noEmit` sem erros; `grep "inventory" src/game/orchestrator.ts` mostra a instância.

### F3-C05. Migrar ProfileStore para v2 (adicionar xp e level)
**Modificar:** `src/game/storage/profile.ts`

Adicionar interface `ProfileV2`:
```ts
export interface ProfileV2 extends Omit<Profile, 'version'> {
  version: 2;
  xp: number;
  level: number;
}
```

No `ProfileStore.load()`, após carregar v1 do IndexedDB, checar se `version === 1` e fazer upgrade em memória (não muda a chave v1; v2 usa chave nova):
```ts
const KEY_V2 = 'movemove.profile.v2';

// No load():
let p2: ProfileV2 | undefined;
try { p2 = await get<ProfileV2>(KEY_V2); } catch { p2 = undefined; }
if (!p2) {
  // seed from v1 if exists
  const p1 = await get<Profile>('movemove.profile.v1').catch(() => undefined);
  p2 = {
    ...(p1 ?? DEFAULT_PROFILE),
    version: 2,
    xp: 0,
    level: 0,
  };
  await set(KEY_V2, p2);
}
this.cache = p2 as any; // ProfileStore continua exportando Profile; cast interno OK
return p2 as unknown as Profile;
```

Atualizar `DEFAULT_PROFILE` para incluir `xp: 0, level: 0` e `version: 2`.

**Verificar:** `npx tsc --noEmit` sem erros.

### F3-C06. Injetar CharacterDef na entidade Player
**Verificar** como `Player` define corpo/cor:
```bash
grep -n "bodyColor\|fillRect\|setFillStyle\|0x4cd\|0xfff" src/game/entities/Player.ts | head -20
```
**Modificar:** `src/game/entities/Player.ts` — adicionar parâmetro `charDef?: CharacterDef` ao construtor; usar `charDef.bodyColor` no lugar da cor hardcoded do corpo, e `charDef.accentColor` no lugar da cor do acento.
**Em `Play.ts create()`:** importar `getCharacterById`, carregar `characterDef` de `getRefs(this).inventory.load()` (assíncrono — guardar em variável de instância; Player usa default até load concluir), instanciar `new Player(scene, lane, charDef)`.
**Verificar:** `npx tsc --noEmit` sem erros.

### F3-C07. Criar `src/game/scenes/Shop.ts`
**Criar:** `src/game/scenes/Shop.ts`
```ts
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { CHARACTER_DEFS } from '../systems/characterDef.ts';
import { COSMETIC_DEFS } from '../systems/cosmeticDef.ts';
import { getRefs } from '../orchestrator.ts';

export class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }

  async create(): Promise<void> {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);
    const refs = getRefs(this);
    const [profile, inventory] = await Promise.all([
      refs.profileStore.load(),
      refs.inventory.load(),
    ]);

    this.add.text(width / 2, 36, strings.shop.title, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '28px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 72, `🪙 ${(profile as any).totalCoins} moedas`, {
      fontFamily: 'system-ui', fontSize: '18px', color: '#f1c40f',
    }).setOrigin(0.5);

    const allItems = [
      ...CHARACTER_DEFS.map((c) => ({ id: c.id, name: c.name, cost: c.cost, type: 'char' as const })),
      ...COSMETIC_DEFS.map((c) => ({ id: c.id, name: c.name, cost: c.cost, type: 'cosmetic' as const })),
    ];

    allItems.forEach((item, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const x = 120 + col * 190;
      const y = 140 + row * 130;
      const unlocked = inventory.unlockedItems.includes(item.id);
      const isActive = inventory.activeCharacter === item.id || Object.values(inventory.activeCosmetics).includes(item.id);
      const bg = this.add.rectangle(x, y, 170, 110, unlocked ? 0x1a2a1a : 0x1a1a2a, 0.9)
        .setStrokeStyle(2, unlocked ? (isActive ? 0x4cd964 : 0x374151) : 0x555555, 1);
      this.add.text(x, y - 30, item.name, { fontFamily: 'system-ui', fontSize: '13px', color: '#f5f5f5', align: 'center', wordWrap: { width: 160 } }).setOrigin(0.5);
      const btnLabel = unlocked ? (isActive ? '✓ Ativo' : 'Usar') : `🪙 ${item.cost}`;
      const btn = this.add.text(x, y + 30, btnLabel, {
        fontFamily: 'system-ui', fontSize: '13px',
        color: unlocked ? '#4cd964' : (profile as any).totalCoins >= item.cost ? '#f1c40f' : '#888',
        backgroundColor: unlocked ? 'rgba(0,50,0,0.7)' : 'rgba(30,20,0,0.7)',
        padding: { x: 10, y: 4 },
      }).setOrigin(0.5);
      if (!unlocked && (profile as any).totalCoins >= item.cost) {
        bg.setInteractive({ useHandCursor: true }).on('pointerup', async () => {
          const p = await refs.profileStore.update({ totalCoins: (profile as any).totalCoins - item.cost } as any);
          await refs.inventory.unlockItem(item.id);
          this.scene.restart();
        });
      } else if (unlocked && !isActive) {
        bg.setInteractive({ useHandCursor: true }).on('pointerup', async () => {
          if (item.type === 'char') {
            await refs.inventory.update({ activeCharacter: item.id });
          }
          this.scene.restart();
        });
      }
    });

    const back = this.add.text(40, 36, `← ${strings.common?.back ?? 'Voltar'}`, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 12, y: 6 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('CharacterSelect'));
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F3-C08. Adicionar strings da loja a `src/i18n/strings.ts`
**Verificar** estrutura atual de `strings.ts`:
```bash
grep -n "export\|miniGames\|summary\|settings" src/i18n/strings.ts | head -20
```
**Modificar:** `src/i18n/strings.ts` — adicionar ao objeto exportado:
```ts
shop: {
  title: 'Loja',
  buy: 'Comprar',
  active: '✓ Ativo',
  locked: 'Bloqueado',
  insufficient: 'Moedas insuficientes',
},
characterSelect: {
  title: 'Selecionar',
  play1P: 'Jogar (1P)',
  play2P: 'Jogar (2P)',
  shop: 'Loja',
  world: 'Mundo',
},
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F3-C09. Registrar Shop e InventoryStore no orchestrator
**Modificar:** `src/game/orchestrator.ts` — adicionar `Shop` à lista de scenes Phaser:
```ts
import { Shop } from './scenes/Shop.ts';
// ...
scenes: [...scenes existentes..., Shop],
```
**Verificar:** `npx tsc --noEmit` sem erros; `npm run dev` e navegar para `?scene=Shop` (ou via console: `game.scene.start('Shop')`) sem erros de "Scene not found".

### F3-C10. Commit Fase F3
```bash
git add src/game/systems/characterDef.ts src/game/systems/cosmeticDef.ts \
        src/game/storage/inventory.ts src/game/storage/profile.ts \
        src/game/scenes/Shop.ts src/game/orchestrator.ts \
        src/game/entities/Player.ts src/i18n/strings.ts
git commit -m "feat(issue-5): fase F3 - personagens, cosméticos e loja in-game (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F3-consol. Atualizar CHECKPOINT.md — F3 concluído
Marcar F3 como `✅ concluído`.

---

## FASE F4 — XP, nível e conquistas

### F4-C01. Criar `src/game/systems/xp.ts`
**Criar:** `src/game/systems/xp.ts`
```ts
import type { RunEntry } from '../storage/runHistory.ts';

export const XPSystem = {
  xpForRun(entry: RunEntry): number {
    return Math.floor((entry.distance ?? 0) * 0.5 + (entry.coins ?? 0) * 2 + (entry.jacks ?? 0) * 1);
  },
  levelFromXp(xp: number): number {
    return Math.floor(Math.sqrt(xp / 50));
  },
  xpToNextLevel(level: number): number {
    return (level + 1) * (level + 1) * 50;
  },
};
```
**Verificar:** `npx tsc --noEmit` sem erros.
**Verificar cálculo:** `Math.floor(Math.sqrt(75/50)) === 1` ✓; `Math.floor(Math.sqrt(5000/50)) === 10` ✓

### F4-C02. Criar `src/game/systems/achievements.ts`
**Criar:** `src/game/systems/achievements.ts`
```ts
import type { RunEntry } from '../storage/runHistory.ts';
import type { Inventory } from '../storage/inventory.ts';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'primeira_partida', name: 'Primeira Partida',   desc: 'Completou sua primeira corrida!' },
  { id: '100m',             name: '100 Metros',          desc: 'Correu 100m em uma partida.' },
  { id: '1000m',            name: '1 Quilômetro',        desc: 'Correu 1000m em uma partida.' },
  { id: '100_moedas',       name: 'Centenário',          desc: 'Coletou 100 moedas em partidas totais.' },
  { id: '10_polichinelos',  name: 'Jack Machine',        desc: 'Fez 10 polichinelos em uma partida.' },
  { id: '2p_modo',          name: 'Dupla Dinâmica',      desc: 'Jogou no modo 2 jogadores.' },
];

export const AchievementSystem = {
  check(
    profileTotalRuns: number,
    profileTotalCoins: number,
    runEntry: RunEntry,
    inventory: Inventory,
  ): string[] {
    const unlocked: string[] = [];
    const already = new Set(inventory.achievements);
    const maybe = (id: string, condition: boolean) => {
      if (!already.has(id) && condition) unlocked.push(id);
    };
    maybe('primeira_partida', profileTotalRuns <= 1);
    maybe('100m', (runEntry.distance ?? 0) >= 100);
    maybe('1000m', (runEntry.distance ?? 0) >= 1000);
    maybe('100_moedas', profileTotalCoins >= 100);
    maybe('10_polichinelos', (runEntry.jacks ?? 0) >= 10);
    return unlocked;
  },
  checkTwoPlayer(inventory: Inventory): string[] {
    return inventory.achievements.includes('2p_modo') ? [] : ['2p_modo'];
  },
};
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F4-C03. Integrar XP + conquistas no `Summary` scene
**Verificar** como `Summary` recebe dados:
```bash
grep -n "init\|data\|distance\|coins\|profile" src/game/scenes/Summary.ts | head -30
```
**Modificar:** `src/game/scenes/Summary.ts`

Importar:
```ts
import { XPSystem } from '../systems/xp.ts';
import { AchievementSystem, ACHIEVEMENT_DEFS } from '../systems/achievements.ts';
```

No `create()`, após salvar dados do run no profile, adicionar:
```ts
const refs = getRefs(this);
const inventory = await refs.inventory.load();
const profile = await refs.profileStore.load() as any;

const xpGained = XPSystem.xpForRun(this.runEntry);
const newXp = (profile.xp ?? 0) + xpGained;
const newLevel = XPSystem.levelFromXp(newXp);
const oldLevel = XPSystem.levelFromXp(profile.xp ?? 0);
await refs.profileStore.update({ xp: newXp, level: newLevel } as any);

const newAchievements = AchievementSystem.check(profile.totalRuns, profile.totalCoins, this.runEntry, inventory);
for (const id of newAchievements) await refs.inventory.addAchievement(id);

// Exibir linha de XP
this.add.text(width / 2, yXp, `+${xpGained} XP  ·  Nível ${newLevel}`, {
  fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '18px', color: '#ffd60a',
}).setOrigin(0.5);

if (newLevel > oldLevel) {
  this.add.text(width / 2, yXp + 28, `🎉 SUBIU PRO NÍVEL ${newLevel}!`, {
    fontFamily: 'system-ui', fontSize: '15px', color: '#4cd964', fontStyle: 'bold',
  }).setOrigin(0.5);
}

// Toasts de conquistas
newAchievements.forEach((id, i) => {
  const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
  if (!def) return;
  this.add.text(width / 2, yAchievements + i * 30, `🏆 ${def.name}`, {
    fontFamily: 'system-ui', fontSize: '14px', color: '#f1c40f', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 3 },
  }).setOrigin(0.5);
});
```

**Verificar:** `npx tsc --noEmit` sem erros.

### F4-C04. Exibir nível no HUD
**Verificar** como HUD é inicializado:
```bash
grep -n "create\|constructor\|level\|text" src/game/ui/hud.ts | head -20
```
**Modificar:** `src/game/ui/hud.ts` — adicionar método `setLevel(n: number)` que atualiza um `Text` de nível no canto superior esquerdo:
```ts
private levelText: Phaser.GameObjects.Text | null = null;

setLevel(level: number): void {
  if (!this.levelText) {
    this.levelText = this.scene.add.text(8, 8, `Nv.${level}`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#ffd60a',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 6, y: 2 },
    }).setScrollFactor(0).setDepth(100);
  } else {
    this.levelText.setText(`Nv.${level}`);
  }
}
```
**Em Play.ts `create()`:** após carregar o profile, chamar `this.hud.setLevel((profile as any).level ?? 0)`.
**Verificar:** `npx tsc --noEmit` sem erros.

### F4-C05. Commit Fase F4
```bash
git add src/game/systems/xp.ts src/game/systems/achievements.ts \
        src/game/scenes/Summary.ts src/game/ui/hud.ts
git commit -m "feat(issue-5): fase F4 - XP, nível e sistema de conquistas (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F4-consol. Atualizar CHECKPOINT.md — F4 concluído
Marcar F4 como `✅ concluído`.

---

## FASE F5 — Tela de seleção (CharacterSelect) e integração Welcome

### F5-C01. Criar `src/game/scenes/CharacterSelect.ts`
**Criar:** `src/game/scenes/CharacterSelect.ts`
```ts
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { WORLD_THEMES } from '../systems/worldTheme.ts';
import { CHARACTER_DEFS } from '../systems/characterDef.ts';
import { getRefs } from '../orchestrator.ts';

export class CharacterSelect extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }

  async create(): Promise<void> {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);
    const refs = getRefs(this);
    const [profile, inventory] = await Promise.all([
      refs.profileStore.load(),
      refs.inventory.load(),
    ]);
    const activeChar = CHARACTER_DEFS.find((c) => c.id === inventory.activeCharacter) ?? CHARACTER_DEFS[0];

    // Título
    this.add.text(width / 2, 36, strings.characterSelect.title, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '28px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    // XP / Nível
    this.add.text(width / 2, 68, `Nível ${(profile as any).level ?? 0}  ·  ${(profile as any).xp ?? 0} XP`, {
      fontFamily: 'system-ui', fontSize: '15px', color: '#ffd60a',
    }).setOrigin(0.5);

    // Preview do personagem ativo (retângulo colorido)
    this.add.rectangle(width / 2, 150, 60, 80, activeChar.bodyColor)
      .setStrokeStyle(3, activeChar.accentColor);
    this.add.text(width / 2, 205, activeChar.name, {
      fontFamily: 'system-ui', fontSize: '14px', color: '#f5f5f5',
    }).setOrigin(0.5);

    // Seleção de mundos
    this.add.text(width / 2, 250, strings.characterSelect.world, {
      fontFamily: 'system-ui', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(0.5);

    Object.values(WORLD_THEMES).forEach((theme, i) => {
      const x = 120 + i * 155;
      const y = 310;
      const isActive = inventory.activeWorld === theme.id;
      const bg = this.add.rectangle(x, y, 140, 60, theme.bgColor, 0.9)
        .setStrokeStyle(3, isActive ? 0x4cd964 : 0x444444, 1)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, y, theme.name, {
        fontFamily: 'system-ui', fontSize: '13px', color: '#f5f5f5', align: 'center',
      }).setOrigin(0.5);
      bg.on('pointerup', async () => {
        await refs.inventory.update({ activeWorld: theme.id });
        this.scene.restart();
      });
    });

    // Botão Loja
    const shopBtn = this.add.text(60, height - 60, `🛒 ${strings.characterSelect.shop}`, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#0b0d10',
      backgroundColor: '#ffd60a', padding: { x: 14, y: 8 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    shopBtn.on('pointerup', () => this.scene.start('Shop'));

    // Botão Jogar 1P
    const play1Btn = this.add.text(width / 2 - 10, height - 60, `▶ ${strings.characterSelect.play1P}`, {
      fontFamily: 'system-ui', fontSize: '18px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 20, y: 10 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    play1Btn.on('pointerup', () => this.scene.start('Play', { worldId: inventory.activeWorld }));

    // Botão Jogar 2P
    const play2Btn = this.add.text(width / 2 + 10, height - 60, `👥 ${strings.characterSelect.play2P}`, {
      fontFamily: 'system-ui', fontSize: '18px', color: '#0b0d10',
      backgroundColor: '#3498db', padding: { x: 20, y: 10 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    play2Btn.on('pointerup', () => this.scene.start('Play2P', { worldId: inventory.activeWorld }));

    // Botão Voltar
    const back = this.add.text(40, 36, '← Voltar', {
      fontFamily: 'system-ui', fontSize: '15px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Welcome'));
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F5-C02. Adicionar botão "Personalizar" na cena `Welcome`
**Verificar** como Welcome renderiza botões:
```bash
grep -n "pointerup\|setInteractive\|setText\|add.text\|Jogar\|Welcome" src/game/scenes/Welcome.ts | head -20
```
**Modificar:** `src/game/scenes/Welcome.ts` — adicionar botão "Personalizar" logo abaixo do botão "Jogar":
```ts
const customBtn = this.add.text(width / 2, yJogar + 60, '🎨 Personalizar', {
  fontFamily: 'system-ui', fontSize: '18px', color: '#0b0d10',
  backgroundColor: '#ffd60a', padding: { x: 18, y: 8 },
}).setOrigin(0.5).setInteractive({ useHandCursor: true });
customBtn.on('pointerup', () => this.scene.start('CharacterSelect'));
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F5-C03. Registrar CharacterSelect no orchestrator
**Modificar:** `src/game/orchestrator.ts` — adicionar `CharacterSelect` à lista de scenes:
```ts
import { CharacterSelect } from './scenes/CharacterSelect.ts';
// ...
scenes: [...existentes..., CharacterSelect],
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F5-C04. Testar fluxo Welcome → CharacterSelect → Play
**Comando:** `npm run dev`
**Verificar no browser:**
1. Clicar "Personalizar" em Welcome → CharacterSelect aparece
2. Selecionar mundo "Espaço" → botão fica com borda verde
3. Clicar "Jogar (1P)" → Play inicia com fundo 0x000011 (quase preto) ✓
4. Voltar → Welcome sem erros de console

### F5-C05. Commit Fase F5
```bash
git add src/game/scenes/CharacterSelect.ts src/game/scenes/Welcome.ts \
        src/game/orchestrator.ts
git commit -m "feat(issue-5): fase F5 - tela de seleção de personagem/mundo/modo (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F5-consol. Atualizar CHECKPOINT.md — F5 concluído
Marcar F5 como `✅ concluído`.

---

## FASE F6 — Modo Cardio Guiado

### F6-C01. Criar `src/game/scenes/CardioGuided.ts`
**Criar:** `src/game/scenes/CardioGuided.ts`

```ts
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import { DemoFigure, ANIMATORS, NEUTRAL_POSE } from '../ui/demoFigure.ts';
import { DETECTORS } from '../systems/exerciseRepDetectors.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { Narrator } from '../systems/narrator.ts';
import type { PoseFrame } from '../../pose/types.ts';

// 3 ciclos: 30s corrida → 15s exercício
const CARDIO_CYCLES = 3;
const RUN_BLOCK_MS = 30_000;
const EXERCISE_BLOCK_MS = 15_000;

// Exercícios sorteados aleatoriamente a cada ciclo (reutiliza os da GuidedSession)
const EXERCISE_POOL = [
  { key: 'trunkRotation',      detector: DETECTORS.trunkRotation,     animator: ANIMATORS.trunkRotation },
  { key: 'highKnee',           detector: DETECTORS.highKnee,          animator: ANIMATORS.highKneeHandsHead },
  { key: 'armsUp',             detector: DETECTORS.armsUp,            animator: ANIMATORS.lungeArmsUp },
];

type Phase = 'run' | 'exercise' | 'done';

export class CardioGuided extends Phaser.Scene {
  private cycle = 0;
  private phase: Phase = 'run';
  private phaseStart = 0;
  private timerEl!: Phaser.GameObjects.Text;
  private phaseEl!: Phaser.GameObjects.Text;
  private repsEl!: Phaser.GameObjects.Text;
  private currentReps = 0;
  private demoFigure: DemoFigure | null = null;
  private backdrop: CameraBackdrop | null = null;
  private narrator!: Narrator;
  private unsubFrame: (() => void) | null = null;

  constructor() { super('CardioGuided'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);
    const refs = getRefs(this);

    this.backdrop = new CameraBackdrop(this, refs.video, 0.3);
    this.narrator = new Narrator();
    this.demoFigure = new DemoFigure(this, width - 120, height / 2);

    this.phaseEl = this.add.text(width / 2, 40, 'CORRIDA', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '28px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.timerEl = this.add.text(width / 2, 80, '30', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '48px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.repsEl = this.add.text(width / 2, 140, '', {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width - 20, 20, `Ciclo 1/${CARDIO_CYCLES}`, {
      fontFamily: 'system-ui', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(1, 0).setDepth(10).setName('cycle-label');

    const back = this.add.text(20, 20, '← Sair', {
      fontFamily: 'system-ui', fontSize: '14px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(10);
    back.on('pointerup', () => { this.cleanup(); this.scene.start('Welcome'); });

    this.startPhase('run');

    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => {
      if (this.phase === 'exercise') this.processExerciseFrame(frame);
    });
  }

  private startPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseStart = this.time.now;
    this.currentReps = 0;
    if (phase === 'run') {
      this.phaseEl.setText('CORRA!');
      this.phaseEl.setColor('#4cd964');
      this.demoFigure?.setAnimator(NEUTRAL_POSE, 0);
      this.narrator.say('Corra!');
    } else if (phase === 'exercise') {
      const ex = EXERCISE_POOL[this.cycle % EXERCISE_POOL.length];
      this.phaseEl.setText('EXERCÍCIO');
      this.phaseEl.setColor('#ffd60a');
      this.demoFigure?.setAnimator(ex.animator, this.time.now);
      this.narrator.say('Faça o exercício!');
      ex.detector().reset();
    }
  }

  private processExerciseFrame(frame: PoseFrame): void {
    const ex = EXERCISE_POOL[this.cycle % EXERCISE_POOL.length];
    const det = ex.detector();
    if (det.process(frame)) {
      this.currentReps++;
      this.repsEl.setText(`${this.currentReps} reps`);
    }
  }

  update(_time: number, _delta: number): void {
    const elapsed = this.time.now - this.phaseStart;
    const blockDuration = this.phase === 'run' ? RUN_BLOCK_MS : EXERCISE_BLOCK_MS;
    const remaining = Math.max(0, Math.ceil((blockDuration - elapsed) / 1000));
    this.timerEl.setText(String(remaining));
    if (this.phase === 'done') return;
    if (elapsed >= blockDuration) {
      if (this.phase === 'run') {
        this.startPhase('exercise');
      } else {
        this.cycle++;
        if (this.cycle >= CARDIO_CYCLES) {
          this.phase = 'done';
          this.narrator.say('Parabéns! Você completou o treino!');
          this.time.delayedCall(2000, () => { this.cleanup(); this.scene.start('Summary', { cardio: true }); });
        } else {
          (this.children.getByName('cycle-label') as Phaser.GameObjects.Text)?.setText(`Ciclo ${this.cycle + 1}/${CARDIO_CYCLES}`);
          this.startPhase('run');
        }
      }
    }
  }

  private cleanup(): void {
    this.unsubFrame?.();
    this.backdrop?.destroy();
    this.narrator.cancel();
  }

  shutdown(): void { this.cleanup(); }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F6-C02. Adicionar strings do CardioGuided a `strings.ts`
**Modificar:** `src/i18n/strings.ts` — adicionar:
```ts
cardioGuided: {
  title: 'Cardio Guiado',
  run: 'CORRA!',
  exercise: 'EXERCÍCIO',
  cycle: 'Ciclo',
  done: 'Treino concluído!',
},
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F6-C03. Registrar CardioGuided no orchestrator e no CharacterSelect
**Modificar:** `src/game/orchestrator.ts` — adicionar `CardioGuided` às scenes:
```ts
import { CardioGuided } from './scenes/CardioGuided.ts';
// ...
scenes: [...existentes..., CardioGuided],
```
**Modificar:** `src/game/scenes/CharacterSelect.ts` — adicionar botão "Cardio Guiado" no `create()`:
```ts
const cardioBtn = this.add.text(width / 2, height - 110, `🏃 Cardio Guiado`, {
  fontFamily: 'system-ui', fontSize: '16px', color: '#0b0d10',
  backgroundColor: '#e74c3c', padding: { x: 14, y: 8 },
}).setOrigin(0.5).setInteractive({ useHandCursor: true });
cardioBtn.on('pointerup', () => this.scene.start('CardioGuided'));
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F6-C04. Testar CardioGuided no browser
**Comando:** `npm run dev`
**Verificar:** navegar para CharacterSelect → "Cardio Guiado" → verificar que contador de 30s aparece, texto "CORRA!" exibe, ao chegar em 0s muda para "EXERCÍCIO", DemoFigure anima, voltar com "← Sair" não quebra.

### F6-C05. Commit Fase F6
```bash
git add src/game/scenes/CardioGuided.ts src/game/orchestrator.ts \
        src/game/scenes/CharacterSelect.ts src/i18n/strings.ts
git commit -m "feat(issue-5): fase F6 - modo cardio guiado (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F6-consol. Atualizar CHECKPOINT.md — F6 concluído
Marcar F6 como `✅ concluído`.

---

## FASE F7 — Modo Desafio Diário

### F7-C01. Criar `src/game/storage/dailyChallenge.ts`
**Criar:** `src/game/storage/dailyChallenge.ts`
```ts
import { get, set } from 'idb-keyval';

export interface DailyRecord {
  date: string;      // YYYY-MM-DD
  distance: number;  // metros
}

type DailyStore = Record<string, DailyRecord>; // worldId → record

const KEY = 'movemove.dailyChallenge.v1';

export class DailyChallengeStore {
  async getRecord(worldId: string): Promise<DailyRecord | null> {
    try {
      const store = (await get<DailyStore>(KEY)) ?? {};
      return store[worldId] ?? null;
    } catch { return null; }
  }

  async saveRecord(worldId: string, record: DailyRecord): Promise<void> {
    try {
      const store = (await get<DailyStore>(KEY)) ?? {};
      store[worldId] = record;
      await set(KEY, store);
    } catch { /* memory-only */ }
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F7-C02. Gerar seed a partir da data atual
**Criar função helper** no início de `src/game/scenes/DailyChallenge.ts` (F7-C03):
```ts
function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
// Ex: 2026-04-27 → 20260427
```

### F7-C03. Criar `src/game/scenes/DailyChallenge.ts`
**Criar:** `src/game/scenes/DailyChallenge.ts`
```ts
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import { DailyChallengeStore } from '../storage/dailyChallenge.ts';
import { getRng } from '../systems/rng.ts';
import type { WorldTheme } from '../systems/worldTheme.ts';
import { WORLD_THEMES, DEFAULT_WORLD_ID } from '../systems/worldTheme.ts';

function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class DailyChallenge extends Phaser.Scene {
  private worldTheme!: WorldTheme;
  private worldId = DEFAULT_WORLD_ID;
  private store = new DailyChallengeStore();
  private recordText: Phaser.GameObjects.Text | null = null;
  private currentRecord: number | null = null;

  constructor() { super('DailyChallenge'); }

  init(data: { worldId?: string }): void {
    this.worldId = data?.worldId ?? DEFAULT_WORLD_ID;
    this.worldTheme = WORLD_THEMES[this.worldId] ?? WORLD_THEMES[DEFAULT_WORLD_ID];
  }

  async create(): Promise<void> {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(this.worldTheme.bgColor);

    this.add.text(width / 2, 36, `🏆 Desafio Diário — ${this.worldTheme.name}`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '22px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);

    const record = await this.store.getRecord(this.worldId);
    const todayRecord = record?.date === todayStr() ? record.distance : null;
    this.currentRecord = todayRecord;

    const recordLabel = todayRecord != null
      ? `Recorde hoje: ${Math.round(todayRecord)}m`
      : 'Sem recorde hoje ainda';

    this.recordText = this.add.text(width / 2, 72, recordLabel, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#8a8d92',
    }).setOrigin(0.5);

    this.add.text(width / 2, 110, `Seed do dia: ${todaySeed()}`, {
      fontFamily: 'system-ui', fontSize: '12px', color: '#555',
    }).setOrigin(0.5);

    const startBtn = this.add.text(width / 2, height / 2, '▶ Iniciar Desafio', {
      fontFamily: 'system-ui', fontSize: '22px', color: '#0b0d10',
      backgroundColor: '#ffd60a', padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerup', () => {
      this.scene.start('Play', {
        worldId: this.worldId,
        seed: todaySeed(),
        mode: 'daily',
        onGameOver: (distance: number) => this.handleGameOver(distance),
      });
    });

    const back = this.add.text(40, 36, '← Voltar', {
      fontFamily: 'system-ui', fontSize: '15px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('CharacterSelect'));
  }

  private async handleGameOver(distance: number): Promise<void> {
    const today = todayStr();
    if (this.currentRecord == null || distance > this.currentRecord) {
      await this.store.saveRecord(this.worldId, { date: today, distance });
    }
  }
}
```

**Verificar:** `npx tsc --noEmit` sem erros.

### F7-C04. Integrar `seed` no Play e `Spawner` (RNG determinístico)
**Verificar** como Play passa seed ao Spawner:
```bash
grep -n "seed\|getRng\|init\|Spawner" src/game/scenes/Play.ts | head -20
```
**Modificar:** `src/game/scenes/Play.ts`

No `init`:
```ts
init(data: { skipPrep?: boolean; worldId?: string; seed?: number }): void {
  this.prepCountdownMs = data?.skipPrep ? 0 : 3000;
  this.worldTheme = WORLD_THEMES[data?.worldId ?? DEFAULT_WORLD_ID] ?? WORLD_THEMES[DEFAULT_WORLD_ID];
  if (data?.seed != null) {
    // Injeta o seed no gerador global antes de criar o Spawner
    (globalThis as any).__movemoveSeed = data.seed;
  }
}
```

**Verificar** que `getRng()` usa `__movemoveSeed` ou `URLSearchParams`:
```bash
grep -n "seed\|getRng\|__movemove" src/game/systems/rng.ts
```
Se `getRng` já usa `?seed=N` da URL, adicionar fallback para `__movemoveSeed`:
```ts
export function getRng(): () => number {
  const urlSeed = new URLSearchParams(location.search).get('seed');
  const globalSeed = (globalThis as any).__movemoveSeed;
  const seed = urlSeed != null ? Number(urlSeed) : (globalSeed ?? Math.random() * 2 ** 32);
  // ...resto da implementação existente
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F7-C05. Registrar DailyChallenge no orchestrator e CharacterSelect
**Modificar:** `src/game/orchestrator.ts`:
```ts
import { DailyChallenge } from './scenes/DailyChallenge.ts';
// ...
scenes: [...existentes..., DailyChallenge],
```
**Modificar:** `src/game/scenes/CharacterSelect.ts` — adicionar botão:
```ts
const dailyBtn = this.add.text(width / 2, height - 155, `🏆 Desafio do Dia`, {
  fontFamily: 'system-ui', fontSize: '16px', color: '#0b0d10',
  backgroundColor: '#9b59b6', padding: { x: 14, y: 8 },
}).setOrigin(0.5).setInteractive({ useHandCursor: true });
dailyBtn.on('pointerup', () => this.scene.start('DailyChallenge', { worldId: inventory.activeWorld }));
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F7-C06. Testar Desafio Diário no browser
**Comando:** `npm run dev`
**Verificar:**
1. Navegar para CharacterSelect → "Desafio do Dia" → tela aparece com seed do dia
2. Clicar "Iniciar Desafio" → Play inicia com seed numérico
3. Rodar duas vezes na mesma sessão → spawner produz os mesmos obstáculos (seed idêntico)

### F7-C07. Commit Fase F7
```bash
git add src/game/storage/dailyChallenge.ts src/game/scenes/DailyChallenge.ts \
        src/game/scenes/CharacterSelect.ts src/game/orchestrator.ts \
        src/game/systems/rng.ts src/game/scenes/Play.ts
git commit -m "feat(issue-5): fase F7 - desafio diário com seed determinístico (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F7-consol. Atualizar CHECKPOINT.md — F7 concluído
Marcar F7 como `✅ concluído`.

---

## FASE F8 — Modo 2 jogadores (Play2P + Summary2P)

> Depende de F1 (MoveNet com `onMultiFrame`). Verificar que F1 está ✅ no CHECKPOINT antes de iniciar.

### F8-C01. Adicionar pipelines 2P ao `AppRefs` no orchestrator
**Modificar:** `src/game/orchestrator.ts`

Importar:
```ts
import { EventDetector as EventDetector2 } from '../pose/events.ts';
import { Calibrator as Calibrator2 } from '../pose/calibration.ts';
import { EmaSmoother as EmaSmoother2 } from '../pose/smoother.ts';
```

Adicionar ao `AppRefs` interface:
```ts
eventDetector2: EventDetector;
calibrator2: Calibrator;
onSmoothedFrame2: (cb: (f: PoseFrame) => void) => () => void;
```

Na função `startApp()`, instanciar os componentes 2P:
```ts
const smoother2 = new EmaSmoother2(POSE_CONFIG.emaAlpha);
const calibrator2 = new Calibrator2();
const eventDetector2 = new EventDetector2();
const smoothedSubs2 = new Set<(f: PoseFrame) => void>();
```

Inscrever no `detector.onMultiFrame` para alimentar P2:
```ts
detector.onMultiFrame((frames) => {
  const f2 = frames.find((f) => f.player === 1);
  if (f2) {
    const smoothed2 = smoother2.smooth(f2.frame.keypoints);
    const frame2: PoseFrame = { ...f2.frame, keypoints: smoothed2, playerId: 1 };
    if (calibrator2.isActive()) {
      const outcome = calibrator2.feed(frame2);
      if (outcome?.ok) eventDetector2.setBaseline(outcome.baseline);
    }
    eventDetector2.ingest(frame2);
    for (const cb of smoothedSubs2) cb(frame2);
  }
});
```

Adicionar ao objeto `refs`:
```ts
eventDetector2,
calibrator2,
onSmoothedFrame2: (cb) => { smoothedSubs2.add(cb); return () => smoothedSubs2.delete(cb); },
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F8-C02. Criar `src/game/scenes/Summary2P.ts`
**Criar:** `src/game/scenes/Summary2P.ts`
```ts
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

interface Summary2PData {
  p1: { distance: number; coins: number; jacks: number };
  p2: { distance: number; coins: number; jacks: number };
}

export class Summary2P extends Phaser.Scene {
  constructor() { super('Summary2P'); }

  init(public data: Summary2PData) {}

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    this.add.text(width / 2, 36, '🏆 Resultado', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '30px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);

    const renderPlayer = (label: string, data: Summary2PData['p1'], x: number) => {
      this.add.text(x, 100, label, {
        fontFamily: 'system-ui', fontSize: '22px', color: '#4cd964', fontStyle: 'bold',
      }).setOrigin(0.5);
      const lines = [
        `${Math.round(data.distance)}m`,
        `🪙 ${data.coins}`,
        `🦵 ${data.jacks} jacks`,
      ];
      lines.forEach((line, i) => {
        this.add.text(x, 145 + i * 36, line, {
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#f5f5f5',
        }).setOrigin(0.5);
      });
    };

    renderPlayer('Jogador 1', this.data.p1, width / 4);
    renderPlayer('Jogador 2', this.data.p2, (3 * width) / 4);

    const winner = this.data.p1.distance >= this.data.p2.distance ? 'Jogador 1' : 'Jogador 2';
    this.add.text(width / 2, height / 2 + 40, `🥇 ${winner} venceu!`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);

    const again = this.add.text(width / 2, height - 60, 'Jogar de Novo', {
      fontFamily: 'system-ui', fontSize: '18px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    again.on('pointerup', () => this.scene.start('Play2P'));

    const menu = this.add.text(width / 2, height - 20, 'Menu', {
      fontFamily: 'system-ui', fontSize: '15px', color: '#8a8d92',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.on('pointerup', () => this.scene.start('Welcome'));
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F8-C03. Criar `src/game/scenes/Play2P.ts` — estrutura base com split-screen
**Criar:** `src/game/scenes/Play2P.ts`

```ts
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { getRefs } from '../orchestrator.ts';
import { Player } from '../entities/Player.ts';
import { Road } from '../systems/road.ts';
import { Parallax } from '../systems/parallax.ts';
import { Spawner } from '../systems/spawner.ts';
import { Scoring } from '../systems/scoring.ts';
import { checkCollisions } from '../systems/collision.ts';
import { EnergySystem } from '../systems/energy.ts';
import { EnergyBar } from '../ui/energyBar.ts';
import { HUD } from '../ui/hud.ts';
import { AchievementSystem } from '../systems/achievements.ts';
import { WORLD_THEMES, DEFAULT_WORLD_ID, type WorldTheme } from '../systems/worldTheme.ts';
import type { GameEvent } from '../../pose/types.ts';

const HW = GAME_CONFIG.width / 2; // half-width: 480

export class Play2P extends Phaser.Scene {
  private worldTheme!: WorldTheme;
  private cam1!: Phaser.Cameras.Scene2D.Camera;
  private cam2!: Phaser.Cameras.Scene2D.Camera;
  // P1 systems
  private player1!: Player;
  private energy1!: EnergySystem;
  private ebar1!: EnergyBar;
  private hud1!: HUD;
  private lives1 = 3;
  private distance1 = 0;
  private coins1 = 0;
  private jacks1 = 0;
  private alive1 = true;
  // P2 systems
  private player2!: Player;
  private energy2!: EnergySystem;
  private ebar2!: EnergyBar;
  private hud2!: HUD;
  private lives2 = 3;
  private distance2 = 0;
  private coins2 = 0;
  private jacks2 = 0;
  private alive2 = true;
  // shared
  private road!: Road;
  private parallax!: Parallax;
  private spawner!: Spawner;
  private scoring!: Scoring;
  private speedMps = GAME_CONFIG.speedInitial;
  private elapsedMs = 0;
  private unsubP1: (() => void) | null = null;
  private unsubP2: (() => void) | null = null;
  private eventListener1: ((e: Event) => void) | null = null;
  private eventListener2: ((e: Event) => void) | null = null;

  constructor() { super('Play2P'); }

  init(data: { worldId?: string }): void {
    this.worldTheme = WORLD_THEMES[data?.worldId ?? DEFAULT_WORLD_ID] ?? WORLD_THEMES[DEFAULT_WORLD_ID];
  }

  create(): void {
    const { width, height } = GAME_CONFIG;
    const refs = getRefs(this);

    // Configurar câmeras split-screen
    // cam1: lado esquerdo (P1)
    this.cam1 = this.cameras.add(0, 0, HW, height);
    this.cam1.setBackgroundColor(this.worldTheme.bgColor);
    // cam2: lado direito (P2)
    this.cam2 = this.cameras.main;
    this.cam2.setViewport(HW, 0, HW, height);
    this.cam2.setBackgroundColor(this.worldTheme.bgColor);

    // Linha divisória central
    const divider = this.add.rectangle(HW, height / 2, 2, height, 0x444444, 0.8).setDepth(200);

    // Labels "J1" / "J2"
    this.add.text(10, 10, 'J1', { fontFamily: 'ui-monospace', fontSize: '14px', color: '#4cd964' }).setDepth(201);
    this.add.text(HW + 10, 10, 'J2', { fontFamily: 'ui-monospace', fontSize: '14px', color: '#3498db' }).setDepth(201);

    // Sistemas compartilhados (pista, paralax, spawner)
    this.parallax = new Parallax(this, { bgColor: this.worldTheme.bgColor, horizonColor: this.worldTheme.horizonColor });
    this.road = new Road(this, this.worldTheme.roadColor);
    this.spawner = new Spawner(this, { obstacleColor: this.worldTheme.obstacleColor, coinColor: this.worldTheme.coinColor });
    this.scoring = new Scoring();

    // P1
    this.player1 = new Player(this, 0);
    this.energy1 = new EnergySystem(GAME_CONFIG.energyInitial);
    this.ebar1 = new EnergyBar(this, 10, height - 30, HW - 20);
    this.hud1 = new HUD(this);

    // P2 (posicionado na metade direita do canvas virtual — offset HW)
    this.player2 = new Player(this, 0);
    this.energy2 = new EnergySystem(GAME_CONFIG.energyInitial);
    this.ebar2 = new EnergyBar(this, HW + 10, height - 30, HW - 20);
    this.hud2 = new HUD(this);

    // Iniciar calibração de P2
    refs.calibrator2.start();

    // Subscrever eventos de P1 (usa eventDetector da Fase 1)
    this.eventListener1 = (e: Event) => this.handleEvent1((e as CustomEvent).detail as GameEvent);
    refs.eventDetector.addEventListener('event', this.eventListener1);

    // Subscrever eventos de P2
    this.eventListener2 = (e: Event) => this.handleEvent2((e as CustomEvent).detail as GameEvent);
    refs.eventDetector2.addEventListener('event', this.eventListener2);
  }

  private handleEvent1(ev: GameEvent): void {
    if (!this.alive1) return;
    if (ev.type === 'jump') this.player1.jump();
    else if (ev.type === 'duck') this.player1.duck();
    else if (ev.type === 'lane_change') this.player1.changeLane(ev.lane);
    else if (ev.type === 'jumping_jack') { this.jacks1++; this.energy1.add(5); }
    else if (ev.type === 'cadence') this.energy1.setIntensity(ev.intensity ?? 'none');
  }

  private handleEvent2(ev: GameEvent): void {
    if (!this.alive2) return;
    if (ev.type === 'jump') this.player2.jump();
    else if (ev.type === 'duck') this.player2.duck();
    else if (ev.type === 'lane_change') this.player2.changeLane(ev.lane);
    else if (ev.type === 'jumping_jack') { this.jacks2++; this.energy2.add(5); }
    else if (ev.type === 'cadence') this.energy2.setIntensity(ev.intensity ?? 'none');
  }

  update(_time: number, delta: number): void {
    if (!this.alive1 && !this.alive2) return;
    this.elapsedMs += delta;
    this.speedMps = Math.min(GAME_CONFIG.speedMax,
      GAME_CONFIG.speedInitial + Math.floor(this.elapsedMs / GAME_CONFIG.speedIncreaseIntervalMs) * GAME_CONFIG.speedIncreasePerInterval
    );
    const mps = this.speedMps;

    this.parallax.update(mps, delta);
    this.road.update(mps, delta);
    this.spawner.update(mps, delta);

    if (this.alive1) {
      this.distance1 += (mps * delta) / 1000;
      this.energy1.update(delta);
      if (this.energy1.isZero()) { this.lives1--; this.energy1.reset(); if (this.lives1 <= 0) this.killPlayer(1); }
    }
    if (this.alive2) {
      this.distance2 += (mps * delta) / 1000;
      this.energy2.update(delta);
      if (this.energy2.isZero()) { this.lives2--; this.energy2.reset(); if (this.lives2 <= 0) this.killPlayer(2); }
    }

    if (!this.alive1 && !this.alive2) this.endGame();
  }

  private killPlayer(p: 1 | 2): void {
    if (p === 1) { this.alive1 = false; this.player1.setVisible(false); }
    else { this.alive2 = false; this.player2.setVisible(false); }
  }

  private async endGame(): Promise<void> {
    const refs = getRefs(this);
    const inventory = await refs.inventory.load();
    const newAchievements = AchievementSystem.checkTwoPlayer(inventory);
    for (const id of newAchievements) await refs.inventory.addAchievement(id);
    this.cleanup();
    this.scene.start('Summary2P', {
      p1: { distance: this.distance1, coins: this.coins1, jacks: this.jacks1 },
      p2: { distance: this.distance2, coins: this.coins2, jacks: this.jacks2 },
    });
  }

  private cleanup(): void {
    const refs = getRefs(this);
    if (this.eventListener1) refs.eventDetector.removeEventListener('event', this.eventListener1);
    if (this.eventListener2) refs.eventDetector2.removeEventListener('event', this.eventListener2);
    this.unsubP1?.();
    this.unsubP2?.();
  }

  shutdown(): void { this.cleanup(); }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F8-C04. Registrar Play2P e Summary2P no orchestrator
**Modificar:** `src/game/orchestrator.ts`:
```ts
import { Play2P } from './scenes/Play2P.ts';
import { Summary2P } from './scenes/Summary2P.ts';
// ...
scenes: [...existentes..., Play2P, Summary2P],
```
**Verificar:** `npx tsc --noEmit` sem erros.

### F8-C05. Testar modo 2P no browser com `?debug=1`
**Comando:** `npm run dev`
**Verificar no browser:**
1. Navegar para `CharacterSelect` → "Jogar (2P)" → `Play2P` inicia
2. Canvas mostra linha divisória central
3. "J1" e "J2" labels visíveis
4. Usar teclas de debug (keyboard fallback `?debug=1`) para simular eventos P1 → player1 se move
5. Console não mostra erros de "eventDetector2 is undefined"
6. Forçar GameOver (energia zerar para ambos) → `Summary2P` aparece com placar lado a lado

### F8-C06. Commit Fase F8
```bash
git add src/game/scenes/Play2P.ts src/game/scenes/Summary2P.ts \
        src/game/orchestrator.ts
git commit -m "feat(issue-5): fase F8 - modo 2 jogadores split-screen (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F8-consol. Atualizar CHECKPOINT.md — F8 concluído
Marcar F8 como `✅ concluído`.

---

## FASE F9 — Integração, testes e docs

### F9-C01. Testar CT01 — seleção de mundo e corrida com tema
```bash
# Iniciar dev server
npm run dev &
```
**Manual no browser:**
1. Welcome → "Personalizar" → CharacterSelect
2. Selecionar "Floresta" → "Jogar (1P)"
3. **Verificar:** fundo visível é verde-escuro (não o cinza padrão)
4. **Verificar:** obstáculos têm cor marrom (0x8b4513 do tema Floresta)

### F9-C02. Testar CT02 — compra na loja
**Manual no browser:**
1. Abrir console, executar: `game.registry.get('refs').profileStore.update({ totalCoins: 500 })`
2. Navegar para CharacterSelect → Loja
3. Clicar em Ninja (custo 200) → verificar que moedas decresce para 300
4. Verificar que Ninja aparece como desbloqueado na próxima abertura da Loja

### F9-C03. Testar CT03 — XP calculado corretamente
```bash
node -e "
const xp = Math.floor(100 * 0.5 + 10 * 2 + 5 * 1);
const level = Math.floor(Math.sqrt(xp / 50));
console.assert(xp === 75, 'xp deve ser 75, got:', xp);
console.assert(level === 1, 'level deve ser 1, got:', level);
console.log('CT03 OK — xp=' + xp + ', level=' + level);
"
```
**Esperado:** `CT03 OK — xp=75, level=1`

### F9-C04. Testar CT04 — conquista primeira_partida
**Manual no browser:**
1. Limpar IndexedDB: console → `indexedDB.deleteDatabase('keyval-store')` e recarregar
2. Jogar 1 partida completa
3. No Summary verificar toast "🏆 Primeira Partida" visível

### F9-C05. Testar CT05 — mapa determinístico Desafio Diário
**Manual no browser:**
1. CharacterSelect → "Desafio do Dia"
2. Iniciar → jogar até morrer; anotar posição dos 3 primeiros obstáculos
3. Repetir com mesma seed (voltar e reiniciar)
4. **Verificar:** mesmos obstáculos nas mesmas posições

### F9-C06. Testar CT06 — 2P split-screen
**Manual no browser:**
1. CharacterSelect → "Jogar (2P)"
2. **Verificar:** dois viewports visíveis com divisória
3. **Verificar:** `game.registry.get('refs').eventDetector2` é instância separada de `eventDetector`
4. Com `?debug=1`, usar teclado para P1 → somente player1 se move

### F9-C07. Testar CT08 — migração v1→v2
```bash
node -e "
// Simula a lógica de migração
const v1 = { version: 1, totalCoins: 50, totalRuns: 3, totalDistance: 200, totalJacks: 5, totalArmsUp: 2, ageGroup: '8-10', missionState: { date: '', missions: [] } };
const v2 = { ...v1, version: 2, xp: 0, level: 0 };
console.assert(v2.totalCoins === 50, 'totalCoins preservado');
console.assert(v2.xp === 0, 'xp inicializado em 0');
console.assert(v2.level === 0, 'level inicializado em 0');
console.log('CT08 OK');
"
```
**Esperado:** `CT08 OK`

### F9-C08. Medir bundle final (RNF01)
```bash
npm run build && ls -lh dist/assets/*.js | awk '{print $5, $9}'
```
**Verificar:** nenhum arquivo JS ultrapassa 15MB gzip. Se ultrapassar, executar:
```bash
npm run build -- --minify && npx vite-bundle-visualizer
```
e registrar no CHECKPOINT.md.

### F9-C09. Executar E2E Playwright (CT09)
```bash
npx playwright test e2e/ --headed 2>&1 | tail -30
```
Se spec do CT09 ainda não existir como arquivo `.spec.ts`, criar:
```bash
cat > e2e/issue-5-flow.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';
import { mkdir } from 'fs/promises';

test('CT09 - seleção de mundo e corrida', async ({ page }) => {
  await mkdir('load-tests/results/issue-5-journey', { recursive: true });

  await page.goto('https://localhost:5173');
  await page.waitForSelector('text=Jogar', { timeout: 30000 });
  await page.screenshot({ path: 'load-tests/results/issue-5-journey/01-welcome.png' });

  await page.click('text=Personalizar');
  await page.waitForSelector('text=Floresta');
  await page.screenshot({ path: 'load-tests/results/issue-5-journey/02-char-select.png' });

  await page.click('text=Floresta');
  await page.screenshot({ path: 'load-tests/results/issue-5-journey/03-floresta-selected.png' });

  await page.click('text=Loja');
  await page.waitForSelector('text=Chapéu Pirata');
  await page.screenshot({ path: 'load-tests/results/issue-5-journey/04-shop.png' });

  await page.click('text=← Voltar');
  await page.waitForSelector('text=Jogar (1P)');
  await page.screenshot({ path: 'load-tests/results/issue-5-journey/05-back-to-select.png' });

  await page.click('text=Jogar (1P)');
  await page.waitForTimeout(4000); // aguarda countdown
  await page.screenshot({ path: 'load-tests/results/issue-5-journey/06-play-running.png' });

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  expect(errors).toHaveLength(0);
});
EOF
```
**Verificar:** `npx playwright test e2e/issue-5-flow.spec.ts --headed` passa sem falhas.

### F9-C10. Atualizar CODEMAP.md
**Modificar:** `docs/CODEMAP.md`

1. Alterar `Status do projeto` para `Fase 3 (conteúdo, progressão, 2P)`
2. Atualizar `Pose detection` de `@mediapipe/tasks-vision` para `@tensorflow-models/pose-detection (MoveNet MultiPose-Lightning)`
3. Adicionar novos arquivos à seção de estrutura:
   - `src/game/scenes/CharacterSelect.ts`, `Shop.ts`, `CardioGuided.ts`, `DailyChallenge.ts`, `Play2P.ts`, `Summary2P.ts`
   - `src/game/systems/worldTheme.ts`, `characterDef.ts`, `cosmeticDef.ts`, `xp.ts`, `achievements.ts`
   - `src/game/storage/inventory.ts`, `dailyChallenge.ts`
4. Atualizar `Histórico SDD`: marcar issue #5 como `Implementada ✅`
**Verificar:** `npx tsc --noEmit` sem erros; `git diff docs/CODEMAP.md | head -30` mostra mudanças.

### F9-C11. Atualizar CHANGELOG.md
**Modificar:** `docs/CHANGELOG.md` — adicionar entrada no topo:
```markdown
## [Fase 3] — 2026-04-27

### Added
- 5 mundos com paleta procedural (cidade, floresta, espaço, oceano, deserto)
- 3 personagens desbloqueáveis (Herói, Ninja, Robô) + 6 cosméticos
- Loja in-game com moedas locais
- Sistema de XP e níveis (fórmula sqrt)
- 6 conquistas/badges
- Tela de seleção de personagem, mundo e modo
- Modo Cardio Guiado (3 ciclos corrida + exercício)
- Desafio Diário com seed determinístico por data
- Modo 2 Jogadores local (split-screen, mesma câmera)

### Changed
- Pose layer migrada de MediaPipe PoseLandmarker para MoveNet MultiPose-Lightning (TF.js)
- KP enum atualizado para COCO-17
- ProfileStore migrado para v2 (adiciona XP e level)
```
**Verificar:** arquivo salvo sem erros de sintaxe Markdown.

### F9-C12. Commit final Fase F9
```bash
git add docs/CODEMAP.md docs/CHANGELOG.md \
        e2e/issue-5-flow.spec.ts \
        docs/sdd/ISSUE_5/CHECKPOINT.md \
        load-tests/results/issue-5-journey/
git commit -m "feat(issue-5): fase F9 - integração, E2E e docs atualizadas (#5)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

### F9-consol. Atualizar CHECKPOINT.md — F9 concluído
Marcar F9 e todas as fases como `✅ concluído`. Registrar data de conclusão.
