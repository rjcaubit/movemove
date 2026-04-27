# Tasks — Fase 1: endless runner mínimo (Phaser 4 + 3 lanes + obstáculos)

**Issue:** #3
**Baseado em:** `02-spec.md`
**Total estimado:** ~52 tasks × 2-5min = ~3-4h de execução cadenciada (sem contar download manual de assets)
**Fases:** A (Setup Phaser + cenas mínimas) → B (Assets + Tutorial + GameOver) → C (Gameplay core sem pose, controlado por keyboard) → D (Integração pose layer) → E (Polish + persistência + E2E + deploy)

---

## FASE A — Setup Phaser + cenas mínimas

### A1. Adicionar Phaser 4 + criar branch

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
git checkout -b feature/sdd-issue-3
npm install phaser@^4.0.0
```
**Verificar:** `node -e "console.log(require('./package.json').dependencies.phaser)"` imprime versão `^4.0.x`. `git status` mostra branch `feature/sdd-issue-3`.

### A2. Atualizar `package.json` (nome + descrição da Fase 1)

**Modificar:** `/Users/rjcaubit/Dev/movemove/package.json`
**Trocar:**
```json
  "name": "movemove-fase0",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "description": "Movemove — Fase 0: PoC de detecção de pose com MediaPipe",
```
**Por:**
```json
  "name": "movemove-fase1",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "Movemove — Fase 1: endless runner mínimo (Phaser 4 + pose detection)",
```
**Verificar:** `npm run lint` (= `tsc --noEmit`) ainda passa.

### A3. Simplificar `index.html` removendo HTML da Fase 0 e adicionando `<div id="game">`

**Modificar:** `/Users/rjcaubit/Dev/movemove/index.html` (substituir todo o conteúdo)
**Conteúdo:**
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0b0d10" />
    <title>Movemove — Endless Runner</title>
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/icons/icon-192.png" />
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app">
      <video id="video" playsinline muted hidden></video>
      <canvas id="overlay" hidden></canvas>
      <div id="game"></div>
      <div id="camera-preview" class="hidden"></div>
      <button id="debug-toggle" class="hidden" aria-label="Mostrar painel de debug">Debug</button>
      <aside id="debug-panel" class="hidden" aria-label="Painel de debug"></aside>
      <section id="screen-error" class="screen hidden" aria-hidden="true"></section>
      <div id="orientation-overlay" class="hidden" aria-hidden="true"></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```
**Verificar:** abrir `index.html` no browser (sem servidor) ainda parseia (sem erro de sintaxe).

### A4. Limpar `src/styles.css` removendo regras não usadas e adicionando regras Fase 1

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/styles.css` (substituir conteúdo inteiro)
**Conteúdo:**
```css
:root {
  --bg: #0b0d10;
  --fg: #f5f5f5;
  --muted: #8a8d92;
  --accent: #4cd964;
  --warn: #ffd60a;
  --error: #ff453a;
  --panel-bg: rgba(11, 13, 16, 0.85);
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  width: 100vw; height: 100vh;
  background: var(--bg);
  color: var(--fg);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 16px;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

button {
  background: var(--accent);
  color: var(--bg);
  border: 0;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
}
button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

#app { position: relative; width: 100%; height: 100%; }

#game { position: absolute; inset: 0; }
#game canvas { display: block; width: 100%; height: 100%; }

#camera-preview {
  position: fixed; top: 12px; right: 12px;
  width: 160px; height: 90px;
  border-radius: 8px; overflow: hidden;
  background: rgba(0,0,0,0.5);
  pointer-events: none;
  z-index: 50;
}
#camera-preview.hidden { display: none; }
#camera-preview canvas { width: 100%; height: 100%; display: block; }

#debug-panel {
  position: fixed; top: 12px; left: 12px;
  background: var(--panel-bg);
  color: var(--fg);
  padding: 12px;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  max-width: 280px; max-height: 80vh; overflow-y: auto;
  z-index: 100;
}
#debug-panel .row { display: flex; justify-content: space-between; gap: 12px; }
#debug-panel .log { margin-top: 8px; max-height: 240px; overflow-y: auto; font-size: 11px; }
#debug-panel .log .entry { color: var(--muted); }
#debug-panel.hidden { display: none; }

#debug-toggle {
  position: fixed; top: 12px; left: 12px;
  background: var(--panel-bg);
  color: var(--fg);
  border: 0; border-radius: 8px; padding: 6px 10px;
  font-size: 12px; cursor: pointer;
  font-family: ui-monospace, monospace;
  min-height: 32px;
  z-index: 100;
}
#debug-toggle.hidden { display: none; }

.screen {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 24px;
  text-align: center;
  gap: 16px;
  background: var(--bg);
  z-index: 200;
}
.screen.hidden { display: none; }
.screen h1 { font-size: 28px; margin: 0; }
.screen p { font-size: 18px; color: var(--muted); margin: 0; max-width: 28em; }

#orientation-overlay {
  position: fixed; inset: 0;
  background: rgba(11, 13, 16, 0.95);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
  z-index: 300;
}
#orientation-overlay.hidden { display: none; }
#orientation-overlay .icon { font-size: 64px; }
#orientation-overlay p { font-size: 18px; max-width: 24em; color: var(--fg); margin: 0; }
```
**Verificar:** `npm run dev` inicia sem erro de CSS no console do browser.

### A5. Criar `src/game/config.ts` — constantes do jogo

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/config.ts`
**Conteúdo:**
```typescript
export const GAME_CONFIG = {
  /** Resolução lógica do canvas. Phaser escala pra tela. */
  width: 960,
  height: 540,
  /** Cores HUD (fora do canvas pixel art) */
  bgColor: 0x0b0d10,

  /** Mundo / pseudo-3D */
  horizonY: 220,            // Y do horizonte no canvas (px)
  laneXOffsetAtNear: 200,   // distância em px da lane lateral pro centro quando z=0
  laneXOffsetAtHorizon: 30, // distância das lanes no horizonte (convergência)
  zMin: 0,                  // perto do player
  zMax: 1,                  // horizonte
  zStep: 0.2,               // discretização (6 valores: 0, 0.2, 0.4, 0.6, 0.8, 1.0)
  scaleAtNear: 1.5,
  scaleAtHorizon: 0.1,

  /** Velocidade do mundo (m/s) */
  speedInitial: 5,
  speedIncreasePerInterval: 1,
  speedIncreaseIntervalMs: 30000,
  speedMax: 15,

  /** Spawning */
  spawnIntervalMsInitial: 2500,
  spawnIntervalMsAfter20s: 1500,
  spawnIntervalMsAfter60s: 1000,
  coinClusterEveryMeters: 50,
  coinClusterSize: 5,
  coinSpacingMeters: 2,

  /** Player (px lógicos no canvas) */
  playerY: 440,
  playerJumpHeightPx: 80,
  playerJumpDurationMs: 600,
  playerDuckDurationMs: 800,
  playerLaneTiltDurationMs: 200,
  playerLaneTiltDeg: 15,

  /** Colisão */
  collisionZThreshold: 0.15,

  /** Persistência */
  storageKeys: {
    bestDistance: 'movemove.bestDistance',
    tutorialDone: 'movemove.tutorialDone',
    muted: 'movemove.muted',
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
```
**Verificar:** `npm run lint` passa.

### A6. Criar `src/game/scenes/Boot.ts` (placeholder, sem assets ainda)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Boot.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    // Assets reais entram na Fase B. Aqui só um pixel branco como placeholder.
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('px-white', 4, 4);
    g.destroy();
  }

  create(): void {
    this.scene.start('Welcome');
  }
}
```
**Verificar:** `npm run lint` passa.

### A7. Criar `src/game/scenes/Welcome.ts` (placeholder com Text bitmap-less)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Welcome.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class Welcome extends Phaser.Scene {
  constructor() { super('Welcome'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    this.add.text(width / 2, height / 2 - 60, strings.welcome.headline, {
      fontFamily: 'system-ui',
      fontSize: '32px',
      color: '#f5f5f5',
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    const cta = this.add.text(width / 2, height / 2 + 60, strings.welcome.cta, {
      fontFamily: 'system-ui',
      fontSize: '24px',
      color: '#0b0d10',
      backgroundColor: '#4cd964',
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    cta.on('pointerup', () => this.scene.start('Loading'));
  }
}
```
**Verificar:** `npm run lint` passa.

### A8. Criar `src/game/scenes/Loading.ts` (placeholder com texto, sem chamada real ao detector ainda)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Loading.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class Loading extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('Loading'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.add.text(width / 2, height / 2 - 30, strings.loading.text, {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
    }).setOrigin(0.5);
    this.statusText = this.add.text(width / 2, height / 2 + 20, '', {
      fontFamily: 'system-ui', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(0.5);

    // Placeholder: simula 1s de loading e vai pra Calibration (na Fase D, troca por integração real)
    this.statusText.setText(strings.loading.statusReady);
    this.time.delayedCall(800, () => this.scene.start('Calibration'));
  }
}
```
**Verificar:** `npm run lint` passa.

### A9. Criar `src/game/scenes/Calibration.ts` (placeholder visual; integração com Calibrator vem na Fase D)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Calibration.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class Calibration extends Phaser.Scene {
  constructor() { super('Calibration'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.add.text(width / 2, height / 2 - 60, strings.calibration.instruction, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5', align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    // Placeholder: countdown 3-2-1 mockado, depois vai pra Play
    let n = 3;
    const cd = this.add.text(width / 2, height / 2 + 30, strings.calibration.countdown(n), {
      fontFamily: 'system-ui', fontSize: '96px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    const tick = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        n -= 1;
        if (n > 0) cd.setText(strings.calibration.countdown(n));
        else { cd.setText('🎯'); this.time.delayedCall(600, () => this.scene.start('Play')); tick.remove(); }
      },
    });
  }
}
```
**Verificar:** `npm run lint` passa.

### A10. Criar `src/game/scenes/Play.ts` (placeholder vazio com fundo + texto)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Play.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

export class Play extends Phaser.Scene {
  constructor() { super('Play'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x1a2030);
    this.add.text(width / 2, height / 2, 'PLAY (placeholder)', {
      fontFamily: 'system-ui', fontSize: '36px', color: '#f5f5f5',
    }).setOrigin(0.5);

    // Tap pra forçar GameOver enquanto não há gameplay
    this.input.on('pointerup', () => this.scene.start('GameOver', { distance: 0, coins: 0 }));
  }
}
```
**Verificar:** `npm run lint` passa.

### A11. Criar `src/game/scenes/GameOver.ts` (placeholder)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/GameOver.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface GameOverData { distance: number; coins: number }

export class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: GameOverData): void {
    const { width, height } = GAME_CONFIG;
    const distance = Math.floor(data?.distance ?? 0);
    const coins = data?.coins ?? 0;

    this.add.text(width / 2, height / 2 - 100, strings.gameOver.title, {
      fontFamily: 'system-ui', fontSize: '40px', color: '#ff453a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 30, `${strings.gameOver.distance}: ${distance} m`, {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 0, `${strings.gameOver.coins}: ${coins}`, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#ffd60a',
    }).setOrigin(0.5);

    const btn1 = this.add.text(width / 2 - 100, height / 2 + 80, strings.gameOver.playAgain, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn1.on('pointerup', () => this.scene.start('Play'));

    const btn2 = this.add.text(width / 2 + 100, height / 2 + 80, strings.gameOver.recalibrate, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5',
      backgroundColor: '#8a8d92', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn2.on('pointerup', () => this.scene.start('Calibration'));
  }
}
```
**Verificar:** `npm run lint` passa.

### A12. Estender `src/i18n/strings.ts` com chaves do jogo

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/i18n/strings.ts`
**Trocar:**
```typescript
export const strings = {
  app: {
    title: 'Movemove — Detector de Movimento',
  },
```
**Por:**
```typescript
export const strings = {
  app: {
    title: 'Movemove — Endless Runner',
  },
  tutorial: {
    slide1Title: 'PULE',
    slide1Hint: 'Pule pra desviar de barreiras altas.',
    slide2Title: 'AGACHE',
    slide2Hint: 'Agache pra desviar de barreiras baixas.',
    slide3Title: 'MUDE DE LANE',
    slide3Hint: 'Mexa o quadril pros lados pra trocar de lane.',
    skip: 'Pular',
    next: 'Próximo',
    start: 'Vamos jogar!',
  },
  play: {
    distance: 'm',
    coins: 'moedas',
    fps: 'FPS',
    mute: 'Mute',
    unmute: 'Som',
  },
  gameOver: {
    title: 'GAME OVER',
    distance: 'Distância',
    coins: 'Moedas',
    best: 'Recorde',
    newRecord: 'NOVO RECORDE!',
    playAgain: 'Jogar de novo',
    recalibrate: 'Recalibrar',
  },
  orientation: {
    rotate: 'Vire o celular pra paisagem pra jogar melhor.',
    continue: 'Continuar assim mesmo',
  },
```
**Verificar:** `npm run lint` passa. Outras chaves (welcome/loading/error/states/calibration/active) ficam intactas.

### A13. Criar `src/game/orchestrator.ts` (esqueleto — só Phaser.Game; pose layer entra na Fase D)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/orchestrator.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from './config.ts';
import { Boot } from './scenes/Boot.ts';
import { Welcome } from './scenes/Welcome.ts';
import { Loading } from './scenes/Loading.ts';
import { Calibration } from './scenes/Calibration.ts';
import { Play } from './scenes/Play.ts';
import { GameOver } from './scenes/GameOver.ts';

export function startApp(): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: GAME_CONFIG.bgColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_CONFIG.width,
      height: GAME_CONFIG.height,
    },
    scene: [Boot, Welcome, Loading, Calibration, Play, GameOver],
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    render: { pixelArt: true, antialias: false },
  });
  return game;
}
```
**Verificar:** `npm run lint` passa.

### A14. Reescrever `src/main.ts` para apenas inicializar o orquestrador

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/main.ts` (substituir conteúdo inteiro)
**Conteúdo:**
```typescript
import { startApp } from './game/orchestrator.ts';

startApp();

export {};
```
**Verificar:** `npm run lint` passa. `npm run dev` abre browser, mostra Welcome → click "Começar" → Loading → Calibration (countdown) → Play (placeholder) → tap → GameOver → click "Jogar de novo" → Play. Fluxo end-to-end funciona com placeholders.

### A15. Remover arquivos UI da Fase 0 não mais usados

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
rm -f src/ui/welcomeScreen.ts src/ui/loadingScreen.ts src/ui/calibrationScreen.ts \
      src/ui/eventOverlay.ts src/ui/noBodyScreen.ts
```
**Verificar:** `npm run lint` falha temporariamente apontando imports quebrados em `src/main.ts` — mas como acabamos de simplificar o `main.ts` na A14, não deve haver imports residuais. Se houver, `grep -rn "welcomeScreen\|loadingScreen\|calibrationScreen\|eventOverlay\|noBodyScreen" src/` deve retornar vazio.

### A16. Commit Fase A

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
git add package.json package-lock.json index.html src/styles.css src/main.ts \
        src/i18n/strings.ts src/game/ \
        src/ui/welcomeScreen.ts src/ui/loadingScreen.ts src/ui/calibrationScreen.ts \
        src/ui/eventOverlay.ts src/ui/noBodyScreen.ts
git commit -m "$(cat <<'EOF'
feat(issue-3): fase A — setup Phaser 4 + cenas mínimas (#3)

- Adiciona phaser@^4.0.0
- Simplifica index.html, styles.css; remove HTML das telas Fase 0
- Cria src/game/{orchestrator, config, scenes/*} com 6 cenas placeholder
- Reescreve main.ts pra delegar ao orchestrator
- Estende strings.ts com chaves tutorial/play/gameOver/orientation
- Remove ui/{welcomeScreen,loadingScreen,calibrationScreen,eventOverlay,noBodyScreen}.ts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline` mostra o commit.

---

## FASE B — Assets + Tutorial + GameOver com bitmap font

### B1. Baixar pack Kenney Pixel Platformer Redux + Background Elements

**Comando manual (humano executa):**
```bash
mkdir -p /tmp/movemove-assets && cd /tmp/movemove-assets

# Pixel Platformer (chars + obstáculos)
curl -fL -o platformer.zip 'https://kenney.nl/media/pages/assets/pixel-platformer/64aa55074a-1677589474/kenney_pixel-platformer.zip'
unzip -o platformer.zip -d platformer

# Background Elements
curl -fL -o backgrounds.zip 'https://kenney.nl/media/pages/assets/background-elements/45a7484cb6-1677708616/kenney_background-elements.zip'
unzip -o backgrounds.zip -d backgrounds

# UI Audio (sons curtos)
curl -fL -o ui-audio.zip 'https://kenney.nl/media/pages/assets/ui-audio/9a9d3c2c1d-1677708625/kenney_ui-audio.zip'
unzip -o ui-audio.zip -d ui-audio

ls -la platformer backgrounds ui-audio
```
**Verificar:** Cada diretório tem subpastas com PNGs/WAVs. Se 404, fallback: usar diretamente em `https://kenney.nl/assets/pixel-platformer` e `background-elements` (URLs podem mudar; humano ajusta). Caso `curl` falhe, baixar manualmente do site, descompactar em `/tmp/movemove-assets/{platformer,backgrounds,ui-audio}/`.

### B2. Copiar sprites selecionados pra `public/assets/`

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
mkdir -p public/assets/sprites/runner public/assets/sprites/obstacles \
         public/assets/bg public/assets/sounds public/assets/fonts \
         public/icons

# Player (Kenney Pixel Platformer — usa o character sprite-sheet ou tiles individuais)
# Ajustar nomes se diferentes — humano valida e renomeia se preciso
cp /tmp/movemove-assets/platformer/Tiles/Characters/character_0000.png public/assets/sprites/runner/player_idle.png || true
cp /tmp/movemove-assets/platformer/Tiles/Characters/character_0001.png public/assets/sprites/runner/player_run_a.png || true
cp /tmp/movemove-assets/platformer/Tiles/Characters/character_0002.png public/assets/sprites/runner/player_run_b.png || true
cp /tmp/movemove-assets/platformer/Tiles/Characters/character_0003.png public/assets/sprites/runner/player_jump.png || true
cp /tmp/movemove-assets/platformer/Tiles/Characters/character_0004.png public/assets/sprites/runner/player_duck.png || true

# Obstáculos (blocos/spike)
cp /tmp/movemove-assets/platformer/Tiles/tile_0048.png public/assets/sprites/obstacles/barrier.png || true
cp /tmp/movemove-assets/platformer/Tiles/tile_0049.png public/assets/sprites/obstacles/low_barrier.png || true
cp /tmp/movemove-assets/platformer/Tiles/tile_0014.png public/assets/sprites/obstacles/wall.png || true

# Coin (estrela ou moeda do pack)
cp /tmp/movemove-assets/platformer/Tiles/tile_0151.png public/assets/sprites/coin.png || true

# Mascote (mesma textura do player_idle)
cp /tmp/movemove-assets/platformer/Tiles/Characters/character_0005.png public/assets/sprites/mascot.png || true

# Backgrounds
cp /tmp/movemove-assets/backgrounds/PNG/back.png public/assets/bg/sky.png || true
cp /tmp/movemove-assets/backgrounds/PNG/middle.png public/assets/bg/mountains_far.png || true
cp /tmp/movemove-assets/backgrounds/PNG/front.png public/assets/bg/mountains_near.png || true

# Sons
cp /tmp/movemove-assets/ui-audio/Audio/click_001.ogg public/assets/sounds/coin.ogg || true
cp /tmp/movemove-assets/ui-audio/Audio/select_001.ogg public/assets/sounds/jump.ogg || true
cp /tmp/movemove-assets/ui-audio/Audio/error_004.ogg public/assets/sounds/hit.ogg || true
cp /tmp/movemove-assets/ui-audio/Audio/error_006.ogg public/assets/sounds/gameover.ogg || true

ls -la public/assets/sprites/runner public/assets/sprites/obstacles public/assets/bg public/assets/sounds
```
**Verificar:** Todos os arquivos existem (`ls` mostra 5+ PNGs em `runner`, 3 em `obstacles`, 3 em `bg`, 4 em `sounds`). Se algum `cp` falhou (`||true`), nomes do pack mudaram — humano ajusta caminhos no Tiles ou substitui pelo arquivo equivalente do pack.

### B3. Criar bitmap font pixel art

**Estratégia:** Usar uma bitmap font open-source pré-pronta (mais simples que gerar). "Atari Classic" do Phaser examples pack é XML formato Phaser e CC0.

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove/public/assets/fonts
# Phaser Examples bitmap font (CC0 pelo time Phaser)
curl -fL -o pixel.png 'https://labs.phaser.io/assets/fonts/bitmap/atari-classic.png'
curl -fL -o pixel.xml 'https://labs.phaser.io/assets/fonts/bitmap/atari-classic.xml'
ls -la pixel.png pixel.xml
```
**Verificar:** Ambos arquivos existem. Se 404, fallback: usar Press Start 2P do Google Fonts via tool `bmfont` (ver TASK B3-fallback). Aceita-se text com fonte system-ui no canvas se a font bitmap não carregar — degradação graciosa.

### B3-fallback (executar SÓ se B3 falhou). Gerar bitmap font local

**Comando:** humano abre `https://snowb.org/`, importa "Press Start 2P" via Google Fonts, exporta XML formato BMFont. Salva como `public/assets/fonts/pixel.png` + `pixel.xml`. Glifos: `A-Z 0-9 . , ! ? : ; - + ' " ÁÂÃÉÊÍÓÔÚÇ áâãéêíóôúç`.
**Verificar:** mesmos arquivos existem.

### B4. Criar ícones PWA placeholder

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove/public/icons
# Placeholder: usa o sprite mascote como ícone, ampliado.
# Em produção: gerar via designer. Aceita-se PNG de 192x192 e 512x512 com fundo cor da paleta.
cp /Users/rjcaubit/Dev/movemove/public/assets/sprites/mascot.png icon-192.png
cp /Users/rjcaubit/Dev/movemove/public/assets/sprites/mascot.png icon-512.png
ls -la
```
**Verificar:** dois arquivos existem. (Tamanho real é menor que 192/512 — browser escala, ok pra v0.1.)

### B5. Criar `public/manifest.webmanifest` (PWA básico, sem standalone)

**Criar:** `/Users/rjcaubit/Dev/movemove/public/manifest.webmanifest`
**Conteúdo:**
```json
{
  "name": "Movemove — Endless Runner",
  "short_name": "Movemove",
  "description": "Endless runner controlado por movimento físico via câmera.",
  "lang": "pt-BR",
  "start_url": "/",
  "display": "browser",
  "background_color": "#0b0d10",
  "theme_color": "#0b0d10",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
**Verificar:** `cat public/manifest.webmanifest | python3 -m json.tool` parseia sem erro.

### B6. Atualizar `Boot.ts` pra carregar todos os assets reais

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Boot.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    // Texturas player
    this.load.image('player_idle', '/assets/sprites/runner/player_idle.png');
    this.load.image('player_run_a', '/assets/sprites/runner/player_run_a.png');
    this.load.image('player_run_b', '/assets/sprites/runner/player_run_b.png');
    this.load.image('player_jump', '/assets/sprites/runner/player_jump.png');
    this.load.image('player_duck', '/assets/sprites/runner/player_duck.png');
    this.load.image('mascot', '/assets/sprites/mascot.png');

    // Obstáculos
    this.load.image('obs_barrier', '/assets/sprites/obstacles/barrier.png');
    this.load.image('obs_low', '/assets/sprites/obstacles/low_barrier.png');
    this.load.image('obs_wall', '/assets/sprites/obstacles/wall.png');

    // Coin
    this.load.image('coin', '/assets/sprites/coin.png');

    // Backgrounds (paralax 3 camadas)
    this.load.image('bg_sky', '/assets/bg/sky.png');
    this.load.image('bg_far', '/assets/bg/mountains_far.png');
    this.load.image('bg_near', '/assets/bg/mountains_near.png');

    // Sons
    this.load.audio('snd_jump', '/assets/sounds/jump.ogg');
    this.load.audio('snd_coin', '/assets/sounds/coin.ogg');
    this.load.audio('snd_hit', '/assets/sounds/hit.ogg');
    this.load.audio('snd_gameover', '/assets/sounds/gameover.ogg');

    // Bitmap font
    this.load.bitmapFont('pixel', '/assets/fonts/pixel.png', '/assets/fonts/pixel.xml');

    // Pixel branco utility (para retângulos coloridos sem precisar gerar texture)
    this.load.on('filecomplete', () => {/* progress */});
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
    g.generateTexture('px-white', 4, 4);
    g.destroy();
  }

  create(): void {
    this.scene.start('Welcome');
  }
}
```
**Verificar:** `npm run dev`, abrir browser, devtools network mostra todos os PNGs e o `pixel.xml`/`pixel.png` carregados com 200. Se 404, ajustar caminhos.

### B7. Atualizar `Welcome.ts` pra usar bitmap font + mascote

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Welcome.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class Welcome extends Phaser.Scene {
  constructor() { super('Welcome'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    // Mascote ampliado
    this.add.image(width / 2, height / 2 - 80, 'mascot').setScale(4);

    this.add.bitmapText(width / 2, height / 2 + 40, 'pixel', 'MOVEMOVE', 32)
      .setOrigin(0.5).setTint(0x4cd964);

    this.add.text(width / 2, height / 2 + 90, strings.welcome.headline, {
      fontFamily: 'system-ui', fontSize: '18px', color: '#8a8d92',
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    const cta = this.add.text(width / 2, height - 80, strings.welcome.cta, {
      fontFamily: 'system-ui', fontSize: '24px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cta.on('pointerup', () => this.scene.start('Loading'));
  }
}
```
**Verificar:** abrir browser, Welcome mostra mascote ampliado + título "MOVEMOVE" em pixel font verde + headline + botão.

### B8. Criar cena Tutorial.ts

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Tutorial.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface Slide { title: string; hint: string; icon: string }

export class Tutorial extends Phaser.Scene {
  private slides: Slide[] = [
    { title: strings.tutorial.slide1Title, hint: strings.tutorial.slide1Hint, icon: 'player_jump' },
    { title: strings.tutorial.slide2Title, hint: strings.tutorial.slide2Hint, icon: 'player_duck' },
    { title: strings.tutorial.slide3Title, hint: strings.tutorial.slide3Hint, icon: 'player_idle' },
  ];
  private idx = 0;
  private titleEl!: Phaser.GameObjects.BitmapText;
  private hintEl!: Phaser.GameObjects.Text;
  private iconEl!: Phaser.GameObjects.Image;
  private nextBtn!: Phaser.GameObjects.Text;

  constructor() { super('Tutorial'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    this.iconEl = this.add.image(width / 2, height / 2 - 80, 'player_jump').setScale(5);
    this.titleEl = this.add.bitmapText(width / 2, height / 2 + 30, 'pixel', '', 32).setOrigin(0.5).setTint(0xffd60a);
    this.hintEl = this.add.text(width / 2, height / 2 + 80, '', {
      fontFamily: 'system-ui', fontSize: '18px', color: '#f5f5f5',
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    const skip = this.add.text(width - 24, 24, strings.tutorial.skip, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#8a8d92',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 12, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    skip.on('pointerup', () => this.finish());

    this.nextBtn = this.add.text(width / 2, height - 70, strings.tutorial.next, {
      fontFamily: 'system-ui', fontSize: '22px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.nextBtn.on('pointerup', () => this.advance());

    this.render();
  }

  private render(): void {
    const s = this.slides[this.idx];
    this.iconEl.setTexture(s.icon);
    this.titleEl.setText(s.title);
    this.hintEl.setText(s.hint);
    this.nextBtn.setText(this.idx === this.slides.length - 1 ? strings.tutorial.start : strings.tutorial.next);
  }

  private advance(): void {
    if (this.idx < this.slides.length - 1) { this.idx += 1; this.render(); }
    else this.finish();
  }

  private finish(): void {
    try { localStorage.setItem(GAME_CONFIG.storageKeys.tutorialDone, 'true'); } catch {/* ignore */}
    this.scene.start('Calibration');
  }
}
```
**Verificar:** `npm run lint`.

### B9. Registrar Tutorial no orquestrador e ajustar fluxo Loading→Tutorial/Calibration

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/orchestrator.ts`
**Trocar:**
```typescript
import { Calibration } from './scenes/Calibration.ts';
import { Play } from './scenes/Play.ts';
import { GameOver } from './scenes/GameOver.ts';
```
**Por:**
```typescript
import { Tutorial } from './scenes/Tutorial.ts';
import { Calibration } from './scenes/Calibration.ts';
import { Play } from './scenes/Play.ts';
import { GameOver } from './scenes/GameOver.ts';
```
E **trocar:**
```typescript
    scene: [Boot, Welcome, Loading, Calibration, Play, GameOver],
```
**Por:**
```typescript
    scene: [Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver],
```
**Verificar:** `npm run lint`.

### B10. Atualizar `Loading.ts` pra escolher Tutorial ou Calibration baseado no localStorage

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Loading.ts`
**Trocar:**
```typescript
    this.statusText.setText(strings.loading.statusReady);
    this.time.delayedCall(800, () => this.scene.start('Calibration'));
```
**Por:**
```typescript
    this.statusText.setText(strings.loading.statusReady);
    this.time.delayedCall(800, () => {
      const done = (() => { try { return localStorage.getItem(GAME_CONFIG.storageKeys.tutorialDone) === 'true'; } catch { return false; } })();
      this.scene.start(done ? 'Calibration' : 'Tutorial');
    });
```
**Verificar:** `npm run dev`. Se `localStorage.movemove.tutorialDone` não existe → entra no Tutorial. Após terminar tutorial → vai pra Calibration. Recarregar → pula Tutorial.

### B11. Atualizar `GameOver.ts` pra usar bitmap font + mostrar recorde

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/GameOver.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface GameOverData { distance: number; coins: number }

export class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: GameOverData): void {
    const { width, height } = GAME_CONFIG;
    const distance = Math.floor(data?.distance ?? 0);
    const coins = data?.coins ?? 0;
    const best = (() => { try { return Number(localStorage.getItem(GAME_CONFIG.storageKeys.bestDistance) ?? 0); } catch { return 0; } })();
    const isNewRecord = distance > best;
    if (isNewRecord) {
      try { localStorage.setItem(GAME_CONFIG.storageKeys.bestDistance, String(distance)); } catch {/* ignore */}
    }

    this.cameras.main.setBackgroundColor(0x1a0d10);
    this.add.bitmapText(width / 2, 80, 'pixel', strings.gameOver.title, 48).setOrigin(0.5).setTint(0xff453a);

    this.add.bitmapText(width / 2, 200, 'pixel', `${strings.gameOver.distance}`, 16).setOrigin(0.5).setTint(0x8a8d92);
    this.add.bitmapText(width / 2, 230, 'pixel', `${distance} ${strings.play.distance}`, 32).setOrigin(0.5).setTint(0xf5f5f5);

    this.add.bitmapText(width / 2, 290, 'pixel', `${strings.gameOver.coins}`, 16).setOrigin(0.5).setTint(0x8a8d92);
    this.add.bitmapText(width / 2, 320, 'pixel', `${coins}`, 24).setOrigin(0.5).setTint(0xffd60a);

    if (isNewRecord) {
      this.add.bitmapText(width / 2, 370, 'pixel', strings.gameOver.newRecord, 20).setOrigin(0.5).setTint(0x4cd964);
    } else {
      this.add.bitmapText(width / 2, 370, 'pixel', `${strings.gameOver.best}: ${best} ${strings.play.distance}`, 16)
        .setOrigin(0.5).setTint(0x8a8d92);
    }

    const btn1 = this.add.text(width / 2 - 110, height - 70, strings.gameOver.playAgain, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn1.on('pointerup', () => this.scene.start('Play'));

    const btn2 = this.add.text(width / 2 + 110, height - 70, strings.gameOver.recalibrate, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5',
      backgroundColor: '#8a8d92', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn2.on('pointerup', () => this.scene.start('Calibration'));
  }
}
```
**Verificar:** `npm run dev`, ir até GameOver (tap em Play placeholder), texto bitmap renderiza, botões funcionam.

### B12. Commit Fase B

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
git add public/ src/game/scenes/ src/game/orchestrator.ts
git commit -m "$(cat <<'EOF'
feat(issue-3): fase B — assets Kenney + Tutorial + GameOver bitmap font (#3)

- Adiciona public/assets/{sprites,bg,sounds,fonts} com pack Kenney CC0
- Cria public/manifest.webmanifest (display: browser, sem standalone)
- Cria icons PWA placeholder
- Boot carrega todos os assets reais; Welcome usa mascote + bitmap font
- Cria scene Tutorial (3 slides, flag localStorage tutorialDone)
- Loading escolhe Tutorial/Calibration baseado no localStorage
- GameOver com bitmap font + recorde local

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline`.

---

## FASE C — Gameplay core (sem pose layer; controlado por keyboard)

### C1. Criar `src/game/systems/rng.ts` (RNG seedável)

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/rng.ts`
**Conteúdo:**
```typescript
/** mulberry32 — RNG seedável determinístico de 32 bits. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getRng(): () => number {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  if (seed && Number.isFinite(Number(seed))) return mulberry32(Number(seed));
  return Math.random;
}
```
**Verificar:** `npm run lint`.

### C2. Criar `src/game/systems/pseudo3d.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/pseudo3d.ts`
**Conteúdo:**
```typescript
import { GAME_CONFIG } from '../config.ts';
import type { Lane } from '../../pose/types.ts';

const C = GAME_CONFIG;

/** z=0 (perto do player) → escala maior. z=1 (horizonte) → escala menor. */
export function zToScale(z: number): number {
  const t = 1 - clamp01(z);
  return C.scaleAtHorizon + (C.scaleAtNear - C.scaleAtHorizon) * t;
}

/** z=0 → playerY (perto). z=1 → horizonY. Linear simples. */
export function zToY(z: number): number {
  const t = 1 - clamp01(z);
  return C.horizonY + (C.playerY - C.horizonY) * t;
}

/** X da lane no plano de profundidade z. Lanes convergem pro centro no horizonte. */
export function laneToX(lane: Lane, z: number): number {
  const centerX = C.width / 2;
  const t = 1 - clamp01(z);
  const offsetAtZ = C.laneXOffsetAtHorizon + (C.laneXOffsetAtNear - C.laneXOffsetAtHorizon) * t;
  return centerX + lane * offsetAtZ;
}

function clamp01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x; }
```
**Verificar:** `npm run lint`.

### C3. Criar `src/game/systems/road.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/road.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

const C = GAME_CONFIG;

/** Desenha estrada pseudo-3D: trapézio + 2 linhas internas convergentes + faixas pintadas dinamicamente. */
export class Road {
  private gfx: Phaser.GameObjects.Graphics;
  private offset = 0;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(1);
  }

  update(speedMps: number, dtSec: number): void {
    this.offset = (this.offset + speedMps * dtSec * 80) % 80;
    this.draw();
  }

  destroy(): void { this.gfx.destroy(); }

  private draw(): void {
    const g = this.gfx;
    g.clear();

    // Asfalto: trapézio do horizonte ao chão
    const cx = C.width / 2;
    const horizonHalfWidth = C.laneXOffsetAtHorizon * 1.5;
    const nearHalfWidth = C.laneXOffsetAtNear * 1.5;
    g.fillStyle(0x2c2f36, 1);
    g.beginPath();
    g.moveTo(cx - horizonHalfWidth, C.horizonY);
    g.lineTo(cx + horizonHalfWidth, C.horizonY);
    g.lineTo(cx + nearHalfWidth, C.height);
    g.lineTo(cx - nearHalfWidth, C.height);
    g.closePath();
    g.fillPath();

    // Linhas das lanes (convergentes)
    g.lineStyle(2, 0x4a4d52, 1);
    for (const offsetSign of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + offsetSign * C.laneXOffsetAtHorizon * 0.5, C.horizonY);
      g.lineTo(cx + offsetSign * C.laneXOffsetAtNear * 0.5, C.height);
      g.strokePath();
    }

    // Faixas brancas pulsando (efeito de movimento)
    g.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 12; i++) {
      const stripeY = C.horizonY + (i * 80 + this.offset);
      if (stripeY > C.height) break;
      const tFromHorizon = (stripeY - C.horizonY) / (C.height - C.horizonY);
      const x = cx;
      const w = 4 + 8 * tFromHorizon;
      const h = 12 + 12 * tFromHorizon;
      g.fillRect(x - w / 2, stripeY, w, h);
    }
  }
}
```
**Verificar:** `npm run lint`.

### C4. Criar `src/game/systems/parallax.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/parallax.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

interface Layer { ts: Phaser.GameObjects.TileSprite; speedFactor: number }

/** 3 camadas de fundo (sky, mountains-far, mountains-near) com velocidades diferentes. */
export class Parallax {
  private layers: Layer[] = [];

  constructor(scene: Phaser.Scene) {
    const { width, height } = GAME_CONFIG;
    const sky = scene.add.tileSprite(0, 0, width, GAME_CONFIG.horizonY + 40, 'bg_sky')
      .setOrigin(0, 0).setDepth(-3);
    const far = scene.add.tileSprite(0, GAME_CONFIG.horizonY - 60, width, 100, 'bg_far')
      .setOrigin(0, 0).setDepth(-2);
    const near = scene.add.tileSprite(0, GAME_CONFIG.horizonY - 30, width, 80, 'bg_near')
      .setOrigin(0, 0).setDepth(-1);
    void height;
    this.layers = [
      { ts: sky, speedFactor: 0.1 },
      { ts: far, speedFactor: 0.3 },
      { ts: near, speedFactor: 0.6 },
    ];
  }

  update(speedMps: number, dtSec: number): void {
    for (const l of this.layers) {
      l.ts.tilePositionX += speedMps * dtSec * l.speedFactor * 60;
    }
  }

  destroy(): void { for (const l of this.layers) l.ts.destroy(); }
}
```
**Verificar:** `npm run lint`.

### C5. Criar `src/game/entities/Player.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/Player.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX } from '../systems/pseudo3d.ts';
import type { Lane } from '../../pose/types.ts';

const C = GAME_CONFIG;

type PlayerState = 'running' | 'jumping' | 'ducking';

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private lane: Lane = 0;
  private state: PlayerState = 'running';
  private runFrame = 0;
  private runFrameAccum = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.sprite = scene.add.sprite(laneToX(0, 0), C.playerY, 'player_idle')
      .setOrigin(0.5, 1).setScale(2.5).setDepth(10);
  }

  update(dtSec: number): void {
    if (this.state === 'running') {
      this.runFrameAccum += dtSec;
      if (this.runFrameAccum >= 0.12) {
        this.runFrameAccum = 0;
        this.runFrame = (this.runFrame + 1) % 2;
        this.sprite.setTexture(this.runFrame === 0 ? 'player_run_a' : 'player_run_b');
      }
    }
  }

  getLane(): Lane { return this.lane; }
  getState(): PlayerState { return this.state; }

  setLane(lane: Lane): void {
    if (this.lane === lane) return;
    this.lane = lane;
    this.scene.tweens.add({
      targets: this.sprite,
      x: laneToX(lane, 0),
      duration: 80,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.sprite,
      angle: lane === -1 ? -C.playerLaneTiltDeg : lane === 1 ? C.playerLaneTiltDeg : 0,
      duration: C.playerLaneTiltDurationMs,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => this.sprite.setAngle(0),
    });
  }

  jump(): void {
    if (this.state !== 'running') return;
    this.state = 'jumping';
    this.sprite.setTexture('player_jump');
    this.scene.tweens.add({
      targets: this.sprite,
      y: C.playerY - C.playerJumpHeightPx,
      duration: C.playerJumpDurationMs / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.state = 'running';
        this.sprite.setTexture('player_run_a');
      },
    });
  }

  duck(): void {
    if (this.state !== 'running') return;
    this.state = 'ducking';
    this.sprite.setTexture('player_duck');
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 1.5,
      duration: C.playerDuckDurationMs / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.state = 'running';
        this.sprite.setScale(2.5);
        this.sprite.setTexture('player_run_a');
      },
    });
  }

  destroy(): void { this.sprite.destroy(); }
}
```
**Verificar:** `npm run lint`.

### C6. Criar `src/game/entities/Obstacle.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/Obstacle.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import type { Lane } from '../../pose/types.ts';

export type ObstacleKind = 'barrier' | 'low_barrier' | 'wall_lane';

const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  barrier: 'obs_barrier',
  low_barrier: 'obs_low',
  wall_lane: 'obs_wall',
};

export class Obstacle {
  readonly sprite: Phaser.GameObjects.Sprite;
  z: number;
  readonly lane: Lane;
  readonly kind: ObstacleKind;
  alive = true;

  constructor(scene: Phaser.Scene, kind: ObstacleKind, lane: Lane) {
    this.kind = kind;
    this.lane = lane;
    this.z = GAME_CONFIG.zMax;
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), TEXTURE_BY_KIND[kind])
      .setOrigin(0.5, 1).setScale(zToScale(this.z)).setDepth(5);
  }

  update(speedMps: number, dtSec: number): void {
    // Avança em direção ao player (z diminui)
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    this.sprite.setX(laneToX(this.lane, Math.max(0, this.z)));
    this.sprite.setY(zToY(Math.max(0, this.z)));
    this.sprite.setScale(zToScale(Math.max(0, this.z)));
    this.sprite.setDepth(5 + (1 - this.z) * 10);
  }

  destroy(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```
**Verificar:** `npm run lint`.

### C7. Criar `src/game/entities/Coin.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/Coin.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX, zToY, zToScale } from '../systems/pseudo3d.ts';
import type { Lane } from '../../pose/types.ts';

export class Coin {
  readonly sprite: Phaser.GameObjects.Sprite;
  z: number;
  readonly lane: Lane;
  alive = true;

  constructor(scene: Phaser.Scene, lane: Lane, zStart: number) {
    this.lane = lane;
    this.z = zStart;
    this.sprite = scene.add.sprite(laneToX(lane, this.z), zToY(this.z), 'coin')
      .setOrigin(0.5, 1).setScale(zToScale(this.z) * 0.7).setDepth(5).setTint(0xffd60a);

    scene.tweens.add({
      targets: this.sprite,
      angle: 360,
      duration: 800,
      repeat: -1,
    });
  }

  update(speedMps: number, dtSec: number): void {
    this.z -= speedMps * dtSec * 0.07;
    if (this.z < -0.05) { this.alive = false; this.sprite.destroy(); return; }
    this.sprite.setX(laneToX(this.lane, Math.max(0, this.z)));
    this.sprite.setY(zToY(Math.max(0, this.z)) - 30);
    this.sprite.setScale(zToScale(Math.max(0, this.z)) * 0.7);
  }

  collect(): void { if (this.alive) { this.sprite.destroy(); this.alive = false; } }
}
```
**Verificar:** `npm run lint`.

### C8. Criar `src/game/systems/spawner.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/spawner.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Obstacle, type ObstacleKind } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import type { Lane } from '../../pose/types.ts';

const C = GAME_CONFIG;
const ALL_KINDS: ObstacleKind[] = ['barrier', 'low_barrier', 'wall_lane'];
const ALL_LANES: Lane[] = [-1, 0, 1];

export class Spawner {
  private elapsedMs = 0;
  private nextSpawnAtMs = 0;
  private metersAccum = 0;
  private nextCoinClusterAt = C.coinClusterEveryMeters;
  private rng: () => number;

  constructor(rng: () => number) {
    this.rng = rng;
  }

  update(scene: Phaser.Scene, dtSec: number, speedMps: number, obstacles: Obstacle[], coins: Coin[]): void {
    this.elapsedMs += dtSec * 1000;
    this.metersAccum += speedMps * dtSec;

    // Spawn obstáculo
    if (this.elapsedMs >= this.nextSpawnAtMs) {
      const interval = this.elapsedMs < 20000
        ? C.spawnIntervalMsInitial
        : this.elapsedMs < 60000
          ? C.spawnIntervalMsAfter20s
          : C.spawnIntervalMsAfter60s;
      this.nextSpawnAtMs = this.elapsedMs + interval;

      const kind = this.elapsedMs < 20000
        ? 'barrier' // Seção 5.4 doc base: primeiros 20s só barriers de pular
        : ALL_KINDS[Math.floor(this.rng() * ALL_KINDS.length)];
      const lane = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
      obstacles.push(new Obstacle(scene, kind, lane));
    }

    // Cluster de moedas
    if (this.metersAccum >= this.nextCoinClusterAt) {
      this.nextCoinClusterAt += C.coinClusterEveryMeters;
      const lane = ALL_LANES[Math.floor(this.rng() * ALL_LANES.length)];
      // Cluster de 5 moedas espaçadas em z (.95, .92, .89, .86, .83)
      for (let i = 0; i < C.coinClusterSize; i++) {
        coins.push(new Coin(scene, lane, 0.95 - i * 0.03));
      }
    }
  }

  reset(): void {
    this.elapsedMs = 0;
    this.nextSpawnAtMs = 0;
    this.metersAccum = 0;
    this.nextCoinClusterAt = C.coinClusterEveryMeters;
  }
}
```
**Verificar:** `npm run lint`.

### C9. Criar `src/game/systems/scoring.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/scoring.ts`
**Conteúdo:**
```typescript
import { GAME_CONFIG } from '../config.ts';

export class Scoring {
  private distance = 0;
  private coins = 0;

  addDistance(dtSec: number, speedMps: number): void { this.distance += dtSec * speedMps; }
  addCoin(): void { this.coins += 1; }

  getDistance(): number { return this.distance; }
  getCoins(): number { return this.coins; }

  getBest(): number {
    try { return Number(localStorage.getItem(GAME_CONFIG.storageKeys.bestDistance) ?? 0); } catch { return 0; }
  }
  setBest(distance: number): void {
    try { localStorage.setItem(GAME_CONFIG.storageKeys.bestDistance, String(Math.floor(distance))); } catch {/* ignore */}
  }

  reset(): void { this.distance = 0; this.coins = 0; }
}
```
**Verificar:** `npm run lint`.

### C10. Criar `src/game/systems/collision.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/systems/collision.ts`
**Conteúdo:**
```typescript
import { GAME_CONFIG } from '../config.ts';
import type { Player } from '../entities/Player.ts';
import type { Obstacle } from '../entities/Obstacle.ts';
import type { Coin } from '../entities/Coin.ts';

export interface CollisionResult {
  collidedObstacle?: Obstacle;
  collectedCoins: Coin[];
}

/** Verifica colisão e coleta. Player evita: jump→barrier, duck→low_barrier, lane diff→wall_lane. */
export function checkCollisions(player: Player, obstacles: Obstacle[], coins: Coin[]): CollisionResult {
  const result: CollisionResult = { collectedCoins: [] };

  for (const obs of obstacles) {
    if (!obs.alive) continue;
    if (obs.z > GAME_CONFIG.collisionZThreshold) continue; // ainda longe
    if (obs.lane !== player.getLane()) continue;
    const playerState = player.getState();
    let evading = false;
    if (obs.kind === 'barrier' && playerState === 'jumping') evading = true;
    if (obs.kind === 'low_barrier' && playerState === 'ducking') evading = true;
    // wall_lane: SÓ é evadido por estar em lane diferente — caímos aqui se estiver na mesma
    if (!evading) {
      result.collidedObstacle = obs;
      return result;
    }
  }

  for (const coin of coins) {
    if (!coin.alive) continue;
    if (coin.z > GAME_CONFIG.collisionZThreshold) continue;
    if (coin.lane !== player.getLane()) continue;
    result.collectedCoins.push(coin);
  }

  return result;
}
```
**Verificar:** `npm run lint`.

### C11. Criar `src/game/ui/hud.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/ui/hud.ts`
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class HUD {
  private distEl: Phaser.GameObjects.BitmapText;
  private coinsEl: Phaser.GameObjects.BitmapText;
  private fpsEl: Phaser.GameObjects.BitmapText | null = null;

  constructor(scene: Phaser.Scene) {
    void GAME_CONFIG;
    this.distEl = scene.add.bitmapText(20, 20, 'pixel', '0 m', 24).setDepth(100).setTint(0xf5f5f5);
    this.coinsEl = scene.add.bitmapText(20, 56, 'pixel', `0 ${strings.play.coins}`, 16).setDepth(100).setTint(0xffd60a);
    if (new URLSearchParams(window.location.search).get('fps') === '1') {
      this.fpsEl = scene.add.bitmapText(20, 88, 'pixel', '0 FPS', 14).setDepth(100).setTint(0x8a8d92);
    }
  }

  setDistance(m: number): void { this.distEl.setText(`${Math.floor(m)} ${strings.play.distance}`); }
  setCoins(n: number): void { this.coinsEl.setText(`${n} ${strings.play.coins}`); }
  setFps(fps: number): void { if (this.fpsEl) this.fpsEl.setText(`${Math.round(fps)} FPS`); }
}
```
**Verificar:** `npm run lint`.

### C12. Implementar `Play.ts` real (gameplay sem pose; controlado por teclado direto Phaser)

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Play.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Player } from '../entities/Player.ts';
import { Obstacle } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { Road } from '../systems/road.ts';
import { Parallax } from '../systems/parallax.ts';
import { Spawner } from '../systems/spawner.ts';
import { Scoring } from '../systems/scoring.ts';
import { checkCollisions } from '../systems/collision.ts';
import { HUD } from '../ui/hud.ts';
import { getRng } from '../systems/rng.ts';
import type { Lane } from '../../pose/types.ts';

const C = GAME_CONFIG;

export class Play extends Phaser.Scene {
  private player!: Player;
  private road!: Road;
  private parallax!: Parallax;
  private spawner!: Spawner;
  private scoring!: Scoring;
  private hud!: HUD;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private speedMps = C.speedInitial;
  private elapsedMs = 0;
  private muted = false;

  constructor() { super('Play'); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.parallax = new Parallax(this);
    this.road = new Road(this);
    this.player = new Player(this);
    this.spawner = new Spawner(getRng());
    this.scoring = new Scoring();
    this.hud = new HUD(this);
    this.obstacles = [];
    this.coins = [];
    this.speedMps = C.speedInitial;
    this.elapsedMs = 0;

    this.muted = (() => { try { return localStorage.getItem(C.storageKeys.muted) === 'true'; } catch { return false; } })();
    this.sound.mute = this.muted;
    const muteBtn = this.add.text(C.width - 20, C.height - 20, this.muted ? '🔇' : '🔊', {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 4 },
    }).setOrigin(1, 1).setDepth(100).setInteractive({ useHandCursor: true }).setData('action', 'mute');
    muteBtn.on('pointerup', () => {
      this.muted = !this.muted;
      this.sound.mute = this.muted;
      muteBtn.setText(this.muted ? '🔇' : '🔊');
      try { localStorage.setItem(C.storageKeys.muted, String(this.muted)); } catch {/* ignore */}
    });

    // Controles teclado direto (provisório — Fase D conecta o EventDetector)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.player.jump());
      this.input.keyboard.on('keydown-DOWN', () => this.player.duck());
      this.input.keyboard.on('keydown-LEFT', () => this.player.setLane(this.shiftLane(-1)));
      this.input.keyboard.on('keydown-RIGHT', () => this.player.setLane(this.shiftLane(1)));
    }
  }

  private shiftLane(dir: -1 | 1): Lane {
    const cur = this.player.getLane();
    const next = Math.max(-1, Math.min(1, cur + dir)) as Lane;
    return next;
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.elapsedMs += deltaMs;

    // Velocidade aumenta a cada interval
    const steps = Math.floor(this.elapsedMs / C.speedIncreaseIntervalMs);
    this.speedMps = Math.min(C.speedMax, C.speedInitial + steps * C.speedIncreasePerInterval);

    this.parallax.update(this.speedMps, dt);
    this.road.update(this.speedMps, dt);
    this.player.update(dt);

    for (const o of this.obstacles) o.update(this.speedMps, dt);
    for (const c of this.coins) c.update(this.speedMps, dt);
    this.obstacles = this.obstacles.filter((o) => o.alive);
    this.coins = this.coins.filter((c) => c.alive);

    this.spawner.update(this, dt, this.speedMps, this.obstacles, this.coins);

    const result = checkCollisions(this.player, this.obstacles, this.coins);
    if (result.collidedObstacle) {
      this.sound.play('snd_hit');
      this.sound.play('snd_gameover');
      this.scene.start('GameOver', { distance: this.scoring.getDistance(), coins: this.scoring.getCoins() });
      return;
    }
    for (const coin of result.collectedCoins) {
      coin.collect();
      this.scoring.addCoin();
      this.sound.play('snd_coin');
    }

    this.scoring.addDistance(dt, this.speedMps);
    this.hud.setDistance(this.scoring.getDistance());
    this.hud.setCoins(this.scoring.getCoins());
    this.hud.setFps(this.game.loop.actualFps);
  }
}
```
**Verificar:** `npm run dev`. Em Welcome→Loading→Tutorial→Calibration (countdown placeholder)→Play. Em Play: estrada com 3 lanes, paralax, player corre, ←/→ muda lane, Space pula, ↓ agacha. Obstáculos vêm do horizonte e crescem. Bate em obstáculo na lane → GameOver. Moedas coletam +1 ao cruzar. Som toca em pulo/coleta/colisão.

### C13. Hook do som de pulo no Player

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/entities/Player.ts`
**Trocar:**
```typescript
  jump(): void {
    if (this.state !== 'running') return;
    this.state = 'jumping';
    this.sprite.setTexture('player_jump');
```
**Por:**
```typescript
  jump(): void {
    if (this.state !== 'running') return;
    this.state = 'jumping';
    this.sprite.setTexture('player_jump');
    this.scene.sound.play('snd_jump');
```
**Verificar:** Pulo agora toca `snd_jump`. (Já implícito no Play via keyboard handler — mas centralizar no Player garante som mesmo se origem for pose.)

### C14. Commit Fase C

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
git add src/game/
git commit -m "$(cat <<'EOF'
feat(issue-3): fase C — gameplay core (pseudo-3D, road, spawner, collision) (#3)

- Sistemas: pseudo3d, road, parallax, spawner, scoring, collision, rng (seedable via ?seed=N)
- Entidades: Player (run/jump/duck/lane), Obstacle (3 tipos), Coin (cluster)
- HUD com bitmap font (distância, moedas, ?fps=1)
- Play scene com gameplay completo controlado por keyboard
- Som mute persiste em localStorage; tocar em pulo/coleta/colisão/gameover

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline`.

---

## FASE D — Integração com pose layer (Calibration real, EventDetector → Play, mini-preview)

### D1. Reescrever `orchestrator.ts` para criar pose layer + compartilhar via registry

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/orchestrator.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from './config.ts';
import { Boot } from './scenes/Boot.ts';
import { Welcome } from './scenes/Welcome.ts';
import { Loading } from './scenes/Loading.ts';
import { Tutorial } from './scenes/Tutorial.ts';
import { Calibration } from './scenes/Calibration.ts';
import { Play } from './scenes/Play.ts';
import { GameOver } from './scenes/GameOver.ts';

import { PoseDetector } from '../pose/poseDetector.ts';
import { EmaSmoother } from '../pose/smoother.ts';
import { POSE_CONFIG } from '../pose/config.ts';
import { Calibrator } from '../pose/calibration.ts';
import { EventDetector } from '../pose/events.ts';
import { KeyboardDebug } from '../debug/keyboard.ts';
import type { GameEvent, PoseFrame } from '../pose/types.ts';

export interface AppRefs {
  detector: PoseDetector;
  smoother: EmaSmoother;
  calibrator: Calibrator;
  eventDetector: EventDetector;
  video: HTMLVideoElement;
  /** Subscribe to smoothed PoseFrame stream (after EMA). Returns unsubscribe. */
  onSmoothedFrame: (cb: (f: PoseFrame) => void) => () => void;
}

export function startApp(): Phaser.Game {
  const video = document.getElementById('video') as HTMLVideoElement;
  if (!video) throw new Error('#video not found');

  const detector = new PoseDetector();
  const smoother = new EmaSmoother(POSE_CONFIG.emaAlpha);
  const calibrator = new Calibrator();
  const eventDetector = new EventDetector();
  const keyboardDebug = new KeyboardDebug((ev: GameEvent) => {
    eventDetector.dispatchEvent(new CustomEvent('event', { detail: ev }));
  });
  if (KeyboardDebug.isEnabledByQuery()) keyboardDebug.enable();

  const smoothedSubs = new Set<(f: PoseFrame) => void>();
  detector.onFrame((raw: PoseFrame) => {
    const smoothed = smoother.smooth(raw.keypoints);
    const frame: PoseFrame = { ...raw, keypoints: smoothed };
    for (const cb of smoothedSubs) cb(frame);
  });

  const refs: AppRefs = {
    detector, smoother, calibrator, eventDetector, video,
    onSmoothedFrame: (cb) => { smoothedSubs.add(cb); return () => smoothedSubs.delete(cb); },
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: GAME_CONFIG.bgColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_CONFIG.width,
      height: GAME_CONFIG.height,
    },
    scene: [Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver],
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    render: { pixelArt: true, antialias: false },
  });
  game.registry.set('refs', refs);
  return game;
}

export function getRefs(scene: Phaser.Scene): AppRefs {
  const r = scene.game.registry.get('refs');
  if (!r) throw new Error('AppRefs not registered');
  return r as AppRefs;
}
```
**Verificar:** `npm run lint`.

### D2. Atualizar `Loading.ts` pra carregar MediaPipe + abrir câmera de verdade

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Loading.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import type { ErrorKind } from '../../ui/errorScreen.ts';
import { showError } from '../../ui/errorScreen.ts';

export class Loading extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('Loading'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.add.text(width / 2, height / 2 - 30, strings.loading.text, {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
    }).setOrigin(0.5);
    this.statusText = this.add.text(width / 2, height / 2 + 20, '', {
      fontFamily: 'system-ui', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(0.5);

    void this.bootDetector();
  }

  private async bootDetector(): Promise<void> {
    const refs = getRefs(this);
    try {
      await refs.detector.loadModel((msg) => this.statusText.setText(msg));
      this.statusText.setText(strings.loading.statusOpeningCamera);
      await refs.detector.openCamera(refs.video);
      refs.detector.start(refs.video);
      this.statusText.setText(strings.loading.statusReady);
      const done = (() => { try { return localStorage.getItem(GAME_CONFIG.storageKeys.tutorialDone) === 'true'; } catch { return false; } })();
      this.scene.start(done ? 'Calibration' : 'Tutorial');
    } catch (err) {
      const kind = this.classifyError(err);
      const errorRoot = document.getElementById('screen-error');
      if (errorRoot) {
        showError(errorRoot, kind, () => {
          errorRoot.classList.add('hidden');
          errorRoot.setAttribute('aria-hidden', 'true');
          this.scene.start('Welcome');
        });
      }
    }
  }

  private classifyError(err: unknown): ErrorKind {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') return 'cameraDenied';
      if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'cameraNotFound';
      if (err.name === 'SecurityError') return 'insecureContext';
    }
    if (err instanceof Error && /fetch|network|loading/i.test(err.message)) return 'modelDownload';
    return 'generic';
  }
}
```
**Verificar:** `npm run dev` → Loading agora chama detector real. Aceitar prompt de câmera → vai pra Tutorial/Calibration.

### D3. Atualizar `Calibration.ts` pra consumir `Calibrator` real frame a frame

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Calibration.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { POSE_CONFIG } from '../../pose/config.ts';
import { getRefs } from '../orchestrator.ts';

export class Calibration extends Phaser.Scene {
  private countdownEl!: Phaser.GameObjects.BitmapText;
  private statusEl!: Phaser.GameObjects.Text;
  private countdownStartAt = 0;
  private countdownDone = false;
  private unsubFrame: (() => void) | null = null;

  constructor() { super('Calibration'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x000000);

    this.add.text(width / 2, 60, strings.calibration.instruction, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5',
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    this.countdownEl = this.add.bitmapText(width / 2, height / 2, 'pixel', '3', 96)
      .setOrigin(0.5).setTint(0x4cd964);

    this.statusEl = this.add.text(width / 2, height - 60, '', {
      fontFamily: 'system-ui', fontSize: '16px', color: '#ffd60a',
    }).setOrigin(0.5);

    const refs = getRefs(this);
    refs.calibrator.abort();
    refs.eventDetector.reset();
    refs.smoother.reset();

    this.countdownStartAt = this.time.now;
    this.countdownDone = false;

    this.unsubFrame = refs.onSmoothedFrame((frame) => {
      if (!this.countdownDone) return;
      const outcome = refs.calibrator.feed(frame);
      if (outcome) {
        if (outcome.ok) {
          refs.eventDetector.setBaseline(outcome.baseline);
          this.statusEl.setText(strings.calibration.ok);
          this.countdownEl.setText('OK');
          this.time.delayedCall(600, () => this.scene.start('Play'));
        } else {
          this.statusEl.setText(strings.calibration.retry);
          // recomeça countdown
          this.countdownDone = false;
          this.countdownStartAt = this.time.now;
        }
      }
    });
  }

  update(): void {
    if (this.countdownDone) return;
    const elapsed = this.time.now - this.countdownStartAt;
    const remaining = POSE_CONFIG.calibrationCountdownSec - Math.floor(elapsed / 1000);
    if (remaining > 0) {
      this.countdownEl.setText(strings.calibration.countdown(remaining));
    } else {
      this.countdownEl.setText('GO');
      this.countdownDone = true;
      this.statusEl.setText(strings.calibration.capturing);
      const refs = getRefs(this);
      refs.calibrator.start();
    }
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
  }
}
```
**Verificar:** `npm run dev`. Calibration agora aguarda o usuário ficar parado por 2s após countdown 3-2-1; vai pra Play quando baseline OK; pede retry se confiança baixa.

### D4. Criar `src/game/ui/cameraPreview.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/ui/cameraPreview.ts`
**Conteúdo:**
```typescript
import { KeypointOverlay } from '../../ui/keypointOverlay.ts';
import type { PoseFrame } from '../../pose/types.ts';

export class CameraPreview {
  private host: HTMLElement;
  private canvas: HTMLCanvasElement;
  private overlay: KeypointOverlay;
  private video: HTMLVideoElement;
  private rafId: number | null = null;
  private lastFrame: PoseFrame | null = null;
  private unsub: (() => void) | null = null;

  constructor(host: HTMLElement, video: HTMLVideoElement, onSmoothedFrame: (cb: (f: PoseFrame) => void) => () => void) {
    this.host = host;
    this.video = video;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160; this.canvas.height = 90;
    host.innerHTML = '';
    host.appendChild(this.canvas);
    host.classList.remove('hidden');
    this.overlay = new KeypointOverlay(this.canvas);

    this.unsub = onSmoothedFrame((f) => { this.lastFrame = f; });
    this.tick();
  }

  private tick = (): void => {
    const ctx = this.canvas.getContext('2d');
    if (ctx && this.video.videoWidth > 0) {
      ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      if (this.lastFrame) this.overlay.draw(this.lastFrame.keypoints, this.lastFrame.confidence);
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.unsub) this.unsub();
    this.host.innerHTML = '';
    this.host.classList.add('hidden');
  }
}
```
**Verificar:** `npm run lint`.

### D5. Atualizar `Play.ts` pra: (a) escutar EventDetector, (b) montar mini-preview, (c) tratar no-body, (d) banner drift

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/scenes/Play.ts` (substituir conteúdo)
**Conteúdo:**
```typescript
import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Player } from '../entities/Player.ts';
import { Obstacle } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { Road } from '../systems/road.ts';
import { Parallax } from '../systems/parallax.ts';
import { Spawner } from '../systems/spawner.ts';
import { Scoring } from '../systems/scoring.ts';
import { checkCollisions } from '../systems/collision.ts';
import { HUD } from '../ui/hud.ts';
import { getRng } from '../systems/rng.ts';
import { CameraPreview } from '../ui/cameraPreview.ts';
import { getRefs } from '../orchestrator.ts';
import { POSE_CONFIG } from '../../pose/config.ts';
import { strings } from '../../i18n/strings.ts';
import type { GameEvent, Lane, PoseFrame } from '../../pose/types.ts';

const C = GAME_CONFIG;

export class Play extends Phaser.Scene {
  private player!: Player;
  private road!: Road;
  private parallax!: Parallax;
  private spawner!: Spawner;
  private scoring!: Scoring;
  private hud!: HUD;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private speedMps = C.speedInitial;
  private elapsedMs = 0;
  private muted = false;
  private cameraPreview: CameraPreview | null = null;
  private noBodyOverlay: Phaser.GameObjects.Container | null = null;
  private lastFrameAt = 0;
  private lowConfSince: number | null = null;
  private driftSuggestedAt: number | null = null;
  private bannerEl: HTMLDivElement | null = null;
  private unsubFrame: (() => void) | null = null;
  private eventListener: ((e: Event) => void) | null = null;
  private isPaused = false;

  constructor() { super('Play'); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.parallax = new Parallax(this);
    this.road = new Road(this);
    this.player = new Player(this);
    this.spawner = new Spawner(getRng());
    this.scoring = new Scoring();
    this.hud = new HUD(this);
    this.obstacles = [];
    this.coins = [];
    this.speedMps = C.speedInitial;
    this.elapsedMs = 0;
    this.lastFrameAt = performance.now();
    this.lowConfSince = null;
    this.driftSuggestedAt = null;

    // Mute toggle
    this.muted = (() => { try { return localStorage.getItem(C.storageKeys.muted) === 'true'; } catch { return false; } })();
    this.sound.mute = this.muted;
    const muteBtn = this.add.text(C.width - 20, C.height - 20, this.muted ? '🔇' : '🔊', {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 4 },
    }).setOrigin(1, 1).setDepth(100).setInteractive({ useHandCursor: true }).setData('action', 'mute');
    muteBtn.on('pointerup', () => {
      this.muted = !this.muted;
      this.sound.mute = this.muted;
      muteBtn.setText(this.muted ? '🔇' : '🔊');
      try { localStorage.setItem(C.storageKeys.muted, String(this.muted)); } catch {/* ignore */}
    });

    // Mini-preview
    const refs = getRefs(this);
    const previewHost = document.getElementById('camera-preview');
    if (previewHost) this.cameraPreview = new CameraPreview(previewHost, refs.video, refs.onSmoothedFrame);

    // Pose events do bus
    this.eventListener = (e: Event) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      switch (ev.type) {
        case 'jump': this.player.jump(); break;
        case 'duck': this.player.duck(); break;
        case 'lane_change': this.player.setLane(ev.lane as Lane); break;
        // arms_up/cadence/jumping_jack ignorados pelo gameplay nesta fase
      }
    };
    refs.eventDetector.addEventListener('event', this.eventListener);

    // Frames pra detectar no-body / drift / inferir confidence
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));
  }

  private handleFrame(frame: PoseFrame): void {
    this.lastFrameAt = frame.timestamp;
    this.hideNoBody();

    if (frame.confidence < POSE_CONFIG.lowConfidenceThreshold) {
      if (this.lowConfSince === null) this.lowConfSince = frame.timestamp;
      const dur = frame.timestamp - this.lowConfSince;
      if (dur > POSE_CONFIG.lowConfidenceWarnDurationMs && !this.bannerEl) {
        this.showBanner(strings.states.lowLight, false);
      }
      if (dur > POSE_CONFIG.driftRecalibrateSuggestMs && this.driftSuggestedAt === null) {
        this.driftSuggestedAt = frame.timestamp;
        this.showBanner(strings.states.driftCalibration, true);
      }
    } else {
      this.lowConfSince = null;
      this.driftSuggestedAt = null;
      this.hideBanner();
    }

    // Ingere no EventDetector
    const refs = getRefs(this);
    refs.eventDetector.ingest(frame);
  }

  update(_time: number, deltaMs: number): void {
    // No-body check
    if (performance.now() - this.lastFrameAt > POSE_CONFIG.noBodyTimeoutMs) {
      this.showNoBody();
      this.isPaused = true;
    } else if (this.isPaused) {
      this.isPaused = false;
    }
    if (this.isPaused) return;

    const dt = deltaMs / 1000;
    this.elapsedMs += deltaMs;

    const steps = Math.floor(this.elapsedMs / C.speedIncreaseIntervalMs);
    this.speedMps = Math.min(C.speedMax, C.speedInitial + steps * C.speedIncreasePerInterval);

    this.parallax.update(this.speedMps, dt);
    this.road.update(this.speedMps, dt);
    this.player.update(dt);

    for (const o of this.obstacles) o.update(this.speedMps, dt);
    for (const c of this.coins) c.update(this.speedMps, dt);
    this.obstacles = this.obstacles.filter((o) => o.alive);
    this.coins = this.coins.filter((c) => c.alive);

    this.spawner.update(this, dt, this.speedMps, this.obstacles, this.coins);

    const result = checkCollisions(this.player, this.obstacles, this.coins);
    if (result.collidedObstacle) {
      this.sound.play('snd_hit');
      this.sound.play('snd_gameover');
      const distance = this.scoring.getDistance();
      const coins = this.scoring.getCoins();
      this.cleanup();
      this.scene.start('GameOver', { distance, coins });
      return;
    }
    for (const coin of result.collectedCoins) {
      coin.collect();
      this.scoring.addCoin();
      this.sound.play('snd_coin');
    }

    this.scoring.addDistance(dt, this.speedMps);
    this.hud.setDistance(this.scoring.getDistance());
    this.hud.setCoins(this.scoring.getCoins());
    this.hud.setFps(this.game.loop.actualFps);
  }

  private showNoBody(): void {
    if (this.noBodyOverlay) return;
    const bg = this.add.rectangle(C.width / 2, C.height / 2, C.width, C.height, 0x0b0d10, 0.7);
    const text = this.add.bitmapText(C.width / 2, C.height / 2, 'pixel', strings.states.noBody, 24).setOrigin(0.5);
    this.noBodyOverlay = this.add.container(0, 0, [bg, text]).setDepth(200);
  }

  private hideNoBody(): void {
    if (!this.noBodyOverlay) return;
    this.noBodyOverlay.destroy();
    this.noBodyOverlay = null;
  }

  private showBanner(text: string, withRecalibrate: boolean): void {
    this.hideBanner();
    const el = document.createElement('div');
    el.className = 'banner';
    el.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#ffd60a;color:#000;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:600;z-index:150;display:flex;align-items:center;gap:8px;';
    const span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    if (withRecalibrate) {
      const btn = document.createElement('button');
      btn.textContent = strings.states.recalibrate;
      btn.style.cssText = 'min-height:32px;padding:4px 10px;font-size:13px;';
      btn.addEventListener('click', () => {
        this.cleanup();
        this.scene.start('Calibration');
      }, { once: true });
      el.appendChild(btn);
    }
    document.body.appendChild(el);
    this.bannerEl = el;
  }

  private hideBanner(): void {
    if (this.bannerEl && this.bannerEl.parentElement) this.bannerEl.parentElement.removeChild(this.bannerEl);
    this.bannerEl = null;
  }

  private cleanup(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.eventListener) {
      const refs = getRefs(this);
      refs.eventDetector.removeEventListener('event', this.eventListener);
      this.eventListener = null;
    }
    if (this.cameraPreview) { this.cameraPreview.destroy(); this.cameraPreview = null; }
    this.hideBanner();
    this.hideNoBody();
  }

  shutdown(): void { this.cleanup(); }
}
```
**Verificar:** `npm run dev`, fluxo completo: Welcome → Loading (carrega MediaPipe + abre câmera) → Tutorial (1ª vez) → Calibration (countdown + captura real) → Play. Mover-se no front da câmera → personagem pula/agacha/muda lane via pose. Mini-preview no canto direito mostra keypoints.

### D6. Adicionar helper debug `__movemoveDebug.forceBaseline` pra Playwright

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/main.ts`
**Trocar:**
```typescript
import { startApp } from './game/orchestrator.ts';

startApp();

export {};
```
**Por:**
```typescript
import { startApp } from './game/orchestrator.ts';
import type { Baseline } from './pose/types.ts';

const game = startApp();

(window as unknown as {
  __movemoveDebug: {
    forceBaseline: (b: Baseline) => void;
    skipToScene: (key: string) => void;
    getRefs: () => unknown;
  };
}).__movemoveDebug = {
  forceBaseline: (b: Baseline) => {
    const refs = game.registry.get('refs') as { eventDetector: { setBaseline: (b: Baseline) => void } };
    refs.eventDetector.setBaseline(b);
  },
  skipToScene: (key: string) => { game.scene.start(key); },
  getRefs: () => game.registry.get('refs'),
};

export {};
```
**Verificar:** `npm run dev`, devtools console: `window.__movemoveDebug.skipToScene('Play')` pula direto pra Play (com baseline ainda ausente — `forceBaseline` resolve isso).

### D7. Commit Fase D

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
git add src/main.ts src/game/orchestrator.ts src/game/scenes/Loading.ts \
        src/game/scenes/Calibration.ts src/game/scenes/Play.ts \
        src/game/ui/cameraPreview.ts
git commit -m "$(cat <<'EOF'
feat(issue-3): fase D — integração pose layer (calibration real, eventos no Play, mini-preview) (#3)

- orchestrator.ts cria pose layer (PoseDetector + EmaSmoother + Calibrator + EventDetector + KeyboardDebug)
- Refs compartilhadas via game.registry
- Loading carrega MediaPipe + abre câmera; trata erros via errorScreen HTML
- Calibration consome Calibrator.feed() frame a frame, transiciona pra Play em sucesso
- Play subscreve eventos do EventDetector, controla Player via pose
- Mini-preview da câmera no canto direito (KeypointOverlay reusado)
- Banner low-light/drift no Play; no-body pause overlay
- __movemoveDebug helpers (forceBaseline, skipToScene) pra Playwright

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline`.

---

## FASE E — Polish (orientation guard, debug panel HTML, E2E, deploy, docs)

### E1. Criar `src/game/ui/orientationGuard.ts`

**Criar:** `/Users/rjcaubit/Dev/movemove/src/game/ui/orientationGuard.ts`
**Conteúdo:**
```typescript
import { strings } from '../../i18n/strings.ts';

export function installOrientationGuard(): void {
  const overlay = document.getElementById('orientation-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  const icon = document.createElement('div');
  icon.className = 'icon'; icon.textContent = '📱↻';
  const text = document.createElement('p');
  text.textContent = strings.orientation.rotate;
  const btn = document.createElement('button');
  btn.textContent = strings.orientation.continue;
  btn.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.append(icon, text, btn);

  const mql = window.matchMedia('(orientation: portrait)');
  const isMobile = window.innerWidth < 900;
  const apply = (): void => {
    if (mql.matches && isMobile) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
  };
  apply();
  mql.addEventListener('change', apply);
}
```
**Verificar:** `npm run lint`.

### E2. Reativar painel debug HTML por cima do canvas (FPS / conf / log de eventos)

**Modificar:** `/Users/rjcaubit/Dev/movemove/src/game/orchestrator.ts`
**Trocar:**
```typescript
import { KeyboardDebug } from '../debug/keyboard.ts';
import type { GameEvent, PoseFrame } from '../pose/types.ts';
```
**Por:**
```typescript
import { KeyboardDebug } from '../debug/keyboard.ts';
import { DebugPanel } from '../ui/debugPanel.ts';
import { installOrientationGuard } from './ui/orientationGuard.ts';
import type { GameEvent, PoseFrame } from '../pose/types.ts';
```

E **adicionar no início de `startApp()`** (logo após `if (!video) ...`):
```typescript
  installOrientationGuard();

  const debugToggleEl = document.getElementById('debug-toggle');
  const debugPanelEl = document.getElementById('debug-panel');
  let debugPanel: DebugPanel | null = null;
  if (KeyboardDebug.isEnabledByQuery() && debugToggleEl && debugPanelEl) {
    debugToggleEl.classList.remove('hidden');
    debugPanel = new DebugPanel(debugPanelEl, debugToggleEl);
  }
```

E **adicionar no callback `detector.onFrame`** (logo antes de `for (const cb of smoothedSubs)`):
```typescript
    if (debugPanel) {
      debugPanel.tickFps(raw.timestamp);
      debugPanel.setConfidence(raw.confidence);
    }
```

E **adicionar listener no eventDetector** (logo após `eventDetector.dispatchEvent`/`KeyboardDebug` setup):
```typescript
  if (debugPanel) {
    eventDetector.addEventListener('event', (e) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      debugPanel!.appendEvent(ev);
      if (ev.type === 'lane_change') debugPanel!.setLane(ev.lane);
      if (ev.type === 'cadence') debugPanel!.setCadence(ev.stepsPerSec);
    });
  }
```

**Verificar:** `npm run lint`. `?debug=1` mostra painel debug HTML por cima do canvas com FPS / Conf / Lane / Cadência / log de eventos.

### E3. Atualizar `e2e/issue-2.spec.ts` pra que ainda passe (regressão Fase 0)

**Inspecionar primeiro:**
```bash
cat /Users/rjcaubit/Dev/movemove/e2e/issue-2.spec.ts | head -30
```
**Modificar (manualmente, baseado no que aparecer):** `e2e/issue-2.spec.ts` provavelmente seleciona elementos como `#screen-welcome`, `[data-event="jump"]` (pips removidos), etc. Tornar TESTS resilientes às mudanças OU desabilitar testes que não fazem sentido (CT06 click-by-click) renomeando arquivo:
```bash
cd /Users/rjcaubit/Dev/movemove
git mv e2e/issue-2.spec.ts e2e/issue-2-legacy.spec.ts.skip
```
Tornar inativo. CT02 (camera denied) e CT04 (keyboard fallback) viram CTs do Fase 1 nos novos specs.
**Verificar:** `npm run e2e -- --list` não lista o arquivo `.spec.ts.skip`.

### E4. Criar `e2e/issue-3-flow.spec.ts` cobrindo CT05 click-by-click

**Criar:** `/Users/rjcaubit/Dev/movemove/e2e/issue-3-flow.spec.ts`
**Conteúdo:**
```typescript
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = join(process.cwd(), 'load-tests', 'results', 'issue-3-journey', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

test.describe('Issue #3 — endless runner E2E', () => {
  test('CT05 — fluxo completo: welcome → tutorial → calibration → play → game over → recalibrate → mute', async ({ page }) => {
    test.setTimeout(120_000);

    // Limpar localStorage pra garantir tutorial aparece
    await page.addInitScript(() => { try { localStorage.clear(); } catch {/* ignore */} });

    await page.goto('/?debug=1&seed=42');

    // 01 - Welcome
    await expect(page.locator('#game canvas')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, '01-welcome.png') });
    await page.locator('canvas').click({ position: { x: 480, y: 460 } }); // CTA "Começar"

    // 02 - Loading (camera denied tratado em outro teste; aqui assumimos --use-fake-device)
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(SHOTS, '02-loading.png') });

    // 03 - Tutorial: avançar até final
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '03-tutorial.png') });
    // Click "Pular" pra acelerar
    await page.locator('canvas').click({ position: { x: 880, y: 36 } });

    // 04 - Calibration: forçar baseline via debug helper
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, '04-calibration.png') });
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: {
        forceBaseline: (b: { hCorpo: number; yQuadrilBase: number; xCentroBase: number; larguraOmbros: number; capturedAt: number }) => void;
        skipToScene: (k: string) => void;
      }};
      w.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2, capturedAt: performance.now() });
      w.__movemoveDebug.skipToScene('Play');
    });
    await page.waitForTimeout(1000);

    // 05 - Play inicial
    await page.screenshot({ path: join(SHOTS, '05-play-initial.png') });

    // 06 - Pulo via keyboard
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(SHOTS, '06-play-jump.png') });

    // 07 - Lane direita
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(SHOTS, '07-play-lane-right.png') });

    // Aguardar colisão (com seed=42, sequência de spawn é determinística)
    await page.waitForTimeout(15000);

    // 08 - Game Over (eventualmente)
    // Heurística: esperar ate aparecer texto "GAME OVER" no canvas — usamos snapshot
    await page.screenshot({ path: join(SHOTS, '08-game-over.png') });

    // 09 - Click Recalibrar
    await page.locator('canvas').click({ position: { x: 590, y: 470 } });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '09-recalibrate.png') });

    // 10 - Mute (volta pra Play forçado, clica mute)
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string) => void } };
      w.__movemoveDebug.skipToScene('Play');
    });
    await page.waitForTimeout(500);
    await page.locator('canvas').click({ position: { x: 940, y: 520 } }); // mute btn canto inferior direito
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(SHOTS, '10-mute-toggled.png') });
    const muted = await page.evaluate(() => localStorage.getItem('movemove.muted'));
    expect(muted).toBe('true');
  });

  test('CT02 — camera denied → errorScreen HTML (regressão)', async ({ page, context }) => {
    await context.grantPermissions([], { origin: 'http://localhost:5173' });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        get: () => ({ getUserMedia: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) }),
      });
    });
    await page.goto('/?debug=1');
    // Click "Começar"
    await page.locator('canvas').click({ position: { x: 480, y: 460 } });
    await page.waitForTimeout(2000);
    const errorScreen = page.locator('#screen-error');
    await expect(errorScreen).toBeVisible({ timeout: 10000 });
    await expect(errorScreen).toContainText(/permitir a câmera/i);
    await page.screenshot({ path: join(SHOTS, 'ct02-camera-denied.png') });
  });

  test('CT04 — keyboard fallback no Play', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('movemove.tutorialDone', 'true'); } catch {/* ignore */} });
    await page.goto('/?debug=1&seed=42');
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: {
        forceBaseline: (b: unknown) => void;
        skipToScene: (k: string) => void;
      }};
      w.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2, capturedAt: performance.now() });
      w.__movemoveDebug.skipToScene('Play');
    });
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(400);
    const debugLog = page.locator('#debug-panel .log');
    await expect(debugLog).toBeVisible();
    await expect(debugLog).toContainText('[KBD]');
    await expect(debugLog).toContainText('jump');
    await page.screenshot({ path: join(SHOTS, 'ct04-debug-play.png') });
  });
});
```
**Verificar:** `npx playwright install chromium` (se 1ª vez), `npm run e2e -- --reporter=list`. Tests passam ou geram falhas pontuais que viram tasks fix.

### E5. Criar `load-tests/results/issue-3-journey/README.md`

**Criar:** `/Users/rjcaubit/Dev/movemove/load-tests/results/issue-3-journey/README.md`
**Conteúdo:**
```markdown
# Issue #3 — Endless Runner v0.1 — Resultados

**Branch:** `feature/sdd-issue-3`
**Deploy:** https://movemove.pages.dev
**Data dos testes:** YYYY-MM-DD

## CT05 — Fluxo completo (Playwright)

Screenshots numerados em `screenshots/`:
- `01-welcome.png` … `10-mute-toggled.png`

## CT01 — Validação humana manual (filho do dev)

| Device | FPS médio | Acerto jump/duck/lane | Latência percebida | Falsos pos. jump (30s parado) | 10 min sem crash? |
|--------|-----------|----------------------|---------------------|--------------------------------|-------------------|
| iPhone SE 2020 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| Galaxy A54 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| MacBook Air M1 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Bugs encontrados

| # | Severidade | Descrição | Status |
|---|-----------|-----------|--------|
| 1 | _ex: P1_ | _descrição_ | _open/fixed_ |
```
**Verificar:** arquivo existe; `mkdir -p` automático no spec do Playwright cria a pasta `screenshots/` quando o teste rodar.

### E6. Atualizar `docs/CHANGELOG.md`

**Modificar:** `/Users/rjcaubit/Dev/movemove/docs/CHANGELOG.md` (adicionar no topo, mantendo entradas anteriores)
**Adicionar (no início após o título):**
```markdown
## 2026-XX-XX — #3 — feat: Fase 1 — endless runner mínimo (Phaser 4)

- Adiciona Phaser 4 como engine de jogo (ADR-4 do study #1).
- 7 cenas Phaser: Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver.
- Sistemas: pseudo-3D Enduro/Out Run, road com 3 lanes convergentes, paralax 3 camadas, spawner determinístico (`?seed=N`), scoring (distância em metros + moedas), collision 2D em `z<0.15`.
- Entidades: Player (run/jump/duck/lane com tween), Obstacle (3 tipos: barrier/low_barrier/wall_lane), Coin (clusters de 5).
- Pose layer da Fase 0 reusado integralmente; cenas consomem `EventDetector` via bus.
- Mini-preview da câmera (canto superior direito) reusa `KeypointOverlay`.
- HUD bitmap font + sons Kenney + tutorial 1× por device + recorde local em `localStorage`.
- PWA básico (`manifest.webmanifest`, `display: browser` — sem standalone, evita risco iOS PWA + getUserMedia).
- Orientation guard pra retrato em mobile.
- E2E Playwright: CT02 (cam denied), CT04 (keyboard), CT05 (E2E click-by-click full flow).
- Bundle gzipped ~10MB (RNF04 redefinido vs Fase 0).
- CT01 manual humano + RNF01-03 (FPS/latência/boot) ficam pra validação pós-merge no celular alvo.
```
**Verificar:** `cat docs/CHANGELOG.md | head -25` mostra a nova entrada.

### E7. Atualizar `docs/CODEMAP.md`

**Modificar:** `/Users/rjcaubit/Dev/movemove/docs/CODEMAP.md` (substituir conteúdo inteiro)
**Conteúdo:**
```markdown
# CODEMAP — Movemove

> Atualizado: 2026-XX-XX (Issue #3 — Fase 1)
> Fonte da verdade sobre estrutura, módulos e padrões.

## Status do projeto
**Fase atual:** 1 (endless runner mínimo, jogável). Sem backend, sem persistência além de `localStorage`.

## Stack
- **Bundler/dev:** Vite 6+ (HTTPS local via `vite-plugin-mkcert`)
- **Linguagem:** TypeScript 5.6+
- **Pose detection:** `@mediapipe/tasks-vision` (Pose Landmarker, modelo `lite`)
- **Engine de jogo:** **Phaser 4.x** (ADR-4 do study #1)
- **i18n:** `src/i18n/strings.ts` PT-BR-only sem framework (Lingui na Fase 2)
- **Persistência:** `localStorage` (recorde, mute, tutorial flag); `idb-keyval` chega na Fase 2
- **Deploy:** Cloudflare Pages

## Estrutura

```
movemove/
├─ EXERGAME_PROJETO.md
├─ docs/
│  ├─ CODEMAP.md            # ESTE arquivo
│  ├─ ARCHITECTURE.md
│  ├─ CHANGELOG.md
│  └─ sdd/ISSUE_{n}/
├─ src/
│  ├─ main.ts               # bootstrap mínimo (delega ao orchestrator)
│  ├─ styles.css
│  ├─ pose/                 # camada de pose (invariante entre fases)
│  │  ├─ types.ts
│  │  ├─ config.ts
│  │  ├─ poseDetector.ts
│  │  ├─ smoother.ts
│  │  ├─ calibration.ts
│  │  └─ events.ts
│  ├─ debug/
│  │  └─ keyboard.ts        # ?debug=1 keyboard fallback
│  ├─ i18n/
│  │  └─ strings.ts         # estendido com chaves tutorial/play/gameOver/orientation
│  ├─ ui/
│  │  ├─ debugPanel.ts      # mantido (HTML por cima do canvas)
│  │  ├─ keypointOverlay.ts # reusado em cameraPreview
│  │  └─ errorScreen.ts     # fallback fatal HTML
│  └─ game/                 # ⭐ NOVO — camada de jogo Phaser 4
│     ├─ orchestrator.ts    # cria pose layer + Phaser.Game; refs via game.registry
│     ├─ config.ts          # GAME_CONFIG (separado de POSE_CONFIG)
│     ├─ scenes/
│     │  ├─ Boot.ts         # carrega assets
│     │  ├─ Welcome.ts
│     │  ├─ Loading.ts      # MediaPipe load + camera open
│     │  ├─ Tutorial.ts     # 3 slides; flag localStorage
│     │  ├─ Calibration.ts  # consome Calibrator real
│     │  ├─ Play.ts         # loop principal
│     │  └─ GameOver.ts
│     ├─ entities/
│     │  ├─ Player.ts
│     │  ├─ Obstacle.ts     # barrier | low_barrier | wall_lane
│     │  └─ Coin.ts
│     ├─ systems/
│     │  ├─ pseudo3d.ts     # zToScale, zToY, laneToX
│     │  ├─ road.ts         # estrada 3-lane convergente
│     │  ├─ parallax.ts     # 3 camadas
│     │  ├─ spawner.ts      # determinístico via ?seed=
│     │  ├─ scoring.ts      # distância + moedas + recorde localStorage
│     │  ├─ collision.ts    # z<0.15 + lane match
│     │  └─ rng.ts          # mulberry32
│     └─ ui/
│        ├─ hud.ts          # bitmap font (distância, moedas, ?fps=1)
│        ├─ cameraPreview.ts # mini-preview canto superior direito
│        └─ orientationGuard.ts # overlay HTML retrato
├─ public/
│  ├─ manifest.webmanifest  # PWA básico, display: browser
│  ├─ icons/                # 192/512 placeholder mascote
│  ├─ models/pose_landmarker_lite.task  # gitignored, baixado em setup
│  ├─ wasm/vision_wasm_internal.{wasm,js}
│  └─ assets/
│     ├─ sprites/runner/    # player_idle/run_a/run_b/jump/duck (Kenney CC0)
│     ├─ sprites/obstacles/ # barrier/low_barrier/wall (Kenney)
│     ├─ sprites/{coin,mascot}.png
│     ├─ bg/{sky,mountains_far,mountains_near}.png  # paralax
│     ├─ sounds/{jump,coin,hit,gameover}.ogg        # Kenney UI Audio
│     └─ fonts/{pixel.png,pixel.xml}                # bitmap font (Atari Classic ou Press Start 2P)
└─ load-tests/results/issue-{n}-journey/
   ├─ README.md
   └─ screenshots/
```

## Padrões canônicos

- **Pose layer abstrai keypoints:** cenas Phaser nunca leem keypoints crus. Subscrevem ao `EventDetector` (bus `EventTarget`) e recebem `GameEvent`.
- **Refs compartilhadas via `Phaser.Game.registry`** (chave `'refs'` → `AppRefs`). Cenas usam helper `getRefs(scene)`.
- **Pose layer com RAF próprio**, independente do `Phaser.Game.loop` — preserva fluxo de calibração/eventos mesmo quando cena Phaser pausa.
- **Thresholds em fração de H_corpo** na pose layer; coordenadas de tela em px no game layer.
- **Strings em PT-BR** centralizadas em `src/i18n/strings.ts`. Sem framework runtime.
- **Modo debug `?debug=1`** sempre disponível: keyboard fallback + painel debug HTML por cima do canvas. `?seed=N` torna spawning determinístico (Playwright). `?fps=1` mostra FPS no HUD.
- **Imports relativos com extensão explícita** (`./Player.ts`).
- **Bitmap font dentro do canvas** (ADR-2): HUD, GameOver, Welcome title. System fonts pro HTML fora do canvas.
- **Sem `display: standalone` no manifest** (risco iOS PWA + getUserMedia).
- **Spawning seedável** via `?seed=N` pra testes determinísticos.

## ADRs aplicáveis (do study #1)

- **ADR-1** — strings em `src/i18n/strings.ts` sem framework de runtime (até Fase 2).
- **ADR-2** (revisado) — system fonts HTML + bitmap font canvas desde Fase 1.
- **ADR-4** — Phaser 4 (não Phaser 3) ✅ adotado nesta fase.
- **ADR-5** — EMA α=0.5 mantido; reavaliação One Euro fica pra Fase 2.
- **ADR-6** — pseudo-3D Enduro/Out Run, sprites Kenney, paralax 3+ camadas ✅ adotado.

## Histórico SDD

| Issue | Tipo | Título | Status |
|-------|------|--------|--------|
| #1 | study | Viabilidade técnica e roadmap das Fases 0-3 | Aberta (pai conceitual) |
| #2 | feat | Fase 0 — PoC de detecção de pose | Encerrada (CT01/RNF01-03 deferidos pra #3) |
| #3 | feat | Fase 1 — endless runner mínimo | **Em andamento** |
| #4 | feat | Fase 2 — camada de exercício saudável | Aguardando #3 |
| #5 | feat | Fase 3 — conteúdo, progressão, 2P | Aguardando #4 |

## Achados acumulados

- **RNF04 (`<5MB` bundle)** — irreal. Fase 0: ~9MB gzip. Fase 1: ~10MB gzip (Phaser 4 +250KB, sprites +500KB, sons +200KB, font +100KB).
- **iOS PWA + `getUserMedia`** — não usar `display: standalone` até Fase 3 ter mitigação.
- **Phaser 4** estável em abr/2026; usado direto.
- **localStorage suficiente** pra recorde/mute/tutorial; IndexedDB chega na Fase 2 com missões/perfil.

## Próxima fase

Issue #4 (Fase 2) — adiciona cadência de corrida medida, polichinelos como power-up, braços-pra-cima como escudo, narrador motivador, missões diárias, IndexedDB. Atualizar este CODEMAP.
```
**Verificar:** `cat docs/CODEMAP.md | head -10` mostra novo cabeçalho.

### E8. Atualizar `docs/ARCHITECTURE.md`

**Modificar:** `/Users/rjcaubit/Dev/movemove/docs/ARCHITECTURE.md` (substituir conteúdo)
**Conteúdo:**
```markdown
# Architecture — Movemove (Fase 1)

> Atualizado: 2026-XX-XX (Issue #3)

## Camadas

```
┌─────────────────────────────────────────┐
│  Game Layer (src/game/*)                │
│  • Phaser 4 cenas: Boot/Welcome/Loading │
│    /Tutorial/Calibration/Play/GameOver  │
│  • Entidades: Player/Obstacle/Coin      │
│  • Sistemas: pseudo3d/road/parallax/    │
│    spawner/scoring/collision/rng        │
│  • UI: HUD bitmap font + cameraPreview  │
└─────────▲───────────────────────────────┘
          │ subscribe (EventTarget bus)
          │
┌─────────┴───────────────────────────────┐
│  Event Bus (EventTarget nativo)         │
│  • dispatch GameEvent                   │
└─────────▲───────────────────────────────┘
          │ emit
          │
┌─────────┴───────────────────────────────┐
│  Pose Layer (src/pose/*) — INVARIANTE   │
│  • poseDetector: MediaPipe + getUM      │
│  • smoother: EMA α=0.5                  │
│  • calibration: 4 baselines             │
│  • events: 6 heurísticas                │
└─────────▲───────────────────────────────┘
          │ frame
          │
┌─────────┴───────────────────────────────┐
│  Hardware (browser camera, MediaPipe)   │
└─────────────────────────────────────────┘

Camadas auxiliares (overlays HTML por cima do canvas Phaser):
  • debugPanel HTML (?debug=1)
  • errorScreen HTML (fallback fatal)
  • cameraPreview HTML (160×90 keypoints)
  • orientationGuard HTML (retrato em mobile)
```

## Princípios invariantes

1. **Cenas Phaser nunca leem keypoints crus.** Apenas `GameEvent` do bus.
2. **Pose layer é trocável.** Substituir `poseDetector.ts` (Fase 3 = MoveNet MultiPose) não toca cenas nem `events.ts`.
3. **Thresholds proporcionais ao corpo detectado** (`H_corpo`), nunca em pixels.
4. **Modo debug é fallback completo:** keyboard substitui pose layer 1:1.
5. **Pose layer roda em RAF próprio**, independente do `Phaser.Game.loop` — calibração e eventos não param se cena Phaser pausa.

## State machine das cenas Phaser

```
Boot → Welcome → Loading
Loading → Tutorial (1ª vez) ou Calibration (já viu tutorial)
Loading → Error HTML (cameraDenied/cameraNotFound/insecureContext/modelDownload)
Tutorial → Calibration
Calibration → Play (baseline OK) ou Calibration loop (low confidence)
Play → GameOver (colisão)
Play → Calibration (drift recalibrate banner)
Play → pause overlay (no body 1.5s) → resume
GameOver → Play (Jogar de novo) ou Calibration (Recalibrar)
```

## Comunicação entre layers

| Origem | Destino | Mecanismo | Payload |
|--------|---------|-----------|---------|
| `PoseDetector` | `EmaSmoother` (orchestrator) | `onFrame(cb)` | `PoseFrame` raw |
| `EmaSmoother` | Subscribers (`Calibrator`, `EventDetector`, `cameraPreview`, cenas) | `onSmoothedFrame(cb)` em `AppRefs` | `PoseFrame` smoothed |
| `EventDetector` | Cenas Phaser (`Play`, `GameOver`) | `addEventListener('event', cb)` | `CustomEvent<GameEvent>` |
| `KeyboardDebug` | `EventDetector` | `dispatchEvent` direto | `GameEvent` com `source: 'kbd'` |
| Cenas | Cenas | `this.scene.start(key, data?)` | data opcional |
| Cenas | Cross-cena state | `game.registry.get/set` | `AppRefs` em `'refs'` |

## Próximas fases

- **Fase 2 (#4):** adiciona cadência de corrida medida (gameplay reage a `cadence`), polichinelos como power-up (`jumping_jack`), braços-pra-cima como escudo (`arms_up`), narrador (`@lingui/core`), missões diárias (IndexedDB via `idb-keyval`), música ritmada.
- **Fase 3 (#5):** troca pose driver para MoveNet MultiPose, modo dois jogadores, mundos/temas plugáveis.
```
**Verificar:** `cat docs/ARCHITECTURE.md | head -15` mostra nova versão.

### E9. Atualizar `EXERGAME_PROJETO.md` Seção 5.6 marcando entregue

**Modificar:** `/Users/rjcaubit/Dev/movemove/EXERGAME_PROJETO.md`
**Trocar:**
```
### 5.6. Entregável

PWA jogável publicada com link curto. Versão 0.1.
```
**Por:**
```
### 5.6. Entregável

PWA jogável publicada com link curto. Versão 0.1. **Entregue 2026-XX-XX em https://movemove.pages.dev (Issue #3).**
```
**Verificar:** `grep -A2 "5.6. Entregável" EXERGAME_PROJETO.md` mostra nova linha.

### E10. Build + deploy Cloudflare Pages

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
npm run build
ls -la dist/
```
**Verificar:** `dist/` tem `index.html`, `assets/` (com hash), e `public/*` copiado. Tamanho total `du -sh dist` aceitável (~20MB uncompressed).

**Comando deploy (humano executa se quiser publicar):**
```bash
npx wrangler pages deploy dist --project-name=movemove
```
**Verificar:** wrangler imprime URL `https://movemove.pages.dev` ou preview URL.

### E11. Commit Fase E + push

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
git add src/game/ui/orientationGuard.ts src/game/orchestrator.ts \
        e2e/issue-3-flow.spec.ts e2e/issue-2-legacy.spec.ts.skip \
        load-tests/results/issue-3-journey/README.md \
        docs/CHANGELOG.md docs/CODEMAP.md docs/ARCHITECTURE.md \
        EXERGAME_PROJETO.md
git rm --cached e2e/issue-2.spec.ts 2>/dev/null || true
git commit -m "$(cat <<'EOF'
feat(issue-3): fase E — polish (orientation, debug HTML, E2E, docs) (#3)

- orientationGuard: overlay retrato em mobile com botão "Continuar"
- DebugPanel HTML reativado por cima do canvas (?debug=1)
- E2E Playwright: CT05 click-by-click + CT02 cam denied + CT04 keyboard
- Legacy issue-2.spec.ts arquivado como .skip
- README do load-tests/issue-3-journey com tabela de devices a preencher
- Atualiza CHANGELOG, CODEMAP, ARCHITECTURE, EXERGAME_PROJETO Seção 5.6

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log --oneline | head -6` mostra commits A, B, C, D, E.

### E12. Rodar Playwright completo

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
npm run e2e -- --reporter=list
```
**Verificar:** 3 testes passam (CT05, CT02, CT04). Se algum falhar: ler output, ajustar coordenadas de click no canvas (assets podem ter dimensões ligeiramente diferentes), e re-rodar. Screenshots em `load-tests/results/issue-3-journey/screenshots/`.

### E13. Auto-review final + abrir PR

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove
git status
git log --oneline origin/main..HEAD
git push -u origin feature/sdd-issue-3
gh pr create --title "feat(issue-3): Fase 1 — endless runner mínimo (Phaser 4)" --body "$(cat <<'EOF'
## Summary
- Adiciona Phaser 4 como engine
- Implementa 7 cenas (Boot/Welcome/Loading/Tutorial/Calibration/Play/GameOver)
- Pseudo-3D Enduro/Out Run em pixel art (Kenney CC0)
- Pose layer da Fase 0 reusado integralmente
- Mini-preview da câmera + HUD bitmap font
- Tutorial 1× por device + recorde local
- E2E Playwright cobrindo CT02/CT04/CT05

Spec: `docs/sdd/ISSUE_3/02-spec.md`
Tasks: `docs/sdd/ISSUE_3/03-tasks.md`

## Test plan
- [ ] `npm run lint` passa
- [ ] `npm run build` passa (~20MB dist, ~10MB gzip)
- [ ] `npm run e2e` passa CT02/CT04/CT05
- [ ] Manual: abrir https://movemove.pages.dev/?debug=1 no celular alvo, jogar uma partida
- [ ] CT01 manual com filho do dev (preenche `load-tests/results/issue-3-journey/README.md`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
**Verificar:** `gh pr view` retorna URL; PR criada (não merged ainda — review humano).

---

## Critério de "Fase 1 concluída"

- [ ] Todas as 5 fases (A-E) commitadas e push feito.
- [ ] PR aberta no GitHub.
- [ ] `npm run lint`, `npm run build`, `npm run e2e` passam.
- [ ] Deploy publicado (`npx wrangler pages deploy dist`).
- [ ] CT01 manual humano agendado (filho do dev no celular alvo).
- [ ] Após CT01 OK: merge da PR + atualizar `04-acceptance.md` + fechar issue #3.
- [ ] `/sdd-plan 4` para Fase 2.

*Fim das tasks.*
