import { h, icon } from './dom.ts';
import { navigate } from '../router.ts';
import { FIGURE_VIEWBOX } from '../../shared/figurePoses.ts';
import { createFigure } from './figure.ts';

export function backHeader(title: string, to: string | (() => void)): HTMLElement {
  const go = typeof to === 'string' ? () => navigate(to) : to;
  return h('div', { class: 'title-row', style: 'margin-bottom:10px' },
    h('button', { class: 'icon-btn sm', 'aria-label': 'Voltar', on: { click: go } }, icon.back()),
    h('div', { class: 'h2' }, title),
  );
}

export function toast(msg: string): void {
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.getElementById('mm-root')?.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

/** Barrinha de amplitude (verde ≥ 75%, laranja abaixo). */
export function ampBar(v: number, min = 0.75): HTMLElement {
  const pct = Math.round(Math.max(0, Math.min(1, v)) * 100);
  return h('div', { class: 'bar', 'aria-label': `Amplitude ${pct}%` },
    h('div', { style: `width:${pct}%;background:${v >= min ? 'var(--mm-good)' : 'var(--mm-warn)'}` }));
}

export function ampColor(v: number, min = 0.75): string {
  return v >= min ? 'var(--mm-good)' : 'var(--mm-warn)';
}

/** Figura estática/animada num tamanho dado; devolve o elemento e um destroy. */
export function figure(key: string, size: number, color = '#14181d', animate = true): { el: SVGSVGElement; destroy: () => void } {
  const f = createFigure(key, { size, color, animate });
  return { el: f.el, destroy: () => f.destroy() };
}

export { FIGURE_VIEWBOX };
