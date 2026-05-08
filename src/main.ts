import { startApp } from './game/orchestrator.ts';
import { GAME_CONFIG } from './game/config.ts';
import type { Baseline, GameEvent, CadenceIntensity } from './pose/types.ts';

// Modo retrato: auto-detecta pelo viewport. ?landscape=1 força paisagem mesmo em
// celular vertical (override pra desenvolvimento).
try {
  const params = new URLSearchParams(window.location.search);
  const forceLandscape = params.get('landscape') === '1';
  const forcePortrait = params.get('portrait') === '1';
  const isPortraitViewport = window.innerHeight > window.innerWidth;
  const usePortrait = forcePortrait || (!forceLandscape && isPortraitViewport);
  if (usePortrait) {
    // Canvas combina com o aspect-ratio real do viewport → FIT vira 1:1, tela cheia
    const w = 720;
    const h = Math.round(w * (window.innerHeight / window.innerWidth));
    (GAME_CONFIG as { width: number; height: number }).width = w;
    (GAME_CONFIG as { width: number; height: number }).height = h;
  }
} catch { /* ignore */ }

const game = startApp();

(window as unknown as {
  __movemoveDebug: {
    forceBaseline: (b: Baseline) => void;
    skipToScene: (key: string, data?: unknown) => void;
    getRefs: () => unknown;
    triggerWaterBreak: () => void;
    forceCadence: (stepsPerSec: number) => void;
    skipMiniGame: (key: string) => void;
    forceMissionState: (state: unknown) => void;
    clearProfile: () => void;
  };
}).__movemoveDebug = {
  forceBaseline: (b: Baseline) => {
    const refs = game.registry.get('refs') as { eventDetector: { setBaseline: (b: Baseline) => void } };
    refs.eventDetector.setBaseline(b);
  },
  skipToScene: (key: string, data?: unknown) => { game.scene.start(key, data as object | undefined); },
  getRefs: () => game.registry.get('refs'),
  triggerWaterBreak: () => {
    if (game.scene.isActive('Play')) {
      const playScene = game.scene.getScene('Play');
      if (playScene) {
        playScene.scene.pause();
        playScene.scene.launch('WaterBreak');
      }
    }
  },
  forceCadence: (stepsPerSec: number) => {
    const refs = game.registry.get('refs') as { eventDetector: EventTarget };
    const intensity: CadenceIntensity =
      stepsPerSec < 0.5 ? 'none'
      : stepsPerSec < 1.5 ? 'walking'
      : stepsPerSec < 3 ? 'jogging'
      : 'running';
    const ev: GameEvent = { type: 'cadence', stepsPerSec, bpm: stepsPerSec * 60, intensity, source: 'kbd', t: performance.now() };
    refs.eventDetector.dispatchEvent(new CustomEvent('event', { detail: ev }));
  },
  skipMiniGame: (key: string) => { game.scene.start(key); },
  forceMissionState: (state: unknown) => {
    const refs = game.registry.get('refs') as { profileStore: { update: (p: object) => Promise<unknown> } };
    void refs.profileStore.update({ missionState: state as object });
  },
  clearProfile: () => {
    const refs = game.registry.get('refs') as { profileStore: { update: (p: object) => Promise<unknown> } };
    void refs.profileStore.update({ totalRuns: 0, totalDistance: 0, totalCoins: 0, totalJacks: 0, totalArmsUp: 0, missionState: { date: '', missions: [] } });
  },
};

export {};
