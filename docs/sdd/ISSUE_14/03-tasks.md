# Tasks — Polish Visual e Sonoro

**Issue:** #14
**Baseado em:** `02-spec.md`
**Total estimado:** ~48 tasks × 3min = ~2.5h
**Fases:** A (estética global) → B (objetos da pista) → C (FX cinematográficos) → D (oponentes) → E (testes)

---

## FASE A — Estética global

### A1. Adicionar PALETTE, FOG e FX flags em config.ts
**Modificar:** `src/game/config.ts` — adicionar após `coinPickupZThreshold`:
```typescript
  /** Paleta Pixel Arcade */
  palette: {
    sky:        0x4488ff,
    skyHorizon: 0x88aaff,
    grassA:     0x44bb44,
    grassB:     0x33aa33,
    roadA:      0x888899,
    roadB:      0x777788,
    stripe:     0xffff00,
    line:       0xffffff,
  },
  /** Neblina */
  fog: { enabled: true, density: 0.7, color: 0x88aaff },
  /** Flags de efeitos — desativar individualmente para performance */
  fx: {
    scanlines:   true,
    vignette:    true,
    speedLines:  true,
    particles:   true,
    chromatic:   false,
    screenShake: true,
    flash:       true,
  },
```
Também trocar `bgColor: 0x0b0d10` → `bgColor: 0x4488ff`
**Verificar:** `npx tsc --noEmit` sem erros

### A2. Adicionar constantes FX em tuning.ts
**Modificar:** `src/tuning.ts` — adicionar ao final:
```typescript
export const FX_CHROMATIC_STRENGTH   = 3;   // px deslocamento RGB
export const FX_SHAKE_AMPLITUDE_PX   = 8;
export const FX_SHAKE_DURATION_MS    = 200;
export const FX_SPEED_LINE_COUNT     = 12;
export const FX_PARTICLE_COIN_COUNT  = 6;
export const FX_PARTICLE_HIT_COUNT   = 4;
```
**Verificar:** `npx tsc --noEmit` sem erros

### A3. Importar VT323 no HTML
**Modificar:** `index.html` — adicionar no `<head>` antes do `<script>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
```
**Verificar:** abrir `https://localhost:5173` — DevTools → Fonts mostra VT323 carregada

### A4. Atualizar Road.draw() com paleta Pixel Arcade
**Modificar:** `src/game/systems/road.ts` — substituir método `draw()` completo:
```typescript
private draw(): void {
  const g = this.gfx;
  const C = GAME_CONFIG;
  const P = C.palette;
  g.clear();

  const cx = C.width / 2;
  const horizHW = C.laneXOffsetAtHorizon * 1.7;
  const nearHW  = C.laneXOffsetAtNear    * 1.7;
  const numSeg  = 20;

  // Céu
  g.fillGradientStyle(P.sky, P.sky, P.skyHorizon, P.skyHorizon, 1);
  g.fillRect(0, 0, C.width, C.horizonY);

  // Segmentos de pista + grama
  for (let i = numSeg; i >= 0; i--) {
    const t  = i / numSeg;
    const t1 = (i + 1) / numSeg;
    const y  = C.horizonY + (C.height - C.horizonY) * Math.pow(t,  1.3);
    const y1 = C.horizonY + (C.height - C.horizonY) * Math.pow(t1, 1.3);
    const hw  = nearHW * Math.pow(t,  1.1);
    const hw1 = nearHW * Math.pow(t1, 1.1);

    // Fog alpha
    const fogAlpha = C.fog.enabled ? Math.max(0, 1 - t * (1 - C.fog.density) * 2) : 1;

    // Grama
    const grassCol = i % 2 === 0 ? P.grassA : P.grassB;
    g.fillStyle(grassCol, fogAlpha);
    g.fillRect(0, y, C.width, Math.max(1, y1 - y));

    // Pista
    const roadCol = i % 2 === 0 ? P.roadA : P.roadB;
    g.fillStyle(roadCol, fogAlpha);
    g.beginPath();
    g.moveTo(cx - hw,  y);  g.lineTo(cx + hw,  y);
    g.lineTo(cx + hw1, y1); g.lineTo(cx - hw1, y1);
    g.closePath();
    g.fillPath();

    // Stripes laterais
    const sw = hw * 0.10;
    g.fillStyle(P.stripe, fogAlpha);
    g.beginPath();
    g.moveTo(cx - hw, y);       g.lineTo(cx - hw + sw, y);
    g.lineTo(cx - hw1 + sw, y1); g.lineTo(cx - hw1, y1);
    g.closePath(); g.fillPath();
    g.beginPath();
    g.moveTo(cx + hw, y);       g.lineTo(cx + hw - sw, y);
    g.lineTo(cx + hw1 - sw, y1); g.lineTo(cx + hw1, y1);
    g.closePath(); g.fillPath();

    // Linha central tracejada
    if (i % 3 === 0) {
      g.fillStyle(P.line, fogAlpha * 0.7);
      g.fillRect(cx - 2, y, 4, (y1 - y) * 0.6);
    }
  }

  // Scroll offset animado (já existente no update)
  this.offset = (this.offset + 0); // mantido em update()
}
```
**Verificar:** `?demo=1` mostra pista azul/verde/amarela

### A5. Reescrever HUD para Corner Widgets + VT323
**Modificar:** `src/game/ui/hud.ts` — substituir arquivo completo:
```typescript
import * as Phaser from 'phaser';
import { strings } from '../../i18n/strings.ts';
import { GAME_CONFIG } from '../config.ts';

const MAX_LIVES = 3;
const VT = { fontFamily: 'VT323, ui-monospace', stroke: '#000', strokeThickness: 3 } as const;
const PANEL = { fillColor: 0x000000, fillAlpha: 0.55 } as const;

export class HUD {
  private distEl:   Phaser.GameObjects.Text;
  private coinsEl:  Phaser.GameObjects.Text;
  private livesEl:  Phaser.GameObjects.Text;
  private bpmEl:    Phaser.GameObjects.Text;
  private fpsEl:    Phaser.GameObjects.Text | null = null;
  private scene:    Phaser.Scene;
  private panels:   Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const pad = 10;

    const mkPanel = (x: number, y: number, w: number, h: number) => {
      const r = scene.add.rectangle(x, y, w, h, PANEL.fillColor, PANEL.fillAlpha)
        .setOrigin(0, 0).setDepth(99);
      this.panels.push(r);
      return r;
    };

    // Topo esquerdo — distância
    mkPanel(pad, pad, 160, 42);
    this.distEl = scene.add.text(pad + 8, pad + 6, '0 m',
      { ...VT, fontSize: '28px', color: '#ffffff' }).setDepth(100);

    // Topo direito — coins
    mkPanel(W - 140 - pad, pad, 140, 42);
    this.coinsEl = scene.add.text(W - 140, pad + 6, `0 ${strings.play.coins}`,
      { ...VT, fontSize: '26px', color: '#ffd60a' }).setDepth(100).setOrigin(0, 0);

    // Base esquerda — BPM / vidas
    mkPanel(pad, H - 52 - pad, 130, 42);
    this.bpmEl = scene.add.text(pad + 8, H - 50,
      '❤❤❤', { ...VT, fontSize: '24px', color: '#ff6688' }).setDepth(100);

    // Base direita — lives
    mkPanel(W - 140 - pad, H - 52 - pad, 140, 42);
    this.livesEl = scene.add.text(W - 136, H - 50,
      '❤️❤️❤️', { fontSize: '24px' }).setDepth(100).setOrigin(0, 0);

    if (new URLSearchParams(window.location.search).get('fps') === '1') {
      this.fpsEl = scene.add.text(W / 2, pad + 6, '0 FPS',
        { ...VT, fontSize: '18px', color: '#8a8d92' }).setOrigin(0.5, 0).setDepth(100);
    }
  }

  setDistance(m: number): void { this.distEl.setText(`${Math.floor(m)} ${strings.play.distance}`); }
  setCoins(n: number):    void { this.coinsEl.setText(`${n} ${strings.play.coins}`); }
  setFps(fps: number):    void { if (this.fpsEl) this.fpsEl.setText(`${Math.round(fps)} FPS`); }
  setBpm(bpm: number):    void { this.bpmEl.setText(`${Math.round(bpm)} BPM`); }

  setLives(n: number): void {
    const full  = '❤️'.repeat(Math.max(0, n));
    const empty = '🖤'.repeat(Math.max(0, MAX_LIVES - n));
    this.livesEl.setText(full + empty);
    if (n < MAX_LIVES) {
      this.scene.tweens.add({
        targets: this.livesEl, scale: { from: 1.4, to: 1 },
        duration: 300, ease: 'Cubic.easeOut',
      });
    }
  }
}
```
**Verificar:** `?demo=1` mostra painéis nos 4 cantos em VT323

### A6. Criar audiosprite JSON placeholder
**Criar:** `public/assets/audio/sfx.json`
```json
{
  "spritemap": {
    "coin_collect":     { "start": 0.0,  "end": 0.4,  "loop": false },
    "obstacle_hit":     { "start": 0.5,  "end": 1.1,  "loop": false },
    "jump":             { "start": 1.2,  "end": 1.6,  "loop": false },
    "shield":           { "start": 1.7,  "end": 2.2,  "loop": false },
    "game_over":        { "start": 2.3,  "end": 3.5,  "loop": false },
    "mission_complete": { "start": 3.6,  "end": 4.8,  "loop": false },
    "boss_defeat":      { "start": 4.9,  "end": 6.2,  "loop": false }
  }
}
```
**Também criar** `public/assets/audio/sfx.mp3` e `public/assets/audio/sfx.ogg` — arquivos de 7s de silêncio como placeholder (gerar com: `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 7 -q:a 9 -acodec libmp3lame public/assets/audio/sfx.mp3` e `.ogg` equivalente). **Se ffmpeg não disponível:** criar arquivos com `base64` de um MP3 de silêncio mínimo válido.
**Verificar:** `ls -la public/assets/audio/` mostra 3 arquivos

### A7. Migrar AudioBus para audioSprite
**Modificar:** `src/game/systems/audioBus.ts` — substituir arquivo completo:
```typescript
import * as Phaser from 'phaser';

export class AudioBus {
  private musicSound: Phaser.Sound.BaseSound | null = null;
  private musicVolume  = 0.4;
  private duckedVolume = 0.15;
  private isDucked     = false;
  private duckTimer:   number | null = null;
  private scene:       Phaser.Scene;
  private sfxEnabled   = true;

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  startMusic(): void {
    if (!this.scene.cache.audio.exists('music_run_loop')) return;
    if (this.musicSound) return;
    this.musicSound = this.scene.sound.add('music_run_loop',
      { loop: true, volume: this.musicVolume });
    this.musicSound.play();
  }

  stopMusic(): void {
    if (this.musicSound) { this.musicSound.stop(); this.musicSound = null; }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicSound && !this.isDucked)
      (this.musicSound as Phaser.Sound.BaseSound & { setVolume?(v: number): void }).setVolume?.(this.musicVolume);
  }

  duck(): void {
    if (!this.musicSound) return;
    this.isDucked = true;
    (this.musicSound as Phaser.Sound.BaseSound & { setVolume?(v: number): void }).setVolume?.(this.duckedVolume);
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
  }

  restore(delayMs = 500): void {
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
    this.duckTimer = window.setTimeout(() => {
      this.isDucked = false;
      if (this.musicSound)
        (this.musicSound as Phaser.Sound.BaseSound & { setVolume?(v: number): void }).setVolume?.(this.musicVolume);
    }, delayMs);
  }

  /** Toca um SFX via audioSprite. Gated: não falha se asset não carregou. */
  playSfx(marker: string): void {
    if (!this.sfxEnabled) return;
    if (!this.scene.cache.audio.exists('sfx')) return;
    try {
      (this.scene.sound as Phaser.Sound.BaseSoundManager & {
        playAudioSprite?(key: string, marker: string, config?: object): void
      }).playAudioSprite?.('sfx', marker, { volume: 0.6 });
      if (import.meta.env.DEV) console.debug(`SFX ${marker} via audioSprite`);
    } catch { /* silencioso — audioSprite pode não ter o marker */ }
  }

  setSfxEnabled(v: boolean): void { this.sfxEnabled = v; }
  getMusicVolume(): number { return this.musicVolume; }
}
```
**Verificar:** `npx tsc --noEmit` sem erros

### A8. Carregar audioSprite em Loading.ts
**Modificar:** `src/game/scenes/Loading.ts` — adicionar dentro de `bootDetector()` antes de `refs.detector.loadModel(...)`:
```typescript
// Carregar audioSprite de SFX (gated — não bloqueia se asset ausente)
if (!this.cache.audio.exists('sfx')) {
  this.load.audioSprite('sfx',
    ['assets/audio/sfx.ogg', 'assets/audio/sfx.mp3'],
    'assets/audio/sfx.json');
  await new Promise<void>(resolve => {
    this.load.once('complete', resolve);
    this.load.start();
  });
}
```
**Verificar:** DevTools Network mostra requisição a `sfx.json` na carga

### A9. Criar PostFxOverlay (scanlines + vignette)
**Criar:** `src/game/ui/postfx.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

export class PostFxOverlay {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(200).setScrollFactor(0);
    this.drawStatic();
  }

  private drawStatic(): void {
    const g = this.gfx;
    const { width: W, height: H, fx } = GAME_CONFIG;
    g.clear();

    if (fx.vignette) {
      const v = scene => scene; // captura closure
      const vGrad = this.gfx.scene.add.graphics().setDepth(200).setScrollFactor(0);
      // Vinheta via fillGradientStyle radial não existe no Phaser — usar fill com alpha
      // Aproximação: 4 rectângulos semi-transparentes nas bordas
      const vAlpha = 0.45;
      const vSize  = 80;
      g.fillStyle(0x000000, vAlpha);
      g.fillRect(0, 0, W, vSize);                    // topo
      g.fillRect(0, H - vSize, W, vSize);            // base
      g.fillRect(0, 0, vSize, H);                    // esquerda
      g.fillRect(W - vSize, 0, vSize, H);            // direita
    }

    if (fx.scanlines) {
      g.lineStyle(1, 0x000000, 0.08);
      for (let y = 0; y < H; y += 3) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath();
      }
    }
  }

  destroy(): void { this.gfx.destroy(); }
}
```
**Verificar:** `?demo=1` — linha sutis horizontais + bordas escuras visíveis

### A10. Integrar PostFxOverlay em Play.ts
**Modificar:** `src/game/scenes/Play.ts` — no método `create()`, após criação do HUD:
```typescript
import { PostFxOverlay } from '../ui/postfx.ts';
// ...
this.postFx = new PostFxOverlay(this);
```
Declarar `private postFx!: PostFxOverlay;` no topo da classe.
No `shutdown()` ou `destroy()`:
```typescript
this.postFx?.destroy();
```
**Verificar:** scanlines e vinheta visíveis em Play

### A11. Commit Fase A
```bash
git add src/game/config.ts src/tuning.ts index.html \
        src/game/systems/road.ts src/game/systems/audioBus.ts \
        src/game/ui/hud.ts src/game/ui/postfx.ts \
        src/game/scenes/Loading.ts src/game/scenes/Play.ts \
        public/assets/audio/
git commit -m "improve(#14): fase A — Pixel Arcade, VT323, Corner HUD, audiosprite, postfx"
```
**Verificar:** `git log -1 --oneline` mostra o commit

---

## FASE B — Objetos da pista

### B1. Criar pastas de assets
```bash
mkdir -p public/assets/sprites public/assets/audio
```
**Verificar:** `ls public/assets/` mostra `sprites/` e `audio/`

### B2. Gerar texturas placeholder para sprites
**Criar:** `src/game/systems/textureGen.ts` — utilitário para gerar texturas procedurais na Fase B:
```typescript
import * as Phaser from 'phaser';

/** Gera textura procedural como placeholder até PNG real estar disponível. */
export function ensureTexture(
  scene: Phaser.Scene,
  key: string,
  w: number, h: number,
  color: number, shape: 'rect' | 'tree' | 'coin' = 'rect',
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 1);
  if (shape === 'tree') {
    g.fillTriangle(w / 2, 0, 0, h * 0.7, w, h * 0.7);
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(w * 0.4, h * 0.7, w * 0.2, h * 0.3);
  } else if (shape === 'coin') {
    g.fillCircle(w / 2, h / 2, Math.min(w, h) / 2 - 2);
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(w / 2, h / 2, Math.min(w, h) / 2 - 6);
  } else {
    g.fillRect(0, 0, w, h);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}
```
**Verificar:** `npx tsc --noEmit`

### B3. Criar BillboardLayer
**Criar:** `src/game/systems/billboard.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { zToScale, zToY } from './pseudo3d.ts';
import { ensureTexture } from './textureGen.ts';

const C = GAME_CONFIG;
const TREE_Z_POSITIONS = [0.95, 0.80, 0.65, 0.50, 0.35, 0.20];

export class BillboardLayer {
  private sprites: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene) {
    ensureTexture(scene, 'billboard_tree', 64, 128, 0x228b22, 'tree');
    ensureTexture(scene, 'billboard_sign', 48, 64, 0xf0c040, 'rect');

    for (const z of TREE_Z_POSITIONS) {
      const scale = zToScale(z);
      const y     = zToY(z);
      const roadEdgeL = C.width / 2 - (C.laneXOffsetAtHorizon + (C.laneXOffsetAtNear - C.laneXOffsetAtHorizon) * (1 - z)) * 1.7;
      const roadEdgeR = C.width / 2 + (C.laneXOffsetAtHorizon + (C.laneXOffsetAtNear - C.laneXOffsetAtHorizon) * (1 - z)) * 1.7;

      const treeL = scene.add.sprite(roadEdgeL - 32 * scale, y, 'billboard_tree')
        .setOrigin(0.5, 1).setScale(scale).setDepth(4 + (1 - z) * 8);
      const treeR = scene.add.sprite(roadEdgeR + 32 * scale, y, 'billboard_tree')
        .setOrigin(0.5, 1).setScale(scale).setDepth(4 + (1 - z) * 8);
      this.sprites.push(treeL, treeR);
    }
  }

  destroy(): void { this.sprites.forEach(s => s.destroy()); this.sprites = []; }
}
```
**Verificar:** `npx tsc --noEmit`

### B4. Integrar BillboardLayer em Play.ts
**Modificar:** `src/game/scenes/Play.ts` — no `create()` após `this.road = new Road(this)`:
```typescript
import { BillboardLayer } from '../systems/billboard.ts';
// ...
this.billboard = new BillboardLayer(this);
```
Declarar `private billboard!: BillboardLayer;`
No `shutdown()`: `this.billboard?.destroy();`
**Verificar:** `?demo=1` mostra árvores nas laterais, menores ao longe

### B5. Trocar textura da Coin para coin_kenney
**Modificar:** `src/game/entities/Coin.ts` — no `constructor()`:

Trocar linha `this.sprite = scene.add.sprite(..., 'coin')` por:
```typescript
// Usar PNG real se disponível, senão placeholder procedural
const texKey = scene.textures.exists('coin_kenney') ? 'coin_kenney' : 'coin';
this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), texKey)
  .setOrigin(0.5, 1).setScale(zToScale(this.z) * 0.7).setDepth(5);
// Não usar setTint — coin_kenney já é dourada
if (!scene.textures.exists('coin_kenney')) this.sprite.setTint(0xffd60a);
```
**Verificar:** moeda aparece sem tint quando `coin_kenney` disponível

### B6. Adicionar novos ObstacleKind em Obstacle.ts
**Modificar:** `src/game/entities/Obstacle.ts`:

1. Expandir tipo:
```typescript
export type ObstacleKind =
  | 'barrier' | 'low_barrier' | 'wall_lane'
  | 'jump_brick' | 'jump_column'
  | 'duck_log'   | 'duck_banner';
```
2. Expandir `TEXTURE_BY_KIND`:
```typescript
const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  barrier:      'obs_barrier',
  low_barrier:  'obs_low',
  wall_lane:    'obs_wall',
  jump_brick:   'obs_jump_brick',
  jump_column:  'obs_jump_column',
  duck_log:     'obs_duck_log',
  duck_banner:  'obs_duck_banner',
};
```
3. No `constructor()` após criar sprite, garantir placeholder:
```typescript
import { ensureTexture } from '../systems/textureGen.ts';
// antes de scene.add.sprite:
ensureTexture(scene, TEXTURE_BY_KIND[kind], 80, 100, kind.startsWith('duck') ? 0x8b4513 : 0xc0622a);
```
**Verificar:** `npx tsc --noEmit`

### B7. Atualizar collision.ts para novos kinds
**Modificar:** `src/game/systems/collision.ts` — dentro do loop de obstáculos, após as linhas existentes de `evading`:
```typescript
if (obs.kind === 'jump_brick'   && playerState === 'jumping') evading = true;
if (obs.kind === 'jump_column'  && playerState === 'jumping') evading = true;
if (obs.kind === 'duck_log'     && playerState === 'ducking') evading = true;
if (obs.kind === 'duck_banner'  && playerState === 'ducking') evading = true;
```
**Verificar:** `npx tsc --noEmit`; testar com `?debug=1` — jump_brick evitado por J

### B8. Adicionar novos kinds ao Spawner
**Modificar:** `src/game/systems/spawner.ts` — atualizar `ALL_KINDS`:
```typescript
const ALL_KINDS: ObstacleKind[] = [
  'barrier', 'low_barrier', 'wall_lane',
  'jump_brick', 'jump_column',
  'duck_log', 'duck_banner',
];
```
**Verificar:** novos obstáculos aparecem em `?demo=1` após 20s

### B9. Implementar screen shake na colisão (Play.ts)
**Modificar:** `src/game/scenes/Play.ts` — localizar onde `lives` é decrementado após colisão. Adicionar após o decremento:
```typescript
import { FX_SHAKE_AMPLITUDE_PX, FX_SHAKE_DURATION_MS } from '../../tuning.ts';
// ...
if (GAME_CONFIG.fx.screenShake) {
  this.cameras.main.shake(FX_SHAKE_DURATION_MS, FX_SHAKE_AMPLITUDE_PX / GAME_CONFIG.width);
}
```
**Verificar:** colisão com obstáculo causa vibração de tela visível

### B10. Implementar flash branco na colisão (Play.ts)
**Modificar:** `src/game/scenes/Play.ts` — na mesma função de colisão, após o shake:
```typescript
if (GAME_CONFIG.fx.flash) {
  const flash = this.add.rectangle(
    GAME_CONFIG.width / 2, GAME_CONFIG.height / 2,
    GAME_CONFIG.width, GAME_CONFIG.height,
    0xffffff, 0.5,
  ).setDepth(150);
  this.tweens.add({
    targets: flash, alpha: 0, duration: 150,
    onComplete: () => flash.destroy(),
  });
}
```
**Verificar:** flash branco de ~150ms ao colidir

### B11. Commit Fase B
```bash
git add src/game/systems/billboard.ts src/game/systems/textureGen.ts \
        src/game/entities/Obstacle.ts src/game/entities/Coin.ts \
        src/game/systems/spawner.ts src/game/systems/collision.ts \
        src/game/scenes/Play.ts
git commit -m "improve(#14): fase B — billboard, novos obstáculos jump/duck, shake, flash"
```

---

## FASE C — FX cinematográficos

### C1. Criar SpeedLines
**Criar:** `src/game/ui/speedLines.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { FX_SPEED_LINE_COUNT } from '../../tuning.ts';

export class SpeedLines {
  private gfx:     Phaser.GameObjects.Graphics;
  private visible_ = false;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(180).setScrollFactor(0);
  }

  setVisible(v: boolean): void {
    if (this.visible_ === v) return;
    this.visible_ = v;
    if (!v) this.gfx.clear();
  }

  update(alpha: number): void {
    if (!this.visible_) return;
    const g   = this.gfx;
    const C   = GAME_CONFIG;
    const vpX = C.width  / 2;
    const vpY = C.horizonY;
    g.clear();
    g.lineStyle(1.5, 0xffffff, alpha * 0.35);
    for (let i = 0; i < FX_SPEED_LINE_COUNT; i++) {
      const angle = (i / FX_SPEED_LINE_COUNT) * Math.PI * 2;
      const len   = 80 + Math.random() * 60;
      g.beginPath();
      g.moveTo(vpX + Math.cos(angle) * 20, vpY + Math.sin(angle) * 20);
      g.lineTo(vpX + Math.cos(angle) * (20 + len), vpY + Math.sin(angle) * (20 + len));
      g.strokePath();
    }
  }

  destroy(): void { this.gfx.destroy(); }
}
```
**Verificar:** `npx tsc --noEmit`

### C2. Integrar SpeedLines em Play.ts
**Modificar:** `src/game/scenes/Play.ts`:
- Importar + declarar: `private speedLines!: SpeedLines;`
- No `create()`: `this.speedLines = new SpeedLines(this);`
- No `update()`, após calcular `energy.tier`:
```typescript
import { SpeedLines } from '../ui/speedLines.ts';
// ...
const tier = this.energy.getTier();
if (GAME_CONFIG.fx.speedLines) {
  this.speedLines.setVisible(tier >= 3);
  this.speedLines.update(tier === 4 ? 1.0 : 0.6);
}
```
- No `shutdown()`: `this.speedLines?.destroy();`
**Verificar:** speed lines aparecem quando energia está alta

### C3. Partículas na coleta de moeda
**Modificar:** `src/game/scenes/Play.ts` — na função que processa `result.collectedCoins`:
```typescript
import { FX_PARTICLE_COIN_COUNT } from '../../tuning.ts';
// ...
if (GAME_CONFIG.fx.particles) {
  for (const c of result.collectedCoins) {
    const px = this.cameras.main.worldView.x + c.sprite.x; // posição mundo
    const py = c.sprite.y;
    for (let i = 0; i < FX_PARTICLE_COIN_COUNT; i++) {
      const p = this.add.circle(
        c.sprite.x, c.sprite.y - 20, 4, 0xffd700,
      ).setDepth(20);
      this.tweens.add({
        targets: p,
        x: c.sprite.x + (Math.random() - 0.5) * 60,
        y: c.sprite.y - 20 - Math.random() * 40,
        alpha: 0, scale: 0,
        duration: 400 + Math.random() * 200,
        onComplete: () => p.destroy(),
      });
    }
  }
}
```
**Verificar:** partículas douradas aparecem ao coletar moeda

### C4. Partículas na colisão
**Modificar:** `src/game/scenes/Play.ts` — na função de colisão, após flash:
```typescript
import { FX_PARTICLE_HIT_COUNT } from '../../tuning.ts';
// ...
if (GAME_CONFIG.fx.particles && result.collidedObstacle) {
  const obs = result.collidedObstacle;
  for (let i = 0; i < FX_PARTICLE_HIT_COUNT; i++) {
    const p = this.add.circle(obs.sprite.x, obs.sprite.y, 5, 0xff4444).setDepth(20);
    this.tweens.add({
      targets: p,
      x: obs.sprite.x + (Math.random() - 0.5) * 50,
      y: obs.sprite.y - Math.random() * 30,
      alpha: 0, scale: 0,
      duration: 300 + Math.random() * 150,
      onComplete: () => p.destroy(),
    });
  }
}
```
**Verificar:** partículas vermelhas ao colidir

### C5. Aberração cromática (CSS filter)
**Modificar:** `src/game/scenes/Play.ts` — adicionar método:
```typescript
private setChromaticAberration(strength: number): void {
  if (!GAME_CONFIG.fx.chromatic) return;
  const canvas = this.game.canvas;
  canvas.style.filter = strength > 0
    ? `drop-shadow(${strength}px 0 0 rgba(255,0,0,0.4)) drop-shadow(-${strength}px 0 0 rgba(0,255,255,0.4))`
    : '';
}
```
No `update()`, após calcular `tier`:
```typescript
import { FX_CHROMATIC_STRENGTH } from '../../tuning.ts';
// ...
const fps = this.game.loop.actualFps;
const useChromatic = tier === 4 && fps >= 40;
this.setChromaticAberration(useChromatic ? FX_CHROMATIC_STRENGTH : 0);
```
No `shutdown()`: `this.setChromaticAberration(0);`
**Verificar:** em tier 4, bordas do canvas têm franja vermelha/ciano

### C6. Commit Fase C
```bash
git add src/game/ui/speedLines.ts src/game/scenes/Play.ts
git commit -m "improve(#14): fase C — speed lines, partículas, aberração cromática"
```

---

## FASE D — Oponentes

### D1. Criar Robot.ts (patrol entre lanes)
**Criar:** `src/game/entities/Robot.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Robot {
  readonly sprite: Phaser.GameObjects.Sprite;
  z:    number;
  lane: Lane;
  alive = true;
  private patrolCount = 0;
  private patrolTimer = 0;
  readonly kind = 'robot' as const;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.z    = GAME_CONFIG.zMax;
    ensureTexture(scene, 'robot', 60, 90, 0x888899);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'robot')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }

    // Patrol: muda de lane a cada 1.5s, máx 3×
    this.patrolTimer += dtSec;
    if (this.patrolTimer >= 1.5 && this.patrolCount < 3) {
      const lanes: Lane[] = [-1, 0, 1];
      const others = lanes.filter(l => l !== this.lane);
      this.lane = others[Math.floor(Math.random() * others.length)];
      this.patrolTimer = 0;
      this.patrolCount++;
    }

    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z));
    this.sprite.setY(zToY(z));
    this.sprite.setScale(zToScale(z));
    this.sprite.setDepth(5 + (1 - this.z) * 10);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```
**Verificar:** `npx tsc --noEmit`

### D2. Criar Animal.ts (corrida diagonal)
**Criar:** `src/game/entities/Animal.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Animal {
  readonly sprite: Phaser.GameObjects.Sprite;
  z:    number;
  lane: Lane;
  alive = true;
  private targetLane: Lane;
  readonly kind = 'animal' as const;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane       = lane;
    this.targetLane = (lane === 0 ? 1 : 0) as Lane;
    this.z          = GAME_CONFIG.zMax;
    ensureTexture(scene, 'animal_fox', 50, 60, 0xe85d04);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'animal_fox')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    // Migrar gradualmente para targetLane
    if (this.z < 0.6 && this.lane !== this.targetLane) this.lane = this.targetLane;
    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z));
    this.sprite.setY(zToY(z));
    this.sprite.setScale(zToScale(z));
    this.sprite.setDepth(5 + (1 - this.z) * 10);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```
**Verificar:** `npx tsc --noEmit`

### D3. Criar Ghost.ts (evasão só lateral)
**Criar:** `src/game/entities/Ghost.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Ghost {
  readonly sprite: Phaser.GameObjects.Sprite;
  z:    number;
  readonly lane: Lane;
  alive = true;
  readonly kind = 'ghost' as const;
  private bobTimer = 0;

  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane;
    this.z    = GAME_CONFIG.zMax;
    ensureTexture(scene, 'ghost', 50, 70, 0xddfff8);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'ghost')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5).setAlpha(0.75);
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    this.bobTimer += dtSec;
    const z    = Math.max(0, this.z);
    const bobY = Math.sin(this.bobTimer * 3) * 8 * zToScale(z);
    this.sprite.setX(laneToX(this.lane, z));
    this.sprite.setY(zToY(z) + bobY);
    this.sprite.setScale(zToScale(z));
    this.sprite.setDepth(5 + (1 - this.z) * 10);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```
**Verificar:** `npx tsc --noEmit`; Ghost flutua com movimento senoidal

### D4. Criar Zombie.ts, Alien.ts, NpcRunner.ts (padrão similar)
**Criar:** `src/game/entities/Zombie.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Zombie {
  readonly sprite: Phaser.GameObjects.Sprite;
  z: number; readonly lane: Lane; alive = true; readonly kind = 'zombie' as const;
  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane; this.z = GAME_CONFIG.zMax;
    ensureTexture(scene, 'zombie', 60, 90, 0x7ab88a);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'zombie')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }
  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07 * 0.7; // 0.7× velocidade
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z)); this.sprite.setY(zToY(z));
    this.sprite.setScale(zToScale(z) * 1.2); // 1.2× hitbox visual
    this.sprite.setDepth(5 + (1 - this.z) * 10);
  }
  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```

**Criar:** `src/game/entities/Alien.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class Alien {
  readonly sprite: Phaser.GameObjects.Sprite;
  z: number; readonly lane: Lane; alive = true; readonly kind = 'alien' as const;
  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane; this.z = GAME_CONFIG.zMax;
    ensureTexture(scene, 'alien', 55, 75, 0x44cc66);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'alien')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }
  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07 * 1.5; // 1.5× rush
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z)); this.sprite.setY(zToY(z));
    this.sprite.setScale(zToScale(z)); this.sprite.setDepth(5 + (1 - this.z) * 10);
  }
  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```

**Criar:** `src/game/entities/NpcRunner.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

export class NpcRunner {
  readonly sprite: Phaser.GameObjects.Sprite;
  z: number; readonly lane: Lane; alive = true; readonly kind = 'npc_runner' as const;
  private speedMult: number;
  constructor(scene: Phaser.Scene, lane: Lane) {
    this.lane = lane; this.z = GAME_CONFIG.zMax;
    this.speedMult = 0.8 + Math.random() * 0.4;
    ensureTexture(scene, 'npc_runner', 50, 80, 0xcc4444);
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'npc_runner')
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }
  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07 * this.speedMult;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    const z = Math.max(0, this.z);
    this.sprite.setX(laneToX(this.lane, z)); this.sprite.setY(zToY(z));
    this.sprite.setScale(zToScale(z)); this.sprite.setDepth(5 + (1 - this.z) * 10);
  }
  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```
**Verificar:** `npx tsc --noEmit` para todos os 3

### D5. Criar Boss.ts com health bar
**Criar:** `src/game/entities/Boss.ts`
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import { ensureTexture } from '../systems/textureGen.ts';
import type { Lane } from '../../pose/types.ts';

const MAX_HP = 3;

export class Boss {
  readonly sprite:  Phaser.GameObjects.Sprite;
  private hpBar:    Phaser.GameObjects.Rectangle;
  private hpFill:   Phaser.GameObjects.Rectangle;
  private hpLabel:  Phaser.GameObjects.Text;
  z:   number;
  readonly lane: Lane = 0;
  alive = true;
  readonly kind = 'boss' as const;
  private hp = MAX_HP;

  constructor(scene: Phaser.Scene) {
    this.z = GAME_CONFIG.zMax;
    ensureTexture(scene, 'boss', 100, 130, 0x440022);
    this.sprite = scene.add.sprite(laneToX(0, this.z), zToY(this.z), 'boss')
      .setOrigin(0.5, 1).setScale(zToScale(this.z) * 2).setDepth(5);

    const barW = 80, barH = 8;
    this.hpBar  = scene.add.rectangle(0, 0, barW, barH, 0x333333).setDepth(50).setOrigin(0.5, 1);
    this.hpFill = scene.add.rectangle(0, 0, barW, barH, 0xff2222).setDepth(51).setOrigin(0, 1);
    this.hpLabel = scene.add.text(0, 0, 'BOSS', {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#ffffff', stroke: '#000', strokeThickness: 2,
    }).setDepth(52).setOrigin(0.5, 1);
  }

  /** Retorna true se boss foi derrotado. */
  hit(): boolean {
    this.hp = Math.max(0, this.hp - 1);
    this.scene.tweens.add({ targets: this.sprite, alpha: { from: 1, to: 0.3 }, yoyo: true, duration: 100 });
    if (this.hp <= 0) { this.alive = false; this.destroy(); return true; }
    return false;
  }

  private get scene(): Phaser.Scene { return this.sprite.scene; }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07 * 0.5; // boss se move mais devagar
    if (this.z < -0.05) { this.alive = false; this.destroy(); return; }
    const z   = Math.max(0, this.z);
    const sc  = zToScale(z) * 2;
    const sx  = laneToX(0, z);
    const sy  = zToY(z);
    this.sprite.setX(sx).setY(sy).setScale(sc).setDepth(5 + (1 - this.z) * 10);

    const barW = 80 * sc;
    this.hpBar.setX(sx).setY(sy - 130 * sc - 10).setDisplaySize(barW, 8);
    this.hpFill.setX(sx - barW / 2).setY(sy - 130 * sc - 10).setDisplaySize(barW * (this.hp / MAX_HP), 8);
    this.hpLabel.setX(sx).setY(sy - 130 * sc - 20);
  }

  destroy(): void {
    this.sprite.destroy();
    this.hpBar.destroy(); this.hpFill.destroy(); this.hpLabel.destroy();
    this.alive = false;
  }
}
```
**Verificar:** `npx tsc --noEmit`

### D6. Atualizar Spawner para incluir oponentes
**Modificar:** `src/game/systems/spawner.ts` — adicionar imports e campos:
```typescript
import { Robot }     from '../entities/Robot.ts';
import { Animal }    from '../entities/Animal.ts';
import { Zombie }    from '../entities/Zombie.ts';
import { Ghost }     from '../entities/Ghost.ts';
import { Alien }     from '../entities/Alien.ts';
import { NpcRunner } from '../entities/NpcRunner.ts';
import { Boss }      from '../entities/Boss.ts';

// Tipos de oponente (habilitados após 30s)
type Opponent = Robot | Animal | Zombie | Ghost | Alien | NpcRunner;
```
Adicionar campos na classe:
```typescript
private opponents: Opponent[] = [];
private boss: Boss | null = null;
private bossNextAt = 1000; // metros
```
No método `update()`, após spawn de obstáculos, adicionar:
```typescript
// Oponentes a partir de 30s
if (this.elapsedMs >= 30_000 && Math.random() < 0.3 * dtSec) {
  const types = [Robot, Animal, Zombie, Ghost, Alien, NpcRunner];
  const Cls   = types[Math.floor(this.rng() * types.length)];
  const lane  = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
  this.opponents.push(new (Cls as typeof Robot)(scene, lane));
}
// Boss a cada 1000m
if (this.metersAccum >= this.bossNextAt && !this.boss) {
  this.boss = new Boss(scene);
  this.bossNextAt += 1000;
}
// Atualizar e limpar mortos
this.opponents = this.opponents.filter(o => { o.update(speedMps, dtSec); return o.alive; });
if (this.boss) { this.boss.update(speedMps, dtSec); if (!this.boss.alive) this.boss = null; }
```
Expor via getter:
```typescript
getOpponents(): Opponent[] { return this.opponents; }
getBoss(): Boss | null { return this.boss; }
```
**Verificar:** `npx tsc --noEmit`

### D7. Atualizar collision.ts para oponentes e Ghost
**Modificar:** `src/game/systems/collision.ts` — adicionar imports e nova função:
```typescript
import type { Robot } from '../entities/Robot.ts';
import type { Animal } from '../entities/Animal.ts';
// ... (todos os tipos de oponente)
import type { Boss } from '../entities/Boss.ts';

export type Opponent = { lane: Lane; z: number; alive: boolean; kind: string; };

export function checkOpponentCollisions(
  player: Player,
  opponents: Opponent[],
  boss: { lane: Lane; z: number; alive: boolean; hit(): boolean } | null,
  armsUpActive: boolean,
): { hitOpponent: boolean; bossDead: boolean } {
  const result = { hitOpponent: false, bossDead: false };
  const playerState = player.getState();
  const playerLane  = player.getLane();

  for (const opp of opponents) {
    if (!opp.alive) continue;
    if (opp.z > GAME_CONFIG.collisionZThreshold) continue;
    if (opp.lane !== playerLane) continue;
    // Ghost: só lane evita
    if (opp.kind === 'ghost') { result.hitOpponent = true; break; }
    // Alien: jump ou duck evitam
    if (opp.kind === 'alien' && (playerState === 'jumping' || playerState === 'ducking')) continue;
    result.hitOpponent = true;
    break;
  }

  if (boss && boss.alive && boss.z <= GAME_CONFIG.collisionZThreshold && armsUpActive) {
    result.bossDead = boss.hit();
  } else if (boss && boss.alive && boss.z <= GAME_CONFIG.collisionZThreshold && !armsUpActive && boss.lane === playerLane) {
    result.hitOpponent = true;
  }

  return result;
}
```
**Verificar:** `npx tsc --noEmit`

### D8. Integrar oponentes em Play.ts
**Modificar:** `src/game/scenes/Play.ts` — no `update()`, após `checkCollisions`:
```typescript
const { hitOpponent, bossDead } = checkOpponentCollisions(
  this.player,
  this.spawner.getOpponents(),
  this.spawner.getBoss(),
  this.armsUpActive, // booleano já existente na cena
);
if (hitOpponent) {
  // mesmo fluxo de colisão com obstáculo (lives--, shake, flash, SFX)
  this.handleCollision();
}
if (bossDead) {
  this.scoring.addBonus(500);
  this.audioBus.playSfx('boss_defeat');
}
```
**Verificar:** robô patrol visível após 30s; boss aparece ao atingir 1000m

### D9. Commit Fase D
```bash
git add src/game/entities/Robot.ts src/game/entities/Animal.ts \
        src/game/entities/Zombie.ts src/game/entities/Ghost.ts \
        src/game/entities/Alien.ts src/game/entities/NpcRunner.ts \
        src/game/entities/Boss.ts \
        src/game/systems/spawner.ts src/game/systems/collision.ts \
        src/game/scenes/Play.ts
git commit -m "improve(#14): fase D — oponentes (robot, animal, zombie, ghost, alien, npc, boss)"
```

---

## FASE E — Testes

### E1. CT01 — Paleta Pixel Arcade
**Executar:**
```bash
open "https://localhost:5173/?demo=1"
```
**Verificar visualmente:** céu azul, grama verde, stripes amarelas. Sem cinza-escuro (0x2c2f36).
**Output esperado:** screenshot salvo em `load-tests/results/issue-14-journey/CT01-palette.png`

### E2. CT02 — VT323 aplicada
**Executar:**
```bash
open "https://localhost:5173/?demo=1"
```
**Verificar:** DevTools → Elements → canvas parent → fontes carregadas incluem VT323.
HUD mostra texto em fonte serifada pixel (VT323), não monospace do sistema.
**Output:** screenshot `CT02-font.png`

### E3. CT03 — AudioSprite (zero load.audio() soltos)
```bash
grep -rn 'load\.audio(' src/game/ --include='*.ts' | grep -v 'audioSprite\|music'
```
**Output esperado:** 0 linhas (só música pode usar `load.audio` — SFX todos via audioSprite)
Abrir jogo, coletar moeda. DevTools Console deve mostrar `SFX coin_collect via audioSprite`.

### E4. CT04 — Obstáculos jump/duck com keyboard debug
**Executar:**
```bash
open "https://localhost:5173/?debug=1&seed=42"
```
1. Aguardar `jump_brick` aparecer (ou forçar: `?debug=1` + tecla de spawn se disponível)
2. Pressionar J (jump) ao ver muro de tijolos — player não perde vida ✓
3. Não pular no próximo muro — player perde vida + screen shake + flash ✓
4. Pressionar S (duck) ao ver `duck_log` — player não perde vida ✓
**Output:** screenshot `CT04-obstacles.png`

### E5. CT05 — Billboard sprites
**Executar:**
```bash
open "https://localhost:5173/?demo=1"
```
**Verificar:** árvores verdes nos dois lados da pista, menores ao longe (zToScale aplicado).
Moeda dourada (sem tint de código).
**Output:** screenshot `CT05-billboard.png`

### E6. CT06 — Boss E2E click-by-click [E2E click-by-click]
**Pré-condição:** `npm run dev` rodando, HTTPS mkcert ativo.
1. Navegar `https://localhost:5173/?debug=1&seed=1`
2. Completar calibração (teclas debug se necessário)
3. Jogar até 1000m acumulados (verificar contador no HUD)
4. **Verificar:** Boss spawna na lane central — sprite 2× maior que obstáculos normais
5. **Verificar:** Health bar de 3 pontos visível acima do Boss
6. Pressionar A (arms_up) 3× consecutivos
7. **Verificar:** Boss desaparece, score sobe +500, SFX `boss_defeat` no console
8. Continuar jogando até 2000m — Boss reaparece ✓
**Salvar screenshots:** `load-tests/results/issue-14-journey/CT06-boss-{1,2,3}.png`
**Critério fail:** Boss não aparece, health bar não decrementa, score não aumenta, SFX ausente.

### E7. CT07 — Efeitos visuais
**Executar:** jogar normalmente, correr muito (tier 4 = energia > 80%)
**Verificar:**
- Speed lines aparecem (linhas radiais do centro da tela)
- Chromatic aberration se FPS > 40 (franja nas bordas)
- Flash branco ao colidir
- Screen shake ao colidir
- Partículas douradas ao coletar moeda
- Partículas vermelhas ao colidir
**Output:** screenshot `CT07-fx.png`

### E8. CT08 — Sem regressão em mini-jogos
**Executar:**
```bash
open "https://localhost:5173/?debug=1"
```
Navegar para MiniGamesHub → jogar CatchBicho, TrunkTwist, BellRinger.
**Verificar:** nenhum crash, VT323 usada nos textos, câmera funciona.
**Output:** screenshot `CT08-minigames.png`

### E9. Criar pasta de resultados e README
```bash
mkdir -p load-tests/results/issue-14-journey
cat > load-tests/results/issue-14-journey/README.md << 'EOF'
# Issue #14 — Polish Visual e Sonoro — E2E Journey

## Cenários testados
- CT01: Paleta Pixel Arcade
- CT02: VT323 aplicada
- CT03: AudioSprite (zero load.audio soltos)
- CT04: Obstáculos jump/duck
- CT05: Billboard sprites
- CT06: Boss E2E (1000m)
- CT07: Efeitos visuais
- CT08: Sem regressão mini-jogos

## Resultado
[PENDENTE — preencher durante execução]

## Bugs encontrados
[nenhum]
EOF
```

### E10. Commit Fase E + atualizar CODEMAP
**Modificar:** `docs/CODEMAP.md` — adicionar em `src/game/systems/`:
```
│  ├─ billboard.ts   # ⭐ Issue 14 — BillboardLayer (árvores/sinais nas bordas da pista)
│  ├─ textureGen.ts  # ⭐ Issue 14 — ensureTexture() placeholder procedural
```
Adicionar em `src/game/ui/`:
```
│  ├─ postfx.ts      # ⭐ Issue 14 — PostFxOverlay (scanlines + vignette)
│  └─ speedLines.ts  # ⭐ Issue 14 — SpeedLines (linhas radiais do VP)
```
Adicionar em `src/game/entities/`:
```
│  ├─ Robot.ts / Animal.ts / Zombie.ts / Ghost.ts / Alien.ts / NpcRunner.ts / Boss.ts  # ⭐ Issue 14
```

```bash
git add load-tests/results/issue-14-journey/ docs/CODEMAP.md docs/CHANGELOG.md
git commit -m "improve(#14): fase E — testes E2E, CODEMAP e CHANGELOG atualizados"
```
