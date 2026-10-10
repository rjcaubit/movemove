/** Mini helper de DOM — sem framework. */
type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & {
  class?: string;
  style?: string;
  on?: Record<string, (e: Event) => void>;
};

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function s<K extends keyof SVGElementTagNameMap>(tag: K, props: Record<string, string | number> | null = null, ...children: Child[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  if (props) for (const [k, v] of Object.entries(props)) el.setAttribute(k, String(v));
  append(el, children);
  return el;
}

function applyProps(el: HTMLElement, props: Props | null): void {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') {
      for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (k === 'style') {
      el.setAttribute('style', String(v));
    } else if (k in el && typeof v !== 'string') {
      (el as unknown as Record<string, unknown>)[k] = v;
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
}

function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
}

export function clear(el: Element): void { while (el.firstChild) el.removeChild(el.firstChild); }

/** Ícones de traço (sem emoji). */
export const icon = {
  close: (size = 16): SVGSVGElement => s('svg', { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
    s('path', { d: 'M3.5 3.5l9 9M12.5 3.5l-9 9', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', fill: 'none' })),
  pause: (size = 14): SVGSVGElement => s('svg', { width: size, height: size, viewBox: '0 0 14 14', 'aria-hidden': 'true' },
    s('rect', { x: 2.5, y: 2, width: 3, height: 10, rx: 1, fill: 'currentColor' }),
    s('rect', { x: 8.5, y: 2, width: 3, height: 10, rx: 1, fill: 'currentColor' })),
  play: (size = 14): SVGSVGElement => s('svg', { width: size, height: size, viewBox: '0 0 14 14', 'aria-hidden': 'true' },
    s('path', { d: 'M4 2.5v9l7.5-4.5z', fill: 'currentColor' })),
  back: (size = 16): SVGSVGElement => s('svg', { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
    s('path', { d: 'M10 3L5 8l5 5', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' })),
  chevron: (size = 16): SVGSVGElement => s('svg', { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
    s('path', { d: 'M6 3l5 5-5 5', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' })),
  tabTreino: (): SVGSVGElement => s('svg', { width: 24, height: 24, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    s('g', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      s('circle', { cx: 12, cy: 4.5, r: 2.2 }), s('path', { d: 'M12 7.5v7M6 5.5l6 3 6-3M8.5 21l3.5-6.5 3.5 6.5' }))),
  tabDesafios: (): SVGSVGElement => s('svg', { width: 24, height: 24, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    s('g', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      s('path', { d: 'M7 4h10v5a5 5 0 0 1-10 0z' }), s('path', { d: 'M12 14v4M8.5 20.5h7M7 6H4.5a2.5 2.5 0 0 0 2.6 3M17 6h2.5a2.5 2.5 0 0 1-2.6 3' }))),
  tabJogos: (): SVGSVGElement => s('svg', { width: 24, height: 24, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    s('g', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      s('rect', { x: 2.5, y: 7, width: 19, height: 11, rx: 5.5 }), s('path', { d: 'M7.5 10.5v4M5.5 12.5h4' }),
      s('circle', { cx: 15.5, cy: 11.5, r: 0.6, fill: 'currentColor' }), s('circle', { cx: 17.5, cy: 13.5, r: 0.6, fill: 'currentColor' }))),
  tabHistorico: (): SVGSVGElement => s('svg', { width: 24, height: 24, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    s('g', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      s('rect', { x: 3.5, y: 4.5, width: 17, height: 16, rx: 3.5 }), s('path', { d: 'M8 14.5v2.5M12 11v6M16 12.5v4.5M3.5 8.5h17' }))),
};

/** Anel de progresso (amplitude). */
export function ring(size: number, stroke: number, track: string): { el: SVGSVGElement; set: (v: number, color: string) => void } {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = s('circle', {
    cx: size / 2, cy: size / 2, r, fill: 'none', stroke: '#22a06b', 'stroke-width': stroke,
    'stroke-linecap': 'round', 'stroke-dasharray': `0 ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})`,
  });
  const el = s('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true', class: 'ring' },
    s('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: track, 'stroke-width': stroke }), arc);
  return {
    el,
    set: (v: number, color: string) => {
      const len = Math.max(0, Math.min(1, v)) * c;
      arc.setAttribute('stroke-dasharray', `${len} ${c}`);
      arc.setAttribute('stroke', color);
      arc.style.opacity = v <= 0.001 ? '0' : '1';
    },
  };
}

export const COLORS = {
  ink: '#14181d',
  accent: '#1f9db6',
  skeleton: '#3ec2dc',
  good: '#22a06b',
  warn: '#e0902a',
  track: '#dde1e6',
} as const;
