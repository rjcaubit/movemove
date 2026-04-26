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
        return; // cadence é mostrado só no painel debug
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
