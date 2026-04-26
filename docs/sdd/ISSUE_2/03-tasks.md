# Tasks — Fase 0: PoC de detecção de pose

**Issue:** #2
**Baseado em:** `02-spec.md`
**Total estimado:** ~50 tasks × 2-5min ≈ 2.5–4h de execução cadenciada
**Fases:** A (setup) → B (UI base) → C (pose core) → D (calibração + 6 heurísticas) → E (debug + estados + deploy + validação)

---

## FASE A — Setup do projeto greenfield

### A1. Criar `package.json`

**Criar:** `package.json`
**Conteúdo:**
```json
{
  "name": "movemove-fase0",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "description": "Movemove — Fase 0: PoC de detecção de pose com MediaPipe",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host",
    "lint": "tsc --noEmit",
    "copy:wasm": "mkdir -p public/wasm && cp -f node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.20"
  }
}
```
**Verificar:** `cat package.json | grep '"name": "movemove-fase0"'` retorna a linha.

---

### A2. Instalar dependências

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && npm install
```
**Verificar:**
- `ls node_modules/@mediapipe/tasks-vision` lista os arquivos
- `node_modules/@mediapipe/tasks-vision/wasm/` contém `vision_wasm_internal.wasm` e `vision_wasm_internal.js`
- `npm list typescript` mostra versão >= 5.6
- `npm list vite` mostra versão >= 6.0
**Se falhar:** rodar `npm cache clean --force && npm install` novamente.

---

### A3. Criar `vite.config.ts`

**Criar:** `vite.config.ts`
**Conteúdo:**
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
```
**Verificar:** `npx vite --version` imprime versão sem erro de config.

---

### A4. Criar `tsconfig.json`

**Criar:** `tsconfig.json`
**Conteúdo:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "vite.config.ts"]
}
```
**Verificar:** `npx tsc --noEmit` (vai dar erro de "no inputs" porque src/ não existe ainda — esperado).

---

### A5. Criar `.gitignore`

**Criar:** `.gitignore`
**Conteúdo:**
```
node_modules
dist
.DS_Store
.vscode
.idea
*.log
.env
.env.local
load-tests/results/*/screenshots/
public/wasm/
public/models/pose_landmarker_lite.task
.tmp-*.md
```
**Verificar:** `cat .gitignore | head -3` mostra `node_modules`.

**Nota:** modelo MediaPipe e WASMs estão gitignorados. São baixados via scripts no setup local; deploy do CI/Cloudflare Pages baixa em build-time (Fase E).

---

### A6. Criar estrutura de pastas

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && \
  mkdir -p src/pose src/ui src/debug src/i18n public/models public/wasm load-tests/results/issue-2-journey/screenshots && \
  ls -la src/ public/ load-tests/results/
```
**Verificar:** todas as pastas listadas (`src/pose`, `src/ui`, `src/debug`, `src/i18n`, `public/models`, `public/wasm`, `load-tests/results/issue-2-journey/screenshots`).

---

### A7. Criar `docs/CODEMAP.md` inicial

**Criar:** `docs/CODEMAP.md`
**Conteúdo:**
```markdown
# CODEMAP — Movemove

> Atualizado: 2026-04-26 (Issue #2 — Fase 0)
> Fonte da verdade sobre estrutura, módulos e padrões. Atualizar a cada issue que mexe em arquitetura.

## Status do projeto
**Fase atual:** 0 (PoC de detecção de pose). Sem jogo, sem backend, sem persistência.

## Stack
- **Bundler/dev:** Vite 6+
- **Linguagem:** TypeScript 5.6+
- **Pose detection:** `@mediapipe/tasks-vision` (Pose Landmarker, modelo `lite`)
- **Engine de jogo:** *(Fase 1+, Phaser 4)*
- **i18n:** `src/i18n/strings.ts` PT-BR-only sem framework *(Lingui na Fase 2)*
- **Persistência:** *(Fase 2+, IndexedDB via idb-keyval)*

## Estrutura

```
movemove/
├─ EXERGAME_PROJETO.md         # doc-base do projeto
├─ docs/
│  ├─ CODEMAP.md               # ESTE arquivo
│  ├─ ARCHITECTURE.md          # pose layer × event bus × UI states
│  ├─ CHANGELOG.md
│  └─ sdd/ISSUE_{n}/           # SDD docs por issue (00-design, 01-research, 02-spec, 03-tasks, 04-acceptance)
├─ src/
│  ├─ main.ts                  # entry — orquestra estado da app
│  ├─ styles.css
│  ├─ pose/
│  │  ├─ types.ts              # Keypoint, Baseline, GameEvent, Lane
│  │  ├─ config.ts             # thresholds em fração de H_corpo, cooldowns
│  │  ├─ poseDetector.ts       # wrapper MediaPipe + getUserMedia
│  │  ├─ smoother.ts           # EMA configurável
│  │  ├─ calibration.ts        # captura de baselines
│  │  └─ events.ts             # 6 heurísticas + bus EventTarget
│  ├─ ui/
│  │  ├─ welcomeScreen.ts
│  │  ├─ loadingScreen.ts
│  │  ├─ calibrationScreen.ts
│  │  ├─ debugPanel.ts
│  │  ├─ eventOverlay.ts
│  │  ├─ keypointOverlay.ts
│  │  ├─ errorScreen.ts
│  │  └─ noBodyScreen.ts
│  ├─ debug/
│  │  └─ keyboard.ts           # fallback ?debug=1
│  └─ i18n/
│     └─ strings.ts            # PT-BR centralizado
├─ public/
│  ├─ models/
│  │  └─ pose_landmarker_lite.task  # ~3MB, gitignored, baixado em setup
│  └─ wasm/
│     └─ vision_wasm_internal.{wasm,js}  # gitignored, copiado de node_modules
└─ load-tests/results/issue-{n}-journey/
   ├─ README.md                # observações empíricas (FPS, falsos positivos, devices testados)
   └─ screenshots/
```

## Padrões canônicos

- **Pose layer abstrai keypoints:** módulos consumidores **nunca** leem keypoints crus. `events.ts` emite eventos via bus (`EventTarget` nesta fase, `mitt` a partir da Fase 1).
- **Thresholds em fração de H_corpo:** nunca em pixels absolutos.
- **Strings em PT-BR:** centralizadas em `src/i18n/strings.ts` exportando constantes/funções nomeadas.
- **Modo debug com keyboard fallback (`?debug=1`):** sempre disponível, em todas as fases. Invariante.
- **Imports relativos com extensão explícita** (`./types.ts`) por causa do `allowImportingTsExtensions`.

## ADRs aplicáveis (do study #1)

- **ADR-5** — filtro EMA α=0.5 (Kalman descartado).
- Modelo MediaPipe = `pose_landmarker_lite.task` (~3MB) em 480p.
- Sem PWA standalone (risco iOS).
- ADRs 1, 2, 3, 4, 6 dormem nesta fase (entram a partir da Fase 1).

## Próxima fase

Issue #3 (Fase 1 — endless runner mínimo). Adicionará Phaser 4, bitmap font, sprites, cenas Boot/Calibration/Play/GameOver. Atualizar este CODEMAP nessa fase.
```
**Verificar:** `wc -l docs/CODEMAP.md` mostra ≥ 50 linhas.

---

### A8. Criar `docs/ARCHITECTURE.md`

**Criar:** `docs/ARCHITECTURE.md`
**Conteúdo:**
```markdown
# Architecture — Movemove (Fase 0)

> Atualizado: 2026-04-26 (Issue #2)

## Camadas

```
┌─────────────────────────────────────────┐
│  UI Layer (src/ui/*, src/main.ts)       │
│  • render screens (Welcome/Loading/     │
│    Calibration/Active/Error/NoBody)     │
│  • paint canvas overlays                │
│  • debug panel toggle                   │
└─────────▲───────────────────────────────┘
          │ subscribe
          │
┌─────────┴───────────────────────────────┐
│  Event Bus (EventTarget nativo)         │
│  • dispatch GameEvent: jump/duck/...    │
└─────────▲───────────────────────────────┘
          │ emit
          │
┌─────────┴───────────────────────────────┐
│  Pose Layer (src/pose/*)                │
│  • poseDetector: MediaPipe + getUM      │
│  • smoother: EMA                        │
│  • calibration: captura baselines       │
│  • events: 6 heurísticas (3.3 doc-base) │
└─────────▲───────────────────────────────┘
          │ frame
          │
┌─────────┴───────────────────────────────┐
│  Hardware (browser camera, MediaPipe)   │
└─────────────────────────────────────────┘
```

## Princípios invariantes

1. **UI nunca lê keypoints crus.** Apenas eventos abstratos do bus.
2. **Pose layer é trocável.** Substituir `poseDetector.ts` por outro driver (MoveNet MultiPose na Fase 3) não toca UI nem `events.ts`.
3. **Thresholds proporcionais ao corpo detectado** (`H_corpo`), nunca em pixels.
4. **Modo debug é fallback completo:** keyboard substitui pose layer 1:1.

## State machine da app

```
Welcome → (clique "Ligar câmera") → Loading
Loading → (modelo ok) → Calibration
Loading → (erro) → Error
Calibration → (baselines capturados) → Active
Active → (clique Recalibrar / drift detectado) → Calibration
Active → (1.5s sem keypoints) → NoBody (overlay sobreposto)
NoBody → (volta keypoints) → Active
* → (erro fatal) → Error
```

## Próximas fases

- Fase 1 (#3): adiciona Phaser 4 entre Pose Layer e UI Layer; introduz cenas; mantém event bus invariante.
- Fase 2 (#4): adiciona persistência (IndexedDB), narrador (`@lingui/core`), reavalia EMA→One Euro.
- Fase 3 (#5): troca pose driver para MoveNet MultiPose, multi-pessoa, multi-mundos.
```
**Verificar:** `cat docs/ARCHITECTURE.md | head -3` mostra título.

---

### A9. Criar `docs/CHANGELOG.md`

**Criar:** `docs/CHANGELOG.md`
**Conteúdo:**
```markdown
# Changelog — Movemove

Formato: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Todas as datas são UTC.

## [Unreleased] — Fase 0 (Issue #2)

### Added
- Setup inicial do projeto (Vite + TS + `@mediapipe/tasks-vision`).
- `pose/poseDetector.ts`, `smoother.ts`, `calibration.ts`, `events.ts` com 6 heurísticas da Seção 3.3 do `EXERGAME_PROJETO.md`.
- Telas Welcome / Loading / Calibration / Active / Error / NoBody.
- Painel de debug com FPS, baselines, lane, cadência, log de eventos.
- Modo debug `?debug=1` com keyboard fallback (Seção 3.5).
- Estrutura `docs/CODEMAP.md`, `docs/ARCHITECTURE.md`.
- Deploy Cloudflare Pages.
```
**Verificar:** `cat docs/CHANGELOG.md` mostra formato.

---

### A10. Commit Fase A

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && \
  git add package.json vite.config.ts tsconfig.json .gitignore docs/CODEMAP.md docs/ARCHITECTURE.md docs/CHANGELOG.md && \
  git commit -m "$(cat <<'EOF'
chore(issue-2): fase A — setup do projeto greenfield (#2)

- Vite 6 + TS 5.6 + @mediapipe/tasks-vision
- Estrutura de pastas src/pose, src/ui, src/debug, src/i18n
- CODEMAP.md, ARCHITECTURE.md, CHANGELOG.md iniciais

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline` mostra `chore(issue-2): fase A`.

---

## FASE B — UI base, telas e estados

### B1. Criar `src/i18n/strings.ts`

**Criar:** `src/i18n/strings.ts`
**Conteúdo:**
```ts
// Strings PT-BR centralizadas. ADR-1 do study #1: sem framework de i18n na Fase 0.

export const strings = {
  app: {
    title: 'Movemove — Detector de Movimento',
  },
  welcome: {
    headline: 'Olá! Vamos detectar seus movimentos.',
    explainer:
      'Toque no botão abaixo para ligar a câmera. Os movimentos ficam só no seu aparelho — nada é enviado pra internet.',
    cta: 'Ligar câmera',
  },
  loading: {
    text: 'Carregando detector de movimento…',
    subtext: 'Da primeira vez pode demorar alguns segundos.',
  },
  calibration: {
    instruction: 'Fique parado, de frente, braços ao lado do corpo.',
    countdown: (n: number) => `${n}…`,
    capturing: 'Capturando…',
    ok: 'Pronto!',
    retry: 'Confiança baixa. Vamos tentar de novo?',
  },
  active: {
    recalibrate: 'Recalibrar',
    debugToggle: 'Debug',
  },
  error: {
    cameraDenied:
      'Você precisa permitir a câmera. Clique no cadeado ↗︎ na barra do navegador e permita o acesso.',
    cameraNotFound:
      'Não encontramos câmera. Conecte uma webcam ou abra esta página no celular.',
    modelDownload:
      'Não conseguimos baixar o detector. Verifique sua internet e tente de novo.',
    generic: 'Algo deu errado. Tente recarregar a página.',
    retry: 'Tentar de novo',
  },
  states: {
    noBody: 'Apareça pra câmera 👋',
    lowLight:
      'Iluminação fraca. Chegue mais perto da janela ou acenda uma luz.',
    driftCalibration:
      'Sua calibração pode estar errada. Recalibrar agora?',
    recalibrate: 'Recalibrar',
  },
} as const;
```
**Verificar:** `npx tsc --noEmit src/i18n/strings.ts` sem erros.

---

### B2. Criar `src/styles.css`

**Criar:** `src/styles.css`
**Conteúdo:**
```css
:root {
  --bg: #0b0d10;
  --fg: #f5f5f5;
  --muted: #8a8d92;
  --accent: #4cd964;
  --warn: #ffd60a;
  --error: #ff453a;
  --jump: #4cd964;
  --duck: #0a84ff;
  --lane-left: #ff9f0a;
  --lane-right: #bf5af2;
  --jack: #ffd60a;
  --arms-up: #ff375f;
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
button.secondary { background: var(--muted); color: var(--fg); }

#app { position: relative; width: 100%; height: 100%; }

.screen {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 24px;
  text-align: center;
  gap: 16px;
}
.screen.hidden { display: none; }
.screen h1 { font-size: 28px; margin: 0; }
.screen p { font-size: 18px; color: var(--muted); margin: 0; max-width: 28em; }

#video-stage { position: absolute; inset: 0; }
#video-stage video, #video-stage canvas {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
}
#video-stage canvas { pointer-events: none; }
#video-stage.hidden { display: none; }

#debug-panel {
  position: absolute; top: 12px; right: 12px;
  background: var(--panel-bg);
  color: var(--fg);
  padding: 12px;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  max-width: 280px; max-height: 80vh; overflow-y: auto;
}
#debug-panel.collapsed { padding: 6px 10px; max-width: none; }
#debug-panel .row { display: flex; justify-content: space-between; gap: 12px; }
#debug-panel .log { margin-top: 8px; max-height: 240px; overflow-y: auto; font-size: 11px; }
#debug-panel .log .entry { color: var(--muted); }

#debug-toggle {
  position: absolute; top: 12px; right: 12px;
  background: var(--panel-bg);
  color: var(--fg);
  border: 0; border-radius: 8px; padding: 6px 10px;
  font-size: 12px; cursor: pointer;
  font-family: ui-monospace, monospace;
}

#event-overlay {
  position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px;
  pointer-events: none;
}
.event-pip {
  width: 56px; height: 56px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #000; font-size: 11px; font-weight: 700;
  opacity: 0;
  transition: opacity 0.15s;
}
.event-pip.fire { opacity: 1; }
.event-pip[data-event="jump"] { background: var(--jump); }
.event-pip[data-event="duck"] { background: var(--duck); }
.event-pip[data-event="lane_left"] { background: var(--lane-left); }
.event-pip[data-event="lane_right"] { background: var(--lane-right); }
.event-pip[data-event="jumping_jack"] { background: var(--jack); }
.event-pip[data-event="arms_up"] { background: var(--arms-up); }

#recalibrate-btn {
  position: absolute; bottom: 24px; right: 12px;
}

.banner {
  position: absolute; top: 12px; left: 12px;
  background: var(--warn); color: #000;
  padding: 8px 14px; border-radius: 8px;
  font-size: 14px; font-weight: 600;
  max-width: calc(100vw - 140px);
}
.banner.error { background: var(--error); color: #fff; }

.no-body-overlay {
  position: absolute; inset: 0;
  background: rgba(11, 13, 16, 0.7);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
}
.no-body-overlay.hidden { display: none; }

.countdown {
  font-size: 96px; font-weight: 900;
  color: var(--accent);
}
```
**Verificar:** `wc -l src/styles.css` ≥ 80.

---

### B3. Criar `index.html`

**Criar:** `index.html`
**Conteúdo:**
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0b0d10" />
    <title>Movemove — Detector de Movimento</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app">
      <!-- Welcome -->
      <section id="screen-welcome" class="screen" aria-hidden="false"></section>

      <!-- Loading -->
      <section id="screen-loading" class="screen hidden" aria-hidden="true"></section>

      <!-- Error -->
      <section id="screen-error" class="screen hidden" aria-hidden="true"></section>

      <!-- Video stage (used by Calibration + Active) -->
      <div id="video-stage" class="hidden" aria-hidden="true">
        <video id="video" playsinline muted></video>
        <canvas id="overlay"></canvas>
        <button id="recalibrate-btn" class="secondary hidden" aria-label="Recalibrar">Recalibrar</button>
        <div id="event-overlay">
          <div class="event-pip" data-event="lane_left">←</div>
          <div class="event-pip" data-event="duck">↓</div>
          <div class="event-pip" data-event="jump">↑</div>
          <div class="event-pip" data-event="lane_right">→</div>
          <div class="event-pip" data-event="jumping_jack">JJ</div>
          <div class="event-pip" data-event="arms_up">↑↑</div>
        </div>
        <div id="no-body-overlay" class="no-body-overlay hidden">
          <span></span>
        </div>
        <button id="debug-toggle" aria-label="Mostrar painel de debug">Debug</button>
        <aside id="debug-panel" class="hidden" aria-label="Painel de debug"></aside>
        <div id="banner-host"></div>
      </div>

      <!-- Calibration overlay (uses video stage underneath) -->
      <section id="screen-calibration" class="screen hidden" aria-hidden="true"></section>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```
**Verificar:** `grep -c 'id="screen-' index.html` retorna 4 (welcome, loading, error, calibration).

---

### B4. Criar `src/ui/welcomeScreen.ts`

**Criar:** `src/ui/welcomeScreen.ts`
**Conteúdo:**
```ts
import { strings } from '../i18n/strings.ts';

export function renderWelcome(root: HTMLElement, onStart: () => void): void {
  root.innerHTML = '';
  root.setAttribute('aria-hidden', 'false');
  root.classList.remove('hidden');

  const h1 = document.createElement('h1');
  h1.textContent = strings.welcome.headline;

  const p = document.createElement('p');
  p.textContent = strings.welcome.explainer;

  const btn = document.createElement('button');
  btn.textContent = strings.welcome.cta;
  btn.setAttribute('aria-label', strings.welcome.cta);
  btn.addEventListener('click', () => onStart(), { once: true });

  root.append(h1, p, btn);
}

export function hideWelcome(root: HTMLElement): void {
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### B5. Criar `src/ui/loadingScreen.ts`

**Criar:** `src/ui/loadingScreen.ts`
**Conteúdo:**
```ts
import { strings } from '../i18n/strings.ts';

export function showLoading(root: HTMLElement): void {
  root.innerHTML = '';
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');

  const h1 = document.createElement('h1');
  h1.textContent = strings.loading.text;

  const p = document.createElement('p');
  p.textContent = strings.loading.subtext;

  root.append(h1, p);
}

export function hideLoading(root: HTMLElement): void {
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### B6. Criar `src/ui/errorScreen.ts`

**Criar:** `src/ui/errorScreen.ts`
**Conteúdo:**
```ts
import { strings } from '../i18n/strings.ts';

export type ErrorKind = 'cameraDenied' | 'cameraNotFound' | 'modelDownload' | 'generic';

export function showError(
  root: HTMLElement,
  kind: ErrorKind,
  onRetry: () => void,
): void {
  root.innerHTML = '';
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');

  const h1 = document.createElement('h1');
  h1.textContent = '⚠️';

  const p = document.createElement('p');
  p.textContent = strings.error[kind];

  const btn = document.createElement('button');
  btn.textContent = strings.error.retry;
  btn.setAttribute('aria-label', strings.error.retry);
  btn.addEventListener('click', () => onRetry(), { once: true });

  root.append(h1, p, btn);
}

export function hideError(root: HTMLElement): void {
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### B7. Criar `src/ui/noBodyScreen.ts`

**Criar:** `src/ui/noBodyScreen.ts`
**Conteúdo:**
```ts
import { strings } from '../i18n/strings.ts';

export function setNoBodyVisible(host: HTMLElement, visible: boolean): void {
  const span = host.querySelector('span');
  if (!span) return;
  span.textContent = strings.states.noBody;
  if (visible) host.classList.remove('hidden');
  else host.classList.add('hidden');
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### B8. Criar esqueleto de `src/main.ts` com state machine

**Criar:** `src/main.ts`
**Conteúdo:**
```ts
import { renderWelcome, hideWelcome } from './ui/welcomeScreen.ts';
import { showLoading, hideLoading } from './ui/loadingScreen.ts';
import { showError, hideError, type ErrorKind } from './ui/errorScreen.ts';

type AppState =
  | { kind: 'welcome' }
  | { kind: 'loading' }
  | { kind: 'calibrating' }
  | { kind: 'active' }
  | { kind: 'error'; error: ErrorKind };

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
};

const screens = {
  welcome: $('screen-welcome'),
  loading: $('screen-loading'),
  error: $('screen-error'),
  calibration: $('screen-calibration'),
};
const videoStage = $('video-stage');

let state: AppState = { kind: 'welcome' };

function transitionTo(next: AppState): void {
  // Hide everything first
  hideWelcome(screens.welcome);
  hideLoading(screens.loading);
  hideError(screens.error);
  screens.calibration.classList.add('hidden');
  videoStage.classList.add('hidden');

  state = next;
  switch (next.kind) {
    case 'welcome':
      renderWelcome(screens.welcome, () => transitionTo({ kind: 'loading' }));
      break;
    case 'loading':
      showLoading(screens.loading);
      // C7 will hook actual model load here
      // For now, simulate transition for B9 smoke test
      setTimeout(() => transitionTo({ kind: 'calibrating' }), 1500);
      break;
    case 'calibrating':
      // D3 will fill this
      videoStage.classList.remove('hidden');
      screens.calibration.classList.remove('hidden');
      screens.calibration.innerHTML = '<h1>Calibração (placeholder Fase B)</h1>';
      break;
    case 'active':
      // C7/D11/E* fill this
      videoStage.classList.remove('hidden');
      break;
    case 'error':
      showError(screens.error, next.error, () => transitionTo({ kind: 'welcome' }));
      break;
  }
}

transitionTo({ kind: 'welcome' });

// Expose for debug console (não fica em produção)
(window as unknown as { __movemoveDebug: { transitionTo: typeof transitionTo } })
  .__movemoveDebug = { transitionTo };
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### B9. Smoke test fase B no dev server

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && npm run dev &
DEV_PID=$!
sleep 3
curl -s http://localhost:5173/ | grep -c 'id="screen-welcome"'
kill $DEV_PID 2>/dev/null
```
**Esperado:** comando `curl` retorna `1` (página entregue, contém o id).
**Verificação manual:** abrir `http://localhost:5173/` no Chrome desktop. Esperar:
1. Welcome screen com "Olá! Vamos detectar seus movimentos." e botão "Ligar câmera"
2. Clicar → tela "Carregando detector de movimento…" por ~1.5s
3. → Placeholder "Calibração (placeholder Fase B)"
4. No console do dev tools, `__movemoveDebug.transitionTo({ kind: 'error', error: 'cameraDenied' })` deve mostrar tela de erro com mensagem PT-BR.

Se algum passo falha, parar e debugar antes de seguir.

---

### B10. Commit Fase B

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && \
  git add src/ index.html && \
  git commit -m "$(cat <<'EOF'
feat(issue-2): fase B — UI base, telas e state machine (#2)

- Strings PT-BR centralizadas (ADR-1)
- styles.css com paleta dark + cores por evento
- Telas Welcome/Loading/Error/NoBody + esqueleto Calibration
- main.ts orquestra state machine com transitionTo

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline` mostra `fase B`.

---

## FASE C — Pose detection core (MediaPipe + getUserMedia + EMA)

### C1. Criar `src/pose/types.ts`

**Criar:** `src/pose/types.ts`
**Conteúdo:**
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

export interface Keypoint {
  x: number; // normalizado 0..1
  y: number; // normalizado 0..1
  z?: number;
  visibility?: number; // 0..1, se disponível
}

export interface PoseFrame {
  /** keypoints normalizados (NormalizedLandmarks do MediaPipe). 33 itens. */
  keypoints: Keypoint[];
  /** confiança média dos keypoints relevantes pras heurísticas (média de visibility) */
  confidence: number;
  /** timestamp performance.now() do frame */
  timestamp: number;
}

export interface Baseline {
  hCorpo: number;       // distância vertical olhos→tornozelos
  yQuadrilBase: number; // Y médio do quadril em repouso
  xCentroBase: number;  // X médio do quadril em repouso
  larguraOmbros: number;
  capturedAt: number;   // timestamp ms
}

export type Lane = -1 | 0 | 1;

export type GameEvent =
  | { type: 'jump'; source: 'pose' | 'kbd'; t: number }
  | { type: 'duck'; source: 'pose' | 'kbd'; t: number }
  | { type: 'lane_change'; lane: Lane; source: 'pose' | 'kbd'; t: number }
  | { type: 'jumping_jack'; source: 'pose' | 'kbd'; t: number }
  | { type: 'arms_up'; source: 'pose' | 'kbd'; t: number }
  | { type: 'cadence'; stepsPerSec: number; source: 'pose' | 'kbd'; t: number };

export type GameEventType = GameEvent['type'];
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### C2. Criar `src/pose/config.ts`

**Criar:** `src/pose/config.ts`
**Conteúdo:**
```ts
// Thresholds expressos em FRAÇÃO de H_corpo (Seção 3.3 do EXERGAME_PROJETO.md).
// NUNCA usar valores em pixels absolutos — quebra com criança vs adulto.

export const POSE_CONFIG = {
  /** EMA — fator de suavização (ADR-5 do study #1) */
  emaAlpha: 0.5,

  /** Calibração */
  calibrationDurationMs: 2000,
  calibrationCountdownSec: 3,
  minConfidenceForCalibration: 0.6,

  /** Estados especiais (Seção 3.4) */
  noBodyTimeoutMs: 1500,
  lowConfidenceThreshold: 0.6,
  lowConfidenceWarnDurationMs: 3000,
  driftRecalibrateSuggestMs: 10000,

  /** Heurística JUMP */
  jumpThresholdFracHCorpo: 0.10, // sobe acima de Y_base − 0.10*H
  jumpCooldownMs: 400,

  /** Heurística DUCK */
  duckThresholdFracHCorpo: 0.15, // desce abaixo de Y_base + 0.15*H
  duckSustainMs: 200,

  /** Heurística LANE CHANGE */
  laneThresholdFracOmbros: 0.20,
  laneHysteresisFrac: 0.05,

  /** Heurística RUNNING CADENCE */
  cadenceKneeRaiseFracHCorpo: 0.08,
  cadenceWindowMs: 2000, // janela pra calcular passos/seg

  /** Heurística JUMPING JACK */
  jackAnkleSpreadFactorOmbros: 1.5,

  /** MediaPipe */
  modelAssetPath: '/models/pose_landmarker_lite.task',
  wasmPath: '/wasm',
  videoIdealWidth: 854,
  videoIdealHeight: 480,
  numPoses: 1,

  /** Debug */
  debugLogMaxEntries: 20,
} as const;
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### C3. Baixar modelo MediaPipe e copiar WASMs

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && \
  curl -L -o public/models/pose_landmarker_lite.task \
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" && \
  npm run copy:wasm && \
  ls -lh public/models/ public/wasm/
```
**Esperado:**
- `public/models/pose_landmarker_lite.task` ≈ 3 MB
- `public/wasm/` contém pelo menos `vision_wasm_internal.wasm` e `vision_wasm_internal.js`
**Se download falhar:** verificar se URL ainda é válida em https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js (página oficial Google AI Edge); fixar versão `1` ou usar `latest/`.

---

### C4. Criar `src/pose/smoother.ts` (EMA)

**Criar:** `src/pose/smoother.ts`
**Conteúdo:**
```ts
import type { Keypoint } from './types.ts';

/**
 * Filtro EMA (Exponential Moving Average) — Seção 3.2 do EXERGAME_PROJETO.md.
 * Mantém um array de keypoints suavizados; primeira amostra inicializa direto.
 *
 * suavizado[t] = α * cru[t] + (1 - α) * suavizado[t-1]
 */
export class EmaSmoother {
  private last: Keypoint[] | null = null;

  constructor(private readonly alpha: number) {
    if (alpha <= 0 || alpha > 1) {
      throw new Error(`EmaSmoother: alpha must be in (0, 1], got ${alpha}`);
    }
  }

  smooth(raw: Keypoint[]): Keypoint[] {
    if (this.last === null || this.last.length !== raw.length) {
      this.last = raw.map((k) => ({ ...k }));
      return this.last;
    }
    const a = this.alpha;
    const out: Keypoint[] = new Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      const p = this.last[i];
      out[i] = {
        x: a * r.x + (1 - a) * p.x,
        y: a * r.y + (1 - a) * p.y,
        z: r.z !== undefined && p.z !== undefined ? a * r.z + (1 - a) * p.z : r.z,
        visibility: r.visibility,
      };
    }
    this.last = out;
    return out;
  }

  reset(): void {
    this.last = null;
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### C5. Criar `src/pose/poseDetector.ts`

**Criar:** `src/pose/poseDetector.ts`
**Conteúdo:**
```ts
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { POSE_CONFIG } from './config.ts';
import type { Keypoint, PoseFrame } from './types.ts';

const RELEVANT_KP_INDICES = [0, 2, 5, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private frameCallbacks = new Set<(frame: PoseFrame) => void>();

  async loadModel(onProgress?: (msg: string) => void): Promise<void> {
    onProgress?.('Inicializando WASM…');
    const vision = await FilesetResolver.forVisionTasks(POSE_CONFIG.wasmPath);
    onProgress?.('Baixando modelo…');
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: POSE_CONFIG.modelAssetPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: POSE_CONFIG.numPoses,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    onProgress?.('Pronto');
  }

  async openCamera(video: HTMLVideoElement): Promise<void> {
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
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        resolve();
      };
      video.addEventListener('loadedmetadata', onLoaded);
    });
    await video.play();
  }

  start(video: HTMLVideoElement): void {
    if (!this.landmarker) throw new Error('PoseDetector: loadModel() first');
    let lastTs = -1;
    const tick = () => {
      const ts = performance.now();
      if (video.currentTime !== lastTs && video.readyState >= 2) {
        lastTs = video.currentTime;
        const result = this.landmarker!.detectForVideo(video, ts);
        const frame = this.toFrame(result, ts);
        if (frame) {
          for (const cb of this.frameCallbacks) cb(frame);
        }
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

  private toFrame(result: PoseLandmarkerResult, ts: number): PoseFrame | null {
    const lm = result.landmarks[0];
    if (!lm || lm.length === 0) return null;
    const keypoints: Keypoint[] = lm.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      visibility: p.visibility,
    }));
    let sum = 0;
    let n = 0;
    for (const i of RELEVANT_KP_INDICES) {
      const v = keypoints[i]?.visibility;
      if (typeof v === 'number') {
        sum += v;
        n++;
      }
    }
    const confidence = n > 0 ? sum / n : 0;
    return { keypoints, confidence, timestamp: ts };
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### C6. Criar `src/ui/keypointOverlay.ts`

**Criar:** `src/ui/keypointOverlay.ts`
**Conteúdo:**
```ts
import type { Keypoint } from '../pose/types.ts';

const POSE_CONNECTIONS: Array<[number, number]> = [
  // tronco
  [11, 12], [11, 23], [12, 24], [23, 24],
  // braços
  [11, 13], [13, 15], [12, 14], [14, 16],
  // pernas
  [23, 25], [25, 27], [24, 26], [26, 28],
  // pés
  [27, 29], [27, 31], [28, 30], [28, 32],
  // face básica (olhos + boca)
  [2, 5], [9, 10],
];

export class KeypointOverlay {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  resizeToVideo(video: HTMLVideoElement): void {
    this.canvas.width = video.videoWidth || 640;
    this.canvas.height = video.videoHeight || 480;
  }

  clear(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(keypoints: Keypoint[], confidence: number): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Connections
    ctx.strokeStyle = confidence > 0.6 ? 'rgba(76,217,100,0.9)' : 'rgba(255,214,10,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [a, b] of POSE_CONNECTIONS) {
      const ka = keypoints[a];
      const kb = keypoints[b];
      if (!ka || !kb) continue;
      ctx.moveTo(ka.x * W, ka.y * H);
      ctx.lineTo(kb.x * W, kb.y * H);
    }
    ctx.stroke();

    // Keypoints
    for (let i = 0; i < keypoints.length; i++) {
      const k = keypoints[i];
      const v = k.visibility ?? 1;
      ctx.fillStyle = v > 0.6 ? 'rgba(76,217,100,1)' : 'rgba(255,69,58,0.9)';
      ctx.beginPath();
      ctx.arc(k.x * W, k.y * H, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### C7. Integrar pose detection no `main.ts`

**Modificar:** `src/main.ts`
**Substituir** o conteúdo inteiro por:
```ts
import { renderWelcome, hideWelcome } from './ui/welcomeScreen.ts';
import { showLoading, hideLoading } from './ui/loadingScreen.ts';
import { showError, hideError, type ErrorKind } from './ui/errorScreen.ts';
import { PoseDetector } from './pose/poseDetector.ts';
import { EmaSmoother } from './pose/smoother.ts';
import { POSE_CONFIG } from './pose/config.ts';
import { KeypointOverlay } from './ui/keypointOverlay.ts';
import type { PoseFrame } from './pose/types.ts';

type AppState =
  | { kind: 'welcome' }
  | { kind: 'loading' }
  | { kind: 'calibrating' }
  | { kind: 'active' }
  | { kind: 'error'; error: ErrorKind };

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
};

const screens = {
  welcome: $('screen-welcome'),
  loading: $('screen-loading'),
  error: $('screen-error'),
  calibration: $('screen-calibration'),
};
const videoStage = $('video-stage');
const video = $('video') as unknown as HTMLVideoElement;
const overlay = $('overlay') as unknown as HTMLCanvasElement;

const detector = new PoseDetector();
const smoother = new EmaSmoother(POSE_CONFIG.emaAlpha);
const keypointPainter = new KeypointOverlay(overlay);

let state: AppState = { kind: 'welcome' };
let unsubFrame: (() => void) | null = null;

function transitionTo(next: AppState): void {
  hideWelcome(screens.welcome);
  hideLoading(screens.loading);
  hideError(screens.error);
  screens.calibration.classList.add('hidden');
  videoStage.classList.add('hidden');

  state = next;
  switch (next.kind) {
    case 'welcome':
      if (unsubFrame) { unsubFrame(); unsubFrame = null; }
      detector.stop();
      smoother.reset();
      renderWelcome(screens.welcome, () => start());
      break;
    case 'loading':
      showLoading(screens.loading);
      break;
    case 'calibrating':
      videoStage.classList.remove('hidden');
      keypointPainter.resizeToVideo(video);
      // D3 will add the calibration screen overlay
      screens.calibration.classList.remove('hidden');
      screens.calibration.innerHTML = '<h1>Calibração em construção (Fase D)</h1>';
      break;
    case 'active':
      videoStage.classList.remove('hidden');
      break;
    case 'error':
      showError(screens.error, next.error, () => transitionTo({ kind: 'welcome' }));
      break;
  }
}

async function start(): Promise<void> {
  transitionTo({ kind: 'loading' });
  try {
    await detector.loadModel();
    await detector.openCamera(video);
    detector.start(video);
    unsubFrame = detector.onFrame(handleFrame);
    transitionTo({ kind: 'calibrating' });
  } catch (err) {
    console.error(err);
    const kind: ErrorKind = classifyError(err);
    transitionTo({ kind: 'error', error: kind });
  }
}

function classifyError(err: unknown): ErrorKind {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'cameraDenied';
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'cameraNotFound';
  }
  if (err instanceof Error && /fetch|network|loading/i.test(err.message)) return 'modelDownload';
  return 'generic';
}

function handleFrame(frame: PoseFrame): void {
  const smoothed = smoother.smooth(frame.keypoints);
  keypointPainter.resizeToVideo(video);
  keypointPainter.draw(smoothed, frame.confidence);
  // D+ will add: calibration capture, events detection, debug panel update
}

transitionTo({ kind: 'welcome' });

(window as unknown as { __movemoveDebug: { transitionTo: typeof transitionTo } })
  .__movemoveDebug = { transitionTo };
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### C8. Smoke test fase C

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && npm run dev &
DEV_PID=$!
sleep 4
echo "Open http://localhost:5173/ in Chrome desktop, click 'Ligar câmera', allow camera."
echo "Expected: keypoints visíveis sobre o vídeo (pontos verdes + linhas conectando ombros/quadris/joelhos)."
read -p "Press ENTER when done testing..."
kill $DEV_PID 2>/dev/null
```
**Verificação manual obrigatória:**
1. Welcome aparece.
2. Clicar "Ligar câmera" → Loading → permissão → câmera abre.
3. Após ~3-5s, pontos verdes aparecem sobre seu corpo no vídeo.
4. Painel de calibração mostra "Calibração em construção (Fase D)" — esperado, será refeito em D3.
5. Console: sem erro vermelho.

Se passar, prosseguir. Se falhar:
- Sem keypoints aparecendo → verificar console (modelo baixou? wasm carregou?). Conferir `Network` tab.
- Erro `delegate: GPU` → trocar pra `delegate: 'CPU'` em C5 e tentar de novo.

---

### C9. Commit Fase C

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && \
  git add src/pose/ src/ui/keypointOverlay.ts src/main.ts && \
  git commit -m "$(cat <<'EOF'
feat(issue-2): fase C — pose detection com MediaPipe (#2)

- PoseDetector wrapper sobre @mediapipe/tasks-vision
- EmaSmoother (ADR-5: alpha=0.5)
- KeypointOverlay desenha 33 pontos + conexões sobre o vídeo
- main.ts integra: welcome → loading → câmera + modelo → calibrating

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline` mostra `fase C`.

---

## FASE D — Calibração + 6 heurísticas + bus de eventos

### D1. Criar `src/pose/calibration.ts`

**Criar:** `src/pose/calibration.ts`
**Conteúdo:**
```ts
import { POSE_CONFIG } from './config.ts';
import { KP, type Baseline, type Keypoint, type PoseFrame } from './types.ts';

export type CalibrationOutcome =
  | { ok: true; baseline: Baseline }
  | { ok: false; reason: 'low_confidence' | 'no_body' | 'aborted' };

export class Calibrator {
  private samples: PoseFrame[] = [];
  private startedAt = 0;
  private active = false;

  start(): void {
    this.samples = [];
    this.startedAt = performance.now();
    this.active = true;
  }

  abort(): void {
    this.active = false;
    this.samples = [];
  }

  isActive(): boolean { return this.active; }

  feed(frame: PoseFrame): CalibrationOutcome | null {
    if (!this.active) return null;
    if (frame.confidence < POSE_CONFIG.minConfidenceForCalibration) {
      // ignore frame, don't fail yet
    } else {
      this.samples.push(frame);
    }
    const elapsed = performance.now() - this.startedAt;
    if (elapsed < POSE_CONFIG.calibrationDurationMs) return null;
    return this.finalize();
  }

  private finalize(): CalibrationOutcome {
    this.active = false;
    if (this.samples.length < 10) {
      return { ok: false, reason: 'low_confidence' };
    }
    const avgConf =
      this.samples.reduce((s, f) => s + f.confidence, 0) / this.samples.length;
    if (avgConf < POSE_CONFIG.minConfidenceForCalibration) {
      return { ok: false, reason: 'low_confidence' };
    }

    const meanY = (idx: number) =>
      this.samples.reduce((s, f) => s + f.keypoints[idx].y, 0) / this.samples.length;
    const meanX = (idx: number) =>
      this.samples.reduce((s, f) => s + f.keypoints[idx].x, 0) / this.samples.length;

    const yEyes = (meanY(KP.LEFT_EYE) + meanY(KP.RIGHT_EYE)) / 2;
    const yAnkles = (meanY(KP.LEFT_ANKLE) + meanY(KP.RIGHT_ANKLE)) / 2;
    const hCorpo = Math.abs(yAnkles - yEyes);

    const yQuadrilBase = (meanY(KP.LEFT_HIP) + meanY(KP.RIGHT_HIP)) / 2;
    const xCentroBase = (meanX(KP.LEFT_HIP) + meanX(KP.RIGHT_HIP)) / 2;

    const xLS = meanX(KP.LEFT_SHOULDER);
    const xRS = meanX(KP.RIGHT_SHOULDER);
    const larguraOmbros = Math.abs(xLS - xRS);

    if (hCorpo < 0.1 || larguraOmbros < 0.05) {
      return { ok: false, reason: 'low_confidence' };
    }

    return {
      ok: true,
      baseline: {
        hCorpo,
        yQuadrilBase,
        xCentroBase,
        larguraOmbros,
        capturedAt: performance.now(),
      },
    };
  }
}

export function pickBestKp(_kps: Keypoint[], idx: number): number {
  // helper for tests/expansion
  return idx;
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### D2. Criar `src/ui/calibrationScreen.ts`

**Criar:** `src/ui/calibrationScreen.ts`
**Conteúdo:**
```ts
import { strings } from '../i18n/strings.ts';
import { POSE_CONFIG } from '../pose/config.ts';

export class CalibrationScreen {
  private container: HTMLElement;
  private countdownEl: HTMLDivElement;
  private instructionEl: HTMLParagraphElement;
  private statusEl: HTMLParagraphElement;
  private timer: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.innerHTML = '';

    this.instructionEl = document.createElement('p');
    this.instructionEl.textContent = strings.calibration.instruction;

    this.countdownEl = document.createElement('div');
    this.countdownEl.className = 'countdown';

    this.statusEl = document.createElement('p');
    this.statusEl.textContent = '';

    this.container.append(this.instructionEl, this.countdownEl, this.statusEl);
  }

  startCountdown(onDone: () => void): void {
    let remaining = POSE_CONFIG.calibrationCountdownSec;
    this.countdownEl.textContent = strings.calibration.countdown(remaining);
    this.timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        this.countdownEl.textContent = strings.calibration.countdown(remaining);
      } else {
        if (this.timer !== null) clearInterval(this.timer);
        this.timer = null;
        this.countdownEl.textContent = '🎯';
        this.statusEl.textContent = strings.calibration.capturing;
        onDone();
      }
    }, 1000);
  }

  showRetry(): void {
    this.statusEl.textContent = strings.calibration.retry;
  }

  showOk(): void {
    this.countdownEl.textContent = '✅';
    this.statusEl.textContent = strings.calibration.ok;
  }

  destroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.container.innerHTML = '';
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### D3. Integrar calibração no `main.ts`

**Modificar:** `src/main.ts`
**Adicionar imports** (logo após os imports existentes):
```ts
import { CalibrationScreen } from './ui/calibrationScreen.ts';
import { Calibrator, type CalibrationOutcome } from './pose/calibration.ts';
import type { Baseline } from './pose/types.ts';
```

**Adicionar variáveis** (logo após `let unsubFrame: (() => void) | null = null;`):
```ts
const calibrator = new Calibrator();
let calibScreen: CalibrationScreen | null = null;
let baseline: Baseline | null = null;
```

**Substituir o case `'calibrating'`** dentro do switch em `transitionTo` por:
```ts
    case 'calibrating': {
      videoStage.classList.remove('hidden');
      keypointPainter.resizeToVideo(video);
      screens.calibration.classList.remove('hidden');
      if (!calibScreen) calibScreen = new CalibrationScreen(screens.calibration);
      else calibScreen = new CalibrationScreen(screens.calibration);
      calibScreen.startCountdown(() => {
        calibrator.start();
      });
      break;
    }
```

**Substituir `handleFrame`** por:
```ts
function handleFrame(frame: PoseFrame): void {
  const smoothed = smoother.smooth(frame.keypoints);
  keypointPainter.resizeToVideo(video);
  keypointPainter.draw(smoothed, frame.confidence);

  if (state.kind === 'calibrating' && calibrator.isActive()) {
    const outcome: CalibrationOutcome | null = calibrator.feed({
      ...frame,
      keypoints: smoothed,
    });
    if (outcome) {
      if (outcome.ok) {
        baseline = outcome.baseline;
        calibScreen?.showOk();
        setTimeout(() => transitionTo({ kind: 'active' }), 600);
      } else {
        calibScreen?.showRetry();
        setTimeout(() => transitionTo({ kind: 'calibrating' }), 1500);
      }
    }
  }
  // events/debug coming in D+
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### D4. Criar `src/pose/events.ts` — esqueleto + bus + jump

**Criar:** `src/pose/events.ts`
**Conteúdo:**
```ts
import { POSE_CONFIG } from './config.ts';
import { KP, type Baseline, type GameEvent, type Keypoint, type Lane, type PoseFrame } from './types.ts';

export class EventDetector extends EventTarget {
  private baseline: Baseline | null = null;
  private lastJumpAt = 0;
  private duckSince: number | null = null;
  private currentLane: Lane = 0;
  private kneeUpHistory: Array<{ side: 'L' | 'R'; t: number }> = [];

  setBaseline(b: Baseline): void { this.baseline = b; }
  reset(): void {
    this.baseline = null;
    this.lastJumpAt = 0;
    this.duckSince = null;
    this.currentLane = 0;
    this.kneeUpHistory = [];
  }

  ingest(frame: PoseFrame): void {
    if (!this.baseline) return;
    const kp = frame.keypoints;
    const t = frame.timestamp;

    this.detectJump(kp, t);
    this.detectDuck(kp, t);
    this.detectLane(kp, t);
    this.detectCadence(kp, t);
    this.detectJumpingJack(kp, t);
    this.detectArmsUp(kp, t);
  }

  private hipY(kp: Keypoint[]): number {
    return (kp[KP.LEFT_HIP].y + kp[KP.RIGHT_HIP].y) / 2;
  }
  private hipX(kp: Keypoint[]): number {
    return (kp[KP.LEFT_HIP].x + kp[KP.RIGHT_HIP].x) / 2;
  }

  private emit(ev: GameEvent): void {
    this.dispatchEvent(new CustomEvent('event', { detail: ev }));
  }

  // --- D5..D10: implementações abaixo ---
  private detectJump(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    const yHip = this.hipY(kp);
    const threshold = this.baseline.yQuadrilBase - POSE_CONFIG.jumpThresholdFracHCorpo * this.baseline.hCorpo;
    if (yHip < threshold && t - this.lastJumpAt > POSE_CONFIG.jumpCooldownMs) {
      this.lastJumpAt = t;
      this.emit({ type: 'jump', source: 'pose', t });
    }
  }
  private detectDuck(_kp: Keypoint[], _t: number): void { /* D6 */ }
  private detectLane(_kp: Keypoint[], _t: number): void { /* D7 */ }
  private detectCadence(_kp: Keypoint[], _t: number): void { /* D8 */ }
  private detectJumpingJack(_kp: Keypoint[], _t: number): void { /* D9 */ }
  private detectArmsUp(_kp: Keypoint[], _t: number): void { /* D10 */ }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### D5. (já feita em D4 — jump implementado)

Marcar D5 como completa via verificação:
**Comando:**
```bash
grep -A 8 'detectJump' /Users/rjcaubit/Dev/movemove/src/pose/events.ts | head -10
```
**Esperado:** mostra a implementação com `Y_quadril_base − POSE_CONFIG.jumpThresholdFracHCorpo * hCorpo`.

---

### D6. Implementar `detectDuck` em `events.ts`

**Modificar:** `src/pose/events.ts`
**Substituir** `private detectDuck(_kp: Keypoint[], _t: number): void { /* D6 */ }` por:
```ts
  private detectDuck(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    const yHip = this.hipY(kp);
    const threshold = this.baseline.yQuadrilBase + POSE_CONFIG.duckThresholdFracHCorpo * this.baseline.hCorpo;
    if (yHip > threshold) {
      if (this.duckSince === null) this.duckSince = t;
      else if (t - this.duckSince >= POSE_CONFIG.duckSustainMs) {
        this.emit({ type: 'duck', source: 'pose', t });
        // require leaving the duck zone before next emit
        this.duckSince = Number.POSITIVE_INFINITY;
      }
    } else {
      this.duckSince = null;
    }
  }
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### D7. Implementar `detectLane` (com histerese)

**Modificar:** `src/pose/events.ts`
**Substituir** `private detectLane(_kp: Keypoint[], _t: number): void { /* D7 */ }` por:
```ts
  private detectLane(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    const xHip = this.hipX(kp);
    const dx = xHip - this.baseline.xCentroBase;
    const T = POSE_CONFIG.laneThresholdFracOmbros * this.baseline.larguraOmbros;
    const Th = POSE_CONFIG.laneHysteresisFrac * this.baseline.larguraOmbros;
    let next: Lane = this.currentLane;
    if (this.currentLane === 0) {
      if (dx < -T) next = -1;
      else if (dx > T) next = 1;
    } else if (this.currentLane === -1) {
      if (dx > -T + Th) next = 0;
    } else if (this.currentLane === 1) {
      if (dx < T - Th) next = 0;
    }
    if (next !== this.currentLane) {
      this.currentLane = next;
      this.emit({ type: 'lane_change', lane: next, source: 'pose', t });
    }
  }
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### D8. Implementar `detectCadence`

**Modificar:** `src/pose/events.ts`
**Substituir** `private detectCadence(_kp: Keypoint[], _t: number): void { /* D8 */ }` por:
```ts
  private detectCadence(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    const yKneeL = kp[KP.LEFT_KNEE].y;
    const yKneeR = kp[KP.RIGHT_KNEE].y;
    const threshold =
      this.baseline.yQuadrilBase - POSE_CONFIG.cadenceKneeRaiseFracHCorpo * this.baseline.hCorpo;
    const last = this.kneeUpHistory[this.kneeUpHistory.length - 1];
    if (yKneeL < threshold && (!last || last.side !== 'L')) {
      this.kneeUpHistory.push({ side: 'L', t });
    } else if (yKneeR < threshold && (!last || last.side !== 'R')) {
      this.kneeUpHistory.push({ side: 'R', t });
    }
    // Drop entries older than window
    const cutoff = t - POSE_CONFIG.cadenceWindowMs;
    while (this.kneeUpHistory.length > 0 && this.kneeUpHistory[0].t < cutoff) {
      this.kneeUpHistory.shift();
    }
    const stepsPerSec = (this.kneeUpHistory.length * 1000) / POSE_CONFIG.cadenceWindowMs;
    this.emit({ type: 'cadence', stepsPerSec, source: 'pose', t });
  }
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### D9. Implementar `detectJumpingJack`

**Modificar:** `src/pose/events.ts`
**Substituir** `private detectJumpingJack(_kp: Keypoint[], _t: number): void { /* D9 */ }` por:
```ts
  private lastJackAt = 0;
  private detectJumpingJack(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    if (t - this.lastJackAt < 600) return; // cooldown
    const xAnkleL = kp[KP.LEFT_ANKLE].x;
    const xAnkleR = kp[KP.RIGHT_ANKLE].x;
    const ankleSpread = Math.abs(xAnkleL - xAnkleR);
    const yWristL = kp[KP.LEFT_WRIST].y;
    const yWristR = kp[KP.RIGHT_WRIST].y;
    const yEyeL = kp[KP.LEFT_EYE].y;
    const yEyeR = kp[KP.RIGHT_EYE].y;
    const yEyes = (yEyeL + yEyeR) / 2;
    const ankleSpreadOk =
      ankleSpread > POSE_CONFIG.jackAnkleSpreadFactorOmbros * this.baseline.larguraOmbros;
    const wristsAboveHead = yWristL < yEyes && yWristR < yEyes;
    if (ankleSpreadOk && wristsAboveHead) {
      this.lastJackAt = t;
      this.emit({ type: 'jumping_jack', source: 'pose', t });
    }
  }
```
**Verificar:** `npx tsc --noEmit` sem erros (declarações duplicadas se houver — verificar `lastJackAt` está como property da classe, fora dos métodos).

---

### D10. Implementar `detectArmsUp`

**Modificar:** `src/pose/events.ts`
**Substituir** `private detectArmsUp(_kp: Keypoint[], _t: number): void { /* D10 */ }` por:
```ts
  private armsUpSince: number | null = null;
  private armsUpEmittedAt = 0;
  private detectArmsUp(kp: Keypoint[], t: number): void {
    const yWristL = kp[KP.LEFT_WRIST].y;
    const yWristR = kp[KP.RIGHT_WRIST].y;
    const yEyeL = kp[KP.LEFT_EYE].y;
    const yEyeR = kp[KP.RIGHT_EYE].y;
    const yEyes = (yEyeL + yEyeR) / 2;
    const both = yWristL < yEyes && yWristR < yEyes;
    if (both) {
      if (this.armsUpSince === null) this.armsUpSince = t;
      if (t - this.armsUpEmittedAt > 500) {
        this.armsUpEmittedAt = t;
        this.emit({ type: 'arms_up', source: 'pose', t });
      }
    } else {
      this.armsUpSince = null;
    }
  }
```
**Verificar:** `npx tsc --noEmit` sem erros. Properties `armsUpSince` e `armsUpEmittedAt` ficam no nível da classe, como `lastJackAt` em D9.

---

### D11. Criar `src/ui/eventOverlay.ts`

**Criar:** `src/ui/eventOverlay.ts`
**Conteúdo:**
```ts
import type { GameEvent } from '../pose/types.ts';

export class EventOverlay {
  private pips: Map<string, HTMLElement> = new Map();
  private timers: Map<string, number> = new Map();

  constructor(host: HTMLElement) {
    for (const el of Array.from(host.querySelectorAll<HTMLElement>('.event-pip'))) {
      const ev = el.dataset.event;
      if (ev) this.pips.set(ev, el);
    }
  }

  fire(ev: GameEvent): void {
    let key: string;
    switch (ev.type) {
      case 'lane_change':
        if (ev.lane === -1) key = 'lane_left';
        else if (ev.lane === 1) key = 'lane_right';
        else return;
        break;
      case 'cadence':
        return; // cadence is shown only in debug panel
      default:
        key = ev.type;
    }
    const pip = this.pips.get(key);
    if (!pip) return;
    pip.classList.add('fire');
    const prev = this.timers.get(key);
    if (prev !== undefined) clearTimeout(prev);
    this.timers.set(
      key,
      window.setTimeout(() => pip.classList.remove('fire'), 500),
    );
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### D12. Integrar events no `main.ts` + smoke test

**Modificar:** `src/main.ts`
**Adicionar imports:**
```ts
import { EventDetector } from './pose/events.ts';
import { EventOverlay } from './ui/eventOverlay.ts';
import type { GameEvent } from './pose/types.ts';
```

**Adicionar variáveis** (após `let baseline: Baseline | null = null;`):
```ts
const eventDetector = new EventDetector();
const eventOverlay = new EventOverlay($('event-overlay'));
eventDetector.addEventListener('event', (e) => {
  const ev = (e as CustomEvent<GameEvent>).detail;
  eventOverlay.fire(ev);
  // debug panel hook will plug in E1
  console.log('[event]', ev);
});
```

**Substituir o bloco "if (state.kind === 'calibrating'..." em `handleFrame`** por:
```ts
  if (state.kind === 'calibrating' && calibrator.isActive()) {
    const outcome: CalibrationOutcome | null = calibrator.feed({
      ...frame,
      keypoints: smoothed,
    });
    if (outcome) {
      if (outcome.ok) {
        baseline = outcome.baseline;
        eventDetector.setBaseline(baseline);
        calibScreen?.showOk();
        setTimeout(() => transitionTo({ kind: 'active' }), 600);
      } else {
        calibScreen?.showRetry();
        setTimeout(() => transitionTo({ kind: 'calibrating' }), 1500);
      }
    }
  }
  if (state.kind === 'active' && baseline) {
    eventDetector.ingest({ ...frame, keypoints: smoothed });
  }
```

**Smoke test:**
```bash
cd /Users/rjcaubit/Dev/movemove && npm run dev &
DEV_PID=$!
sleep 4
echo "Open http://localhost:5173/, click 'Ligar câmera', complete calibration, then jump/squat/move sideways. Expect colored pips firing at the bottom + console.log of events."
read -p "Press ENTER when done testing..."
kill $DEV_PID 2>/dev/null
```
**Verificação manual:**
1. Welcome → Loading → Calibration (countdown 3-2-1) → captura ~2s → Active.
2. Pular fisicamente → pip verde "↑" pisca + console mostra `{type:'jump',...}`.
3. Agachar → pip azul "↓" pisca.
4. Mover-se 30cm pra esquerda → pip laranja "←" pisca; voltar pro centro → outro evento `lane_change lane:0`.
5. Cadência aparece como `console.log` várias vezes/segundo (sem pip).

---

### D13. Commit Fase D

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && \
  git add src/pose/calibration.ts src/pose/events.ts src/ui/calibrationScreen.ts src/ui/eventOverlay.ts src/main.ts && \
  git commit -m "$(cat <<'EOF'
feat(issue-2): fase D — calibração + 6 heurísticas + bus de eventos (#2)

- Calibrator: countdown 3-2-1 + captura 2s + cálculo H_corpo
- EventDetector: 6 heurísticas (jump/duck/lane/cadence/jack/arms_up)
  com thresholds em fração de H_corpo (Seção 3.3 do EXERGAME_PROJETO.md)
- EventOverlay: pips coloridos por evento (500ms)
- Bus = EventTarget nativo (study #1)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
**Verificar:** `git log -1 --oneline` mostra `fase D`.

---

## FASE E — Debug, estados especiais, deploy, validação

### E1. Criar `src/ui/debugPanel.ts`

**Criar:** `src/ui/debugPanel.ts`
**Conteúdo:**
```ts
import type { Baseline, GameEvent, Lane } from '../pose/types.ts';
import { POSE_CONFIG } from '../pose/config.ts';

interface PanelState {
  fps: number;
  confidence: number;
  baseline: Baseline | null;
  lane: Lane;
  cadence: number;
}

export class DebugPanel {
  private panel: HTMLElement;
  private toggle: HTMLElement;
  private logEl: HTMLDivElement;
  private rowFps: HTMLDivElement;
  private rowConf: HTMLDivElement;
  private rowBase: HTMLDivElement;
  private rowLane: HTMLDivElement;
  private rowCad: HTMLDivElement;
  private logEntries: string[] = [];
  private state: PanelState = {
    fps: 0, confidence: 0, baseline: null, lane: 0, cadence: 0,
  };
  private fpsBuf: number[] = [];

  constructor(panel: HTMLElement, toggle: HTMLElement) {
    this.panel = panel;
    this.toggle = toggle;
    this.panel.innerHTML = '';
    this.rowFps = this.row('FPS', '—');
    this.rowConf = this.row('Conf.', '—');
    this.rowBase = this.row('Baseline', '—');
    this.rowLane = this.row('Lane', '0');
    this.rowCad = this.row('Cadência', '0 p/s');
    this.logEl = document.createElement('div');
    this.logEl.className = 'log';
    this.panel.appendChild(this.logEl);
    this.toggle.addEventListener('click', () => {
      this.panel.classList.toggle('hidden');
    });
  }

  private row(label: string, value: string): HTMLDivElement {
    const r = document.createElement('div');
    r.className = 'row';
    const k = document.createElement('span'); k.textContent = label;
    const v = document.createElement('span'); v.textContent = value;
    r.append(k, v);
    this.panel.appendChild(r);
    return r;
  }

  tickFps(now: number): void {
    this.fpsBuf.push(now);
    const cutoff = now - 1000;
    while (this.fpsBuf.length > 0 && this.fpsBuf[0] < cutoff) this.fpsBuf.shift();
    this.state.fps = this.fpsBuf.length;
    this.update();
  }

  setConfidence(c: number): void { this.state.confidence = c; this.update(); }
  setBaseline(b: Baseline | null): void { this.state.baseline = b; this.update(); }
  setLane(l: Lane): void { this.state.lane = l; this.update(); }
  setCadence(c: number): void { this.state.cadence = c; this.update(); }

  appendEvent(ev: GameEvent): void {
    const ts = new Date().toISOString().slice(11, 23);
    const tag = ev.source === 'kbd' ? '[KBD]' : '[POSE]';
    let detail = ev.type;
    if (ev.type === 'lane_change') detail = `lane=${ev.lane}`;
    else if (ev.type === 'cadence') detail = `cadence=${ev.stepsPerSec.toFixed(2)}`;
    this.logEntries.unshift(`${ts} ${tag} ${detail}`);
    if (this.logEntries.length > POSE_CONFIG.debugLogMaxEntries) this.logEntries.pop();
    this.logEl.innerHTML = this.logEntries
      .map((e) => `<div class="entry">${e}</div>`).join('');
  }

  private update(): void {
    this.rowFps.lastChild!.textContent = `${this.state.fps}`;
    this.rowConf.lastChild!.textContent = this.state.confidence.toFixed(2);
    this.rowBase.lastChild!.textContent = this.state.baseline
      ? `H=${this.state.baseline.hCorpo.toFixed(3)} hipY=${this.state.baseline.yQuadrilBase.toFixed(3)}`
      : '—';
    this.rowLane.lastChild!.textContent = `${this.state.lane}`;
    this.rowCad.lastChild!.textContent = `${this.state.cadence.toFixed(2)} p/s`;
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### E2. Criar `src/debug/keyboard.ts`

**Criar:** `src/debug/keyboard.ts`
**Conteúdo:**
```ts
import type { GameEvent } from '../pose/types.ts';

export class KeyboardDebug {
  private cadenceOn = false;
  private cadenceTimer: number | null = null;
  private listener: ((e: KeyboardEvent) => void) | null = null;

  constructor(private readonly emit: (ev: GameEvent) => void) {}

  enable(): void {
    if (this.listener) return;
    this.listener = (e: KeyboardEvent) => {
      const t = performance.now();
      switch (e.code) {
        case 'Space':
          this.emit({ type: 'jump', source: 'kbd', t });
          break;
        case 'ArrowDown':
          this.emit({ type: 'duck', source: 'kbd', t });
          break;
        case 'ArrowLeft':
          this.emit({ type: 'lane_change', lane: -1, source: 'kbd', t });
          break;
        case 'ArrowRight':
          this.emit({ type: 'lane_change', lane: 1, source: 'kbd', t });
          break;
        case 'KeyJ':
          this.emit({ type: 'jumping_jack', source: 'kbd', t });
          break;
        case 'KeyR':
          this.toggleCadence();
          break;
      }
    };
    window.addEventListener('keydown', this.listener);
  }

  private toggleCadence(): void {
    this.cadenceOn = !this.cadenceOn;
    if (this.cadenceOn) {
      const fire = () => {
        this.emit({ type: 'cadence', stepsPerSec: 2.5, source: 'kbd', t: performance.now() });
      };
      fire();
      this.cadenceTimer = window.setInterval(fire, 400);
    } else {
      if (this.cadenceTimer !== null) clearInterval(this.cadenceTimer);
      this.cadenceTimer = null;
      this.emit({ type: 'cadence', stepsPerSec: 0, source: 'kbd', t: performance.now() });
    }
  }

  disable(): void {
    if (this.listener) window.removeEventListener('keydown', this.listener);
    this.listener = null;
    if (this.cadenceTimer !== null) clearInterval(this.cadenceTimer);
    this.cadenceTimer = null;
    this.cadenceOn = false;
  }

  static isEnabledByQuery(): boolean {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  }
}
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### E3. Implementar estados especiais (no body / low confidence / drift)

**Modificar:** `src/main.ts`
**Adicionar imports:**
```ts
import { setNoBodyVisible } from './ui/noBodyScreen.ts';
import { strings } from './i18n/strings.ts';
```

**Adicionar variáveis** (após `const eventDetector = ...`):
```ts
const noBodyHost = $('no-body-overlay');
const bannerHost = $('banner-host');
let lastFrameAt = 0;
let lowConfSince: number | null = null;
let driftSince: number | null = null;
```

**Adicionar função utilitária** (próximo do topo, antes de `function transitionTo`):
```ts
let bannerEl: HTMLDivElement | null = null;
function showBanner(text: string, kind: 'warn' | 'error' = 'warn', actionLabel?: string, onAction?: () => void): void {
  hideBanner();
  bannerEl = document.createElement('div');
  bannerEl.className = `banner ${kind === 'error' ? 'error' : ''}`;
  bannerEl.textContent = text;
  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.textContent = actionLabel;
    btn.style.marginLeft = '12px';
    btn.style.minHeight = '32px';
    btn.style.padding = '4px 10px';
    btn.style.fontSize = '13px';
    btn.addEventListener('click', () => { hideBanner(); onAction(); }, { once: true });
    bannerEl.appendChild(btn);
  }
  bannerHost.appendChild(bannerEl);
}
function hideBanner(): void {
  if (bannerEl && bannerEl.parentElement) bannerEl.parentElement.removeChild(bannerEl);
  bannerEl = null;
}
```

**Adicionar dentro do `handleFrame` no início**:
```ts
  lastFrameAt = frame.timestamp;
  setNoBodyVisible(noBodyHost, false);
  if (state.kind === 'active') {
    if (frame.confidence < 0.6) {
      if (lowConfSince === null) lowConfSince = frame.timestamp;
      const dur = frame.timestamp - lowConfSince;
      if (dur > 3000 && !bannerEl) showBanner(strings.states.lowLight, 'warn');
      if (dur > 10000 && driftSince === null) {
        driftSince = frame.timestamp;
        showBanner(strings.states.driftCalibration, 'warn', strings.states.recalibrate, () => {
          baseline = null;
          eventDetector.reset();
          driftSince = null;
          lowConfSince = null;
          transitionTo({ kind: 'calibrating' });
        });
      }
    } else {
      lowConfSince = null;
      driftSince = null;
      hideBanner();
    }
  }
```

**Adicionar setInterval no final do arquivo** (após `transitionTo({ kind: 'welcome' });`):
```ts
setInterval(() => {
  if (state.kind === 'active' && lastFrameAt > 0 && performance.now() - lastFrameAt > 1500) {
    setNoBodyVisible(noBodyHost, true);
  }
}, 500);
```
**Verificar:** `npx tsc --noEmit` sem erros.

---

### E4. Adicionar botão "Recalibrar" funcional

**Modificar:** `src/main.ts`
**Adicionar** (após variáveis de estado):
```ts
const recalibrateBtn = $('recalibrate-btn') as unknown as HTMLButtonElement;
recalibrateBtn.addEventListener('click', () => {
  baseline = null;
  eventDetector.reset();
  smoother.reset();
  transitionTo({ kind: 'calibrating' });
});
```

**Atualizar `transitionTo`** — no case `'active'` mostrar o botão; nos outros, esconder:
```ts
    case 'active':
      videoStage.classList.remove('hidden');
      recalibrateBtn.classList.remove('hidden');
      break;
```
E nos outros cases adicionar `recalibrateBtn.classList.add('hidden');` antes da hide do videoStage. Mais simples: adicionar logo no início do `transitionTo`, junto com os hides:
```ts
  recalibrateBtn.classList.add('hidden');
```

**Verificar:** `npx tsc --noEmit` sem erros.

---

### E5. Plugar DebugPanel + Keyboard fallback

**Modificar:** `src/main.ts`
**Adicionar imports:**
```ts
import { DebugPanel } from './ui/debugPanel.ts';
import { KeyboardDebug } from './debug/keyboard.ts';
```

**Adicionar variáveis** (próximo das outras de UI):
```ts
const debugPanel = new DebugPanel($('debug-panel'), $('debug-toggle'));
const keyboardDebug = new KeyboardDebug((ev) => {
  // Roteia evento de teclado pro mesmo destino que evento de pose
  eventDetector.dispatchEvent(new CustomEvent('event', { detail: ev }));
});
if (KeyboardDebug.isEnabledByQuery()) keyboardDebug.enable();
```

**No listener de eventos do detector** (já existe), adicionar após `eventOverlay.fire(ev)`:
```ts
  debugPanel.appendEvent(ev);
  if (ev.type === 'lane_change') debugPanel.setLane(ev.lane);
  if (ev.type === 'cadence') debugPanel.setCadence(ev.stepsPerSec);
```

**No `handleFrame`**, adicionar:
```ts
  debugPanel.tickFps(frame.timestamp);
  debugPanel.setConfidence(frame.confidence);
  if (baseline) debugPanel.setBaseline(baseline);
```

**Verificar:** `npx tsc --noEmit` sem erros.

**Smoke test:**
```bash
cd /Users/rjcaubit/Dev/movemove && npm run dev &
DEV_PID=$!
sleep 4
echo "Open http://localhost:5173/?debug=1 — test keyboard fallback (Space/Arrows/J/R) and toggle debug panel."
read -p "ENTER when done..."
kill $DEV_PID 2>/dev/null
```
**Verificação manual:**
1. Welcome → Loading → Calibration → Active.
2. Toggle "Debug" no canto direito → painel aparece com FPS, Confiança, Baseline, Lane, Cadência, log.
3. Pressionar Espaço → pip verde + log mostra `[KBD] jump`.
4. Pressionar setas → log mostra `[KBD] lane=-1` / `lane=1`.
5. Pressionar `R` → log mostra `[KBD] cadence=2.50` várias vezes; pressionar `R` de novo → cadência vai a 0.
6. Tampar a câmera → após 1.5s, overlay "Apareça pra câmera" aparece. Liberar → some.
7. Clicar "Recalibrar" → volta pra Calibration.

---

### E6. Build de produção e medir bundle size

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && \
  npm run copy:wasm && \
  npm run build && \
  echo "--- dist/ size ---" && du -sh dist/ && \
  echo "--- breakdown ---" && find dist/ -type f -exec ls -lh {} \; | awk '{print $5, $9}' | sort -rh | head -20
```
**Esperado:**
- `dist/` total < 5MB (RNF04 do spec).
- Maiores arquivos: `pose_landmarker_lite.task` (~3MB), `vision_wasm_internal.wasm` (~1.5MB), `index-*.js` (<200KB).
**Se exceder 5MB:** investigar com `du -sh dist/*` e ver se há asset duplicado; reduzir `assetsInlineLimit` em `vite.config.ts` se imagens base64 estiverem inflando.

---

### E7. Verificar `npm run preview` localmente serve o build

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && npm run preview &
PREV_PID=$!
sleep 3
curl -s -o /dev/null -w "Status %{http_code} | Size %{size_download} bytes\n" http://localhost:5173/
curl -s -o /dev/null -w "Model %{http_code} | %{size_download} bytes\n" http://localhost:5173/models/pose_landmarker_lite.task
curl -s -o /dev/null -w "WASM %{http_code} | %{size_download} bytes\n" http://localhost:5173/wasm/vision_wasm_internal.wasm
kill $PREV_PID 2>/dev/null
```
**Esperado:**
- HTML: 200, ~1-3KB
- Modelo: 200, ~3MB
- WASM: 200, ~1-2MB

---

### E8. Configurar deploy Cloudflare Pages

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && cat > wrangler.toml <<'EOF'
name = "movemove"
compatibility_date = "2026-04-26"

[site]
bucket = "./dist"
EOF

# Headers para servir .task como octet-stream e MediaPipe WASM corretamente
mkdir -p public
cat > public/_headers <<'EOF'
/models/*
  Content-Type: application/octet-stream
  Cache-Control: public, max-age=31536000, immutable

/wasm/*.wasm
  Content-Type: application/wasm
  Cache-Control: public, max-age=31536000, immutable

/wasm/*.js
  Content-Type: application/javascript
  Cache-Control: public, max-age=31536000, immutable
EOF

ls -la wrangler.toml public/_headers
```
**Verificar:** ambos arquivos criados.

**Deploy manual (faça uma vez via UI da Cloudflare ou via wrangler):**
```bash
# Pré-requisito: instalar wrangler globalmente
# npm i -g wrangler
# wrangler login
# Depois:
# cd /Users/rjcaubit/Dev/movemove && wrangler pages deploy dist --project-name movemove
```
*Esta sub-task pode ser pulada na sessão atual e feita manualmente pelo usuário; o critério de "link compartilhável" é cumprido pelo `wrangler pages deploy` na primeira vez.*

---

### E9. Criar `load-tests/results/issue-2-journey/README.md`

**Criar:** `load-tests/results/issue-2-journey/README.md`
**Conteúdo:**
```markdown
# Journey de teste — Issue #2 (Fase 0 PoC)

Esta pasta contém logs e screenshots da validação empírica da Fase 0 — Seção 4.4 e 4.5 do `EXERGAME_PROJETO.md`.

## Metodologia

Validação manual humana (criança real do dev). FPS lido pelo painel de debug toggle. Latência subjetiva. Falsos positivos contados manualmente.

## Devices testados

| Device | OS | Browser | FPS médio | Acerto subjetivo (jump/duck/lane) | Falsos positivos jump (1min parado) | Notas |
|--------|----|---------|-----------|------------------------------------|--------------------------------------|-------|
| iPhone SE 2020 | iOS 18 | Safari | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ |
| Galaxy A54 | Android 14 | Chrome | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ |
| MacBook Air M1 | macOS 14 | Chrome | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ |

## Iluminações testadas

- [ ] Sala normal (dia)
- [ ] Sala normal (noite com luz acesa)
- [ ] Sala com contraluz (janela atrás)
- [ ] Pouca luz

## Tipos de roupa

- [ ] Roupa colada
- [ ] Roupa larga
- [ ] Com casaco/chapéu

## Critérios de aceitação (Seção 4.4)

- [ ] 30+ FPS no celular alvo
- [ ] Acerto subjetivo > 85% pra jump/duck/lane (em 20 tentativas, ≤ 3 perdas)
- [ ] Latência percebida < 150ms
- [ ] Calibração funciona pra criança E adulto sem mudar código
- [ ] Não falha catastroficamente em baixa luz ou pessoas no fundo

## Bugs encontrados

(adicionar conforme descoberta)

## Screenshots

Em `./screenshots/` numerados sequencialmente. Cada um deve ter caption no commit message.
```
**Verificar:** `cat load-tests/results/issue-2-journey/README.md | head -3`.

---

### E10. (Opcional / quando devices estiverem em mãos) — Executar CT01 manualmente

**Comando preparatório:**
```bash
echo "Para CT01 manual:"
echo "1. Garantir Cloudflare Pages está deployado: visite https://movemove.pages.dev"
echo "2. Abrir o link no Chrome do iPhone/Android do filho do dev."
echo "3. Permitir câmera. Aguardar carregamento."
echo "4. Ficar parado pra calibração."
echo "5. Pular 20x — contar quantos viraram evento jump."
echo "6. Agachar 20x — contar acertos."
echo "7. Mover lateralmente 20x — contar acertos."
echo "8. Ficar parado 1 min e contar falsos positivos de jump."
echo "9. Anotar tudo em load-tests/results/issue-2-journey/README.md."
echo "10. Tirar screenshots: tela inicial, calibração, painel debug com FPS visível, evento detectado."
echo "11. Salvar em load-tests/results/issue-2-journey/screenshots/ numerados."
```
**Critério:** README preenchido com pelo menos 1 device testado (idealmente 3) + 5 screenshots no mínimo.

*Esta task NÃO bloqueia o /sdd-execute — pode ser feita após o merge inicial. Marcar critérios na issue conforme validar.*

---

### E11. (E2E click-by-click via Playwright)

**Pré-requisito:** instalar Playwright como dev dep:
```bash
cd /Users/rjcaubit/Dev/movemove && npm i -D @playwright/test && npx playwright install chromium
```

**Criar:** `e2e/issue-2.spec.ts`
**Conteúdo:**
```ts
import { test, expect } from '@playwright/test';

test.describe('Fase 0 — Issue #2', () => {
  test('CT06 click-by-click (com fake camera)', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['camera'],
      // Chrome flags would normally be set via `chromiumSandbox: false` and launch options;
      // here we rely on permissions and a stubbed media stream.
    });
    const page = await context.newPage();

    // Stub getUserMedia para devolver MediaStream vazio (suficiente pra navegar telas)
    await page.addInitScript(() => {
      const fakeStream = new MediaStream();
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: async () => fakeStream,
        configurable: true,
      });
    });

    await page.goto('http://localhost:5173/?debug=1');

    // Welcome screen
    await expect(page.locator('#screen-welcome h1')).toBeVisible();
    await page.screenshot({ path: 'load-tests/results/issue-2-journey/screenshots/01-welcome.png' });

    // Click "Ligar câmera"
    await page.getByRole('button', { name: 'Ligar câmera' }).click();

    // Loading screen
    await expect(page.locator('#screen-loading h1')).toBeVisible();
    await page.screenshot({ path: 'load-tests/results/issue-2-journey/screenshots/02-loading.png' });

    // Em fake stream, calibração pode falhar; aceitar transição pra calibration ou error
    await Promise.race([
      page.waitForSelector('#screen-calibration .countdown', { timeout: 30000 }).catch(() => null),
      page.waitForSelector('#screen-error', { timeout: 30000 }).catch(() => null),
    ]);
    await page.screenshot({ path: 'load-tests/results/issue-2-journey/screenshots/03-after-loading.png' });

    // Toggle debug panel
    const toggle = page.locator('#debug-toggle');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator('#debug-panel')).not.toHaveClass(/hidden/);
      await page.screenshot({ path: 'load-tests/results/issue-2-journey/screenshots/04-debug-panel.png' });
    }

    // Keyboard fallback test
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('KeyJ');
    await page.screenshot({ path: 'load-tests/results/issue-2-journey/screenshots/05-keyboard-fired.png' });

    await context.close();
  });
});
```

**Adicionar no `package.json` script:**
```json
"e2e": "playwright test"
```

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && npm run dev &
DEV_PID=$!
sleep 4
npm run e2e
kill $DEV_PID 2>/dev/null
ls load-tests/results/issue-2-journey/screenshots/
```
**Esperado:** pelo menos 4-5 screenshots criados em `load-tests/results/issue-2-journey/screenshots/`.

---

### E12. Atualizar body da issue + commit final

**Comando:**
```bash
cd /Users/rjcaubit/Dev/movemove && \
  cat > /tmp/issue-2-final-body.md <<'EOF'
## Objetivo

PoC isolada de detecção de pose com MediaPipe Tasks Vision: validar empiricamente que as 6 heurísticas da Seção 3.3 do `EXERGAME_PROJETO.md` (jump, duck, lane change, cadence, jumping jack, arms up) detectam movimento real do filho do desenvolvedor com >85% de acerto subjetivo, no celular alvo, com latência <150ms. **Sem jogo.**

## Entrega

Página HTML solta (Vite + TS + `@mediapipe/tasks-vision`) que abre câmera, sobrepõe keypoints, executa as 6 heurísticas e exibe painel de debug. Tela de calibração com countdown. Modo debug com keyboard fallback (`?debug=1`). Deploy: link compartilhável em Cloudflare Pages.

## Decisões transversais aplicáveis (do study #1)

Modelo `pose_landmarker_lite` em 480p; EMA α=0.5; sem `display: standalone` no manifest (risco iOS PWA + getUserMedia); estrutura de pastas `src/pose/` conforme study.

## Critérios de aceitação (Seção 4.4 do EXERGAME_PROJETO.md)

- [ ] 30+ FPS no Chrome/Safari de iPhone do desenvolvedor.
- [ ] Acerto subjetivo > 85% pra jump/duck/lane do filho.
- [ ] Latência percebida < 150ms.
- [ ] Calibração funciona em alturas diferentes (criança e adulto, sem mudar código).
- [ ] Não falha catastroficamente em baixa luz ou com pessoa entrando no fundo.

## Dependências

Stack do study #1 fechada (ADRs 1–6).

## Spec

- Design: `docs/sdd/ISSUE_2/00-design.md`
- Research: `docs/sdd/ISSUE_2/01-research.md`
- Spec: `docs/sdd/ISSUE_2/02-spec.md`
- Tasks: `docs/sdd/ISSUE_2/03-tasks.md`

## Links

- Doc base: `EXERGAME_PROJETO.md` Seção 4
- Study transversal: #1
- Journey de teste: `load-tests/results/issue-2-journey/README.md`

## Status SDD

- [x] 00-design.md
- [x] 01-research.md
- [x] 02-spec.md
- [x] 03-tasks.md
- [ ] Implementado (/sdd-execute)
- [ ] 04-acceptance.md

## Próximo passo

→ `/sdd-execute 2` — implementar cadenciado (checkpoint por fase) ou `/sdd-execute 2 --auto` em batch.
EOF
gh issue edit 2 --repo rjcaubit/movemove --body-file /tmp/issue-2-final-body.md
git add docs/sdd/ISSUE_2/01-research.md docs/sdd/ISSUE_2/02-spec.md docs/sdd/ISSUE_2/03-tasks.md src/ui/debugPanel.ts src/debug/keyboard.ts public/_headers wrangler.toml e2e/ load-tests/ package.json package-lock.json
git commit -m "$(cat <<'EOFC'
feat(issue-2): fase E — debug, estados especiais, deploy, validação (#2)

- DebugPanel toggle com FPS/conf/baseline/lane/cadência/log
- KeyboardDebug fallback (?debug=1)
- Estados: noBody, lowLight, drift recalibration suggest
- Cloudflare Pages headers (_headers) para .task / .wasm
- Playwright E2E (CT06)
- Journey log em load-tests/results/issue-2-journey/
- 01-research.md, 02-spec.md, 03-tasks.md no docs/sdd/ISSUE_2/

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOFC
)"
```
**Verificar:**
- `gh issue view 2 --json body | jq -r .body | head -20` mostra body atualizado com `[x] 03-tasks.md`.
- `git log --oneline -1` mostra `fase E`.

---

### E13. Marco final — cumprir Seção 4.4 com criança real

**Não automatizável.** Esta task é executada pelo usuário (dev) com o filho na frente do celular. O script E10 já dá os passos.

**Critério de "Implementado" da issue:** README de `load-tests/results/issue-2-journey/` preenchido com:
- Pelo menos 1 device com FPS ≥ 30 medido
- Acerto subjetivo > 85% para jump/duck/lane em 20 tentativas
- Pelo menos 5 screenshots numerados
- Lista de bugs encontrados (pode ser vazia)

Quando esses 4 forem cumpridos:
```bash
gh issue comment 2 --repo rjcaubit/movemove --body "Validação manual concluída. README + screenshots em load-tests/results/issue-2-journey/. Critérios de aceitação atingidos."
gh issue close 2 --repo rjcaubit/movemove
```
…e seguir pra `/sdd-brainstorm` ou `/sdd-plan 3` (Fase 1).
