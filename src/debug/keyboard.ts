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
