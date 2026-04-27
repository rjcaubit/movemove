import { startApp } from './game/orchestrator.ts';
import type { Baseline, GameEvent, CadenceIntensity } from './pose/types.ts';

const game = startApp();

(window as unknown as {
  __movemoveDebug: {
    forceBaseline: (b: Baseline) => void;
    skipToScene: (key: string, data?: unknown) => void;
    getRefs: () => unknown;
    triggerWaterBreak: () => void;
    forceCadence: (stepsPerSec: number) => void;
    skipMiniGame: (key: string) => void;
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
};

export {};
