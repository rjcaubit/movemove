# Tasks — Ninja Fruit (mini-jogo de cortar frutas)

**Issue:** #15
**Baseado em:** `02-spec.md`
**Total:** 32 tasks × ~3min = ~95min de execução cadenciada

Distribuição em 5 fases (linear A-E):
- **Fase A** (5 tasks): cena esqueleto + i18n + registro no orchestrator/hub
- **Fase B** (7 tasks): entidade `Fruit` + spawn balístico + penalidade de fruta perdida
- **Fase C** (8 tasks): tracker de velocity + auto-detect mão + slice de fruta + bomba
- **Fase D** (7 tasks): combo + scoring + finish + missions + narrador
- **Fase E** (5 tasks): rastro visual + debug fallback + docs canônicas

---

## FASE A — Cena esqueleto + entrada no hub

### A1. Adicionar chaves i18n para Ninja Fruit

**Editar:** `src/i18n/strings.ts`
**Onde:** dentro do objeto `miniGames: {...}` (depois das chaves `helicopter*` por volta da linha 143)

**Adicionar:**
```typescript
ninjaTitle: t('Ninja Fruit'),
ninjaDesc: t('Corta as frutas com a mão certa! Cuidado com as bombas.'),
ninjaSlices: t('Frutas cortadas'),
ninjaBestCombo: t('Melhor combo'),
ninjaIntroWave: t('Acene a mão que vai cortar!'),
ninjaIntroReady: t('Pronto! Vai!'),
ninjaCombo: t('COMBO'),
```

**Verificar:** `npm run build` compila sem erro de TypeScript.

---

### A2. Adicionar tema `'ninja'` no hudStyle

**Editar:** `src/game/ui/hudStyle.ts`

**Linha 101 — substituir:**
```typescript
export type Theme = 'ghost' | 'trunk' | 'bell' | 'chicken' | 'dance' | 'castor' | 'helicopter';
```
**Por:**
```typescript
export type Theme = 'ghost' | 'trunk' | 'bell' | 'chicken' | 'dance' | 'castor' | 'helicopter' | 'ninja';
```

**Linha 117 — substituir o fechamento `};` do `THEMES`:**
```typescript
  helicopter: { topBand: 0x0a2a4a, bottomBand: 0x1a3d0a, accent: 0x4cd964, vignette: 0x050e14 },
};
```
**Por:**
```typescript
  helicopter: { topBand: 0x0a2a4a, bottomBand: 0x1a3d0a, accent: 0x4cd964, vignette: 0x050e14 },
  ninja: { topBand: 0x4a0a14, bottomBand: 0x140208, accent: 0xff453a, vignette: 0x0a0204 },
};
```

**Verificar:** `npm run build` compila.

---

### A3. Criar cena `NinjaFruit.ts` esqueleto

**Criar:** `src/game/scenes/NinjaFruit.ts`

**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';

const LIVES = 3;

interface NinjaFruitData {
  session?: string[];
}

export class NinjaFruit extends Phaser.Scene {
  private lives = LIVES;
  private score = 0;
  private bestCombo = 0;
  private startedAt = 0;
  private done = false;

  private livesText!: Phaser.GameObjects.Text;
  private scorePill!: Pill;

  private backdrop: CameraBackdrop | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private frameUnsub: (() => void) | null = null;

  constructor() { super('NinjaFruit'); }

  create(data: NinjaFruitData): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a0204);
    this.session = data?.session ?? [];
    this.lives = LIVES;
    this.score = 0;
    this.bestCombo = 0;
    this.startedAt = performance.now();
    this.done = false;

    addThemedFrame(this, 'ninja');
    addTitleBanner(this, width / 2, 50, strings.miniGames.ninjaTitle, 0xff453a, 0xffffff);

    this.scorePill = new Pill(this, 130, 50, '0', {
      width: 200, fill: 0xff453a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '🍉', origin: [0.5, 0.5],
    });

    this.livesText = this.add.text(width - 130, 50, this.livesStr(), {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px',
    }).setOrigin(0.5).setDepth(50);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.6);

    this.narrator = new Narrator(null, true);
    this.narrator.speak(narratorLines.ninjaStart(), 2);

    addBackButton(this);
  }

  update(_time: number, _delta: number): void {
    if (this.done) return;
    // gameplay vai entrar nas próximas tasks
  }

  private livesStr(): string {
    return '❤️'.repeat(this.lives) + '🖤'.repeat(LIVES - this.lives);
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;

    if (this.frameUnsub) { this.frameUnsub(); this.frameUnsub = null; }

    const refs = getRefs(this);
    void refs.missions.tick({ ninjaSlices: this.score });
    this.scene.start('MiniGameResult', {
      gameKey: 'NinjaFruit',
      score: this.score,
      scoreLabel: strings.miniGames.ninjaSlices,
      extra: { [strings.miniGames.ninjaBestCombo]: this.bestCombo },
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.frameUnsub) { this.frameUnsub(); this.frameUnsub = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
  }
}
```

**Verificar:** vai dar erro `narratorLines.ninjaStart` não existe — corrigido na A4.

---

### A4. Adicionar entradas em `narratorLines.ts`

**Editar:** `src/game/i18n/narratorLines.ts`

**Adicionar antes do `};` final (depois de `helicopterSurvived`):**
```typescript
  ninjaStart: (): string => pick([t('Corta as frutas! Cuidado com bombas!'), t('Vai, ninja!'), t('Mostra a katana!')]),
  ninjaSlice: (): string => pick([t('Zás!'), t('Cortou!'), t('Tá ON!')]),
  ninjaCombo: (n: number): string => `${n} ${t('combo!')}`,
  ninjaBomb: (): string => pick([t('Era bomba! Cuidado!'), t('Boom! Tomou!'), t('Não corta as bombas!')]),
  ninjaLastLife: (): string => pick([t('Última vida! Capricha!'), t('Só mais uma chance!')]),
```

**Adicionar à interface `MissionDeltas` em `src/game/systems/missions.ts:15-29`:** após `helicopterSeconds?:`:
```typescript
  ninjaSlices?: number;
```

**Verificar:** `npm run build` compila.

---

### A5. Registrar cena no `orchestrator.ts` + adicionar card no `MiniGamesHub`

**Editar:** `src/game/orchestrator.ts`

**Após linha 27 (último import de cena `Rec`):**
```typescript
import { NinjaFruit } from './scenes/NinjaFruit.ts';
```

**Linha 137 — substituir o array `scene: [...]`:** localizar `HelicopterGame, MiniGameResult` e inserir `NinjaFruit` antes de `MiniGameResult`:
```typescript
scene: [Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver, Demo, Settings, Summary, WaterBreak, MiniGamesHub, BodyCheck, CatchBicho, TrunkTwist, BellRinger, ChickenGame, DanceDance, CastorGame, CastorModePicker, HelicopterGame, NinjaFruit, MiniGameResult, GuidedSession, GuidedSessionPicker, Rec],
```

**Editar:** `src/game/scenes/MiniGamesHub.ts:49-53`

**Substituir o array `aim: [...]`:**
```typescript
  aim: [
    { title: strings.miniGames.catchTitle,  desc: strings.miniGames.catchDesc,  icon: '🪰', color: 0x4cd964, start: goCheck('CatchBicho') },
    { title: strings.miniGames.castorTitle, desc: strings.miniGames.castorDesc, icon: '🦫', color: 0x8b4513, start: (s) => s.scene.start('CastorModePicker') },
    { title: strings.miniGames.trunkTitle,  desc: strings.miniGames.trunkDesc,  icon: '🌀', color: 0xbf5af2, start: goCheck('TrunkTwist') },
    { title: strings.miniGames.ninjaTitle,  desc: strings.miniGames.ninjaDesc,  icon: '🍉', color: 0xff453a, start: goCheck('NinjaFruit') },
  ],
```

**Verificar:** rodar `npm run dev`, navegar `https://localhost:5173/`, ir Hub → Mira; card "Ninja Fruit" aparece. Clicar passa por `BodyCheck` e abre `NinjaFruit` com banner+score=0+lives=❤️❤️❤️ e narrador falando.

---

### A6. Commit Fase A

```bash
git add src/i18n/strings.ts src/game/ui/hudStyle.ts src/game/scenes/NinjaFruit.ts src/game/i18n/narratorLines.ts src/game/systems/missions.ts src/game/orchestrator.ts src/game/scenes/MiniGamesHub.ts
git commit -m "feat(issue-15): fase A - NinjaFruit esqueleto + card no hub (#15)"
```

---

## FASE B — Entidade Fruit (good+bad) + spawn balístico

### B1. Criar entidade `Fruit.ts` (kind fruit/bomb, física balística)

**Criar:** `src/game/entities/Fruit.ts`

**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

export type FruitKind = 'fruit' | 'bomb';

const FRUIT_EMOJIS = ['🍉', '🍎', '🍌', '🍊', '🍇', '🥝', '🍑'];
const BOMB_EMOJIS = ['💣', '🧨'];

const GRAVITY_NORM = 1.2;          // H_corpo/s² (queda)
const SPAWN_VY_MIN = -1.6;         // velocidade inicial pra cima
const SPAWN_VY_MAX = -2.1;
const SPAWN_VX_RANGE = 0.4;        // ±0.4 H_corpo/s lateral

export class Fruit {
  readonly kind: FruitKind;
  /** posição normalizada (0-1) */
  x: number;
  y: number;
  /** velocidade normalizada (H_corpo/s) */
  private vx: number;
  private vy: number;
  alive = true;
  /** se true, contou como "perdida" (pra evitar dupla penalização) */
  private accounted = false;

  private body: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, kind: FruitKind, normX: number) {
    this.kind = kind;
    this.x = normX;
    this.y = 1.05; // começa logo abaixo da tela
    this.vy = SPAWN_VY_MIN + Math.random() * (SPAWN_VY_MAX - SPAWN_VY_MIN);
    // direciona pro centro: positivo se vem da esquerda, negativo se da direita
    const center = 0.5;
    const towardCenter = (center - normX) * 1.4;
    this.vx = towardCenter + (Math.random() - 0.5) * SPAWN_VX_RANGE;

    const emoji = kind === 'fruit'
      ? FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)]
      : BOMB_EMOJIS[Math.floor(Math.random() * BOMB_EMOJIS.length)];

    this.body = scene.add.text(this.x * GAME_CONFIG.width, this.y * GAME_CONFIG.height, emoji, {
      fontSize: '64px',
    }).setOrigin(0.5).setDepth(20);

    if (kind === 'bomb') {
      // pavio aceso pulsando — chama atenção
      scene.tweens.add({
        targets: this.body,
        scale: { from: 1.0, to: 1.15 },
        duration: 280,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  /** Avança física por dt segundos. */
  update(dt: number): void {
    if (!this.alive) return;
    this.vy += GRAVITY_NORM * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.body.setX(this.x * GAME_CONFIG.width);
    this.body.setY(this.y * GAME_CONFIG.height);
    this.body.setRotation(this.body.rotation + dt * 1.6);
  }

  /** True quando saiu da tela (qualquer borda). */
  isOffscreen(): boolean {
    return this.y > 1.15 || this.x < -0.1 || this.x > 1.1;
  }

  /** Pra evitar contar perda mais de uma vez. */
  markAccounted(): void { this.accounted = true; }
  wasAccounted(): boolean { return this.accounted; }

  /** Slice visual: split em 2 metades + alpha out. */
  slice(scene: Phaser.Scene): void {
    this.alive = false;
    const px = this.x * GAME_CONFIG.width;
    const py = this.y * GAME_CONFIG.height;
    const half1 = scene.add.text(px, py, this.body.text, { fontSize: '64px' })
      .setOrigin(0.5).setDepth(21).setAlpha(0.9);
    const half2 = scene.add.text(px, py, this.body.text, { fontSize: '64px' })
      .setOrigin(0.5).setDepth(21).setAlpha(0.9);
    this.body.destroy();
    scene.tweens.add({ targets: half1, x: px - 60, y: py + 80, rotation: -1.2, alpha: 0, duration: 600, onComplete: () => half1.destroy() });
    scene.tweens.add({ targets: half2, x: px + 60, y: py + 80, rotation: 1.2, alpha: 0, duration: 600, onComplete: () => half2.destroy() });
  }

  /** Explode (bomba cortada): flash + alpha out. */
  explode(scene: Phaser.Scene): void {
    this.alive = false;
    const px = this.x * GAME_CONFIG.width;
    const py = this.y * GAME_CONFIG.height;
    const flash = scene.add.text(px, py, '💥', { fontSize: '120px' })
      .setOrigin(0.5).setDepth(22);
    this.body.destroy();
    scene.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
  }

  destroy(): void {
    if (this.body && this.body.scene) this.body.destroy();
    this.alive = false;
  }
}
```

**Verificar:** `npm run build` compila.

---

### B2. Adicionar constantes de tuning em `tuning.ts`

**Editar:** `src/tuning.ts`

**Adicionar ao final do arquivo (após `getAgeGroup` ou similar):**
```typescript
// Ninja Fruit
export const NINJA_VELOCITY_THRESHOLD = 1.2;     // H_corpo/s — velocidade mínima do pulso pra cortar
export const NINJA_BOMB_GRACE_MS = 5000;          // só fruta nos primeiros 5s
export const NINJA_BOMB_SPAWN_CHANCE_INITIAL = 0.05;
export const NINJA_BOMB_SPAWN_CHANCE_MAX = 0.30;  // chega aqui ao longo da partida
export const NINJA_SPAWN_INTERVAL_MS_INITIAL = 1100;
export const NINJA_SPAWN_INTERVAL_MS_MIN = 600;
export const NINJA_SPAWN_INTERVAL_STEP_MS = 25;   // acelera por slice (ou desacelera por miss)
export const NINJA_HIT_RADIUS = 0.10;             // raio normalizado do hit test
export const NINJA_INTRO_MS = 3000;
export const NINJA_INTRO_MIN_MOVEMENT = 0.05;     // H_corpo total pra detectar mão dominante
```

**Verificar:** `npm run build` compila.

---

### B3. Adicionar estado de spawning à cena `NinjaFruit`

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Adicionar imports após os existentes:**
```typescript
import { Fruit } from '../entities/Fruit.ts';
import {
  NINJA_BOMB_GRACE_MS,
  NINJA_BOMB_SPAWN_CHANCE_INITIAL,
  NINJA_BOMB_SPAWN_CHANCE_MAX,
  NINJA_SPAWN_INTERVAL_MS_INITIAL,
  NINJA_SPAWN_INTERVAL_MS_MIN,
  NINJA_SPAWN_INTERVAL_STEP_MS,
} from '../../tuning.ts';
```

**Adicionar campos privados na classe (após `private done = false;`):**
```typescript
  private fruits: Fruit[] = [];
  private nextSpawnAt = 0;
  private spawnIntervalMs = NINJA_SPAWN_INTERVAL_MS_INITIAL;
  private lastFrameTime = 0;
```

**No `create()`, antes do `addBackButton(this);`, adicionar:**
```typescript
    this.fruits = [];
    this.nextSpawnAt = performance.now() + 800;
    this.spawnIntervalMs = NINJA_SPAWN_INTERVAL_MS_INITIAL;
    this.lastFrameTime = performance.now();
```

**Verificar:** `npm run build` compila.

---

### B4. Implementar tick de spawn + física no `update()`

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Substituir o método `update()` inteiro:**
```typescript
  update(_time: number, _delta: number): void {
    if (this.done) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000); // cap em 50ms (lag spike)
    this.lastFrameTime = now;
    const elapsed = now - this.startedAt;

    // Spawn
    if (now >= this.nextSpawnAt) {
      const bombChanceRamp = Math.min(1, elapsed / 30_000); // ramp em 30s
      const bombChance = elapsed < NINJA_BOMB_GRACE_MS
        ? 0
        : NINJA_BOMB_SPAWN_CHANCE_INITIAL +
          (NINJA_BOMB_SPAWN_CHANCE_MAX - NINJA_BOMB_SPAWN_CHANCE_INITIAL) * bombChanceRamp;
      const kind: 'fruit' | 'bomb' = Math.random() < bombChance ? 'bomb' : 'fruit';
      const normX = 0.15 + Math.random() * 0.7;
      this.fruits.push(new Fruit(this, kind, normX));
      this.nextSpawnAt = now + this.spawnIntervalMs;
    }

    // Física + cleanup
    for (const f of this.fruits) f.update(dt);
    for (const f of this.fruits) {
      if (f.alive && f.isOffscreen()) {
        if (f.kind === 'fruit' && !f.wasAccounted()) {
          f.markAccounted();
          this.onFruitMissed();
        }
        f.destroy();
      }
    }
    this.fruits = this.fruits.filter((f) => f.alive);
  }

  private onFruitMissed(): void {
    this.lives -= 1;
    this.livesText.setText(this.livesStr());
    this.spawnIntervalMs = Math.min(NINJA_SPAWN_INTERVAL_MS_INITIAL, this.spawnIntervalMs + NINJA_SPAWN_INTERVAL_STEP_MS);
    if (this.lives <= 0) {
      this.finish();
    } else if (this.lives === 1) {
      this.narrator.speak(narratorLines.ninjaLastLife(), 2);
    }
  }
```

**Verificar:** rodar `npm run dev`, abrir o jogo. Deve ver frutas voando em arco. Deixar passar — vidas caem, partida termina ao zerar. (Cortar ainda não funciona — fase C.)

---

### B5. `shutdown()` limpa frutas vivas

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Substituir `shutdown()`:**
```typescript
  shutdown(): void {
    if (this.frameUnsub) { this.frameUnsub(); this.frameUnsub = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    for (const f of this.fruits) f.destroy();
    this.fruits = [];
  }
```

**Verificar:** `npm run build` compila.

---

### B6. Adicionar import `NINJA_BOMB_SPAWN_CHANCE_INITIAL/MAX` (já feito em B3) — verificação

**Verificar:** abrir `src/game/scenes/NinjaFruit.ts` e confirmar que os imports da B3 cobrem todas as constantes usadas. Se algum estiver faltando, adicionar agora.

---

### B7. Commit Fase B

```bash
git add src/game/entities/Fruit.ts src/tuning.ts src/game/scenes/NinjaFruit.ts
git commit -m "feat(issue-15): fase B - entidade Fruit, spawn balístico, miss = -1 vida (#15)"
```

---

## FASE C — Tracker de velocity + auto-detect mão + slice + bomba

### C1. Criar `wristVelocity.ts`

**Criar:** `src/game/systems/wristVelocity.ts`

**Conteúdo:**
```typescript
import { KP, type PoseFrame } from '../../pose/types.ts';

interface Sample { x: number; y: number; t: number }

/**
 * Tracker de velocidade do pulso. Mantém histórico curto (até MAX_AGE_MS) e
 * expõe `speedNorm()` em H_corpo/s (coordenadas já normalizadas).
 *
 * Reuso futuro: outros mini-jogos podem precisar (slap, swing). Lógica
 * separada da cena pra ficar testável.
 */
const MAX_AGE_MS = 250;
const MAX_SAMPLES = 8;

export class WristVelocityTracker {
  private historyL: Sample[] = [];
  private historyR: Sample[] = [];

  /** Atualiza com frame novo. Chamar a cada `onSmoothedFrame`. */
  push(frame: PoseFrame): void {
    const now = frame.timestamp ?? performance.now();
    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];
    if (lw) this.append(this.historyL, { x: lw.x, y: lw.y, t: now });
    if (rw) this.append(this.historyR, { x: rw.x, y: rw.y, t: now });
  }

  private append(arr: Sample[], s: Sample): void {
    arr.push(s);
    while (arr.length > MAX_SAMPLES) arr.shift();
    while (arr.length > 0 && s.t - arr[0].t > MAX_AGE_MS) arr.shift();
  }

  /** Velocidade do pulso em H_corpo/s. 0 se histórico < 2 amostras. */
  speedNorm(hand: 'L' | 'R'): number {
    const arr = hand === 'L' ? this.historyL : this.historyR;
    if (arr.length < 2) return 0;
    const a = arr[arr.length - 2];
    const b = arr[arr.length - 1];
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0 || dt > 0.1) return 0; // gap suspeito
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy) / dt;
  }

  /** Deslocamento total acumulado da mão (somando passos). Usado pra auto-detect. */
  totalDisplacement(hand: 'L' | 'R'): number {
    const arr = hand === 'L' ? this.historyL : this.historyR;
    let sum = 0;
    for (let i = 1; i < arr.length; i++) {
      const dx = arr[i].x - arr[i - 1].x;
      const dy = arr[i].y - arr[i - 1].y;
      sum += Math.sqrt(dx * dx + dy * dy);
    }
    return sum;
  }

  reset(): void { this.historyL = []; this.historyR = []; }
}
```

**Verificar:** `npm run build` compila.

---

### C2. Cena: tracker + intro de auto-detect

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Adicionar imports:**
```typescript
import { WristVelocityTracker } from '../systems/wristVelocity.ts';
import { NINJA_INTRO_MS, NINJA_INTRO_MIN_MOVEMENT, NINJA_HIT_RADIUS, NINJA_VELOCITY_THRESHOLD } from '../../tuning.ts';
import { handPosition } from '../../pose/spatialQueries.ts';
import type { PoseFrame } from '../../pose/types.ts';
```

**Adicionar campos privados:**
```typescript
  private tracker = new WristVelocityTracker();
  private dominantHand: 'L' | 'R' | null = null;
  private introText: Phaser.GameObjects.Text | null = null;
  private accumL = 0;
  private accumR = 0;
  private prevL: { x: number; y: number } | null = null;
  private prevR: { x: number; y: number } | null = null;
```

**No `create()`, substituir o bloco do `backdrop` por:**
```typescript
    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.6);
    this.backdrop.handGlows = [
      { idx: 15, color: '#ff453a', alpha: 0.55 },
      { idx: 16, color: '#ff453a', alpha: 0.55 },
    ];

    // assina frame stream pra alimentar tracker e medir mão dominante
    this.frameUnsub = refs.onSmoothedFrame((f: PoseFrame) => this.onFrame(f));

    // intro
    this.tracker.reset();
    this.dominantHand = null;
    this.accumL = 0;
    this.accumR = 0;
    this.prevL = null;
    this.prevR = null;
    this.introText = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2,
      strings.miniGames.ninjaIntroWave, {
      fontFamily: 'VT323, ui-monospace', fontSize: '40px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(60);

    // pausa o spawning durante a intro: nextSpawnAt vai ser empurrado pra depois da intro
    this.nextSpawnAt = performance.now() + NINJA_INTRO_MS + 600;
```

**Adicionar o método `onFrame`:**
```typescript
  private onFrame(f: PoseFrame): void {
    this.tracker.push(f);
    const elapsed = performance.now() - this.startedAt;
    if (elapsed < NINJA_INTRO_MS) {
      const lw = handPosition(f, 'L');
      const rw = handPosition(f, 'R');
      if (lw && this.prevL) {
        this.accumL += Math.hypot(lw.x - this.prevL.x, lw.y - this.prevL.y);
      }
      if (rw && this.prevR) {
        this.accumR += Math.hypot(rw.x - this.prevR.x, rw.y - this.prevR.y);
      }
      this.prevL = lw ? { x: lw.x, y: lw.y } : null;
      this.prevR = rw ? { x: rw.x, y: rw.y } : null;
    } else if (this.dominantHand === null) {
      // fim da intro: decide
      if (this.accumL > this.accumR && this.accumL > NINJA_INTRO_MIN_MOVEMENT) {
        this.dominantHand = 'L';
      } else if (this.accumR > this.accumL && this.accumR > NINJA_INTRO_MIN_MOVEMENT) {
        this.dominantHand = 'R';
      } else {
        this.dominantHand = 'R'; // fallback
      }
      // glow só na mão dominante
      const glowIdx = this.dominantHand === 'L' ? 15 : 16;
      this.backdrop!.handGlows = [{ idx: glowIdx, color: '#ff453a', alpha: 0.85 }];
      // remove texto de intro
      if (this.introText) {
        this.tweens.add({
          targets: this.introText, alpha: 0, y: GAME_CONFIG.height / 2 - 60,
          duration: 400, onComplete: () => { this.introText?.destroy(); this.introText = null; },
        });
      }
    }
  }
```

**Verificar:** rodar `npm run dev`. Intro mostra texto, frutas só começam a spawnar depois de ~3.6s. Após intro, hand glow fica só num pulso (decisão registrada nos consoles via `__movemoveDebug` se quiser inspecionar).

---

### C3. Detecção de slice (loop de hit test) — cortar fruta

**Editar:** `src/game/scenes/NinjaFruit.ts`

**No `update()`, **após** `for (const f of this.fruits) f.update(dt);` e **antes** do bloco de offscreen, adicionar:**
```typescript
    // Detecção de slice: só após a intro
    if (this.dominantHand !== null) {
      const speed = this.tracker.speedNorm(this.dominantHand);
      const lastFrame = this.backdrop?.lastFrame ?? null;
      if (speed >= NINJA_VELOCITY_THRESHOLD && lastFrame) {
        const wrist = handPosition(lastFrame, this.dominantHand);
        if (wrist) {
          for (const f of this.fruits) {
            if (!f.alive) continue;
            const dx = wrist.x - f.x;
            const dy = wrist.y - f.y;
            if (dx * dx + dy * dy <= NINJA_HIT_RADIUS * NINJA_HIT_RADIUS) {
              if (f.kind === 'fruit') {
                this.onFruitSliced(f);
              } else {
                this.onBombSliced(f);
              }
            }
          }
        }
      }
    }
```

**Adicionar handlers `onFruitSliced` / `onBombSliced` (ainda como métodos privados na cena):**
```typescript
  private onFruitSliced(f: Fruit): void {
    f.slice(this);
    this.score += 1;
    this.scorePill.setText(String(this.score));
    this.spawnIntervalMs = Math.max(NINJA_SPAWN_INTERVAL_MS_MIN, this.spawnIntervalMs - NINJA_SPAWN_INTERVAL_STEP_MS);
  }

  private onBombSliced(f: Fruit): void {
    f.explode(this);
    this.lives -= 1;
    this.livesText.setText(this.livesStr());
    this.cameras.main.shake(220, 0.018);
    this.cameras.main.flash(180, 255, 255, 255);
    this.narrator.speak(narratorLines.ninjaBomb(), 2);
    if (this.lives <= 0) this.finish();
    else if (this.lives === 1) this.narrator.speak(narratorLines.ninjaLastLife(), 2);
  }
```

**Garantir que `CameraBackdrop` expõe `lastFrame`:** verificar arquivo:
```bash
grep -n "lastFrame" /Users/rjcaubit/Dev/movemove/src/game/ui/cameraBackdrop.ts
```
- Se já existir, ok.
- Se NÃO existir, voltar e usar uma alternativa: armazenar o último `PoseFrame` na própria cena dentro de `onFrame` — basta adicionar `private lastPoseFrame: PoseFrame | null = null;` e no `onFrame` fazer `this.lastPoseFrame = f;`, então no detection trocar `lastFrame` por `this.lastPoseFrame`.

**Verificar:** `npm run build` compila e ao rodar, gesticular sobre uma fruta a corta (split visual + score sobe).

---

### C4. Verificar/instalar `lastPoseFrame` na cena (caso `lastFrame` não exista)

**Editar:** `src/game/scenes/NinjaFruit.ts`

Adicionar campo:
```typescript
  private lastPoseFrame: PoseFrame | null = null;
```

No `onFrame()`, no início:
```typescript
    this.lastPoseFrame = f;
```

No `update()`, substituir `const lastFrame = this.backdrop?.lastFrame ?? null;` por:
```typescript
    const lastFrame = this.lastPoseFrame;
```

**Verificar:** rodar de novo, slice funciona com a mão dominante.

---

### C5. Confirmar que mão errada não corta

**Validar manualmente:** rodar `npm run dev`, fazer auto-detect ir pra direita, gesticular com a esquerda sobre frutas — não corta. Trocar pra esquerda na intro, validar inverso.

Se acontecer corte com a mão errada, conferir que o filtro `this.dominantHand` é usado (não `'L'` e `'R'` ambos). Não é uma task de código — é validação.

---

### C6. SFX gated (opcional, só se sons existem)

**Editar:** `src/game/scenes/NinjaFruit.ts`

No `onFruitSliced()`, antes de `this.score += 1;`:
```typescript
    if (this.cache.audio.exists('slice')) this.sound.play('slice', { volume: 0.4 });
```
No `onBombSliced()`, antes de `this.lives -= 1;`:
```typescript
    if (this.cache.audio.exists('explosion')) this.sound.play('explosion', { volume: 0.5 });
```

**Verificar:** se assets `slice` e `explosion` não estão registrados em `Boot.ts`, isso é no-op silencioso (correto pelo padrão `RNF04`). Pode adicionar registro depois.

---

### C7. Validar grace period e bomb spawn ramp

**Validar manualmente:** rodar `npm run dev`, marcar tempo. Nenhuma bomba deve aparecer nos primeiros 5s. Após ~30s, bombas devem aparecer com mais frequência (chance ~0.3).

Não é task de código.

---

### C8. Commit Fase C

```bash
git add src/game/systems/wristVelocity.ts src/game/scenes/NinjaFruit.ts
git commit -m "feat(issue-15): fase C - velocity tracker, auto-detect mão, slice + bomba (#15)"
```

---

## FASE D — Combo, scoring, finish, missions, narrador

### D1. Adicionar estado de combo + HUD

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Adicionar campos:**
```typescript
  private combo = 0;
  private comboPill: Pill | null = null;
```

**No `create()`, após `this.scorePill = ...;`, adicionar:**
```typescript
    this.comboPill = new Pill(this, GAME_CONFIG.width / 2, 50, '', {
      width: 240, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#1a0b2a', fontSize: 26, icon: '🔥', origin: [0.5, 0.5],
    });
    this.comboPill.container.setVisible(false);
```

> Se `Pill` não expõe `container` direto, ler `src/game/ui/hudStyle.ts` e usar a API correta (`Pill.setVisible(false)` ou `pill.container.setVisible(false)` — ajustar conforme assinatura).

**Adicionar método `updateCombo`:**
```typescript
  private updateCombo(slicedFruit: boolean): void {
    if (slicedFruit) {
      this.combo += 1;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      if (this.combo >= 2) {
        this.comboPill?.setText(`x${this.combo} ${strings.miniGames.ninjaCombo}`);
        this.comboPill?.container.setVisible(true);
        if (this.combo === 5 || this.combo % 10 === 0) {
          this.narrator.speak(narratorLines.ninjaCombo(this.combo), 1);
        }
      }
    } else {
      this.combo = 0;
      this.comboPill?.container.setVisible(false);
    }
  }
```

**Verificar:** ajustar API de `Pill.container.setVisible` se necessário (lendo o arquivo).

---

### D2. Aplicar combo nos handlers

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Em `onFruitSliced`, substituir bloco inteiro:**
```typescript
  private onFruitSliced(f: Fruit): void {
    f.slice(this);
    if (this.cache.audio.exists('slice')) this.sound.play('slice', { volume: 0.4 });
    this.updateCombo(true);
    const points = 1 * Math.max(1, this.combo); // multiplier por combo
    this.score += points;
    this.scorePill.setText(String(this.score));
    this.spawnIntervalMs = Math.max(NINJA_SPAWN_INTERVAL_MS_MIN, this.spawnIntervalMs - NINJA_SPAWN_INTERVAL_STEP_MS);
  }
```

**Em `onBombSliced`, adicionar antes do `this.lives -= 1`:**
```typescript
    this.updateCombo(false);
```

**Em `onFruitMissed`, adicionar no início (antes de `this.lives -= 1`):**
```typescript
    this.updateCombo(false);
```

**Verificar:** rodar, cortar 3 frutas seguidas → HUD mostra combo, score sobe com multiplier. Errar → combo zera.

---

### D3. Falas reativas em pontos chave

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Em `onFruitSliced`, antes do `this.spawnIntervalMs = ...`:**
```typescript
    if (this.score === 1 || this.score % 15 === 0) {
      this.narrator.speak(narratorLines.ninjaSlice(), 1);
    }
```

**Verificar:** `npm run dev` — narrador fala de vez em quando, não a cada slice (não polui).

---

### D4. Timer de partida (opcional — sem timer fixo neste design)

> Decisão re-validada: no design, partida termina por **vidas**, não por tempo. NÃO há timer de 60s. **Pular esta task** (manter mas marcar como skip) — ela existe só pra deixar explícito que conferimos.

**Sem alteração de código.**

---

### D5. `finish()` já passa `bestCombo` no `extra` — validar

Já implementado no A3. Validar que `MiniGameResult` mostra:
```
data.extra = { [strings.miniGames.ninjaBestCombo]: this.bestCombo }
```
Loop em `MiniGameResult.ts:31-37` já itera `Object.entries(data.extra)` mostrando `${k}: ${v}`. Logo, deve aparecer `Melhor combo: N` na tela de fim.

**Validar manualmente:** zerar 3 vidas → tela de resultado mostra "Frutas cortadas: N" e "Melhor combo: M".

---

### D6. Confirmar `MissionDeltas.ninjaSlices` chega na missão

**Validar manualmente:** abrir DevTools, observar `localStorage`/IndexedDB após terminar partida — `missionState` recebe incremento. Não é task de código (já implementado em A3+A4).

---

### D7. Commit Fase D

```bash
git add src/game/scenes/NinjaFruit.ts
git commit -m "feat(issue-15): fase D - combo + scoring com multiplier + falas reativas (#15)"
```

---

## FASE E — Polish: rastro visual + debug fallback + docs

### E1. Criar `sliceTrail.ts`

**Criar:** `src/game/ui/sliceTrail.ts`

**Conteúdo:**
```typescript
import * as Phaser from 'phaser';

const MAX_POINTS = 12;
const FADE_MS = 250;

interface Point { x: number; y: number; t: number }

/**
 * Rastro polyline cosmético do pulso da mão dominante. Não influencia
 * detecção — só feel visual (Fruit Ninja-style).
 */
export class SliceTrail {
  private points: Point[] = [];
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(40);
  }

  push(xPx: number, yPx: number): void {
    const t = performance.now();
    this.points.push({ x: xPx, y: yPx, t });
    while (this.points.length > MAX_POINTS) this.points.shift();
  }

  /** Redesenha; chamar a cada frame na cena. */
  render(): void {
    this.gfx.clear();
    const now = performance.now();
    this.points = this.points.filter((p) => now - p.t < FADE_MS);
    if (this.points.length < 2) return;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      const age = (now - b.t) / FADE_MS;
      const alpha = 1 - age;
      const width = 8 * (1 - age) + 2;
      this.gfx.lineStyle(width, 0xff453a, alpha);
      this.gfx.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.points = [];
  }
}
```

---

### E2. Cena consome `SliceTrail`

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Imports:**
```typescript
import { SliceTrail } from '../ui/sliceTrail.ts';
```

**Campo:**
```typescript
  private trail: SliceTrail | null = null;
```

**No `create()`, após o backdrop:**
```typescript
    this.trail = new SliceTrail(this);
```

**No `onFrame()`, após `this.lastPoseFrame = f;`:**
```typescript
    if (this.dominantHand !== null) {
      const wrist = handPosition(f, this.dominantHand);
      if (wrist) {
        this.trail?.push(wrist.x * GAME_CONFIG.width, wrist.y * GAME_CONFIG.height);
      }
    }
```

**No `update()`, no fim:**
```typescript
    this.trail?.render();
```

**No `shutdown()`, antes de `if (this.backdrop)`:**
```typescript
    if (this.trail) { this.trail.destroy(); this.trail = null; }
```

**Verificar:** rodar — rastro vermelho aparece atrás do pulso dominante.

---

### E3. Debug fallback: mouse simula slice

**Editar:** `src/game/scenes/NinjaFruit.ts`

**Imports:**
```typescript
import { KeyboardDebug } from '../../debug/keyboard.ts';
```

> Se `KeyboardDebug` não tem helper de query, fazer check direto: `new URLSearchParams(location.search).has('debug')`. Conferir `KeyboardDebug.isEnabledByQuery()` em `src/debug/keyboard.ts` — usado em `orchestrator.ts:73`.

**Campos:**
```typescript
  private debugMouse = false;
  private debugMouseX = 0.5;
  private debugMouseY = 0.5;
  private debugMousePrevX = 0.5;
  private debugMousePrevY = 0.5;
  private debugMouseT = 0;
```

**No `create()`, ao final (antes de `addBackButton`):**
```typescript
    if (KeyboardDebug.isEnabledByQuery()) {
      this.debugMouse = true;
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        this.debugMousePrevX = this.debugMouseX;
        this.debugMousePrevY = this.debugMouseY;
        this.debugMouseT = performance.now();
        this.debugMouseX = p.x / GAME_CONFIG.width;
        this.debugMouseY = p.y / GAME_CONFIG.height;
      });
      // força mão dominante = R no debug pra não depender da intro
      this.dominantHand = 'R';
      if (this.introText) { this.introText.destroy(); this.introText = null; }
      this.backdrop!.handGlows = [{ idx: 16, color: '#ff453a', alpha: 0.85 }];
      this.nextSpawnAt = performance.now() + 600;
    }
```

**No `update()`, antes do bloco "Detecção de slice", adicionar:**
```typescript
    // debug: mouse vira pulso virtual com velocity calculada por delta
    if (this.debugMouse && this.dominantHand) {
      const now = performance.now();
      const dt = Math.max(0.001, (now - this.debugMouseT) / 1000);
      const dx = this.debugMouseX - this.debugMousePrevX;
      const dy = this.debugMouseY - this.debugMousePrevY;
      const debugSpeed = Math.sqrt(dx * dx + dy * dy) / dt;
      if (debugSpeed >= NINJA_VELOCITY_THRESHOLD * 0.5) {
        for (const f of this.fruits) {
          if (!f.alive) continue;
          const ddx = this.debugMouseX - f.x;
          const ddy = this.debugMouseY - f.y;
          if (ddx * ddx + ddy * ddy <= NINJA_HIT_RADIUS * NINJA_HIT_RADIUS) {
            if (f.kind === 'fruit') this.onFruitSliced(f);
            else this.onBombSliced(f);
          }
        }
        this.trail?.push(this.debugMouseX * GAME_CONFIG.width, this.debugMouseY * GAME_CONFIG.height);
      }
    }
```

**Verificar:** rodar `https://localhost:5173/?debug=1`, navegar até NinjaFruit, mover mouse rapidamente sobre frutas — corta. Sobre bomba — flash + screenShake.

---

### E4. Atualizar `docs/CODEMAP.md`

**Editar:** `docs/CODEMAP.md`

**Na tabela "Cenas Phaser registradas" (linhas ~95-122), adicionar linha após `HelicopterGame`:**

```markdown
| `NinjaFruit` | Mini-game | Ninja Fruit — corta frutas, evita bombas (3 vidas, combo) |
```

**Na seção "Histórico SDD" (linhas ~150-160), adicionar linha:**
```markdown
| #15 | feat | Ninja Fruit — mini-jogo de cortar frutas | **WIP** |
```

---

### E5. Atualizar `docs/GAMES.md`

**Editar:** `docs/GAMES.md`

**Adicionar seção depois de "## 12. Sessão Guiada — encadeamento" e antes de "## Infra compartilhada":**

```markdown
---

## 13. Ninja Fruit (`NinjaFruit`)

**Arquivo:** `src/game/scenes/NinjaFruit.ts` — Entidade: `Fruit.ts` (`'fruit' | 'bomb'`)

**Gesto:** trajetória do pulso da mão dominante (calibrada na intro de 3s) com velocidade ≥ `NINJA_VELOCITY_THRESHOLD` (1.2 H_corpo/s) cruzando bbox da fruta. Mão errada não corta.

**Mecânica:**
- Intro de 3s: "acene a mão que vai cortar" — auto-detect mede deslocamento total de cada pulso e fixa a dominante. Hand glow fica só nesse pulso.
- Frutas surgem em arco balístico vindo de baixo (gravidade simulada manual em coords normalizadas), com x random.
- **Espelha padrão `good/bad` do Castor:** `FruitKind = 'fruit' | 'bomb'`, `BOMB_GRACE_MS = 5000` (só fruta nos primeiros 5s), `BOMB_SPAWN_CHANCE` cresce de 0.05 até 0.30 ao longo de 30s.
- Slice de fruta = +1 ponto × multiplier do combo + split visual em 2 metades.
- Slice de bomba = -1 vida + screenShake + flash + narrador. Combo reseta.
- Fruta perdida = -1 vida (bomba que sai sem cortar = sem penalidade).
- Combo cresce por slice de fruta consecutivo; HUD aparece quando combo ≥ 2; reseta em miss/bomba. `bestCombo` rastreado e exibido no `MiniGameResult.extra`.
- Rastro visual cosmético (`SliceTrail`) desenhado pelos últimos ~12 pontos do pulso dominante (Phaser Graphics polyline com fade). NÃO entra na detecção.

**Velocidade do pulso:** `WristVelocityTracker` (`src/game/systems/wristVelocity.ts`) mantém histórico de até 8 amostras por mão, descarta gaps > 100ms, expõe `speedNorm()` em H_corpo/s.

**Modo debug:** `?debug=1` força mão dominante = R, pula intro, e ponteiro do mouse vira pulso virtual (velocity calculada por delta de movimento).

**Vidas:** 3. **Duração:** ilimitada — termina ao zerar vidas.

**Pontuação:** `score` = frutas cortadas com multiplier de combo. Salvo em `missions.tick({ ninjaSlices })`.
```

---

### E6. Atualizar `docs/CHANGELOG.md`

**Editar:** `docs/CHANGELOG.md`

**Adicionar entrada no topo (formato segue commits anteriores):**

```markdown
## Issue #15 — Ninja Fruit

- Novo mini-jogo `NinjaFruit` na categoria Mira: corta frutas com a mão dominante (auto-detectada na intro de 3s), evita bombas.
- Modo arcade: 3 vidas, combo crescente com multiplier de pontos, partida termina ao zerar vidas.
- Espelha o padrão `good/bad` do Castor (`FruitKind = 'fruit' | 'bomb'`, `BOMB_GRACE_MS`, `BOMB_SPAWN_CHANCE`).
- Adiciona util novo `WristVelocityTracker` (primeiro tracker de velocity do projeto) e `SliceTrail` (rastro cosmético).
- Tema visual `'ninja'` em `hudStyle.ts` (vermelho/preto).
- `?debug=1` permite cortar com o mouse.
```

---

### E7. Commit Fase E

```bash
git add src/game/ui/sliceTrail.ts src/game/scenes/NinjaFruit.ts docs/CODEMAP.md docs/GAMES.md docs/CHANGELOG.md
git commit -m "feat(issue-15): fase E - rastro visual + debug fallback + docs (#15)"
```

---

## Pós-implementação — checklist de validação manual (CT05)

Rodar e capturar screenshots numerados em `load-tests/results/issue-15-journey/` para anexar na issue:

1. `01-welcome.png` — tela inicial
2. `02-hub-categorias.png` — hub com 3 categorias
3. `03-hub-mira.png` — categoria Mira com 4 cards (Mata Mosca, Bate Castor, Roda Tronco, **Ninja Fruit**)
4. `04-bodycheck.png` — check de postura
5. `05-intro.png` — texto "acene a mão que vai cortar"
6. `06-play.png` — fase de jogo (timer, score, vidas, hand glow)
7. `07-slice.png` — fruta cortada com split
8. `08-bomb.png` — bomba cortada com flash/shake
9. `09-combo.png` — HUD de combo ativa (≥ 2)
10. `10-miss.png` — fruta caindo, vida -1
11. `11-result.png` — `MiniGameResult` com `Frutas cortadas: N` e `Melhor combo: M`

Adicionar comentário na issue #15 com o link da pasta de screenshots e checklist do que foi validado.
