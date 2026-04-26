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
  // D+ adiciona: captura calibração, detecção de eventos, painel debug
}

transitionTo({ kind: 'welcome' });

(window as unknown as {
  __movemoveDebug: { transitionTo: typeof transitionTo; getState: () => AppState };
}).__movemoveDebug = { transitionTo, getState: () => state };

export {};
