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
      // C7 substitui isso por load real do modelo + câmera
      setTimeout(() => transitionTo({ kind: 'calibrating' }), 1500);
      break;
    case 'calibrating':
      videoStage.classList.remove('hidden');
      screens.calibration.classList.remove('hidden');
      screens.calibration.innerHTML = '<h1>Calibração (placeholder Fase B)</h1>';
      break;
    case 'active':
      videoStage.classList.remove('hidden');
      break;
    case 'error':
      showError(screens.error, next.error, () => transitionTo({ kind: 'welcome' }));
      break;
  }
}

transitionTo({ kind: 'welcome' });

(window as unknown as {
  __movemoveDebug: { transitionTo: typeof transitionTo; getState: () => AppState };
}).__movemoveDebug = { transitionTo, getState: () => state };

export {};
