import { renderWelcome, hideWelcome } from './ui/welcomeScreen.ts';
import { showLoading, hideLoading, setLoadingStatus } from './ui/loadingScreen.ts';
import { showError, hideError, type ErrorKind } from './ui/errorScreen.ts';
import { setNoBodyVisible } from './ui/noBodyScreen.ts';
import { PoseDetector } from './pose/poseDetector.ts';
import { EmaSmoother } from './pose/smoother.ts';
import { POSE_CONFIG } from './pose/config.ts';
import { KeypointOverlay } from './ui/keypointOverlay.ts';
import { CalibrationScreen } from './ui/calibrationScreen.ts';
import { Calibrator, type CalibrationOutcome } from './pose/calibration.ts';
import { EventDetector } from './pose/events.ts';
import { EventOverlay } from './ui/eventOverlay.ts';
import { DebugPanel } from './ui/debugPanel.ts';
import { KeyboardDebug } from './debug/keyboard.ts';
import { strings } from './i18n/strings.ts';
import type { Baseline, GameEvent, PoseFrame } from './pose/types.ts';

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
const recalibrateBtn = $('recalibrate-btn') as unknown as HTMLButtonElement;
const noBodyHost = $('no-body-overlay');
const bannerHost = $('banner-host');

const detector = new PoseDetector();
const smoother = new EmaSmoother(POSE_CONFIG.emaAlpha);
const keypointPainter = new KeypointOverlay(overlay);
const calibrator = new Calibrator();
const eventDetector = new EventDetector();
const eventOverlay = new EventOverlay($('event-overlay'));
const debugPanel = new DebugPanel($('debug-panel'), $('debug-toggle'));
const keyboardDebug = new KeyboardDebug((ev) => {
  eventDetector.dispatchEvent(new CustomEvent('event', { detail: ev }));
});
if (KeyboardDebug.isEnabledByQuery()) keyboardDebug.enable();

let state: AppState = { kind: 'welcome' };
let unsubFrame: (() => void) | null = null;
let calibScreen: CalibrationScreen | null = null;
let baseline: Baseline | null = null;
let lastFrameAt = 0;
let lowConfSince: number | null = null;
let driftSuggestedAt: number | null = null;

let bannerEl: HTMLDivElement | null = null;
function showBanner(
  text: string,
  kind: 'warn' | 'error' = 'warn',
  actionLabel?: string,
  onAction?: () => void,
): void {
  hideBanner();
  bannerEl = document.createElement('div');
  bannerEl.className = `banner ${kind === 'error' ? 'error' : ''}`;
  const span = document.createElement('span');
  span.textContent = text;
  bannerEl.appendChild(span);
  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.textContent = actionLabel;
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

eventDetector.addEventListener('event', (e) => {
  const ev = (e as CustomEvent<GameEvent>).detail;
  eventOverlay.fire(ev);
  debugPanel.appendEvent(ev);
  if (ev.type === 'lane_change') debugPanel.setLane(ev.lane);
  if (ev.type === 'cadence') debugPanel.setCadence(ev.stepsPerSec);
});

recalibrateBtn.addEventListener('click', () => {
  baseline = null;
  eventDetector.reset();
  smoother.reset();
  lowConfSince = null;
  driftSuggestedAt = null;
  hideBanner();
  transitionTo({ kind: 'calibrating' });
});

function transitionTo(next: AppState): void {
  hideWelcome(screens.welcome);
  hideLoading(screens.loading);
  hideError(screens.error);
  screens.calibration.classList.add('hidden');
  videoStage.classList.add('hidden');
  recalibrateBtn.classList.add('hidden');

  state = next;
  switch (next.kind) {
    case 'welcome':
      if (unsubFrame) { unsubFrame(); unsubFrame = null; }
      detector.stop();
      smoother.reset();
      eventDetector.reset();
      baseline = null;
      hideBanner();
      setNoBodyVisible(noBodyHost, false);
      renderWelcome(screens.welcome, () => start());
      break;
    case 'loading':
      showLoading(screens.loading);
      break;
    case 'calibrating': {
      videoStage.classList.remove('hidden');
      keypointPainter.resizeToVideo(video);
      screens.calibration.classList.remove('hidden');
      if (calibScreen) calibScreen.destroy();
      calibScreen = new CalibrationScreen(screens.calibration);
      calibScreen.startCountdown(() => calibrator.start());
      break;
    }
    case 'active':
      videoStage.classList.remove('hidden');
      recalibrateBtn.classList.remove('hidden');
      break;
    case 'error':
      showError(screens.error, next.error, () => transitionTo({ kind: 'welcome' }));
      break;
  }
}

async function start(): Promise<void> {
  transitionTo({ kind: 'loading' });
  try {
    await detector.loadModel((msg) => setLoadingStatus(msg));
    setLoadingStatus(strings.loading.statusOpeningCamera);
    await detector.openCamera(video);
    detector.start(video);
    unsubFrame = detector.onFrame(handleFrame);
    transitionTo({ kind: 'calibrating' });
  } catch (err) {
    console.error(err);
    transitionTo({ kind: 'error', error: classifyError(err) });
  }
}

function classifyError(err: unknown): ErrorKind {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'cameraDenied';
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'cameraNotFound';
    if (err.name === 'SecurityError') return 'insecureContext';
  }
  if (err instanceof Error && /fetch|network|loading/i.test(err.message)) return 'modelDownload';
  return 'generic';
}

function handleFrame(frame: PoseFrame): void {
  const smoothed = smoother.smooth(frame.keypoints);
  const smoothedFrame: PoseFrame = { ...frame, keypoints: smoothed };

  lastFrameAt = frame.timestamp;
  setNoBodyVisible(noBodyHost, false);

  keypointPainter.resizeToVideo(video);
  keypointPainter.draw(smoothed, frame.confidence);

  debugPanel.tickFps(frame.timestamp);
  debugPanel.setConfidence(frame.confidence);
  if (baseline) debugPanel.setBaseline(baseline);

  if (state.kind === 'calibrating' && calibrator.isActive()) {
    const outcome: CalibrationOutcome | null = calibrator.feed(smoothedFrame);
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
    eventDetector.ingest(smoothedFrame);

    if (frame.confidence < POSE_CONFIG.lowConfidenceThreshold) {
      if (lowConfSince === null) lowConfSince = frame.timestamp;
      const dur = frame.timestamp - lowConfSince;
      if (dur > POSE_CONFIG.lowConfidenceWarnDurationMs && !bannerEl) {
        showBanner(strings.states.lowLight, 'warn');
      }
      if (dur > POSE_CONFIG.driftRecalibrateSuggestMs && driftSuggestedAt === null) {
        driftSuggestedAt = frame.timestamp;
        showBanner(strings.states.driftCalibration, 'warn', strings.states.recalibrate, () => {
          baseline = null;
          eventDetector.reset();
          lowConfSince = null;
          driftSuggestedAt = null;
          transitionTo({ kind: 'calibrating' });
        });
      }
    } else {
      lowConfSince = null;
      driftSuggestedAt = null;
      hideBanner();
    }
  }
}

setInterval(() => {
  if (
    state.kind === 'active' &&
    lastFrameAt > 0 &&
    performance.now() - lastFrameAt > POSE_CONFIG.noBodyTimeoutMs
  ) {
    setNoBodyVisible(noBodyHost, true);
  }
}, 500);

transitionTo({ kind: 'welcome' });

(window as unknown as {
  __movemoveDebug: { transitionTo: typeof transitionTo; getState: () => AppState };
}).__movemoveDebug = { transitionTo, getState: () => state };

export {};
