# Tasks — CanoeGame: mini-jogo de remo top-down

**Issue:** #16
**Baseado em:** `02-spec.md`
**Total:** ~20 tasks × 3-5min ≈ 75-100min

---

## FASE A — Constantes + RowingDetector

### A1. Adicionar constantes CANOE_* e ROWING_* em tuning.ts

**Editar:** `src/tuning.ts` — adicionar ao final do arquivo:

```typescript
// ─────────────────────────────────────────────
// CANOE GAME
// ─────────────────────────────────────────────
export const CANOE_DURATION_MS        = 60_000;
export const CANOE_SPEED_PER_STROKE   = 0.06;   // acréscimo normalizado por stroke
export const CANOE_SPEED_DECAY        = 0.9;    // multiplica speed a cada segundo sem stroke
export const CANOE_MAX_SPEED          = 0.4;    // max normalizado (0–1/s)
export const CANOE_STEER_AMOUNT       = 0.12;   // fração de largura desviada por stroke
export const CANOE_LERP               = 0.08;   // interpolação X por frame (0=lento, 1=imediato)
export const CANOE_COLLISION_BRAKE    = 0.35;   // multiplica speed em colisão
export const CANOE_ROCK_BASE_SPEED    = 0.0002; // fração de tela/ms, mínimo mesmo sem remar
export const CANOE_ROCK_SPAWN_MS      = 2200;   // ms entre spawns de pedra
export const CANOE_METERS_PER_UNIT    = 50;     // 1 unidade normalizada = 50 metros (HUD)

// ROWING DETECTOR
export const ROWING_STROKE_THRESHOLD  = 0.40;   // velocidade mínima do pulso (coords norm/s)
export const ROWING_REFRACTORY_MS     = 420;    // ms de cooldown por lado após stroke
```

**Verificar:** `npm run build` sem erros de tipo

---

### A2. Criar src/game/systems/rowingDetector.ts

**Criar:** `src/game/systems/rowingDetector.ts`

```typescript
import { WristVelocityTracker } from './wristVelocity.ts';
import { KP, type PoseFrame } from '../../pose/types.ts';

const Y_HISTORY = 5;
const MIN_DY = 0.015; // descida mínima em coordenadas normalizadas para contar como stroke

export class RowingDetector {
  private tracker = new WristVelocityTracker();
  private lastStroke: 'L' | 'R' | null = null;
  private refractoryUntil: Record<'L' | 'R', number> = { L: 0, R: 0 };
  private yHist: Record<'L' | 'R', number[]> = { L: [], R: [] };

  constructor(
    private readonly speedThreshold: number,
    private readonly refractoryMs: number,
    private readonly onStroke: (side: 'L' | 'R') => void,
  ) {}

  push(frame: PoseFrame): void {
    this.tracker.push(frame);
    const now = performance.now();

    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];

    if (lw) { this.yHist.L.push(lw.y); if (this.yHist.L.length > Y_HISTORY) this.yHist.L.shift(); }
    if (rw) { this.yHist.R.push(rw.y); if (this.yHist.R.length > Y_HISTORY) this.yHist.R.shift(); }

    this.checkSide('L', now);
    this.checkSide('R', now);
  }

  private checkSide(side: 'L' | 'R', now: number): void {
    if (now < this.refractoryUntil[side]) return;

    const speed = this.tracker.speedNorm(side);
    if (speed < this.speedThreshold) return;

    const hist = this.yHist[side];
    if (hist.length < Y_HISTORY) return;
    const dy = hist[hist.length - 1] - hist[0]; // positivo = descida (Y aumenta pra baixo)
    if (dy < MIN_DY) return;

    if (this.lastStroke === side) return; // alternância obrigatória

    this.lastStroke = side;
    this.refractoryUntil[side] = now + this.refractoryMs;
    this.onStroke(side);
  }

  reset(): void {
    this.tracker.reset();
    this.lastStroke = null;
    this.refractoryUntil = { L: 0, R: 0 };
    this.yHist = { L: [], R: [] };
  }
}
```

**Verificar:** `npm run build` sem erros; importações com extensão `.ts`

---

### A3. Commit Fase A

```bash
git add src/tuning.ts src/game/systems/rowingDetector.ts
git commit -m "feat(issue-16): fase A - constantes canoe + RowingDetector (#16)"
```

---

## FASE B — Cena: estrutura + visuals

### B1. Criar CanoeGame.ts — esqueleto da cena

**Criar:** `src/game/scenes/CanoeGame.ts`

```typescript
import * as Phaser from 'phaser';
import { getRefs } from '../orchestrator.ts';
import { RowingDetector } from '../systems/rowingDetector.ts';
import { KeypointOverlay } from '../../ui/keypointOverlay.ts';
import {
  CANOE_DURATION_MS, CANOE_SPEED_PER_STROKE, CANOE_SPEED_DECAY,
  CANOE_MAX_SPEED, CANOE_STEER_AMOUNT, CANOE_LERP,
  CANOE_COLLISION_BRAKE, CANOE_ROCK_BASE_SPEED, CANOE_ROCK_SPAWN_MS,
  CANOE_METERS_PER_UNIT,
  ROWING_STROKE_THRESHOLD, ROWING_REFRACTORY_MS,
} from '../../tuning.ts';
import { GAME_CONFIG } from '../config.ts';

interface Rock { x: number; y: number; rx: number; ry: number } // normalized 0-1

export class CanoeGame extends Phaser.Scene {
  private unsub: (() => void) | null = null;
  private detector!: RowingDetector;
  private pipDiv: HTMLDivElement | null = null;
  private pipOverlay: KeypointOverlay | null = null;
  private pipCanvas: HTMLCanvasElement | null = null;
  private pipVideo: HTMLVideoElement | null = null;

  private bgGfx!: Phaser.GameObjects.Graphics;
  private canoeGfx!: Phaser.GameObjects.Graphics;
  private wakeGfx!: Phaser.GameObjects.Graphics;
  private rockGfx!: Phaser.GameObjects.Graphics;
  private indicL!: Phaser.GameObjects.Graphics;
  private indicR!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  private canoeX = 0.5;
  private canoeTargetX = 0.5;
  private speed = 0;
  private distanceM = 0;
  private timeLeftMs = CANOE_DURATION_MS;
  private rocks: Rock[] = [];
  private lastRockSpawn = 0;
  private riverScrollY = 0; // normalizado, 0–1, loop
  private lastStrokeAt = 0;
  private strokeFlash: Record<'L' | 'R', number> = { L: 0, R: 0 }; // ms restantes de flash

  constructor() { super('CanoeGame'); }

  create(): void {
    this.resetState();
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;

    this.bgGfx    = this.add.graphics().setDepth(0);
    this.wakeGfx  = this.add.graphics().setDepth(1);
    this.rockGfx  = this.add.graphics().setDepth(2);
    this.canoeGfx = this.add.graphics().setDepth(3);
    this.indicL   = this.add.graphics().setDepth(5);
    this.indicR   = this.add.graphics().setDepth(5);

    this.hudText = this.add.text(W / 2, 28, '0 m', {
      fontFamily: 'VT323, ui-monospace', fontSize: '32px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(10);

    this.timerText = this.add.text(W - 16, 28, '1:00', {
      fontFamily: 'VT323, ui-monospace', fontSize: '28px', color: '#ffae0a',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(10);

    this.createPip();
    this.setupDetector();
    this.setupDebugKeys();

    // BackButton no canto superior-esquerdo (PIP ocupa bottom-right)
    this.add.text(16, 16, '✕', {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4,
    }).setDepth(20).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.endGame());
  }

  private resetState(): void {
    this.canoeX = 0.5;
    this.canoeTargetX = 0.5;
    this.speed = 0;
    this.distanceM = 0;
    this.timeLeftMs = CANOE_DURATION_MS;
    this.rocks = [];
    this.lastRockSpawn = 0;
    this.riverScrollY = 0;
    this.lastStrokeAt = 0;
    this.strokeFlash = { L: 0, R: 0 };
  }

  // ... demais métodos implementados nas tasks B2–D6
}
```

**Verificar:** arquivo compila sem erros (pode ter métodos stubbed como `private setupDetector() {}` por ora)

---

### B2. Implementar drawRiver() — fundo + paredes de cânion

**Editar:** `src/game/scenes/CanoeGame.ts` — adicionar método e chamar em `update()`:

```typescript
private drawRiver(): void {
  const W = GAME_CONFIG.width;
  const H = GAME_CONFIG.height;
  const g = this.bgGfx;
  g.clear();

  // Fundo azul do rio
  g.fillStyle(0x1a8fc1, 1);
  g.fillRect(0, 0, W, H);

  // Paredes de cânion (cinza, irregulares)
  // Largura do rio: 55% do W centralizado
  const riverW = W * 0.55;
  const riverLeft  = (W - riverW) / 2;
  const riverRight = riverLeft + riverW;

  // Scroll das paredes: riverScrollY em [0,1], loop visual via módulo
  const segH = H / 4;
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const ys = ((i + this.riverScrollY) % segments) * segH - segH;
    const irregLeft  = riverLeft  - 8 * Math.sin((i + this.riverScrollY) * 2.3);
    const irregRight = riverRight + 8 * Math.sin((i + this.riverScrollY) * 1.7 + 1);

    // Parede esquerda
    g.fillStyle(0x7a7a8a, 1);
    g.fillRect(0, ys, irregLeft, segH + 2);
    // Borda clara (highlight)
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(irregLeft - 4, ys, 4, segH + 2);

    // Parede direita
    g.fillStyle(0x7a7a8a, 1);
    g.fillRect(irregRight, ys, W - irregRight, segH + 2);
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(irregRight, ys, 4, segH + 2);
  }
}
```

**Verificar:** ao chamar `this.drawRiver()` no `update()`, paredes aparecem nos lados com o rio azul ao centro

---

### B3. Implementar drawCanoe() — oval + bonequinho + remos

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
private drawCanoe(): void {
  const W = GAME_CONFIG.width;
  const H = GAME_CONFIG.height;
  const g = this.canoeGfx;
  g.clear();

  const cx = this.canoeX * W;
  const cy = H * 0.72; // canoa no terço inferior
  const bw = 28; const bh = 52; // semi-eixos da oval da canoa

  // Sombra da canoa
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(cx + 3, cy + 4, bw * 2, bh * 2);

  // Corpo da canoa (laranja)
  g.fillStyle(0xe8740a, 1);
  g.fillEllipse(cx, cy, bw * 2, bh * 2);

  // Interior (mais escuro)
  g.fillStyle(0x8b3a00, 1);
  g.fillEllipse(cx, cy, bw * 1.2, bh * 1.4);

  // Bonequinho (visto de cima)
  g.fillStyle(0xf0d090, 1); // cabeça
  g.fillCircle(cx, cy - 8, 9);
  g.fillStyle(0x3080e0, 1); // tronco
  g.fillRect(cx - 6, cy - 2, 12, 16);

  // Remos
  this.drawPaddle(g, cx, cy, 'L');
  this.drawPaddle(g, cx, cy, 'R');
}

private drawPaddle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, side: 'L' | 'R'): void {
  const dir = side === 'L' ? -1 : 1;
  const flash = this.strokeFlash[side] > 0;
  const alpha = flash ? 1.0 : 0.6;

  // Ângulo do remo: em repouso horizontal, em stroke levemente inclinado
  const angle = flash ? Math.PI * 0.18 * dir : Math.PI * 0.08 * dir;
  const shaftLen = 36;
  const bladeW = 10; const bladeH = 18;

  g.lineStyle(4, 0xf0f0e0, alpha);
  const ox = cx + dir * 12;
  const oy = cy;
  const ex = ox + Math.cos(angle) * shaftLen * dir;
  const ey = oy + Math.sin(Math.abs(angle)) * shaftLen * -0.3;
  g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.strokePath();

  // Pá do remo
  g.fillStyle(0xd4c090, alpha);
  g.fillEllipse(ex, ey, bladeW, bladeH);
}
```

**Verificar:** canoa laranja com bonequinho e remos visíveis; remo do lado do flash fica mais brilhante

---

### B4. Implementar updateWake() — rastro branco

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
private updateWake(): void {
  const W = GAME_CONFIG.width;
  const H = GAME_CONFIG.height;
  const g = this.wakeGfx;
  g.clear();

  if (this.speed < 0.02) return; // sem wake se estiver quase parado
  const cx = this.canoeX * W;
  const cy = H * 0.72;

  // Trapézio afinando para trás
  const wakeLen = 60 + this.speed * 120;
  const wakeW   = 14 * this.speed / CANOE_MAX_SPEED + 4;

  g.fillStyle(0xffffff, 0.55);
  g.fillTriangle(
    cx - wakeW, cy + 30,
    cx + wakeW, cy + 30,
    cx, cy + 30 + wakeLen,
  );
}
```

---

### B5. Implementar spawnRock() + updateRocks() + drawRocks()

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
private spawnRock(now: number): void {
  if (now - this.lastRockSpawn < CANOE_ROCK_SPAWN_MS) return;
  this.lastRockSpawn = now;

  const riverLeft  = 0.5 - 0.275; // normalizado
  const riverRight = 0.5 + 0.275;
  const rx = 0.025 + Math.random() * 0.015; // raio horizontal norm
  const ry = rx * 0.7;
  const x = riverLeft + rx + Math.random() * (riverRight - riverLeft - rx * 2);
  this.rocks.push({ x, y: -0.06, rx, ry });
}

private updateRocks(dt: number): void {
  const rockSpeed = CANOE_ROCK_BASE_SPEED + this.speed * 0.0003;
  for (const r of this.rocks) {
    r.y += rockSpeed * dt;
  }
  this.rocks = this.rocks.filter((r) => r.y < 1.1);
}

private drawRocks(): void {
  const W = GAME_CONFIG.width;
  const H = GAME_CONFIG.height;
  const g = this.rockGfx;
  g.clear();
  for (const r of this.rocks) {
    const px = r.x * W;
    const py = r.y * H;
    g.fillStyle(0x888898, 1);
    g.fillEllipse(px, py, r.rx * W * 2, r.ry * H * 2);
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(px - r.rx * W * 0.2, py - r.ry * H * 0.3, r.rx * W * 0.6, r.ry * H * 0.4);
  }
}
```

**Verificar:** pedras cinzas aparecem no topo e descem; desaparecem ao sair pela base

---

### B6. Implementar indicadores L/R na base

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
private drawIndicators(): void {
  const W = GAME_CONFIG.width;
  const H = GAME_CONFIG.height;
  const baseY = H - 52;

  this.drawHex(this.indicL, W * 0.22, baseY, 'L', this.strokeFlash.L > 0);
  this.drawHex(this.indicR, W * 0.78, baseY, 'R', this.strokeFlash.R > 0);
}

private drawHex(g: Phaser.GameObjects.Graphics, x: number, y: number, label: string, lit: boolean): void {
  g.clear();
  const r = 30;
  const alpha = lit ? 0.9 : 0.3;
  const color = lit ? 0xffd60a : 0x4cd9ff;

  // Hexágono
  g.fillStyle(color, alpha);
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    if (i === 0) g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
    else g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  g.closePath(); g.fillPath();

  // Label (não usa Phaser.Text — reusar texto já criado em create() ou desenhar via Graphics)
  // Nota: texto fixo — criar em create() como Phaser.GameObjects.Text separados para L e R
}
```

> **Nota de implementação:** criar dois `Phaser.GameObjects.Text` em `create()` para "L" e "R" posicionados sobre os hexágonos. O `drawHex()` cuida apenas do fundo colorido.

**Verificar:** hexágonos L/R visíveis na base; piscam em amarelo quando stroke detectado

---

### B7. Registrar CanoeGame no orchestrator

**Editar:** `src/game/orchestrator.ts`

1. Adicionar import (após NinjaFruit, linha ~28):
```typescript
import { CanoeGame } from './scenes/CanoeGame.ts';
```

2. Adicionar ao array `scene` (linha 138, após `NinjaFruit`):
```typescript
scene: [..., NinjaFruit, CanoeGame, MiniGameResult, ...]
```

**Verificar:** `npm run build` sem erro; `CanoeGame` aparece nas cenas disponíveis

---

### B8. Commit Fase B

```bash
git add src/game/scenes/CanoeGame.ts src/game/orchestrator.ts
git commit -m "feat(issue-16): fase B - CanoeGame visuals + registro (#16)"
```

---

## FASE C — Pose + PIP camera

### C1. Implementar createPip()

**Editar:** `src/game/scenes/CanoeGame.ts` — adicionar método:

```typescript
private createPip(): void {
  const refs = getRefs(this);
  const stream = (refs.video as HTMLVideoElement).srcObject as MediaStream | null;
  if (!stream) return; // câmera não abriu (não deve acontecer pós-BodyCheck)

  const pip = document.createElement('div');
  pip.id = 'canoe-pip';
  pip.style.cssText = [
    'position:fixed',
    'bottom:16px',
    'right:16px',
    'width:22vw',
    'min-width:80px',
    'max-width:140px',
    'aspect-ratio:3/4',
    'border-radius:10px',
    'overflow:hidden',
    'z-index:200',
    'border:2px solid rgba(255,255,255,0.45)',
    'box-shadow:0 2px 12px rgba(0,0,0,0.5)',
  ].join(';');

  const vid = document.createElement('video');
  vid.srcObject = stream;
  vid.autoplay = true;
  vid.playsInline = true;
  vid.muted = true;
  vid.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block;';

  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;transform:scaleX(-1);';

  pip.appendChild(vid);
  pip.appendChild(cvs);
  document.body.appendChild(pip);

  this.pipDiv    = pip;
  this.pipVideo  = vid;
  this.pipCanvas = cvs;
  this.pipOverlay = new KeypointOverlay(cvs);

  void vid.play();
}
```

**Verificar:** pequeno retângulo com câmera aparece no canto bottom-right ao entrar na cena

---

### C2. setupDetector() — subscrever onSmoothedFrame + atualizar PIP

**Editar:** `src/game/scenes/CanoeGame.ts` — implementar `setupDetector()`:

```typescript
private setupDetector(): void {
  const refs = getRefs(this);

  this.detector = new RowingDetector(
    ROWING_STROKE_THRESHOLD,
    ROWING_REFRACTORY_MS,
    (side) => this.onStroke(side),
  );

  this.unsub = refs.onSmoothedFrame((frame) => {
    this.detector.push(frame);

    // Atualizar skeleton no PIP
    if (this.pipOverlay && this.pipCanvas && this.pipVideo) {
      this.pipCanvas.width  = this.pipVideo.videoWidth  || 320;
      this.pipCanvas.height = this.pipVideo.videoHeight || 240;
      this.pipOverlay.draw(frame.keypoints, frame.confidence ?? 1);
    }
  });
}

private onStroke(side: 'L' | 'R'): void {
  this.lastStrokeAt = performance.now();
  this.strokeFlash[side] = 300; // ms de flash visual

  // Mover canoa
  const dir = side === 'L' ? -1 : 1;
  this.canoeTargetX = Phaser.Math.Clamp(
    this.canoeTargetX + dir * CANOE_STEER_AMOUNT,
    0.1, 0.9,
  );

  // Acelerar
  this.speed = Math.min(this.speed + CANOE_SPEED_PER_STROKE, CANOE_MAX_SPEED);
}
```

**Verificar:** skeleton verde aparece no PIP ao posicionar em frente à câmera; `onStroke` é chamado ao mover braço para baixo

---

### C3. Implementar shutdown() — cleanup PIP + unsub

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
shutdown(): void {
  this.unsub?.();
  this.unsub = null;
  this.detector?.reset();

  if (this.pipDiv) {
    this.pipDiv.remove();
    this.pipDiv = null;
    this.pipOverlay = null;
    this.pipCanvas = null;
    this.pipVideo = null;
  }
}
```

**Verificar:** ao sair da cena (BackButton ou endGame), o PIP div desaparece do DOM; `document.getElementById('canoe-pip')` retorna `null`

---

### C4. Commit Fase C

```bash
git add src/game/scenes/CanoeGame.ts
git commit -m "feat(issue-16): fase C - pose integration + PIP camera (#16)"
```

---

## FASE D — Lógica de jogo + update loop

### D1. Implementar update() — loop principal

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
update(_time: number, delta: number): void {
  if (this.timeLeftMs <= 0) return;

  const dt = delta; // ms

  // Timer
  this.timeLeftMs -= dt;
  if (this.timeLeftMs <= 0) { this.timeLeftMs = 0; this.endGame(); return; }

  // Decair velocidade (exponencial)
  const timeSinceStroke = performance.now() - this.lastStrokeAt;
  if (timeSinceStroke > 600) {
    this.speed *= Math.pow(CANOE_SPEED_DECAY, dt / 1000);
    if (this.speed < 0.005) this.speed = 0;
  }

  // Scroll do rio
  const scrollDt = (CANOE_ROCK_BASE_SPEED + this.speed * 0.0003) * dt;
  this.riverScrollY = (this.riverScrollY + scrollDt * 4) % 1;

  // Lerp posição X da canoa
  this.canoeX = Phaser.Math.Linear(this.canoeX, this.canoeTargetX, CANOE_LERP);

  // Distância
  this.distanceM += this.speed * dt * CANOE_METERS_PER_UNIT / 1000;

  // Flash timers
  if (this.strokeFlash.L > 0) this.strokeFlash.L -= dt;
  if (this.strokeFlash.R > 0) this.strokeFlash.R -= dt;

  // Spawn + update rocks
  this.spawnRock(this.time.now);
  this.updateRocks(dt);
  this.checkCollisions();

  // Render
  this.drawRiver();
  this.updateWake();
  this.drawRocks();
  this.drawCanoe();
  this.drawIndicators();
  this.updateHud();
}
```

---

### D2. Implementar checkCollisions()

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
private checkCollisions(): void {
  const W = GAME_CONFIG.width;
  const H = GAME_CONFIG.height;
  const cx = this.canoeX;
  const cy = 0.72; // normalizado
  const cw = 0.07; const ch = 0.10; // half-extents normalizados

  for (const r of this.rocks) {
    const dx = Math.abs(r.x - cx) / (cw + r.rx);
    const dy = Math.abs(r.y - cy) / (ch + r.ry);
    if (dx < 1 && dy < 1) {
      // Colisão
      this.speed *= CANOE_COLLISION_BRAKE;
      this.cameras.main.shake(200, 0.006);

      // Flash vermelho rápido
      this.cameras.main.flash(150, 255, 60, 60, false);

      // Remove rocha colidida
      this.rocks = this.rocks.filter((k) => k !== r);

      // Narrator (sem import direto — via refs)
      const refs = getRefs(this);
      if ((refs as unknown as Record<string, unknown>).narrator) {
        // narrator opcional — fala se disponível
      }
      break; // uma colisão por frame
    }
  }
}
```

> **Nota:** integração com Narrator requer importar `Narrator` de `../systems/narrator.ts`. Checar se o padrão de acesso é igual ao NinjaFruit e ajustar conforme.

**Verificar:** colidir com pedra reduz speed, tela treme levemente, flash vermelho aparece

---

### D3. Implementar updateHud()

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
private updateHud(): void {
  this.hudText.setText(`${Math.floor(this.distanceM)} m`);

  const totalSec = Math.ceil(this.timeLeftMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  this.timerText.setText(`${min}:${sec.toString().padStart(2, '0')}`);
}
```

---

### D4. Implementar setupDebugKeys() — teclado A/D

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
private setupDebugKeys(): void {
  if (!window.location.search.includes('debug')) return;

  const keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  const keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);

  if (keyA) this.input.keyboard?.on('keydown-A', () => this.onStroke('L'));
  if (keyD) this.input.keyboard?.on('keydown-D', () => this.onStroke('R'));
}
```

**Verificar:** com `?debug=1`, tecla A move canoa para esquerda, D para direita

---

### D5. Implementar endGame()

**Editar:** `src/game/scenes/CanoeGame.ts`:

```typescript
private endGame(): void {
  this.scene.start('MiniGameResult', {
    score:    Math.floor(this.distanceM),
    label:    'metros remados',
    gameKey:  'CanoeGame',
    extra:    { speed: this.speed.toFixed(2) },
  });
}
```

**Verificar:** ao chamar `endGame()`, cena muda para `MiniGameResult` com distância correta; PIP desaparece (via `shutdown()` automático do Phaser ao trocar de cena)

---

### D6. Commit Fase D

```bash
git add src/game/scenes/CanoeGame.ts
git commit -m "feat(issue-16): fase D - game loop, colisões, HUD, fim de jogo (#16)"
```

---

## FASE E — Integração hub + docs

### E1. Adicionar strings à strings.ts

**Editar:** `src/i18n/strings.ts` — localizar o objeto `miniGames` e adicionar:

```typescript
// dentro de miniGames: { ... }
canoeTitle: 'Canoa',
canoeDesc:  'Rema alternando os braços',
```

**Verificar:** `strings.miniGames.canoeTitle` retorna `'Canoa'` em console do browser

---

### E2. Adicionar CanoeGame ao MiniGamesHub

**Editar:** `src/game/scenes/MiniGamesHub.ts` — array `cardio` (linha ~40-44):

```typescript
cardio: [
  { title: strings.miniGames.runnerTitle,     desc: strings.miniGames.runnerDesc,     icon: '🏃', color: 0xff453a, start: goCheck('Calibration') },
  { title: strings.miniGames.helicopterTitle, desc: strings.miniGames.helicopterDesc, icon: '🚁', color: 0x4cd964, start: goCheck('HelicopterGame') },
  { title: strings.miniGames.chickenTitle,    desc: strings.miniGames.chickenDesc,    icon: '🐔', color: 0xffae0a, start: goCheck('ChickenGame') },
  { title: strings.miniGames.canoeTitle,      desc: strings.miniGames.canoeDesc,      icon: '🛶', color: 0x1a8fc1, start: goCheck('CanoeGame') },
],
```

**Verificar:** card "🛶 Canoa" aparece na categoria Cardio do hub

---

### E3. Atualizar CODEMAP.md

**Editar:** `docs/CODEMAP.md`

1. Tabela "Cenas Phaser registradas" — adicionar linha após NinjaFruit:
```
| `CanoeGame` | Mini-game | Remo alternado top-down, avatar sprite, PIP camera, sem CameraBackdrop |
```

2. Seção "Status do projeto" — atualizar contagem de cenas (26 → 27) e mencionar Issue #16.

3. Tabela "Histórico SDD" — adicionar linha:
```
| #16 | feat | CanoeGame — mini-jogo de remo top-down | **WIP** |
```

---

### E4. Atualizar GAMES.md

**Editar:** `docs/GAMES.md` — adicionar nova seção após NinjaFruit:

```markdown
## 14. Canoa (`CanoeGame`)

**Arquivo:** `src/game/scenes/CanoeGame.ts`
**Sistema:** `src/game/systems/rowingDetector.ts` — `RowingDetector`

**Gesto:** pulso desce com velocidade ≥ `ROWING_STROKE_THRESHOLD`
(coords norm/s) em movimento descendente. Alternância obrigatória (não
conta dois seguidos do mesmo lado). Refractory de `ROWING_REFRACTORY_MS` ms.

**Mecânica:**
- Rio top-down scrollando verticalmente. Canoa move-se L/R com inércia (`lerp`).
- Stroke L → canoa desvia para a esquerda; stroke R → direita.
- `speed` cresce por stroke; decai sem remadas.
- Pedras scrollam de cima; colisão freia a canoa + screenShake.
- PIP camera (bottom-right, ~22vw) mostra feed + skeleton — sem CameraBackdrop.
- Indicadores L/R hexagonais na base flasham no stroke detectado.

**Duração:** 60 s fixos.
**Scoring:** distância percorrida em metros (`distanceM`).
**Keyboard debug:** A = stroke L; D = stroke R (com `?debug=1`).
```

---

### E5. Commit Fase E

```bash
git add src/i18n/strings.ts src/game/scenes/MiniGamesHub.ts \
        docs/CODEMAP.md docs/GAMES.md
git commit -m "feat(issue-16): fase E - hub integration + docs (#16)"
```

---

## Checklist de aceite pré-PR

- [ ] `npm run build` sem erros TypeScript
- [ ] Card 🛶 Canoa aparece no hub, categoria Cardio
- [ ] `?debug=1`: A move esquerda, D move direita, canoa visível, PIP no canto
- [ ] PIP mostra skeleton verde sobre feed da câmera
- [ ] Pedras aparecem e descem; colisão faz tela tremer
- [ ] Timer chega a 0:00 → MiniGameResult com "X metros remados"
- [ ] Ao voltar do resultado, PIP não fica preso no DOM
- [ ] `npm run build` ainda sem erros após docs atualizados
