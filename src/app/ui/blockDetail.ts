import { h, s } from './dom.ts';
import type { Exercise } from '../services/catalog.ts';
import type { BlockResult } from '../services/sessionRunner.ts';
import { CHALLENGE_MIN_AMPLITUDE } from '../services/sessionRunner.ts';
import { blockStats, fatigueText } from '../services/blockStats.ts';
import { fmtClock, fmtPct } from '../services/format.ts';

/**
 * Cartões do resumo de um exercício (tema escuro): repetições, amplitude,
 * fadiga, curva do movimento e ritmo. Usado no descanso e no resumo final.
 */
const FATIGUE_WARN = 0.25;
const MIN_CURVE_POINTS = 8;

const secs = (ms: number): string => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

function statCard(label: string, value: string, side: string, sub: string, color = ''): HTMLElement {
  return h('div', { class: 'st-card' },
    h('div', { class: 'st-label' }, label),
    h('div', { class: 'st-row' },
      h('div', { class: 'st-big', style: color ? `color:${color}` : '' }, value),
      side ? h('div', { class: 'st-side' }, side) : null),
    sub ? h('div', { class: 'st-sub' }, sub) : null);
}

function curveChart(b: BlockResult): SVGSVGElement {
  const deg = b.curveUnit === 'deg';
  const top = deg ? 180 : 100;
  const X0 = 38; const X1 = 318; const Y0 = 12; const Y1 = 112;
  const y = (v: number): number => Y1 - (Math.max(0, Math.min(top, v)) / top) * (Y1 - Y0);
  const n = b.curve.length;
  const d = b.curve.map((v, i) => `${i === 0 ? 'M' : 'L'}${(X0 + (i / (n - 1)) * (X1 - X0)).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const unit = deg ? '°' : '%';
  const grid = [top, top / 2, 0];
  return s('svg', { viewBox: '0 0 326 136', width: '100%', role: 'img', 'aria-label': `Curva do movimento ao longo de ${Math.round(b.activeMs / 1000)} segundos` },
    ...grid.map((g) => s('line', { x1: X0, y1: y(g), x2: X1, y2: y(g), stroke: '#39414c', 'stroke-width': 1 })),
    ...grid.map((g) => s('text', { x: X0 - 6, y: y(g) + 3.5, 'text-anchor': 'end', fill: '#aab2bc', 'font-size': 10 }, `${g}${unit}`)),
    s('text', { x: X0, y: 130, fill: '#aab2bc', 'font-size': 10 }, '0 s'),
    s('text', { x: X1, y: 130, 'text-anchor': 'end', fill: '#aab2bc', 'font-size': 10 }, `${Math.round(b.activeMs / 1000)} s`),
    s('path', { d, fill: 'none', stroke: '#3ec2dc', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

function paceBars(times: number[]): HTMLElement {
  const max = Math.max(...times);
  const base = (times[0] + (times[1] ?? times[0])) / 2;
  return h('div', { class: 'st-bars', role: 'img', 'aria-label': `Tempo de cada repetição, de ${secs(Math.min(...times))} a ${secs(max)}` },
    ...times.map((t) => h('div', { style: `height:${Math.round(12 + (t / max) * 46)}px;background:${t > base * (1 + FATIGUE_WARN) ? '#f0a94e' : '#3ec2dc'}` })));
}

export function blockCards(b: BlockResult, ex: Exercise | undefined, targetReps?: number): HTMLElement[] {
  if (b.skipped) return [h('div', { class: 'st-card' }, h('div', { class: 'st-sub' }, 'Exercício pulado.'))];
  const isHold = ex?.tipo === 'tempo';
  const st = blockStats(b);
  const out: HTMLElement[] = [];
  const hasAmp = isHold ? b.holdMs > 0 : b.attempts.length > 0;
  const ampColor = b.amplitude >= CHALLENGE_MIN_AMPLITUDE ? '#5fd6a2' : '#f0a94e';

  out.push(h('div', { class: 'st-pair' },
    isHold
      ? statCard('Segurou', fmtClock(b.holdMs), '', `de ${fmtClock(b.activeMs)} no exercício`)
      : statCard('Repetições', String(b.reps), fmtClock(b.activeMs),
        st.notCounted > 0 ? `${st.notCounted} não ${st.notCounted === 1 ? 'contou' : 'contaram'}` : targetReps ? `meta: ${targetReps}` : ''),
    statCard(isHold ? 'Alinhamento' : 'Amplitude', hasAmp ? fmtPct(b.amplitude) : '—', hasAmp ? 'média' : '',
      !isHold && st.ampBest !== null && st.ampWorst !== null && b.attempts.length > 1 ? `melhor ${fmtPct(st.ampBest)} · pior ${fmtPct(st.ampWorst)}` : '',
      hasAmp ? ampColor : '')));

  if (!isHold && st.fatigue !== null) {
    const t = fatigueText(st.fatigue);
    const pct = Math.round(st.fatigue * 100);
    const color = st.fatigue >= FATIGUE_WARN ? '#f0a94e' : '#5fd6a2';
    out.push(h('div', { class: 'st-card' },
      h('div', { class: 'st-row' }, h('div', { class: 'st-label' }, 'Fadiga'), h('div', { class: 'st-mid', style: `color:${color}` }, `${pct}%`)),
      h('div', { class: 'st-track' }, h('div', { style: `width:${Math.min(100, pct)}%;background:${color}` })),
      h('div', { class: 'st-text' }, h('b', null, t.title), ` ${t.sub}`)));
  }

  if (b.curve.length >= MIN_CURVE_POINTS) {
    out.push(h('div', { class: 'st-card' },
      h('div', { class: 'st-row' },
        h('div', { class: 'st-title' }, b.curveLabel),
        h('div', { class: 'st-sub' }, b.curveUnit === 'deg' ? 'cada vale ou pico é uma repetição' : '')),
      curveChart(b)));
  }

  if (!isHold && st.repTimesMs.length >= 2 && st.fastestMs !== null) {
    out.push(h('div', { class: 'st-card st-pace' },
      h('div', { class: 'st-pace-txt' },
        h('div', { class: 'st-title' }, 'Ritmo'),
        h('div', { class: 'st-sub' }, `Tempo de cada repetição. Mais rápida: ${secs(st.fastestMs)}`)),
      paceBars(st.repTimesMs)));
  }
  return out;
}
