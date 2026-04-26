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
    let detail: string = ev.type;
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
