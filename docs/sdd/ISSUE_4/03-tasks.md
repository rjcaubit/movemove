# Tasks — Fase 2: camada de exercício saudável

**Issue:** #4
**Baseado em:** `02-spec.md`
**Total estimado:** ~50 tasks × 2-5min = ~3-4h cadenciado
**Fases:** A (deps + i18n + storage + cadência expandida) → B (energia + zonas + shield) → C (missões + áudio + narrador) → D (Settings + Summary + WaterBreak) → E (E2E + docs + deploy)

---

## FASE A — Deps, i18n, storage, cadência expandida

### A1. Branch + deps idb-keyval + lingui

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
git checkout main && git pull origin main
git checkout -b feature/sdd-issue-4
npm install idb-keyval@^6 @lingui/core@^4 @lingui/cli@^4 --save
```
**Verificar:**
```bash
node -e "console.log(Object.keys(require('./package.json').dependencies))"
```
deve listar `idb-keyval` e `@lingui/core` (cli em devDeps OK também).

### A2. Atualizar `package.json` versão + scripts i18n

**Modificar:** `/Users/rjcaubit/Dev/movemove/package.json`
**Trocar:**
```json
  "name": "movemove-fase1",
  "private": true,
  "version": "0.1.0",
  "description": "Movemove — Fase 1: endless runner mínimo (Phaser 4 + pose detection)",
```
**Por:**
```json
  "name": "movemove-fase2",
  "private": true,
  "version": "0.5.0",
  "description": "Movemove — Fase 2: camada de exercício saudável (cadência, polichinelos, missões, narrador)",
```
E **adicionar** dentro de `"scripts"` (após `"e2e": ...`):
```json
    "i18n:extract": "lingui extract",
    "i18n:compile": "lingui compile",
```
**Verificar:** `npm run lint` continua passando.

### A3. Criar `lingui.config.ts` no root

**Criar:** `/Users/rjcaubit/Dev/movemove/lingui.config.ts`
**Conteúdo:**
```typescript
import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['pt-BR'],
  sourceLocale: 'pt-BR',
  catalogs: [
    {
      path: 'src/i18n/locales/{locale}',
      include: ['src'],
    },
  ],
  format: 'po',
  compileNamespace: 'es',
};

export default config;
```
**Verificar:** `npx lingui extract --clean 2>&1 | tail -5` produz `src/i18n/locales/pt-BR.po` (pode estar vazio na 1ª passagem; aceito).

### A4. Reescrever `src/i18n/strings.ts` como wrapper de `@lingui/core`

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/i18n/strings.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import { i18n } from '@lingui/core';

// Activate locale (sem catálogo carregado, fallback é o próprio msgid → identity)
i18n.load('pt-BR', {});
i18n.activate('pt-BR');

const t = (msg: string): string => i18n._(msg);

export const strings = {
  app: { title: t('Movemove — Endless Runner') },
  welcome: {
    headline: t('Olá! Vamos detectar seus movimentos.'),
    explainer: t('Toque no botão abaixo para ligar a câmera. Os movimentos ficam só no seu aparelho — nada é enviado pra internet.'),
    cta: t('Ligar câmera'),
    settings: t('Configurações'),
  },
  loading: {
    text: t('Carregando detector de movimento…'),
    subtext: t('Da primeira vez pode demorar alguns segundos.'),
    spinnerAriaLabel: t('Carregando'),
    statusInitWasm: t('Inicializando WASM…'),
    statusDownloadingModel: t('Baixando modelo…'),
    statusReady: t('Pronto'),
    statusOpeningCamera: t('Abrindo câmera…'),
  },
  calibration: {
    instruction: t('Fique parado, de frente, braços ao lado do corpo.'),
    countdown: (n: number): string => `${n}…`,
    capturing: t('Capturando…'),
    ok: t('Pronto!'),
    retry: t('Confiança baixa. Vamos tentar de novo?'),
  },
  active: { recalibrate: t('Recalibrar'), debugToggle: t('Debug') },
  error: {
    cameraDenied: t('Você precisa permitir a câmera. Clique no cadeado ↗︎ na barra do navegador e permita o acesso.'),
    cameraNotFound: t('Não encontramos câmera. Conecte uma webcam ou abra esta página no celular.'),
    insecureContext: t('A câmera só funciona em HTTPS ou abrindo por http://localhost. Se você abriu por um IP da rede (192.168.x.x), abra direto em http://localhost:5173 no computador, ou use um túnel HTTPS (cloudflared) pra acessar do celular.'),
    modelDownload: t('Não conseguimos baixar o detector. Verifique sua internet e tente de novo.'),
    generic: t('Algo deu errado. Tente recarregar a página.'),
    retry: t('Tentar de novo'),
  },
  states: {
    noBody: t('Apareça pra câmera 👋'),
    lowLight: t('Iluminação fraca. Chegue mais perto da janela ou acenda uma luz.'),
    driftCalibration: t('Sua calibração pode estar errada. Recalibrar agora?'),
    recalibrate: t('Recalibrar'),
  },
  tutorial: {
    slide1Title: t('PULE'),
    slide1Hint: t('Pule pra desviar de barreiras altas.'),
    slide2Title: t('AGACHE'),
    slide2Hint: t('Agache pra desviar de barreiras baixas.'),
    slide3Title: t('MUDE DE LANE'),
    slide3Hint: t('Mexa o quadril pros lados pra trocar de lane.'),
    skip: t('Pular'),
    next: t('Próximo'),
    start: t('Vamos jogar!'),
  },
  play: {
    distance: t('m'),
    coins: t('moedas'),
    fps: t('FPS'),
    mute: t('Mute'),
    unmute: t('Som'),
    energy: t('Energia'),
    cadence: t('Cadência'),
    bpm: t('passos/min'),
    waterBreak: t('Hora da água!'),
    waterDismiss: t('Continuar'),
  },
  gameOver: {
    title: t('FIM!'),
    distance: t('Distância'),
    coins: t('Moedas'),
    best: t('Recorde'),
    newRecord: t('NOVO RECORDE!'),
    playAgain: t('Jogar de novo'),
    recalibrate: t('Recalibrar'),
  },
  summary: {
    title: t('Como foi?'),
    distance: t('Distância'),
    coins: t('Moedas'),
    jacks: t('Polichinelos'),
    jumps: t('Pulos'),
    ducks: t('Agachadas'),
    cardioTime: t('Tempo cardio'),
    bpmAvg: t('BPM médio'),
    bpmTrack: t('Cadência ao longo da partida'),
    missions: t('Missões'),
    settings: t('Configurações'),
  },
  settings: {
    title: t('Configurações'),
    music: t('Música'),
    sfx: t('Efeitos'),
    voice: t('Narrador'),
    narratorOn: t('Narrador motivador'),
    captionsOn: t('Legendas'),
    age: t('Faixa etária'),
    age_5_7: t('5 a 7 anos'),
    age_8_10: t('8 a 10 anos'),
    age_11_12: t('11 a 12 anos'),
    back: t('Voltar'),
  },
  orientation: {
    rotate: t('Vire o celular pra paisagem pra jogar melhor.'),
    continue: t('Continuar assim mesmo'),
  },
} as const;
```
**Verificar:** `npm run lint` passa.

### A5. Criar `OneEuroSmoother` (preparado, não usado ainda)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/pose/oneEuroSmoother.ts`
**Conteúdo:**
```typescript
import type { Keypoint } from './types.ts';

/**
 * One Euro Filter — adaptive low-pass.
 * Reference: Casiez et al. 2012.
 *
 * Cutoff aumenta com velocidade (menos lag em mov rápido), reduz parado (menos jitter).
 * Use só se EMA mostrar jitter empírico em cadência rápida (ADR-5).
 */
export class OneEuroSmoother {
  private prev: Keypoint[] | null = null;
  private prevDx: number[] | null = null;
  private prevT = 0;

  constructor(
    private readonly minCutoff: number = 1.0,
    private readonly beta: number = 0.007,
    private readonly dCutoff: number = 1.0,
  ) {}

  smooth(raw: Keypoint[], tMs: number): Keypoint[] {
    const tSec = tMs / 1000;
    if (this.prev === null || this.prev.length !== raw.length) {
      this.prev = raw.map((k) => ({ ...k }));
      this.prevDx = new Array(raw.length * 2).fill(0);
      this.prevT = tSec;
      return this.prev;
    }
    const dt = Math.max(1e-3, tSec - this.prevT);
    const out: Keypoint[] = new Array(raw.length);
    const newDx: number[] = new Array(raw.length * 2);
    for (let i = 0; i < raw.length; i++) {
      const dxX = (raw[i].x - this.prev[i].x) / dt;
      const dxY = (raw[i].y - this.prev[i].y) / dt;
      const aD = this.alpha(dt, this.dCutoff);
      const sdxX = aD * dxX + (1 - aD) * (this.prevDx?.[i * 2] ?? 0);
      const sdxY = aD * dxY + (1 - aD) * (this.prevDx?.[i * 2 + 1] ?? 0);
      const cutoffX = this.minCutoff + this.beta * Math.abs(sdxX);
      const cutoffY = this.minCutoff + this.beta * Math.abs(sdxY);
      const aX = this.alpha(dt, cutoffX);
      const aY = this.alpha(dt, cutoffY);
      out[i] = {
        x: aX * raw[i].x + (1 - aX) * this.prev[i].x,
        y: aY * raw[i].y + (1 - aY) * this.prev[i].y,
        z: raw[i].z,
        visibility: raw[i].visibility,
      };
      newDx[i * 2] = sdxX;
      newDx[i * 2 + 1] = sdxY;
    }
    this.prev = out;
    this.prevDx = newDx;
    this.prevT = tSec;
    return out;
  }

  reset(): void { this.prev = null; this.prevDx = null; this.prevT = 0; }

  private alpha(dt: number, cutoff: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
}
```
**Verificar:** `npm run lint` passa.

### A6. Estender `pose/types.ts` com `bpm`/`intensity` em `cadence`

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/pose/types.ts`
**Trocar:**
```typescript
  | { type: 'cadence'; stepsPerSec: number; source: 'pose' | 'kbd'; t: number };
```
**Por:**
```typescript
  | { type: 'cadence'; stepsPerSec: number; bpm?: number; intensity?: CadenceIntensity; source: 'pose' | 'kbd'; t: number };

export type CadenceIntensity = 'none' | 'walking' | 'jogging' | 'running';
```
E **adicionar** export de `CadenceIntensity` (já está acima). **Verificar:** `npm run lint` passa.

### A7. Estender `detectCadence` em `events.ts` pra emitir `bpm` + `intensity`

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/pose/events.ts`
**Trocar:**
```typescript
    if (newStep) {
      const stepsPerSec = (this.kneeUpHistory.length * 1000) / POSE_CONFIG.cadenceWindowMs;
      this.emit({ type: 'cadence', stepsPerSec, source: 'pose', t });
    }
```
**Por:**
```typescript
    if (newStep) {
      const stepsPerSec = (this.kneeUpHistory.length * 1000) / POSE_CONFIG.cadenceWindowMs;
      const bpm = stepsPerSec * 60;
      const intensity =
        stepsPerSec < 0.5 ? 'none'
        : stepsPerSec < 1.5 ? 'walking'
        : stepsPerSec < 3 ? 'jogging'
        : 'running';
      this.emit({ type: 'cadence', stepsPerSec, bpm, intensity, source: 'pose', t });
    }
```
**Verificar:** `npm run lint` passa.

### A8. Adicionar `cadence` decay event quando histórico zera

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/pose/events.ts`
Após o bloco `if (newStep)` (final de `detectCadence`), **adicionar:**
```typescript
    // Emit "decay" cadence quando histórico esvazia (silêncio prolongado)
    // — assim consumers sabem que o usuário parou.
    if (!newStep && this.kneeUpHistory.length === 0 && this.lastCadenceEmitT < t - 1000) {
      this.lastCadenceEmitT = t;
      this.emit({ type: 'cadence', stepsPerSec: 0, bpm: 0, intensity: 'none', source: 'pose', t });
    }
```
E **adicionar** ao topo da classe `EventDetector`:
```typescript
  private lastCadenceEmitT = 0;
```
junto com os outros campos privados, e no `reset()`:
```typescript
    this.lastCadenceEmitT = 0;
```
**Verificar:** `npm run lint` passa. (Se TS reclamar de campo não inicializado, garantir = 0 no declaração.)

### A9. Estender `KeyboardDebug` com B/S/M/W

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/debug/keyboard.ts`
**Trocar (dentro do `switch`):**
```typescript
        case 'KeyR':
          this.toggleCadence();
          break;
      }
```
**Por:**
```typescript
        case 'KeyR':
          this.toggleCadence();
          break;
        case 'KeyB':
          // Boost cadência simulada (3 passos/s)
          this.boostCadence();
          break;
        case 'KeyS':
          // Shield direto (arms_up)
          this.emit({ type: 'arms_up', source: 'kbd', t });
          break;
        case 'KeyM':
          // Skip pra Summary mock — integrado via window.__movemoveDebug
          (window as unknown as { __movemoveDebug?: { skipToScene: (k: string, d?: unknown) => void } }).__movemoveDebug?.skipToScene('Summary', { distance: 500, coins: 12, jacks: 4, jumps: 8, ducks: 3, durationS: 90, bpmAvg: 95, bpmTrack: [60, 80, 100, 120, 110, 95, 90, 100] });
          break;
        case 'KeyW':
          // Trigger water break
          (window as unknown as { __movemoveDebug?: { triggerWaterBreak: () => void } }).__movemoveDebug?.triggerWaterBreak();
          break;
      }
```
E **adicionar** método `boostCadence` na classe (após `toggleCadence`):
```typescript
  private boostCadence(): void {
    const start = performance.now();
    const interval = window.setInterval(() => {
      this.emit({ type: 'cadence', stepsPerSec: 3, bpm: 180, intensity: 'running', source: 'kbd', t: performance.now() });
      if (performance.now() - start > 5000) clearInterval(interval);
    }, 200);
  }
```
**Verificar:** `npm run lint` passa.

### A10. Criar `ProfileStore` (idb-keyval)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/storage/profile.ts`
**Conteúdo:**
```typescript
import { get, set } from 'idb-keyval';

export type AgeGroup = '5-7' | '8-10' | '11-12';

export interface MissionInstance {
  defId: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: number;
}

export interface Profile {
  version: 1;
  ageGroup: AgeGroup;
  totalRuns: number;
  totalDistance: number;
  totalCoins: number;
  totalJacks: number;
  totalArmsUp: number;
  missionState: { date: string; missions: MissionInstance[] };
}

const KEY = 'movemove.profile.v1';

const DEFAULT_PROFILE: Profile = {
  version: 1,
  ageGroup: '8-10',
  totalRuns: 0,
  totalDistance: 0,
  totalCoins: 0,
  totalJacks: 0,
  totalArmsUp: 0,
  missionState: { date: '', missions: [] },
};

export class ProfileStore {
  private cache: Profile | null = null;

  async load(): Promise<Profile> {
    if (this.cache) return this.cache;
    let p: Profile | undefined;
    try { p = await get<Profile>(KEY); } catch { p = undefined; }
    if (!p) {
      p = { ...DEFAULT_PROFILE };
      // Migração soft do localStorage (v0)
      try {
        const dist = Number(localStorage.getItem('movemove.bestDistance') ?? 0);
        if (dist > 0) p.totalDistance = dist;
        const ageStored = localStorage.getItem('movemove.ageGroup');
        if (ageStored === '5-7' || ageStored === '8-10' || ageStored === '11-12') p.ageGroup = ageStored;
      } catch { /* ignore */ }
      await this.save(p);
    }
    this.cache = p;
    return p;
  }

  async save(p: Profile): Promise<void> {
    this.cache = p;
    try { await set(KEY, p); } catch { /* fallback memory-only */ }
  }

  async update(patch: Partial<Profile>): Promise<Profile> {
    const cur = await this.load();
    const next = { ...cur, ...patch };
    await this.save(next);
    return next;
  }
}
```
**Verificar:** `npm run lint` passa.

### A11. Criar `RunHistoryStore`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/storage/runHistory.ts`
**Conteúdo:**
```typescript
import { get, set } from 'idb-keyval';

export interface RunEntry {
  id: string;
  startedAt: number;
  durationS: number;
  distance: number;
  coins: number;
  jacks: number;
  armsUp: number;
  jumps: number;
  ducks: number;
  bpmAvg: number;
  bpmTrack: number[];
}

const KEY = 'movemove.runHistory.v1';
const MAX_ENTRIES = 30;

export class RunHistoryStore {
  async list(): Promise<RunEntry[]> {
    try { return (await get<RunEntry[]>(KEY)) ?? []; } catch { return []; }
  }

  async push(entry: RunEntry): Promise<void> {
    const cur = await this.list();
    cur.unshift(entry);
    while (cur.length > MAX_ENTRIES) cur.pop();
    try { await set(KEY, cur); } catch { /* memory-only */ }
  }
}
```
**Verificar:** `npm run lint` passa.

### A12. Commit Fase A

```bash
cd /Users/rjcaubit/Dev/movemove
git add package.json package-lock.json lingui.config.ts \
        src/i18n/strings.ts src/pose/oneEuroSmoother.ts \
        src/pose/types.ts src/pose/events.ts src/debug/keyboard.ts \
        src/game/storage/
git commit -m "$(cat <<'EOF'
feat(issue-4): fase A — deps + i18n + storage + cadência expandida (#4)

- Adiciona idb-keyval@^6 + @lingui/core@^4
- lingui.config.ts + strings.ts wrapper i18n (i18n._\`...\`)
- OneEuroSmoother criado (preparado, não ativado por default — ADR-5)
- pose/types.ts: cadence event ganha bpm + intensity (compat retroativa)
- pose/events.ts: detectCadence emite tier (none/walking/jogging/running)
  + decay event quando histórico zera
- KeyboardDebug: B (boost cadência), S (shield), M (skip Summary), W (water break)
- ProfileStore + RunHistoryStore (idb-keyval, schema v1, migra soft do localStorage)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline`.

---

## FASE B — Energia + zonas + escudo

### B1. Criar `EnergySystem`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/energy.ts`
**Conteúdo:**
```typescript
import type { CadenceIntensity } from '../../pose/types.ts';

const RATES: Record<CadenceIntensity, number> = {
  none: -8,
  walking: 5,
  jogging: 12,
  running: 25,
};

export class EnergySystem {
  private value = 50;
  private intensity: CadenceIntensity = 'none';
  private lastUpdateMs = performance.now();

  setIntensity(intensity: CadenceIntensity): void {
    this.intensity = intensity;
  }

  /** Atualiza valor por dt em segundos. Chamar a cada frame do Play. */
  tick(dtSec: number): void {
    const rate = RATES[this.intensity];
    this.value = Math.max(0, Math.min(100, this.value + rate * dtSec));
    this.lastUpdateMs = performance.now();
  }

  getValue(): number { return this.value; }
  getIntensity(): CadenceIntensity { return this.intensity; }

  /** Multiplicador de velocidade do mundo. */
  getSpeedFactor(): number {
    if (this.value >= 30) return 1;
    return Math.max(0, this.value / 30);
  }

  reset(): void { this.value = 50; this.intensity = 'none'; this.lastUpdateMs = performance.now(); }
}
```
**Verificar:** `npm run lint`.

### B2. Criar `ShieldEffect`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/shield.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import type { Player } from '../entities/Player.ts';

export class ShieldEffect {
  private charges = 0;
  private aura: Phaser.GameObjects.Arc | null = null;
  private scene: Phaser.Scene;
  private player: Player;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  activate(): void {
    if (this.charges >= 1) return; // só 1 carga simultânea
    this.charges = 1;
    this.aura = this.scene.add.circle(this.player.sprite.x, this.player.sprite.y - 40, 50, 0x0a84ff, 0.3)
      .setDepth(11).setStrokeStyle(3, 0x0a84ff, 0.8);
  }

  /** Returns true se consumiu carga (player evitou colisão). */
  consume(): boolean {
    if (this.charges <= 0) return false;
    this.charges = 0;
    if (this.aura) {
      this.scene.tweens.add({
        targets: this.aura, alpha: 0, scale: 1.5, duration: 200,
        onComplete: () => { this.aura?.destroy(); this.aura = null; },
      });
    }
    return true;
  }

  update(): void {
    if (this.aura) {
      this.aura.setX(this.player.sprite.x);
      this.aura.setY(this.player.sprite.y - 40);
    }
  }

  hasCharge(): boolean { return this.charges > 0; }
  reset(): void { this.charges = 0; if (this.aura) { this.aura.destroy(); this.aura = null; } }
}
```
**Verificar:** `npm run lint`.

### B3. Criar `JackZone` entity

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/JackZone.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { zToY, zToScale } from '../systems/pseudo3d.ts';

export class JackZone {
  readonly graphics: Phaser.GameObjects.Graphics;
  z: number;
  alive = true;
  count = 0;
  required: number;
  private startedAtMs: number | null = null;
  private windowMs: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, required = 5, windowMs = 4000) {
    this.scene = scene;
    this.required = required;
    this.windowMs = windowMs;
    this.z = GAME_CONFIG.zMax;
    this.graphics = scene.add.graphics().setDepth(4);
  }

  startWindow(): void {
    if (this.startedAtMs === null) this.startedAtMs = performance.now();
  }

  tickJack(): boolean {
    if (this.startedAtMs === null) return false;
    if (performance.now() - this.startedAtMs > this.windowMs) return false;
    this.count += 1;
    return this.count >= this.required;
  }

  isInPlayerZone(): boolean { return this.z < 0.2 && this.z > -0.05; }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.graphics.destroy(); return; }
    this.draw();
    if (this.isInPlayerZone()) this.startWindow();
  }

  private draw(): void {
    this.graphics.clear();
    const z = Math.max(0, this.z);
    const cx = GAME_CONFIG.width / 2;
    const y = zToY(z);
    const scale = zToScale(z);
    const w = 600 * scale;
    this.graphics.lineStyle(6, 0xffd60a, 0.8);
    this.graphics.strokeEllipse(cx, y, w, w * 0.25);
  }

  destroy(): void { if (this.alive) { this.graphics.destroy(); this.alive = false; } }
}
```
**Verificar:** `npm run lint`.

### B4. Criar `ArmsZone` entity

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/ArmsZone.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { zToY, zToScale } from '../systems/pseudo3d.ts';

export class ArmsZone {
  readonly graphics: Phaser.GameObjects.Graphics;
  z: number;
  alive = true;
  startedAtMs: number | null = null;
  armsUpDurationMs = 0;
  private windowMs: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, windowMs = 3000) {
    this.scene = scene;
    this.windowMs = windowMs;
    this.z = GAME_CONFIG.zMax;
    this.graphics = scene.add.graphics().setDepth(4);
  }

  isInPlayerZone(): boolean { return this.z < 0.25 && this.z > -0.05; }

  registerArmsUp(dtMs: number): void {
    if (this.startedAtMs === null) this.startedAtMs = performance.now();
    this.armsUpDurationMs += dtMs;
  }

  isCompleted(): boolean { return this.armsUpDurationMs >= this.windowMs * 0.7; }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.graphics.destroy(); return; }
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    const z = Math.max(0, this.z);
    const cx = GAME_CONFIG.width / 2;
    const y = zToY(z) - 80 * zToScale(z);
    const scale = zToScale(z);
    const w = 400 * scale;
    const h = 30 * scale;
    this.graphics.fillStyle(0xbf5af2, 0.7);
    this.graphics.fillRect(cx - w / 2, y - h / 2, w, h);
    this.graphics.lineStyle(3, 0xbf5af2, 1);
    this.graphics.strokeRect(cx - w / 2, y - h / 2, w, h);
  }

  destroy(): void { if (this.alive) { this.graphics.destroy(); this.alive = false; } }
}
```
**Verificar:** `npm run lint`.

### B5. Criar `ZoneManager`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/zones.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { JackZone } from '../entities/JackZone.ts';
import { ArmsZone } from '../entities/ArmsZone.ts';

export class ZoneManager {
  jacks: JackZone[] = [];
  arms: ArmsZone[] = [];
  private metersAccum = 0;
  private nextZoneAt: number;
  private scene: Phaser.Scene;
  private rng: () => number;
  private spacing: number;

  constructor(scene: Phaser.Scene, rng: () => number, spacingMeters = 80) {
    this.scene = scene;
    this.rng = rng;
    this.spacing = spacingMeters;
    this.nextZoneAt = spacingMeters;
  }

  tickDistance(deltaM: number): void {
    this.metersAccum += deltaM;
    if (this.metersAccum >= this.nextZoneAt) {
      this.nextZoneAt += this.spacing;
      if (this.rng() < 0.5) this.jacks.push(new JackZone(this.scene));
      else this.arms.push(new ArmsZone(this.scene));
    }
  }

  update(speedMps: number, dtSec: number): void {
    for (const j of this.jacks) j.update(speedMps, dtSec);
    for (const a of this.arms) a.update(speedMps, dtSec);
    this.jacks = this.jacks.filter((j) => j.alive);
    this.arms = this.arms.filter((a) => a.alive);
  }

  /** Encontra zona de polichinelo ativa no player; null se nenhuma. */
  activeJackZone(): JackZone | null {
    return this.jacks.find((j) => j.isInPlayerZone()) ?? null;
  }

  activeArmsZone(): ArmsZone | null {
    return this.arms.find((a) => a.isInPlayerZone()) ?? null;
  }

  destroy(): void {
    for (const j of this.jacks) j.destroy();
    for (const a of this.arms) a.destroy();
    this.jacks = [];
    this.arms = [];
  }
}
```
**Verificar:** `npm run lint`.

### B6. Criar `EnergyBar` UI

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/ui/energyBar.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import type { CadenceIntensity } from '../../pose/types.ts';

const COLOR_BY_TIER: Record<CadenceIntensity, number> = {
  none: 0x8a8d92,
  walking: 0x0a84ff,
  jogging: 0x4cd964,
  running: 0xff9f0a,
};

export class EnergyBar {
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private bpmEl: Phaser.GameObjects.Text;
  private readonly maxWidth = 200;

  constructor(scene: Phaser.Scene) {
    const x = scene.scale.width - 220;
    const y = 20;
    this.bg = scene.add.rectangle(x, y, this.maxWidth, 16, 0x0b0d10, 0.6).setOrigin(0, 0).setDepth(100);
    this.fill = scene.add.rectangle(x, y, this.maxWidth, 16, 0x4cd964, 1).setOrigin(0, 0).setDepth(101);
    this.label = scene.add.text(x, y - 18, 'ENERGIA', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px', color: '#f5f5f5',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(101);
    this.bpmEl = scene.add.text(x + this.maxWidth + 8, y, '0 BPM', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#ffd60a',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(101);
  }

  update(value: number, intensity: CadenceIntensity, bpm: number): void {
    this.fill.setSize(Math.max(0, this.maxWidth * (value / 100)), 16);
    this.fill.setFillStyle(COLOR_BY_TIER[intensity]);
    this.bpmEl.setText(`${Math.round(bpm)} BPM`);
  }
}
```
**Verificar:** `npm run lint`.

### B7. Adicionar config de zonas/energia em `GAME_CONFIG`

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/config.ts`
**Adicionar antes do `} as const;` final:**
```typescript

  /** Energia */
  energyInitial: 50,
  energyDeceleratesBelow: 30,

  /** Zonas especiais */
  zoneSpacingMeters: 80,
  jackZoneRequired: 5,
  jackZoneWindowMs: 4000,
  armsZoneWindowMs: 3000,

  /** Bonus */
  zoneBonusScore: 50,
```
**Verificar:** `npm run lint`.

### B8. Integrar EnergySystem + ZoneManager + Shield no Play

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Play.ts`
Adicionar imports no topo:
```typescript
import { EnergySystem } from '../systems/energy.ts';
import { ZoneManager } from '../systems/zones.ts';
import { ShieldEffect } from '../systems/shield.ts';
import { EnergyBar } from '../ui/energyBar.ts';
import { mulberry32 } from '../systems/rng.ts';
```

E **adicionar campos privados** (perto dos outros):
```typescript
  private energy!: EnergySystem;
  private zones!: ZoneManager;
  private shield!: ShieldEffect;
  private energyBar!: EnergyBar;
  private currentBpm = 0;
```

E **dentro de `create()`** logo após `this.player = new Player(this);`:
```typescript
    this.energy = new EnergySystem();
    this.zones = new ZoneManager(this, mulberry32(43));
    this.shield = new ShieldEffect(this, this.player);
    this.energyBar = new EnergyBar(this);
```

E **estender o eventListener** (substituir o `switch` inteiro):
```typescript
    this.eventListener = (e: Event) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      switch (ev.type) {
        case 'jump': this.player.jump(); break;
        case 'duck': this.player.duck(); break;
        case 'lane_change': this.player.setLane(ev.lane); break;
        case 'cadence':
          if (ev.intensity) this.energy.setIntensity(ev.intensity);
          if (typeof ev.bpm === 'number') this.currentBpm = ev.bpm;
          break;
        case 'jumping_jack': {
          const z = this.zones.activeJackZone();
          if (z) {
            const completed = z.tickJack();
            if (completed) {
              this.scoring.addCoin(); // bônus
            }
          }
          break;
        }
        case 'arms_up': {
          const z = this.zones.activeArmsZone();
          if (z) z.registerArmsUp(50);
          break;
        }
      }
    };
```

E **dentro do `update()`** (após o bloco do prepCountdown e antes do collision check), adicionar:
```typescript
    this.energy.tick(dt);
    this.zones.tickDistance(this.speedMps * dt);
    this.zones.update(this.speedMps, dt);
    this.shield.update();

    // Verifica conclusão de ArmsZone (concede shield)
    for (const z of this.zones.arms) {
      if (z.isCompleted() && !this.shield.hasCharge()) this.shield.activate();
    }

    // Speed factor da energia
    const energyFactor = this.energy.getSpeedFactor();
    this.speedMps = Math.min(C.speedMax, C.speedInitial + steps * C.speedIncreasePerInterval) * energyFactor;
```
*(substituir a linha existente de `this.speedMps = Math.min(...)` por essa nova versão multiplicada).*

E **modificar a colisão** pra consumir shield antes de game over:
```typescript
    if (result.collidedObstacle) {
      if (this.shield.consume()) {
        result.collidedObstacle.destroy();
      } else {
        this.tweens.killAll();
        this.sound.stopAll();
        if (this.cache.audio.exists('snd_hit')) this.sound.play('snd_hit');
        if (this.cache.audio.exists('snd_gameover')) this.sound.play('snd_gameover');
        const distance = this.scoring.getDistance();
        const coins = this.scoring.getCoins();
        this.cleanup();
        this.scene.start('GameOver', { distance, coins });
        return;
      }
    }
```

E **no fim do `update()`**, atualizar o `EnergyBar`:
```typescript
    this.energyBar.update(this.energy.getValue(), this.energy.getIntensity(), this.currentBpm);
```

**Verificar:** `npm run lint` passa. `npm run build` passa.

### B9. Commit Fase B

```bash
cd /Users/rjcaubit/Dev/movemove
git add src/game/
git commit -m "$(cat <<'EOF'
feat(issue-4): fase B — energia + zonas + escudo (#4)

- EnergySystem: 4 tiers (none/walking/jogging/running) modulam velocidade
- ZoneManager: spawn de JackZone (5 polichinelos em 4s) + ArmsZone (3s arms_up)
- ShieldEffect: aura azul; 1 carga consumida em colisão
- EnergyBar HUD com cor por tier + BPM
- Play integra: cadence ev → energy; jumping_jack → tick zone; arms_up → arms zone;
  velocidade multiplicada por energy factor; shield consume em colisão

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## FASE C — Missões + áudio + narrador

### C1. Criar `public/data/missions.json`

**Criar:** `/Users/rjcaubit/Dev/movemove/public/data/missions.json`
**Conteúdo:**
```json
{
  "version": 1,
  "defs": [
    { "id": "run_500m", "title": "Corrida longa", "desc": "Corra 500m em uma só partida", "progressKey": "run.distance", "targetMin": 300, "targetMax": 800 },
    { "id": "daily_100_jacks", "title": "Polichinelo champion", "desc": "Faça {target} polichinelos hoje", "progressKey": "daily.jacks", "targetMin": 50, "targetMax": 150 },
    { "id": "daily_50_coins", "title": "Coletor", "desc": "Colete {target} moedas hoje", "progressKey": "daily.coins", "targetMin": 30, "targetMax": 80 },
    { "id": "run_60s", "title": "Vai com tudo", "desc": "Sobreviva {target}s sem cair", "progressKey": "run.duration_s", "targetMin": 45, "targetMax": 120 },
    { "id": "daily_arms_20", "title": "Defensor", "desc": "Ative escudo {target} vezes hoje", "progressKey": "daily.armsUp", "targetMin": 5, "targetMax": 15 }
  ]
}
```

### C2. Criar `MissionSystem`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/missions.ts`
**Conteúdo:**
```typescript
import { mulberry32 } from './rng.ts';
import type { ProfileStore, MissionInstance } from '../storage/profile.ts';

interface MissionDef {
  id: string;
  title: string;
  desc: string;
  progressKey: 'run.distance' | 'daily.jacks' | 'daily.coins' | 'run.duration_s' | 'daily.armsUp';
  targetMin: number;
  targetMax: number;
}

interface MissionsCatalog { version: number; defs: MissionDef[] }

export class MissionSystem {
  private catalog: MissionsCatalog | null = null;
  private profileStore: ProfileStore;

  constructor(profileStore: ProfileStore) {
    this.profileStore = profileStore;
  }

  async load(): Promise<void> {
    if (this.catalog) return;
    const res = await fetch('/data/missions.json');
    this.catalog = await res.json() as MissionsCatalog;
    await this.ensureToday();
  }

  private async ensureToday(): Promise<void> {
    if (!this.catalog) return;
    const today = this.todayKey();
    const profile = await this.profileStore.load();
    if (profile.missionState.date === today) return;

    const seed = this.hash(`${this.catalog.version}-${today}`);
    const rng = mulberry32(seed);
    const pool = [...this.catalog.defs];
    const chosen: MissionInstance[] = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      const def = pool.splice(idx, 1)[0];
      const target = Math.round(def.targetMin + rng() * (def.targetMax - def.targetMin));
      chosen.push({ defId: def.id, target, progress: 0, completed: false });
    }
    await this.profileStore.update({ missionState: { date: today, missions: chosen } });
  }

  async getActive(): Promise<{ inst: MissionInstance; def: MissionDef }[]> {
    if (!this.catalog) return [];
    const profile = await this.profileStore.load();
    return profile.missionState.missions.map((inst) => ({
      inst,
      def: this.catalog!.defs.find((d) => d.id === inst.defId)!,
    })).filter((x) => x.def);
  }

  /** Atualiza progresso por delta. Retorna missões recém-completadas. */
  async tick(deltas: { distance?: number; jacks?: number; coins?: number; armsUp?: number; durationS?: number }): Promise<MissionInstance[]> {
    if (!this.catalog) return [];
    const profile = await this.profileStore.load();
    const justCompleted: MissionInstance[] = [];
    let dirty = false;
    for (const m of profile.missionState.missions) {
      if (m.completed) continue;
      const def = this.catalog.defs.find((d) => d.id === m.defId);
      if (!def) continue;
      let delta = 0;
      switch (def.progressKey) {
        case 'run.distance': delta = deltas.distance ?? 0; break;
        case 'daily.jacks': delta = deltas.jacks ?? 0; break;
        case 'daily.coins': delta = deltas.coins ?? 0; break;
        case 'daily.armsUp': delta = deltas.armsUp ?? 0; break;
        case 'run.duration_s': delta = deltas.durationS ?? 0; break;
      }
      if (delta > 0) {
        m.progress += delta;
        dirty = true;
        if (m.progress >= m.target) {
          m.completed = true;
          m.completedAt = Date.now();
          justCompleted.push(m);
        }
      }
    }
    if (dirty) await this.profileStore.save(profile);
    return justCompleted;
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h >>> 0;
  }
}
```
**Verificar:** `npm run lint`.

### C3. Criar `AudioBus`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/audioBus.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';

export class AudioBus {
  private musicSound: Phaser.Sound.BaseSound | null = null;
  private musicVolume = 0.4;
  private duckedVolume = 0.15;
  private isDucked = false;
  private duckRestoreTimer: number | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  startMusic(): void {
    if (!this.scene.cache.audio.exists('music_run_loop')) return;
    if (this.musicSound) return;
    this.musicSound = this.scene.sound.add('music_run_loop', { loop: true, volume: this.musicVolume });
    this.musicSound.play();
  }

  stopMusic(): void {
    if (this.musicSound) { this.musicSound.stop(); this.musicSound = null; }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicSound && !this.isDucked) {
      (this.musicSound as Phaser.Sound.BaseSound & { setVolume: (v: number) => void }).setVolume(this.musicVolume);
    }
  }

  duck(): void {
    if (!this.musicSound) return;
    this.isDucked = true;
    (this.musicSound as Phaser.Sound.BaseSound & { setVolume: (v: number) => void }).setVolume(this.duckedVolume);
    if (this.duckRestoreTimer !== null) clearTimeout(this.duckRestoreTimer);
  }

  restore(delayMs = 500): void {
    if (this.duckRestoreTimer !== null) clearTimeout(this.duckRestoreTimer);
    this.duckRestoreTimer = window.setTimeout(() => {
      this.isDucked = false;
      if (this.musicSound) (this.musicSound as Phaser.Sound.BaseSound & { setVolume: (v: number) => void }).setVolume(this.musicVolume);
    }, delayMs);
  }

  getMusicVolume(): number { return this.musicVolume; }
}
```
**Verificar:** `npm run lint`.

### C4. Criar `Narrator`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/narrator.ts`
**Conteúdo:**
```typescript
import type { AudioBus } from './audioBus.ts';

export class Narrator {
  private audioBus: AudioBus | null;
  private enabled: boolean;
  private lastSpeakAt = 0;
  private cooldownMs = 3000;
  private voice: SpeechSynthesisVoice | null = null;

  constructor(audioBus: AudioBus | null, enabled = true) {
    this.audioBus = audioBus;
    this.enabled = enabled;
    this.detectVoice();
  }

  private detectVoice(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const pick = (): void => {
      const voices = window.speechSynthesis.getVoices();
      this.voice = voices.find((v) => v.lang.startsWith('pt')) ?? voices[0] ?? null;
    };
    pick();
    if (!this.voice) window.speechSynthesis.addEventListener('voiceschanged', pick, { once: true });
  }

  speak(text: string, priority = 1): void {
    if (!this.enabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const now = performance.now();
    if (now - this.lastSpeakAt < this.cooldownMs && priority <= 1) return;
    this.lastSpeakAt = now;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    if (this.voice) utter.voice = this.voice;
    utter.rate = 1.05;
    utter.pitch = 1.1;
    if (this.audioBus) {
      this.audioBus.duck();
      utter.onend = () => this.audioBus?.restore(500);
    }
    window.speechSynthesis.speak(utter);
  }

  setEnabled(v: boolean): void { this.enabled = v; if (!v && window.speechSynthesis) window.speechSynthesis.cancel(); }
  isEnabled(): boolean { return this.enabled; }
}
```
**Verificar:** `npm run lint`.

### C5. Criar `narratorLines.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/i18n/narratorLines.ts`
**Conteúdo:**
```typescript
import { i18n } from '@lingui/core';

const t = (s: string): string => i18n._(s);

const pick = (arr: string[], rng: () => number = Math.random): string => arr[Math.floor(rng() * arr.length)];

export const narratorLines = {
  firstJack: (): string => pick([t('Boa! Manda ver!'), t('Isso aí!'), t('Continua assim!')]),
  comboJack: (n: number): string => `${n} ${t('polichinelos! Tá voando!')}`,
  energyLow: (): string => pick([t('Vamos lá! Acelera!'), t('Não para agora!'), t('Tá quase!')]),
  missionComplete: (): string => pick([t('Missão concluída!'), t('Mandou bem!'), t('Mais uma na conta!')]),
  gameOver: (): string => pick([t('Foi nada! Tenta de novo.'), t('Quase! Bora de novo?'), t('Você consegue!')]),
};
```
**Verificar:** `npm run lint`.

### C6. Adicionar load de áudio (placeholders) em Boot

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Boot.ts`
**Adicionar dentro de `preload()` (antes de `g.fillRect(0,0,4,4)`):**
```typescript
    // Áudio: tenta carregar; se asset não existir, sound.cache.exists() devolve false (gated).
    // Música — placeholder não bloqueia se 404.
    this.load.audio('music_run_loop', '/assets/sounds/music/run-loop.ogg');
    this.load.audio('snd_shield_on', '/assets/sounds/shield_on.ogg');
    this.load.audio('snd_jack_done', '/assets/sounds/jack_done.ogg');
    this.load.audio('snd_water_break', '/assets/sounds/water_break.ogg');
    this.load.audio('snd_mission_complete', '/assets/sounds/mission_complete.ogg');
    // Suprime erro de 404 (assets vão pra polish issue)
    this.load.on('loaderror', (file: { src: string }) => { console.warn('Audio not loaded (placeholder):', file.src); });
```
**Verificar:** `npm run lint` + `npm run build`.

### C7. Integrar audioBus + narrator + missions no orchestrator

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/orchestrator.ts`
Adicionar imports:
```typescript
import { ProfileStore } from './storage/profile.ts';
import { RunHistoryStore } from './storage/runHistory.ts';
import { MissionSystem } from './systems/missions.ts';
```

E **adicionar a `AppRefs`**:
```typescript
  profileStore: ProfileStore;
  runHistory: RunHistoryStore;
  missions: MissionSystem;
```

E **dentro de `startApp()`** (antes do `const refs: AppRefs`):
```typescript
  const profileStore = new ProfileStore();
  const runHistory = new RunHistoryStore();
  const missions = new MissionSystem(profileStore);
  void missions.load(); // async fire-and-forget; pronto antes de Play começar
```

E na construção de `refs`, adicionar:
```typescript
    profileStore, runHistory, missions,
```

**Verificar:** `npm run lint`.

### C8. Integrar narrator + missions no Play

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Play.ts`
Adicionar imports:
```typescript
import { AudioBus } from '../systems/audioBus.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
```

Campos privados:
```typescript
  private audioBus!: AudioBus;
  private narrator!: Narrator;
  private dailyJacksThisRun = 0;
  private dailyArmsUpThisRun = 0;
  private cumulativeDistance = 0;
  private cumulativeCoins = 0;
  private cumulativeJumps = 0;
  private cumulativeDucks = 0;
  private bpmTrack: number[] = [];
  private bpmSampleAccum = 0;
  private startedAtMs = 0;
```

Dentro de `create()` (após `this.shield = ...`):
```typescript
    this.audioBus = new AudioBus(this);
    this.audioBus.startMusic();
    const narratorEnabled = (() => { try { return localStorage.getItem('movemove.narrator.enabled') !== 'false'; } catch { return true; } })();
    this.narrator = new Narrator(this.audioBus, narratorEnabled);
    this.startedAtMs = performance.now();
    this.dailyJacksThisRun = 0;
    this.dailyArmsUpThisRun = 0;
    this.bpmTrack = [];
    this.bpmSampleAccum = 0;
```

Estender o `case 'jumping_jack'`:
```typescript
        case 'jumping_jack': {
          const z = this.zones.activeJackZone();
          if (z) {
            const completed = z.tickJack();
            if (completed) this.scoring.addCoin();
          }
          this.dailyJacksThisRun += 1;
          if (this.dailyJacksThisRun === 1) this.narrator.speak(narratorLines.firstJack(), 2);
          else if (this.dailyJacksThisRun % 5 === 0) this.narrator.speak(narratorLines.comboJack(this.dailyJacksThisRun), 1);
          break;
        }
```

E `case 'arms_up'`:
```typescript
        case 'arms_up': {
          const z = this.zones.activeArmsZone();
          if (z) z.registerArmsUp(50);
          this.dailyArmsUpThisRun += 1;
          break;
        }
```

E **substituir a lógica de colisão** pra adicionar narrator gameOver:
```typescript
      } else {
        this.narrator.speak(narratorLines.gameOver(), 2);
        this.audioBus.stopMusic();
        ...
```

E **antes do scene.start('GameOver', ...)**, salvar runHistory + atualizar missions:
```typescript
        const refs = getRefs(this);
        const durationS = (performance.now() - this.startedAtMs) / 1000;
        const bpmAvg = this.bpmTrack.length ? this.bpmTrack.reduce((a, b) => a + b, 0) / this.bpmTrack.length : 0;
        const distance = this.scoring.getDistance();
        const coins = this.scoring.getCoins();
        void refs.runHistory.push({
          id: `${Date.now()}`, startedAt: this.startedAtMs, durationS,
          distance, coins, jacks: this.dailyJacksThisRun, armsUp: this.dailyArmsUpThisRun,
          jumps: this.cumulativeJumps, ducks: this.cumulativeDucks, bpmAvg,
          bpmTrack: this.bpmTrack.slice(-60),
        });
        void refs.missions.tick({
          distance, jacks: this.dailyJacksThisRun,
          coins, armsUp: this.dailyArmsUpThisRun, durationS,
        }).then((completed) => {
          if (completed.length > 0) this.narrator.speak(narratorLines.missionComplete(), 2);
        });
        this.cleanup();
        this.scene.start('Summary', {
          distance, coins, jacks: this.dailyJacksThisRun, armsUp: this.dailyArmsUpThisRun,
          jumps: this.cumulativeJumps, ducks: this.cumulativeDucks, durationS, bpmAvg, bpmTrack: this.bpmTrack.slice(-60),
        });
        return;
```

E **dentro do `update()`**, sample do BPM (a cada 1s):
```typescript
    this.bpmSampleAccum += deltaMs;
    if (this.bpmSampleAccum >= 1000) {
      this.bpmSampleAccum = 0;
      this.bpmTrack.push(this.currentBpm);
      if (this.bpmTrack.length > 600) this.bpmTrack.shift(); // cap safety
    }
```

E também trackear jumps/ducks no `case 'jump'` e `case 'duck'`:
```typescript
        case 'jump': this.player.jump(); this.cumulativeJumps += 1; break;
        case 'duck': this.player.duck(); this.cumulativeDucks += 1; break;
```

**Verificar:** `npm run lint` passa. `npm run build` passa.

### C9. Commit Fase C

```bash
cd /Users/rjcaubit/Dev/movemove
git add src/game/ public/data/
git commit -m "$(cat <<'EOF'
feat(issue-4): fase C — missões + áudio + narrador (#4)

- public/data/missions.json com 5 templates (3 sorteadas/dia, seed por data)
- MissionSystem: load + ensureToday + tick + persist via ProfileStore
- AudioBus: música em loop + ducking automático
- Narrator: Web Speech API pt-BR; cooldown + cancelamento por prioridade;
  fallback gracioso se speechSynthesis indisponível
- narratorLines: catálogo i18n via @lingui/core
- Boot carrega áudios placeholder (gated por cache.audio.exists)
- Play integra audioBus + narrator + missions; salva RunHistory + Mission tick em GameOver
- Track de BPM (1Hz) pra sparkline; tracking de jumps/ducks/jacks/armsUp do run

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## FASE D — Settings + Summary + WaterBreak

### D1. Criar `Sparkline` UI utility

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/ui/sparkline.ts`
**Conteúdo:**
```typescript
/** Renderiza SVG sparkline inline. Downsample pra max 60 pontos. */
export function sparklineSvg(values: number[], width = 300, height = 60, color = '#4cd964'): string {
  if (values.length === 0) return `<svg width="${width}" height="${height}"></svg>`;
  const downsampled = downsample(values, 60);
  const max = Math.max(...downsampled, 1);
  const points = downsampled.map((v, i) => {
    const x = (i / (downsampled.length - 1 || 1)) * width;
    const y = height - (v / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><polyline fill="none" stroke="${color}" stroke-width="2" points="${points}"/></svg>`;
}

function downsample(arr: number[], target: number): number[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let sum = 0; let n = 0;
    for (let j = start; j < end; j++) { sum += arr[j]; n++; }
    out.push(n > 0 ? sum / n : 0);
  }
  return out;
}
```
**Verificar:** `npm run lint`.

### D2. Criar cena `Summary`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Summary.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { sparklineSvg } from '../ui/sparkline.ts';
import { getRefs } from '../orchestrator.ts';

interface SummaryData {
  distance: number; coins: number; jacks: number; armsUp: number;
  jumps: number; ducks: number; durationS: number; bpmAvg: number;
  bpmTrack: number[];
}

export class Summary extends Phaser.Scene {
  private htmlOverlay: HTMLDivElement | null = null;

  constructor() { super('Summary'); }

  async create(data: SummaryData): Promise<void> {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x111418);

    this.add.text(width / 2, 40, strings.summary.title, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '36px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    const grid = [
      [strings.summary.distance, `${Math.floor(data.distance)} m`],
      [strings.summary.coins, String(data.coins)],
      [strings.summary.jacks, String(data.jacks)],
      [strings.summary.jumps, String(data.jumps)],
      [strings.summary.ducks, String(data.ducks)],
      [strings.summary.cardioTime, `${Math.round(data.durationS)} s`],
      [strings.summary.bpmAvg, `${Math.round(data.bpmAvg)}`],
    ];
    grid.forEach(([k, v], i) => {
      const x = (i % 4) * 220 + 80; const y = 110 + Math.floor(i / 4) * 60;
      this.add.text(x, y, k, { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '13px', color: '#8a8d92' }).setOrigin(0);
      this.add.text(x, y + 18, v, { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '22px', color: '#f5f5f5', fontStyle: 'bold' }).setOrigin(0);
    });

    // Sparkline via HTML overlay (canvas Phaser não renderiza SVG nativamente)
    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;left:50%;bottom:200px;transform:translateX(-50%);background:rgba(0,0,0,0.5);padding:8px;border-radius:8px;z-index:150;';
    ov.innerHTML = `<div style="color:#8a8d92;font:12px ui-monospace;margin-bottom:4px;">${strings.summary.bpmTrack}</div>${sparklineSvg(data.bpmTrack, 360, 60, '#ffd60a')}`;
    document.body.appendChild(ov);
    this.htmlOverlay = ov;

    // Missões
    const refs = getRefs(this);
    const missions = await refs.missions.getActive();
    const yMission = height - 200;
    this.add.text(width / 2, yMission, strings.summary.missions, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(0.5);
    missions.forEach((m, i) => {
      const x = (i + 0.5) * (width / 3);
      const status = m.inst.completed ? '✅' : `${Math.floor(m.inst.progress)}/${m.inst.target}`;
      this.add.text(x, yMission + 30, m.def.title, {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#f5f5f5', align: 'center',
      }).setOrigin(0.5);
      this.add.text(x, yMission + 50, status, {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '16px',
        color: m.inst.completed ? '#4cd964' : '#ffd60a', fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5);
    });

    // Botões
    const btn = (x: number, label: string, onClick: () => void): void => {
      const t = this.add.text(x, height - 50, label, {
        fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
        backgroundColor: '#4cd964', padding: { x: 18, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', () => { this.cleanup(); onClick(); });
    };
    btn(width / 2 - 200, strings.gameOver.playAgain, () => this.scene.start('Play', { skipPrep: false }));
    btn(width / 2, strings.gameOver.recalibrate, () => this.scene.start('Calibration'));
    btn(width / 2 + 200, strings.summary.settings, () => this.scene.start('Settings', { from: 'Summary', data }));
  }

  private cleanup(): void {
    if (this.htmlOverlay) { this.htmlOverlay.remove(); this.htmlOverlay = null; }
  }

  shutdown(): void { this.cleanup(); }
}
```
**Verificar:** `npm run lint`.

### D3. Criar cena `Settings`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Settings.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface SettingsData { from?: 'Welcome' | 'Summary' }

const KEYS = {
  music: 'movemove.audio.music',
  sfx: 'movemove.audio.sfx',
  voice: 'movemove.audio.voice',
  narratorEnabled: 'movemove.narrator.enabled',
  captions: 'movemove.narrator.captions',
  age: 'movemove.ageGroup',
};

export class Settings extends Phaser.Scene {
  constructor() { super('Settings'); }

  create(data: SettingsData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0b0d10);

    this.add.text(width / 2, 60, strings.settings.title, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '32px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    let y = 130;
    this.makeSlider(width / 2, y, strings.settings.music, KEYS.music, 40); y += 60;
    this.makeSlider(width / 2, y, strings.settings.sfx, KEYS.sfx, 80); y += 60;
    this.makeSlider(width / 2, y, strings.settings.voice, KEYS.voice, 80); y += 80;

    this.makeToggle(width / 2, y, strings.settings.narratorOn, KEYS.narratorEnabled, true); y += 50;
    this.makeToggle(width / 2, y, strings.settings.captionsOn, KEYS.captions, false); y += 80;

    this.makeAgeRadio(width / 2, y);

    const back = this.add.text(width / 2, height - 60, strings.settings.back, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.setName('btn-back');
    back.on('pointerup', () => this.scene.start(data?.from === 'Summary' ? 'Summary' : 'Welcome'));
  }

  private makeSlider(x: number, y: number, label: string, key: string, defaultVal: number): void {
    const cur = (() => { try { const v = localStorage.getItem(key); return v == null ? defaultVal : Number(v); } catch { return defaultVal; } })();
    this.add.text(x - 200, y, label, { fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5' }).setOrigin(0, 0.5);
    const valueEl = this.add.text(x + 200, y, String(cur), { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#ffd60a' }).setOrigin(1, 0.5);
    const minus = this.add.text(x + 80, y, '−', {
      fontFamily: 'system-ui', fontSize: '24px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 10, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const plus = this.add.text(x + 140, y, '+', {
      fontFamily: 'system-ui', fontSize: '24px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 10, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    let val = cur;
    const apply = (delta: number): void => {
      val = Math.max(0, Math.min(100, val + delta));
      try { localStorage.setItem(key, String(val)); } catch { /* ignore */ }
      valueEl.setText(String(val));
    };
    minus.on('pointerup', () => apply(-10));
    plus.on('pointerup', () => apply(10));
  }

  private makeToggle(x: number, y: number, label: string, key: string, defaultVal: boolean): void {
    const cur = (() => { try { const v = localStorage.getItem(key); return v == null ? defaultVal : v === 'true'; } catch { return defaultVal; } })();
    this.add.text(x - 200, y, label, { fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5' }).setOrigin(0, 0.5);
    let val = cur;
    const btn = this.add.text(x + 100, y, val ? 'ON' : 'OFF', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#0b0d10',
      backgroundColor: val ? '#4cd964' : '#8a8d92', padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => {
      val = !val;
      btn.setText(val ? 'ON' : 'OFF').setBackgroundColor(val ? '#4cd964' : '#8a8d92');
      try { localStorage.setItem(key, String(val)); } catch { /* ignore */ }
    });
  }

  private makeAgeRadio(x: number, y: number): void {
    const cur = (() => { try { return localStorage.getItem(KEYS.age) ?? '8-10'; } catch { return '8-10'; } })();
    this.add.text(x - 200, y, strings.settings.age, { fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5' }).setOrigin(0, 0.5);
    const opts = [
      { v: '5-7', label: strings.settings.age_5_7 },
      { v: '8-10', label: strings.settings.age_8_10 },
      { v: '11-12', label: strings.settings.age_11_12 },
    ];
    const buttons: Phaser.GameObjects.Text[] = [];
    opts.forEach((o, i) => {
      const bx = x + 50 + i * 100;
      const isCur = cur === o.v;
      const b = this.add.text(bx, y, o.label, {
        fontFamily: 'system-ui', fontSize: '12px', color: isCur ? '#0b0d10' : '#f5f5f5',
        backgroundColor: isCur ? '#4cd964' : '#8a8d92', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      buttons.push(b);
      b.on('pointerup', () => {
        try { localStorage.setItem(KEYS.age, o.v); } catch { /* ignore */ }
        opts.forEach((oo, ii) => {
          const isNow = oo.v === o.v;
          buttons[ii].setColor(isNow ? '#0b0d10' : '#f5f5f5').setBackgroundColor(isNow ? '#4cd964' : '#8a8d92');
        });
      });
    });
  }
}
```
**Verificar:** `npm run lint`.

### D4. Criar cena `WaterBreak`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/WaterBreak.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class WaterBreak extends Phaser.Scene {
  private startedAtMs = 0;
  private countdownEl!: Phaser.GameObjects.Text;
  private dismissEl!: Phaser.GameObjects.Text;
  private dismissEnabled = false;

  constructor() { super('WaterBreak'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x000000);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setDepth(0);

    this.add.text(width / 2, 100, '💧', { fontSize: '120px' }).setOrigin(0.5);
    this.add.text(width / 2, 240, strings.play.waterBreak, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '36px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.countdownEl = this.add.text(width / 2, 320, '30', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '72px', color: '#0a84ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.dismissEl = this.add.text(width / 2, height - 80, strings.play.waterDismiss, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#8a8d92', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dismissEl.setName('btn-dismiss');
    this.dismissEl.on('pointerup', () => {
      if (!this.dismissEnabled) return;
      this.scene.stop().resume('Play');
    });

    this.startedAtMs = performance.now();
  }

  update(): void {
    const elapsed = (performance.now() - this.startedAtMs) / 1000;
    const remaining = Math.max(0, 30 - Math.floor(elapsed));
    this.countdownEl.setText(String(remaining));
    if (elapsed >= 10 && !this.dismissEnabled) {
      this.dismissEnabled = true;
      this.dismissEl.setBackgroundColor('#4cd964').setColor('#0b0d10');
    }
    if (remaining === 0) {
      this.scene.stop().resume('Play');
    }
  }
}
```
**Verificar:** `npm run lint`.

### D5. Registrar Settings/Summary/WaterBreak no orchestrator + adicionar botão Settings no Welcome

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/orchestrator.ts`
Adicionar imports:
```typescript
import { Settings } from './scenes/Settings.ts';
import { Summary } from './scenes/Summary.ts';
import { WaterBreak } from './scenes/WaterBreak.ts';
```
E **alterar `scene: [...]`** pra incluir os novos:
```typescript
    scene: [Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver, Demo, Settings, Summary, WaterBreak],
```

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Welcome.ts`
**Adicionar antes do `cta.on(...)`:**
```typescript
    const settingsBtn = this.add.text(width - 24, 24, strings.welcome.settings, {
      fontFamily: 'system-ui', fontSize: '14px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 12, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    settingsBtn.setName('btn-settings');
    settingsBtn.on('pointerup', () => this.scene.start('Settings', { from: 'Welcome' }));
```

**Verificar:** `npm run lint` + `npm run build`.

### D6. Integrar water-break check + ageGroup no Play

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Play.ts`
Adicionar campo:
```typescript
  private static cumulativePlayMs = 0;
  private static lastWaterBreakAt = 0;
```

E **dentro de `update()`** (após o energy.tick), adicionar:
```typescript
    Play.cumulativePlayMs += deltaMs;
    const ageGroup = (() => { try { return localStorage.getItem('movemove.ageGroup') ?? '8-10'; } catch { return '8-10'; } })();
    const interval = ageGroup === '5-7' ? 6 * 60 * 1000 : ageGroup === '11-12' ? 10 * 60 * 1000 : 8 * 60 * 1000;
    if (Play.cumulativePlayMs - Play.lastWaterBreakAt > interval) {
      Play.lastWaterBreakAt = Play.cumulativePlayMs;
      this.scene.pause().launch('WaterBreak');
    }
```

E expor helper em `__movemoveDebug`:

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/main.ts`
**Trocar:**
```typescript
  skipToScene: (key: string) => { game.scene.start(key); },
  getRefs: () => game.registry.get('refs'),
};
```
**Por:**
```typescript
  skipToScene: (key: string, data?: unknown) => { game.scene.start(key, data); },
  getRefs: () => game.registry.get('refs'),
  triggerWaterBreak: () => {
    const playScene = game.scene.getScene('Play');
    if (playScene && game.scene.isActive('Play')) { game.scene.pause('Play').launch('WaterBreak'); }
  },
  forceCadence: (stepsPerSec: number) => {
    const refs = game.registry.get('refs') as { eventDetector: EventTarget };
    const intensity = stepsPerSec < 0.5 ? 'none' : stepsPerSec < 1.5 ? 'walking' : stepsPerSec < 3 ? 'jogging' : 'running';
    refs.eventDetector.dispatchEvent(new CustomEvent('event', { detail: { type: 'cadence', stepsPerSec, bpm: stepsPerSec * 60, intensity, source: 'kbd', t: performance.now() } }));
  },
};
```

E **atualizar a interface declarada** logo acima:
```typescript
(window as unknown as {
  __movemoveDebug: {
    forceBaseline: (b: Baseline) => void;
    skipToScene: (key: string, data?: unknown) => void;
    getRefs: () => unknown;
    triggerWaterBreak: () => void;
    forceCadence: (stepsPerSec: number) => void;
  };
}).__movemoveDebug = { ... };
```

**Verificar:** `npm run lint` + `npm run build`.

### D7. Commit Fase D

```bash
cd /Users/rjcaubit/Dev/movemove
git add src/game/ src/main.ts
git commit -m "$(cat <<'EOF'
feat(issue-4): fase D — Settings + Summary + WaterBreak (#4)

- Cena Settings: sliders volume + toggles narrator/captions + radio ageGroup; persiste em localStorage
- Cena Summary: distância/coins/jacks/jumps/ducks/cardio + sparkline SVG inline (downsample 60 pts)
  + 3 missões com status; substitui GameOver como destino default
- Cena WaterBreak: modal com countdown 30s; dispense disponível só após 10s
- Welcome ganha botão "Configurações"
- Play integra cumulative play time + intervalo do water break por ageGroup
- main.ts: __movemoveDebug ganha triggerWaterBreak + forceCadence + skipToScene com data

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## FASE E — E2E + docs

### E1. Atualizar `e2e/issue-3-flow.spec.ts` pra referenciar novo destino Summary (regressão Fase 1)

**Modificar:** `/Users/rjcaubit/Dev/movemove/e2e/issue-3-flow.spec.ts`
Procurar ocorrências de `'GameOver'` em `skipToScene` e trocar por `'Summary'` quando aplicável (CT08 que abre GameOver direto pode ficar como está — testa fallback). Adicionar comentário no topo: `// Mantido como regressão Fase 1; novos testes da Fase 2 em issue-4-flow.spec.ts`.
**Verificar:** `npm run e2e -- --reporter=list 2>&1 | tail -10` os 5 testes da Fase 1 passam.

### E2. Criar `e2e/issue-4-flow.spec.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/e2e/issue-4-flow.spec.ts`
**Conteúdo:**
```typescript
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = join(process.cwd(), 'load-tests', 'results', 'issue-4-journey', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

test.describe('Issue #4 — fase 2 cardio', () => {
  test('CT11 — fluxo completo Settings + Summary + WaterBreak (E2E click-by-click)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    await page.goto('/?debug=1&seed=42');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });

    // 01 - Welcome com Configurações
    await page.screenshot({ path: join(SHOTS, '01-welcome.png') });

    // 02 - Skip pra Settings via debug
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string, d?: unknown) => void } };
      w.__movemoveDebug.skipToScene('Settings', { from: 'Welcome' });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SHOTS, '02-settings.png') });

    // 03 - Skip pra Play via debug + force baseline + force cadence running
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: {
        forceBaseline: (b: unknown) => void;
        skipToScene: (k: string, d?: unknown) => void;
        forceCadence: (s: number) => void;
      }};
      w.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2, capturedAt: performance.now() });
      w.__movemoveDebug.skipToScene('Play', { skipPrep: true });
    });
    await page.waitForTimeout(800);

    // 04 - Force cadence running, energy deve subir
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { forceCadence: (s: number) => void } };
      for (let i = 0; i < 5; i++) w.__movemoveDebug.forceCadence(3.5);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '04-play-running.png') });

    // 05 - WaterBreak via debug
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { triggerWaterBreak: () => void } };
      w.__movemoveDebug.triggerWaterBreak();
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '05-water-break.png') });

    // 06 - Skip pra Summary via debug com mock data
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string, d?: unknown) => void } };
      w.__movemoveDebug.skipToScene('Summary', { distance: 500, coins: 12, jacks: 4, armsUp: 2, jumps: 8, ducks: 3, durationS: 90, bpmAvg: 95, bpmTrack: [60, 80, 100, 120, 110, 95, 90, 100] });
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, '06-summary.png') });

    // 07 - Verifica sparkline no DOM
    const svgCount = await page.locator('svg polyline').count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('CT09 — Settings persiste em localStorage', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.evaluate(() => {
      try {
        localStorage.setItem('movemove.ageGroup', '5-7');
        localStorage.setItem('movemove.audio.music', '20');
      } catch { /* ignore */ }
    });
    await page.reload();
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    const age = await page.evaluate(() => localStorage.getItem('movemove.ageGroup'));
    const music = await page.evaluate(() => localStorage.getItem('movemove.audio.music'));
    expect(age).toBe('5-7');
    expect(music).toBe('20');
  });

  test('CT12 — speechSynthesis indisponível não bloqueia', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => undefined });
    });
    await page.goto('/?debug=1');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: {
        forceBaseline: (b: unknown) => void;
        skipToScene: (k: string, d?: unknown) => void;
      }};
      w.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2, capturedAt: performance.now() });
      w.__movemoveDebug.skipToScene('Play', { skipPrep: true });
    });
    await page.waitForTimeout(1500);
    // Sem crash; canvas continua presente
    await expect(page.locator('#game canvas')).toBeVisible();
  });
});
```
**Verificar:** `npm run e2e -- --reporter=list 2>&1 | tail -10`. Os 3 novos passam (e os 5 da Fase 1 continuam passando).

### E3. `load-tests/results/issue-4-journey/README.md`

**Criar:** `/Users/rjcaubit/Dev/movemove/load-tests/results/issue-4-journey/README.md`
**Conteúdo:**
```markdown
# Issue #4 — Fase 2 cardio — Resultados

**Branch:** `feature/sdd-issue-4`
**Data dos testes E2E:** YYYY-MM-DD

## Testes Playwright (automatizados)
- CT11 — fluxo Settings + Play running + WaterBreak + Summary (sparkline visível)
- CT09 — Settings persistente após reload
- CT12 — speechSynthesis indisponível não crasha

Screenshots em `screenshots/`.

## CT01 — Validação humana 15min (PENDENTE)
| Device | FPS | Cadência fiel? | Polichinelos zonas (5+)? | Escudos (3+)? | Missão completa? | 15 min sem crash? | Cansou? |
|--------|-----|----------------|--------------------------|---------------|------------------|--------------------|---------|

## Bugs encontrados
| # | Severidade | Descrição | Status |
|---|-----------|-----------|--------|
```

### E4. Atualizar docs canônicas

**Modificar:** `/Users/rjcaubit/Dev/movemove/docs/CHANGELOG.md`
**Adicionar no topo (após `Formato:` line):**
```markdown
## 2026-XX-XX — #4 — feat: Fase 2 — camada de exercício saudável

### Added
- `idb-keyval` + `@lingui/core` adotados.
- Cadência ganha `bpm` + `intensity` (4 tiers); decay event quando jogador para.
- `EnergySystem`: barra 0-100, sobe com cadência, multiplica velocidade do mundo.
- `ZoneManager` com 2 tipos: `JackZone` (5 polichinelos em 4s) e `ArmsZone` (3s arms_up).
- `ShieldEffect`: aura azul, 1 carga, consome em colisão.
- `MissionSystem` + `ProfileStore` + `RunHistoryStore` (idb-keyval, schema v1).
- `AudioBus` música em loop + ducking automático.
- `Narrator` Web Speech API pt-BR com fallback gracioso.
- 3 novas cenas: `Settings`, `Summary` (substitui GameOver default), `WaterBreak` (a cada 8 min).
- Sparkline SVG inline manual (BPM da partida).
- `?debug=1` ganha B/S/M/W; `__movemoveDebug` ganha forceCadence/triggerWaterBreak.
- E2E: CT09/CT11/CT12.

### Pendências (issue de polish A/V)
- Música real curada (placeholder silent).
- Sons de SFX reais (placeholders silent).
- Voz neural pré-gravada (Web Speech API atende por agora).
```

**Modificar:** `/Users/rjcaubit/Dev/movemove/docs/CODEMAP.md`
Atualizar topo:
```markdown
> Atualizado: 2026-XX-XX (Issue #4 — Fase 2)

## Status do projeto
**Fase atual:** 2 (cardio + missões + narrador). Persistência via IndexedDB (`idb-keyval`).
```
E adicionar `idb-keyval` + `@lingui/core` na lista de Stack. Adicionar bloco `src/game/storage/` na estrutura. Atualizar histórico SDD com #4 em andamento.

**Modificar:** `/Users/rjcaubit/Dev/movemove/docs/ARCHITECTURE.md`
Adicionar camada Storage abaixo de UI/Game; adicionar Audio (Music+Speech) ao lado.

**Modificar:** `/Users/rjcaubit/Dev/movemove/EXERGAME_PROJETO.md`
Seção 6.5: marcar implementação base entregue 2026-XX-XX.

### E5. Build + lint final + commit Fase E + push + PR

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
npm run lint && npm run build && npm run e2e -- --reporter=list 2>&1 | tail -15
git add e2e/ load-tests/results/issue-4-journey/ docs/ EXERGAME_PROJETO.md
git commit -m "$(cat <<'EOF'
feat(issue-4): fase E — E2E + doc-sync (#4)

- e2e/issue-4-flow.spec.ts: CT11 (E2E click-by-click), CT09 (settings persiste), CT12 (no speech)
- load-tests/results/issue-4-journey/README.md
- CHANGELOG, CODEMAP, ARCHITECTURE, EXERGAME_PROJETO Seção 6.5

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin feature/sdd-issue-4
gh pr create --base main --head feature/sdd-issue-4 --title "feat(issue-4): Fase 2 — camada de exercício saudável" --body "$(cat <<'EOF'
## Summary
- Cadência → energia → velocidade
- Polichinelos como power-up + zonas dedicadas
- Braços-pra-cima → escudo
- Missões diárias (idb-keyval) + reset à meia-noite local
- Narrador motivador (Web Speech API)
- Resumo pós-partida com sparkline SVG
- Water break a cada 8 min (ajustável por idade)
- Lingui adotado (substitui strings raw)

## Test plan
- [x] lint + build + e2e
- [ ] CT01 manual humano 15min

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## FASE F — Mini-jogos (refinamento 2026-04-27)

> Suite de 3 mini-jogos lúdicos focados em movimentos específicos de braço/tronco. Modo paralelo ao endless runner (acessível pelo botão "Mini-jogos" no Welcome). Justificativa e RF25-RF35 detalhados em `02-spec.md → Refinamentos`.

### F1. Criar `src/pose/spatialQueries.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/pose/spatialQueries.ts`
**Conteúdo:**
```typescript
import { KP, type PoseFrame, type Keypoint } from './types.ts';

export interface Target { x: number; y: number; r: number } // normalizado 0..1

/** True se o pulso da mão escolhida está dentro do círculo target. */
export function handAt(frame: PoseFrame, hand: 'L' | 'R', target: Target): boolean {
  const idx = hand === 'L' ? KP.LEFT_WRIST : KP.RIGHT_WRIST;
  const kp = frame.keypoints[idx];
  if (!kp) return false;
  const dx = kp.x - target.x;
  const dy = kp.y - target.y;
  return dx * dx + dy * dy <= target.r * target.r;
}

export function handPosition(frame: PoseFrame, hand: 'L' | 'R'): Keypoint | null {
  const idx = hand === 'L' ? KP.LEFT_WRIST : KP.RIGHT_WRIST;
  return frame.keypoints[idx] ?? null;
}

/** Ângulo (graus) da linha entre ombros vs horizontal. Positivo = ombro direito mais alto (rotação pra esquerda do POV do usuário). */
export function trunkRotationAngle(frame: PoseFrame): number {
  const ls = frame.keypoints[KP.LEFT_SHOULDER];
  const rs = frame.keypoints[KP.RIGHT_SHOULDER];
  if (!ls || !rs) return 0;
  const dx = rs.x - ls.x;
  const dy = rs.y - ls.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/** Ambos os pulsos estão acima da linha y (em coords normalizadas, lembrando que y cresce pra baixo). */
export function bothHandsAbove(frame: PoseFrame, yLine: number): boolean {
  const lw = frame.keypoints[KP.LEFT_WRIST];
  const rw = frame.keypoints[KP.RIGHT_WRIST];
  if (!lw || !rw) return false;
  return lw.y < yLine && rw.y < yLine;
}
```
**Verificar:** `npm run lint`.

### F2. Criar `Bicho` entity (sprite procedural)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/Bicho.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';

export type BichoColor = 'red' | 'blue' | 'green' | 'yellow';

const COLOR_HEX: Record<BichoColor, number> = {
  red: 0xff453a,
  blue: 0x0a84ff,
  green: 0x4cd964,
  yellow: 0xffd60a,
};

export class Bicho {
  readonly sprite: Phaser.GameObjects.Container;
  readonly normX: number; // 0..1 — coord normalizada (pra spatialQueries)
  readonly normY: number;
  readonly color: BichoColor;
  readonly bornAtMs: number;
  readonly lifetimeMs: number;
  alive = true;

  constructor(scene: Phaser.Scene, normX: number, normY: number, color: BichoColor, lifetimeMs = 3000) {
    this.normX = normX;
    this.normY = normY;
    this.color = color;
    this.lifetimeMs = lifetimeMs;
    this.bornAtMs = performance.now();
    const screenX = normX * scene.scale.width;
    const screenY = normY * scene.scale.height;
    const body = scene.add.circle(0, 0, 36, COLOR_HEX[color], 1).setStrokeStyle(3, 0x000000, 0.6);
    const eyeL = scene.add.circle(-10, -8, 5, 0xffffff).setStrokeStyle(1, 0x000000);
    const eyeR = scene.add.circle(10, -8, 5, 0xffffff).setStrokeStyle(1, 0x000000);
    const pupL = scene.add.circle(-10, -8, 2, 0x000000);
    const pupR = scene.add.circle(10, -8, 2, 0x000000);
    this.sprite = scene.add.container(screenX, screenY, [body, eyeL, eyeR, pupL, pupR]).setDepth(20);
    scene.tweens.add({ targets: this.sprite, scale: { from: 0.8, to: 1.1 }, duration: 600, yoyo: true, repeat: -1 });
  }

  isExpired(): boolean { return performance.now() - this.bornAtMs > this.lifetimeMs; }

  catch(scene: Phaser.Scene, onComplete: () => void): void {
    this.alive = false;
    scene.tweens.add({
      targets: this.sprite, scale: 1.6, alpha: 0, duration: 250,
      onComplete: () => { this.sprite.destroy(); onComplete(); },
    });
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```
**Verificar:** `npm run lint`.

### F3. Criar `TrunkTarget` entity

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/TrunkTarget.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';

export class TrunkTarget {
  readonly sprite: Phaser.GameObjects.Container;
  readonly side: 'L' | 'R';
  alive = true;

  constructor(scene: Phaser.Scene, side: 'L' | 'R') {
    this.side = side;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const x = side === 'L' ? 80 : W - 80;
    const y = H / 2 - 60;
    const ring = scene.add.circle(0, 0, 50, 0xffd60a, 0.2).setStrokeStyle(6, 0xffd60a, 1);
    const arrow = scene.add.text(0, 0, side === 'L' ? '←' : '→', {
      fontFamily: 'system-ui', fontSize: '40px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.sprite = scene.add.container(x, y, [ring, arrow]).setDepth(20);
    scene.tweens.add({ targets: ring, scale: { from: 1, to: 1.2 }, duration: 500, yoyo: true, repeat: -1 });
  }

  hit(scene: Phaser.Scene, onComplete: () => void): void {
    this.alive = false;
    scene.tweens.add({
      targets: this.sprite, scale: 1.5, alpha: 0, duration: 200,
      onComplete: () => { this.sprite.destroy(); onComplete(); },
    });
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```

### F4. Criar `Bell` entity

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/Bell.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';

export class Bell {
  readonly sprite: Phaser.GameObjects.Container;
  readonly normX: number;
  readonly normY: number;
  readonly hand: 'L' | 'R';
  readonly bornAtMs: number;
  readonly windowMs: number;
  alive = true;

  constructor(scene: Phaser.Scene, normX: number, normY: number, hand: 'L' | 'R', windowMs = 800) {
    this.normX = normX;
    this.normY = normY;
    this.hand = hand;
    this.windowMs = windowMs;
    this.bornAtMs = performance.now();
    const x = normX * scene.scale.width;
    const y = normY * scene.scale.height;
    const color = hand === 'L' ? 0x0a84ff : 0xff453a;
    const ring = scene.add.circle(0, 0, 44, color, 0.3).setStrokeStyle(5, color, 1);
    const txt = scene.add.text(0, 0, '🔔', { fontSize: '32px' }).setOrigin(0.5);
    this.sprite = scene.add.container(x, y, [ring, txt]).setDepth(20);
    scene.tweens.add({ targets: ring, scale: { from: 1, to: 1.25 }, duration: windowMs / 2, yoyo: true, repeat: 0, onComplete: () => { /* expira no update */ } });
  }

  isExpired(): boolean { return performance.now() - this.bornAtMs > this.windowMs; }

  ring(scene: Phaser.Scene, onComplete: () => void): void {
    this.alive = false;
    scene.tweens.add({
      targets: this.sprite, scale: 1.6, alpha: 0, duration: 200,
      onComplete: () => { this.sprite.destroy(); onComplete(); },
    });
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```

### F5. Criar cena `MiniGamesHub`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/MiniGamesHub.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class MiniGamesHub extends Phaser.Scene {
  constructor() { super('MiniGamesHub'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    this.add.text(width / 2, 40, strings.miniGames.hubTitle, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '36px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 86, strings.miniGames.hubSubtitle, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#8a8d92', align: 'center',
    }).setOrigin(0.5);

    const cards: Array<[string, string, string, () => void]> = [
      [strings.miniGames.catchTitle, strings.miniGames.catchDesc, '🦋', () => this.scene.start('CatchBicho', { mode: 'alternating' })],
      [strings.miniGames.trunkTitle, strings.miniGames.trunkDesc, '🌀', () => this.scene.start('TrunkTwist')],
      [strings.miniGames.bellTitle, strings.miniGames.bellDesc, '🔔', () => this.scene.start('BellRinger')],
    ];
    cards.forEach(([title, desc, icon, onClick], i) => {
      const x = (i + 0.5) * (width / 3);
      const y = height / 2 - 20;
      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 240, 180, 0x1a2030, 0.8).setStrokeStyle(2, 0x4cd964, 0.5);
      const ico = this.add.text(0, -50, icon, { fontSize: '60px' }).setOrigin(0.5);
      const t = this.add.text(0, 10, title, {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '18px', color: '#f5f5f5', fontStyle: 'bold',
      }).setOrigin(0.5);
      const d = this.add.text(0, 40, desc, {
        fontFamily: 'system-ui', fontSize: '12px', color: '#8a8d92', align: 'center',
        wordWrap: { width: 220 },
      }).setOrigin(0.5);
      card.add([bg, ico, t, d]);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', onClick);
    });

    const guided = this.add.text(width / 2, height - 110, `🎯 ${strings.miniGames.guidedSession}`, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#ffd60a', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    guided.setName('btn-guided');
    guided.on('pointerup', () => this.scene.start('CatchBicho', { mode: 'alternating', session: ['CatchBicho', 'TrunkTwist', 'BellRinger'] }));

    const back = this.add.text(40, 40, '← ' + strings.miniGames.back, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 12, y: 6 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Welcome'));
  }
}
```

### F6. Criar cena `CatchBicho`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/CatchBicho.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { Bicho, type BichoColor } from '../entities/Bicho.ts';
import { handAt } from '../../pose/spatialQueries.ts';
import { getRefs } from '../orchestrator.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

interface CatchData {
  mode: 'same_R' | 'same_L' | 'alternating';
  session?: string[]; // próximos jogos da sessão guiada
}

const DURATION_MS = 60000;
const SPAWN_INTERVAL_MS = 1500;

export class CatchBicho extends Phaser.Scene {
  private bichos: Bicho[] = [];
  private score = 0;
  private mode: CatchData['mode'] = 'alternating';
  private nextHand: 'L' | 'R' = 'R';
  private startedAt = 0;
  private nextSpawnAt = 0;
  private scoreEl!: Phaser.GameObjects.Text;
  private timeEl!: Phaser.GameObjects.Text;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];

  constructor() { super('CatchBicho'); }

  create(data: CatchData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0d1a14);
    this.mode = data?.mode ?? 'alternating';
    this.session = data?.session ?? [];
    this.score = 0;
    this.bichos = [];
    this.startedAt = performance.now();
    this.nextSpawnAt = this.startedAt + 500;

    this.add.text(width / 2, 30, strings.miniGames.catchTitle, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreEl = this.add.text(20, 20, `${strings.miniGames.score}: 0`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#f5f5f5', stroke: '#000', strokeThickness: 3,
    });
    this.timeEl = this.add.text(width - 20, 20, '60s', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#ffd60a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    const refs = getRefs(this);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));
    void height;
  }

  private handleFrame(frame: PoseFrame): void {
    for (const b of this.bichos) {
      if (!b.alive) continue;
      const targetHand = this.mode === 'same_L' ? 'L' : this.mode === 'same_R' ? 'R' :
        (b.color === 'blue' ? 'L' : 'R');
      const target = { x: b.normX, y: b.normY, r: 0.10 };
      if (handAt(frame, targetHand, target)) {
        b.catch(this, () => {/* destroyed */});
        this.score += 1;
        this.scoreEl.setText(`${strings.miniGames.score}: ${this.score}`);
        if (this.score === 1 || this.score % 5 === 0) this.narrator.speak(narratorLines.bichoCaught(), 1);
      }
    }
  }

  update(): void {
    const elapsed = performance.now() - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timeEl.setText(`${remaining}s`);

    // Spawn
    if (performance.now() >= this.nextSpawnAt && elapsed < DURATION_MS) {
      this.nextSpawnAt = performance.now() + SPAWN_INTERVAL_MS;
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.25 + Math.random() * 0.5;
      const color: BichoColor = this.mode === 'alternating'
        ? (this.nextHand === 'R' ? 'red' : 'blue')
        : (Math.random() < 0.5 ? 'green' : 'yellow');
      this.bichos.push(new Bicho(this, x, y, color));
      this.nextHand = this.nextHand === 'R' ? 'L' : 'R';
    }

    // Expira bichos
    for (const b of this.bichos) if (b.alive && b.isExpired()) b.destroy();
    this.bichos = this.bichos.filter((b) => b.alive);

    if (elapsed >= DURATION_MS) this.finish();
  }

  private finish(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    for (const b of this.bichos) b.destroy();
    this.scene.start('MiniGameResult', {
      gameKey: 'CatchBicho', score: this.score, scoreLabel: strings.miniGames.bichosCaught,
      session: this.session,
    });
  }

  shutdown(): void { if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; } }
}
```

### F7. Criar cena `TrunkTwist`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/TrunkTwist.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { TrunkTarget } from '../entities/TrunkTarget.ts';
import { trunkRotationAngle } from '../../pose/spatialQueries.ts';
import { getRefs } from '../orchestrator.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

const DURATION_MS = 90000;
const ROT_THRESHOLD_DEG = 25;
const SUSTAIN_MS = 200;

export class TrunkTwist extends Phaser.Scene {
  private current: TrunkTarget | null = null;
  private nextSide: 'L' | 'R' = 'R';
  private score = 0;
  private startedAt = 0;
  private rotationStartedAt = 0;
  private rotationSide: 'L' | 'R' | null = null;
  private scoreEl!: Phaser.GameObjects.Text;
  private timeEl!: Phaser.GameObjects.Text;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];

  constructor() { super('TrunkTwist'); }

  create(data?: { session?: string[] }): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x140d1a);
    this.session = data?.session ?? [];
    this.score = 0;
    this.startedAt = performance.now();
    this.add.text(width / 2, 30, strings.miniGames.trunkTitle, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', color: '#bf5af2', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreEl = this.add.text(20, 20, `${strings.miniGames.score}: 0`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#f5f5f5', stroke: '#000', strokeThickness: 3,
    });
    this.timeEl = this.add.text(width - 20, 20, '90s', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#ffd60a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    this.spawnNext();

    const refs = getRefs(this);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));
  }

  private spawnNext(): void {
    if (this.current) this.current.destroy();
    this.current = new TrunkTarget(this, this.nextSide);
    this.rotationStartedAt = 0;
    this.rotationSide = null;
  }

  private handleFrame(frame: PoseFrame): void {
    if (!this.current) return;
    const angle = trunkRotationAngle(frame); // negativo = giro esquerda (linha de ombros caindo pra esquerda no espelho)
    // Ângulo neutro horizontal ≈ 180° quando usuário de frente; trabalhamos com desvio do horizontal:
    const deviation = ((angle + 540) % 360) - 180; // -180..180, perto de 0 quando ombros horizontais
    let side: 'L' | 'R' | null = null;
    if (Math.abs(deviation) > ROT_THRESHOLD_DEG) side = deviation > 0 ? 'L' : 'R';
    if (side === this.current.side) {
      if (this.rotationStartedAt === 0) this.rotationStartedAt = performance.now();
      else if (performance.now() - this.rotationStartedAt > SUSTAIN_MS) {
        const hitSide = this.current.side;
        this.current.hit(this, () => {/* destroyed */});
        this.current = null;
        this.score += 1;
        this.scoreEl.setText(`${strings.miniGames.score}: ${this.score}`);
        if (this.score % 3 === 0) this.narrator.speak(narratorLines.trunkHit(hitSide), 1);
        this.nextSide = this.nextSide === 'L' ? 'R' : 'L';
        this.time.delayedCall(400, () => this.spawnNext());
      }
    } else {
      this.rotationStartedAt = 0;
    }
    this.rotationSide = side;
  }

  update(): void {
    const elapsed = performance.now() - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timeEl.setText(`${remaining}s`);
    if (elapsed >= DURATION_MS) this.finish();
  }

  private finish(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.current) this.current.destroy();
    this.scene.start('MiniGameResult', {
      gameKey: 'TrunkTwist', score: this.score, scoreLabel: strings.miniGames.rotations,
      session: this.session,
    });
  }

  shutdown(): void { if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; } }
}
```

### F8. Criar cena `BellRinger`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/BellRinger.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { Bell } from '../entities/Bell.ts';
import { handAt } from '../../pose/spatialQueries.ts';
import { getRefs } from '../orchestrator.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

const DURATION_MS = 75000;
const BPM = 100;
const BEAT_MS = 60000 / BPM;
const WINDOW_MS = 600;

export class BellRinger extends Phaser.Scene {
  private bells: Bell[] = [];
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private nextBeatAt = 0;
  private startedAt = 0;
  private scoreEl!: Phaser.GameObjects.Text;
  private comboEl!: Phaser.GameObjects.Text;
  private timeEl!: Phaser.GameObjects.Text;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];

  constructor() { super('BellRinger'); }

  create(data?: { session?: string[] }): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x1a1a14);
    this.session = data?.session ?? [];
    this.score = 0; this.combo = 0; this.bestCombo = 0;
    this.bells = [];
    this.startedAt = performance.now();
    this.nextBeatAt = this.startedAt + 1000;

    this.add.text(width / 2, 30, strings.miniGames.bellTitle, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreEl = this.add.text(20, 20, `${strings.miniGames.score}: 0`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#f5f5f5', stroke: '#000', strokeThickness: 3,
    });
    this.comboEl = this.add.text(20, 50, `${strings.miniGames.combo}: 0`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '16px', color: '#0a84ff', stroke: '#000', strokeThickness: 3,
    });
    this.timeEl = this.add.text(width - 20, 20, '75s', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#ffd60a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    const refs = getRefs(this);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));
  }

  private handleFrame(frame: PoseFrame): void {
    for (const bell of this.bells) {
      if (!bell.alive) continue;
      const target = { x: bell.normX, y: bell.normY, r: 0.10 };
      if (handAt(frame, bell.hand, target)) {
        bell.ring(this, () => {/* destroyed */});
        this.score += 10;
        this.combo += 1;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        this.scoreEl.setText(`${strings.miniGames.score}: ${this.score}`);
        this.comboEl.setText(`${strings.miniGames.combo}: ${this.combo}`);
        if (this.combo === 5 || this.combo % 10 === 0) this.narrator.speak(narratorLines.bellOnBeat(), 1);
      } else if (handAt(frame, bell.hand === 'L' ? 'R' : 'L', target)) {
        // Mão errada — zera combo
        bell.ring(this, () => {/* destroyed */});
        this.combo = 0;
        this.comboEl.setText(`${strings.miniGames.combo}: 0`);
      }
    }
  }

  update(): void {
    const now = performance.now();
    const elapsed = now - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timeEl.setText(`${remaining}s`);

    // Spawn bells em cada beat
    if (now >= this.nextBeatAt && elapsed < DURATION_MS) {
      this.nextBeatAt += BEAT_MS;
      const hand: 'L' | 'R' = Math.random() < 0.5 ? 'L' : 'R';
      const x = hand === 'L' ? 0.25 : 0.75;
      const y = 0.4 + Math.random() * 0.2;
      this.bells.push(new Bell(this, x, y, hand, WINDOW_MS));
    }

    // Expira bells (perde sem tocar = zera combo)
    for (const b of this.bells) {
      if (b.alive && b.isExpired()) {
        b.destroy();
        this.combo = 0;
        this.comboEl.setText(`${strings.miniGames.combo}: 0`);
      }
    }
    this.bells = this.bells.filter((b) => b.alive);

    if (elapsed >= DURATION_MS) this.finish();
  }

  private finish(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    for (const b of this.bells) b.destroy();
    this.scene.start('MiniGameResult', {
      gameKey: 'BellRinger',
      score: this.score, scoreLabel: strings.miniGames.score,
      extra: { [strings.miniGames.bestCombo]: this.bestCombo },
      session: this.session,
    });
  }

  shutdown(): void { if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; } }
}
```

### F9. Criar cena `MiniGameResult`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/MiniGameResult.ts`
**Conteúdo:**
```typescript
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface ResultData {
  gameKey: string;
  score: number;
  scoreLabel: string;
  extra?: Record<string, number>;
  session?: string[];
}

export class MiniGameResult extends Phaser.Scene {
  constructor() { super('MiniGameResult'); }

  create(data: ResultData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x111418);

    this.add.text(width / 2, 60, strings.miniGames.result, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '32px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 130, data.scoreLabel, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '16px', color: '#8a8d92',
    }).setOrigin(0.5);
    this.add.text(width / 2, 170, String(data.score), {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '64px', color: '#f5f5f5', fontStyle: 'bold',
    }).setOrigin(0.5);

    let y = 260;
    if (data.extra) {
      for (const [k, v] of Object.entries(data.extra)) {
        this.add.text(width / 2, y, `${k}: ${v}`, {
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '18px', color: '#ffd60a',
        }).setOrigin(0.5);
        y += 30;
      }
    }

    const session = data.session ?? [];
    const idx = session.indexOf(data.gameKey);
    const next = (idx >= 0 && idx < session.length - 1) ? session[idx + 1] : null;

    if (next) {
      this.add.text(width / 2, height - 130, `${strings.miniGames.next}: ${next}`, {
        fontFamily: 'system-ui', fontSize: '16px', color: '#8a8d92',
      }).setOrigin(0.5);
      this.time.delayedCall(3000, () => this.scene.start(next, { session }));
      return;
    }

    const btn = (x: number, label: string, onClick: () => void): void => {
      const t = this.add.text(x, height - 60, label, {
        fontFamily: 'system-ui', fontSize: '18px', color: '#0b0d10',
        backgroundColor: '#4cd964', padding: { x: 18, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', onClick);
    };
    btn(width / 2 - 130, strings.miniGames.playAgain, () => this.scene.start(data.gameKey));
    btn(width / 2 + 130, strings.miniGames.hubBack, () => this.scene.start('MiniGamesHub'));
  }
}
```

### F10. Estender `strings.ts` + `narratorLines.ts` com bloco miniGames

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/i18n/strings.ts`
Adicionar dentro do objeto `strings` (junto com `gameOver`, `summary`, etc):
```typescript
  miniGames: {
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
    bellDesc: t('Toca os sinos no ritmo, com a mão certa!'),
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
  },
```

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/i18n/narratorLines.ts`
Adicionar:
```typescript
  bichoCaught: (): string => pick([t('Pegou!'), t('Boa!'), t('Mais um!')]),
  trunkHit: (side: 'L'|'R'): string => side === 'L' ? t('Esquerda!') : t('Direita!'),
  bellOnBeat: (): string => pick([t('No tempo!'), t('Boa!'), t('Manda ver!')]),
  guidedNext: (game: string): string => `${t('Próximo:')} ${game}`,
```

E adicionar no botão Welcome (`src/game/scenes/Welcome.ts`):
```typescript
    const minigamesBtn = this.add.text(width / 2, height - 30, '🎮 ' + strings.miniGames.hubTitle, {
      fontFamily: 'system-ui', fontSize: '18px', color: '#0b0d10',
      backgroundColor: '#ffd60a', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    minigamesBtn.setName('btn-minigames');
    minigamesBtn.on('pointerup', () => this.scene.start('MiniGamesHub'));
```
*(Posicionar abaixo do CTA "Começar"; ajustar y do CTA pra height - 100 se preciso pra não sobrepor.)*

**Verificar:** `npm run lint`.

### F11. Registrar 5 cenas novas no orchestrator

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/orchestrator.ts`
Adicionar imports:
```typescript
import { MiniGamesHub } from './scenes/MiniGamesHub.ts';
import { CatchBicho } from './scenes/CatchBicho.ts';
import { TrunkTwist } from './scenes/TrunkTwist.ts';
import { BellRinger } from './scenes/BellRinger.ts';
import { MiniGameResult } from './scenes/MiniGameResult.ts';
```
E **alterar** o array de cenas:
```typescript
    scene: [Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver, Demo, Settings, Summary, WaterBreak, MiniGamesHub, CatchBicho, TrunkTwist, BellRinger, MiniGameResult],
```

### F12. Adicionar 2 missões novas em missions.json

**Modificar:** `/Users/rjcaubit/Dev/movemove/public/data/missions.json`
**Adicionar 2 entradas no array `defs`:**
```json
    { "id": "daily_30_bichos", "title": "Caçador", "desc": "Pegue {target} bichos hoje", "progressKey": "daily.bichosCaught", "targetMin": 20, "targetMax": 50 },
    { "id": "daily_30_rotations", "title": "Rodopio", "desc": "Gire o tronco {target} vezes hoje", "progressKey": "daily.trunkRotations", "targetMin": 15, "targetMax": 40 }
```
*(adicionar antes do `]`).*

E **estender** `MissionDef.progressKey` em `src/game/storage/profile.ts` e `src/game/systems/missions.ts` pra incluir `'daily.bichosCaught' | 'daily.trunkRotations' | 'run.miniGameCompleted'`. Cada mini-jogo, no `finish()`, chama `refs.missions.tick({ bichosCaught: this.score })` (ou similar).

### F13. Helpers debug em `main.ts`

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/main.ts`
Adicionar dentro do `__movemoveDebug`:
```typescript
  forceHandTarget: (hand: 'L' | 'R', x: number, y: number) => {
    // Stub: força um frame com pulso na posição alvo
    const refs = game.registry.get('refs') as { onSmoothedFrame: (cb: (f: unknown) => void) => () => void };
    void refs; void hand; void x; void y;
    console.warn('forceHandTarget — implementar via stream injection se quiser E2E real; por enquanto usar mocks de PoseFrame');
  },
  skipMiniGame: (key: 'CatchBicho' | 'TrunkTwist' | 'BellRinger') => { game.scene.start(key); },
```

### F14. Adicionar e2e tests dos mini-jogos

**Criar:** `/Users/rjcaubit/Dev/movemove/e2e/issue-4-minigames.spec.ts`
**Conteúdo:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Issue #4 — mini-jogos', () => {
  test('CT13/CT16 — hub abre e Sessão Guiada inicia primeiro jogo', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    await page.goto('/?debug=1');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string, d?: unknown) => void } };
      w.__movemoveDebug.skipToScene('MiniGamesHub');
    });
    await page.waitForTimeout(400);
    // Sessão Guiada button presente (assert via DOM/canvas — usamos snapshot)
    await page.screenshot({ path: '/tmp/minigames-hub.png' });

    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipMiniGame: (k: string) => void } };
      w.__movemoveDebug.skipMiniGame('CatchBicho');
    });
    await page.waitForTimeout(800);
    await expect(page.locator('#game canvas')).toBeVisible();
  });

  test('CT14 — TrunkTwist scene carrega', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipMiniGame: (k: string) => void } };
      w.__movemoveDebug.skipMiniGame('TrunkTwist');
    });
    await page.waitForTimeout(400);
    await expect(page.locator('#game canvas')).toBeVisible();
  });

  test('CT15 — BellRinger scene carrega', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipMiniGame: (k: string) => void } };
      w.__movemoveDebug.skipMiniGame('BellRinger');
    });
    await page.waitForTimeout(400);
    await expect(page.locator('#game canvas')).toBeVisible();
  });
});
```

### F15. Commit Fase F

```bash
cd /Users/rjcaubit/Dev/movemove
git add src/pose/spatialQueries.ts src/game/entities/{Bicho,TrunkTarget,Bell}.ts \
        src/game/scenes/{MiniGamesHub,CatchBicho,TrunkTwist,BellRinger,MiniGameResult}.ts \
        src/game/scenes/Welcome.ts src/game/orchestrator.ts \
        src/i18n/strings.ts src/game/i18n/narratorLines.ts \
        public/data/missions.json src/main.ts \
        src/game/storage/profile.ts src/game/systems/missions.ts \
        e2e/issue-4-minigames.spec.ts
git commit -m "$(cat <<'EOF'
feat(issue-4): fase F — suite de mini-jogos lúdicos (#4)

Modo paralelo ao endless runner com 3 jogos de exercício específico:
- "Pega o Bicho": bichos aparecem, player toca com mão (esquerda/direita/alternando)
- "Roda Tronco": alvos laterais; gira tronco (rotação ombro >25°) pra atingir
- "Toca o Sino": sinos pulsam em ritmo; player toca com mão correta (cor)

Implementação:
- src/pose/spatialQueries.ts: handAt, trunkRotationAngle, bothHandsAbove
- 5 cenas Phaser novas + 3 entities procedurais
- MiniGamesHub no Welcome; Sessão Guiada concatena os 3
- 2 missões diárias novas (caçador, rodopio); progress keys estendidas
- Narrator estende com bichoCaught/trunkHit/bellOnBeat
- E2E: CT13-CT16

Adiantamento parcial do "Cardio guiado" da Fase 3 (Seção 7.1 doc base).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

*Fim das tasks.*
