import { FIGURE_VIEWBOX, GUIDE_ANIMATIONS, guideStill, type Skeleton } from '../../shared/figurePoses.ts';
import { s } from './dom.ts';

/**
 * Boneco guia em SVG: traço 4px arredondado, cabeça círculo, pontos nas
 * articulações. Anima interpolando os keyframes de `figurePoses`.
 */
export interface GuideFigure {
  el: SVGSVGElement;
  setExercise(key: string): void;
  setColor(color: string): void;
  destroy(): void;
}

const active = new Set<{ tick: (t: number) => void }>();
let rafId: number | null = null;

function loop(t: number): void {
  for (const a of active) a.tick(t);
  rafId = active.size ? requestAnimationFrame(loop) : null;
}

function ensureLoop(): void {
  if (rafId === null && typeof requestAnimationFrame !== 'undefined') rafId = requestAnimationFrame(loop);
}

/** Caixa quadrada que envolve a animação inteira (amostrada) — boneco grande e sem "pulo" de escala. */
const boxCache = new Map<string, { x: number; y: number; w: number }>();
function animBox(key: string): { x: number; y: number; w: number } {
  const hit = boxCache.get(key);
  if (hit) return hit;
  const a = GUIDE_ANIMATIONS[key];
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  const add = (p: { x: number; y: number }, r = 0): void => {
    x0 = Math.min(x0, p.x - r); y0 = Math.min(y0, p.y - r); x1 = Math.max(x1, p.x + r); y1 = Math.max(y1, p.y + r);
  };
  if (a) {
    for (let t = 0; t < 5000; t += 125) {
      const sk = a(t);
      add(sk.head, 14);
      for (const l of [...sk.near, ...sk.far]) for (const p of l) add(p);
    }
  }
  if (!isFinite(x0)) { x0 = FIGURE_VIEWBOX.x; y0 = FIGURE_VIEWBOX.y; x1 = x0 + FIGURE_VIEWBOX.w; y1 = y0 + FIGURE_VIEWBOX.h; }
  const pad = 12;
  const w = Math.max(x1 - x0, y1 - y0, 150) + pad * 2;
  const box = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w / 2, w };
  boxCache.set(key, box);
  return box;
}

const pts = (line: { x: number; y: number }[]): string => line.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export function createFigure(key: string, opts: { size?: number; color?: string; stroke?: number; animate?: boolean; className?: string } = {}): GuideFigure {
  const size = opts.size ?? 120;
  let box = animBox(key);
  // Traço ~4px na tela, independente do tamanho do SVG.
  let stroke = ((opts.stroke ?? 4) * box.w) / size;
  let color = opts.color ?? '#14181d';
  const farG = s('g', { fill: 'none', 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.35 });
  const nearG = s('g', { fill: 'none', 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const headEl = s('circle', { r: 14, fill: 'none', 'stroke-width': stroke });
  const jointsG = s('g');
  const svg = s('svg', {
    width: size, height: size, viewBox: `${box.x} ${box.y} ${box.w} ${box.w}`,
    class: `figure ${opts.className ?? ''}`, role: 'img', 'aria-label': 'Boneco guia',
  }, farG, nearG, headEl, jointsG);

  const applyBox = (): void => {
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.w}`);
    stroke = ((opts.stroke ?? 4) * box.w) / size;
    for (const g of [farG, nearG, headEl]) g.setAttribute('stroke-width', String(stroke));
    jointsG.innerHTML = '';
  };
  const paintColor = (): void => {
    farG.setAttribute('stroke', color);
    nearG.setAttribute('stroke', color);
    headEl.setAttribute('stroke', color);
    jointsG.setAttribute('fill', color);
  };
  paintColor();

  const syncCount = (g: SVGGElement, n: number, tag: 'polyline' | 'circle'): void => {
    while (g.childNodes.length < n) g.appendChild(s(tag, tag === 'circle' ? { r: stroke * 0.9 } : null));
    while (g.childNodes.length > n) g.removeChild(g.lastChild!);
  };

  const draw = (sk: Skeleton): void => {
    syncCount(farG, sk.far.length, 'polyline');
    sk.far.forEach((l, i) => (farG.childNodes[i] as SVGPolylineElement).setAttribute('points', pts(l)));
    syncCount(nearG, sk.near.length, 'polyline');
    sk.near.forEach((l, i) => (nearG.childNodes[i] as SVGPolylineElement).setAttribute('points', pts(l)));
    headEl.setAttribute('cx', sk.head.x.toFixed(1));
    headEl.setAttribute('cy', sk.head.y.toFixed(1));
    syncCount(jointsG, sk.joints.length, 'circle');
    sk.joints.forEach((p, i) => {
      const c = jointsG.childNodes[i] as SVGCircleElement;
      c.setAttribute('cx', p.x.toFixed(1));
      c.setAttribute('cy', p.y.toFixed(1));
    });
  };

  let current = key;
  let start = performance.now();
  const anim = { tick: (t: number) => { const a = GUIDE_ANIMATIONS[current]; if (a) draw(a(t - start)); } };
  draw(guideStill(key));
  if (opts.animate !== false) { active.add(anim); ensureLoop(); }

  return {
    el: svg,
    setExercise(k: string) {
      if (k === current) return;
      current = k;
      box = animBox(k);
      applyBox();
      start = performance.now();
      draw(guideStill(k));
    },
    setColor(c: string) { color = c; paintColor(); },
    destroy() { active.delete(anim); },
  };
}
