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
