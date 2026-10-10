import './landing.css';
import { h, s, ring } from '../app/ui/dom.ts';
import { createFigure } from '../app/ui/figure.ts';
import { GUIDE_ANIMATIONS, type Skeleton } from '../shared/figurePoses.ts';
import { CATALOG, GROUP_LABEL } from '../app/services/catalog.ts';

/** Landing do MoveMove (`/`). O app mora em `/app/`. */
const APP = '/app/';
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const returning = ((): boolean => {
  try { return !!localStorage.getItem('mm2.history'); } catch { return false; }
})();

// ---------------------------------------------------------------- celular (tela de treino)
function phoneMock(): HTMLElement {
  const SK_COLOR = '#3ec2dc';
  const WARN = '#e0902a';
  const GOOD = '#22a06b';
  // "Você" na câmera: o mesmo agachamento do guia, grande e em ciano.
  const sk = s('svg', { class: 'skeleton', viewBox: '-122 -120 340 697', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
  const lines = s('g', { fill: 'none', stroke: SK_COLOR, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const head = s('circle', { r: 13, fill: SK_COLOR });
  const joints = s('g', { fill: SK_COLOR });
  sk.append(lines, head, joints);

  const count = h('div', { class: 'big num' }, '11');
  const cue = h('div', { class: 't' }, 'Boa profundidade');
  const cueSub = h('div', { class: 's' }, 'amplitude 92%');
  const amp = ring(40, 5, 'rgba(255,255,255,.14)');
  amp.set(0.92, GOOD);
  const guide = createFigure('squat', { size: 104, animate: !reduced });

  const draw = (k: Skeleton, shallow: boolean): void => {
    while (lines.firstChild) lines.removeChild(lines.firstChild);
    while (joints.firstChild) joints.removeChild(joints.firstChild);
    // Escala o agachamento do "usuário" (1.5×) e move pro centro da câmera.
    const tf = (p: { x: number; y: number }): string => `${(p.x * 1.35).toFixed(1)},${(p.y * 1.35 + 110).toFixed(1)}`;
    for (const l of [...k.far, ...k.near]) lines.append(s('polyline', { points: l.map(tf).join(' ') }));
    const [hx, hy] = tf(k.head).split(',');
    head.setAttribute('cx', hx); head.setAttribute('cy', hy);
    k.joints.forEach((p, i) => {
      const [x, y] = tf(p).split(',');
      // Joelho (índice 4) em laranja quando a rep foi rasa.
      joints.append(s('circle', { cx: x, cy: y, r: i === 4 && shallow ? 9 : 6.5, fill: i === 4 && shallow ? WARN : SK_COLOR }));
    });
  };

  let reps = 11;
  let lastCycle = -1;
  let shallow = false;
  const start = performance.now();
  const tick = (now: number): void => {
    const t = now - start;
    const cycle = Math.floor(t / 2000);
    // Repetições rasas de vez em quando: o boneco desce menos.
    const frac = (t % 2000) / 2000;
    const depth = shallow ? 0.55 : 1;
    const base = GUIDE_ANIMATIONS.squat(t);
    const stand = GUIDE_ANIMATIONS.squat(0);
    const k = depth === 1 ? base : lerp(stand, base, depth);
    draw(k, shallow && frac > 0.3);
    if (cycle !== lastCycle) {
      if (lastCycle >= 0) {
        reps = reps >= 15 ? 1 : reps + 1;
        count.textContent = String(reps);
        count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop');
        const wasShallow = shallow;
        cue.textContent = wasShallow ? 'Desce mais' : 'Boa profundidade';
        cue.style.color = wasShallow ? WARN : GOOD;
        cueSub.textContent = `amplitude ${wasShallow ? 64 : 88 + (reps % 3) * 3}%`;
        amp.set(wasShallow ? 0.64 : 0.9, wasShallow ? WARN : GOOD);
      }
      lastCycle = cycle;
      shallow = cycle % 4 === 2;
    }
    if (!reduced) requestAnimationFrame(tick);
  };
  cue.style.color = GOOD;
  if (reduced) draw(GUIDE_ANIMATIONS.squat(1100), false);
  else requestAnimationFrame(tick);

  const segs = h('div', { class: 'ph-segs' }, ...Array.from({ length: 9 }, (_, i) => h('i', { class: i < 2 ? 'd' : i === 2 ? 'n' : '' })));
  const x = s('svg', { width: 12, height: 12, viewBox: '0 0 16 16' }, s('path', { d: 'M3.5 3.5l9 9M12.5 3.5l-9 9', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
  const pause = s('svg', { width: 11, height: 11, viewBox: '0 0 14 14' }, s('rect', { x: 2.5, y: 2, width: 3, height: 10, rx: 1, fill: '#fff' }), s('rect', { x: 8.5, y: 2, width: 3, height: 10, rx: 1, fill: '#fff' }));

  return h('div', { class: 'phone-stage' },
    h('div', { class: 'phone', role: 'img', 'aria-label': 'Tela de treino do MoveMove: câmera com esqueleto, contador de repetições e boneco guia' },
      h('div', { class: 'stripes' }),
      sk,
      h('div', { class: 'shade-top' }),
      h('div', { class: 'shade-bot' }),
      h('div', { class: 'ph-top' },
        h('div', { class: 'ph-row' }, h('div', { class: 'ph-btn' }, x), h('div', { class: 'ph-meta num' }, '3 de 9 · 04:12 restantes'), h('div', { class: 'ph-btn' }, pause)),
        segs,
        h('div', { class: 'ph-name' }, 'Agachamento')),
      h('div', { class: 'ph-count' }, count, h('div', { class: 'of' }, 'de 15 repetições')),
      h('div', { class: 'ph-guide' }, guide.el, h('div', { class: 'eyebrow' }, 'guia')),
      h('div', { class: 'ph-cue' }, amp.el, h('div', null, cue, cueSub)),
      h('div', { class: 'ph-skip' }, 'Pular exercício'),
    ));
}

function lerp(a: Skeleton, b: Skeleton, k: number): Skeleton {
  const lp = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });
  const ll = (x: { x: number; y: number }[][], y: { x: number; y: number }[][]) => x.map((l, i) => l.map((p, j) => lp(p, y[i][j])));
  return { head: lp(a.head, b.head), near: ll(a.near, b.near), far: ll(a.far, b.far), joints: a.joints.map((p, i) => lp(p, b.joints[i])) };
}

// ---------------------------------------------------------------- seções
function stepCard(n: string, title: string, text: string, vis: HTMLElement): HTMLElement {
  return h('div', { class: 'card' },
    h('div', { class: 'step-n' }, n),
    h('div', { class: 'step-vis' }, vis),
    h('h3', null, title),
    h('p', null, text));
}

function ampRow(v: number, title: string, sub: string): HTMLElement {
  const color = v >= 0.75 ? '#22a06b' : '#e0902a';
  const r = ring(48, 6, '#dde1e6');
  r.set(v, color);
  return h('div', { class: 'amp-row' }, r.el,
    h('div', null, h('div', { class: 't', style: `color:${color}` }, title), h('div', { class: 's' }, sub)),
    h('div', { class: 'v num' }, `${Math.round(v * 100)}%`));
}

function render(): void {
  const root = document.getElementById('lp')!;
  const ctaLabel = returning ? 'Continuar treinando' : 'Começar treino';
  const ctaHref = returning ? APP : `${APP}#/montar`;

  const nav = h('header', { class: 'nav' },
    h('div', { class: 'wrap' },
      h('a', { class: 'brand', href: '/' }, h('span', { class: 'brand-dot' }), 'MoveMove'),
      h('nav', { class: 'nav-links', 'aria-label': 'Seções' },
        h('a', { class: 'hide-sm', href: '#como' }, 'Como funciona'),
        h('a', { class: 'hide-sm', href: '#desafios' }, 'Desafios'),
        h('a', { class: 'btn btn-primary btn-sm', href: APP }, 'Abrir app'))));

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'wrap' },
      h('div', null,
        h('div', { class: 'eyebrow' }, 'Treino em casa com a câmera'),
        h('h1', { class: 'h1' }, 'Seu treino em casa, com alguém contando as repetições.'),
        h('p', { class: 'lead' }, 'O MoveMove usa a câmera do celular ou do computador pra contar suas reps, medir a amplitude de cada movimento e te corrigir na hora. Sem conta e sem baixar nada.'),
        h('div', { class: 'hero-ctas' },
          h('a', { class: 'btn btn-primary', href: ctaHref }, ctaLabel),
          h('a', { class: 'btn btn-secondary', href: '#como' }, 'Como funciona')),
        h('div', { class: 'hero-note' }, h('span', null, 'Grátis'), h('span', null, 'Roda no navegador'), h('span', null, 'Nada é gravado'))),
      phoneMock()));

  const stepChips = h('div', { class: 'chips' },
    h('span', { class: 'chip on' }, 'Pernas'), h('span', { class: 'chip' }, 'Core'), h('span', { class: 'chip on' }, 'Força'), h('span', { class: 'chip on' }, '7 min'), h('span', { class: 'chip' }, 'Intenso'));
  const stepPrep = h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:10px' }, h('div', { class: 'outline' }), h('span', { class: 'pill' }, 'Boa, segura assim'));
  const stepFig = createFigure('pushup', { size: 150, animate: !reduced });
  const how = h('section', { class: 'section', id: 'como' },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('div', { class: 'eyebrow' }, 'Como funciona'),
        h('h2', { class: 'h2' }, 'Três toques e você já está treinando.')),
      h('div', { class: 'grid grid-3' },
        stepCard('1', 'Monte o treino', 'Escolha grupo muscular, objetivo, duração, nível e o que tem em casa. O treino sai pronto, com tempo e descanso certos.', stepChips),
        stepCard('2', 'Entre no contorno', 'Apoie o celular e fique de corpo inteiro na tela. Quando a posição estiver boa, o treino começa sozinho.', stepPrep),
        stepCard('3', 'Siga o guia', 'Um boneco mostra o movimento no ritmo certo. Você só se mexe: o app conta, cronometra e avisa quando corrigir.', h('div', null, stepFig.el)))));

  const amplitude = h('section', { class: 'section', style: 'padding-top:0' },
    h('div', { class: 'wrap' },
      h('div', { class: 'amp' },
        h('div', null,
          h('div', { class: 'eyebrow' }, 'Amplitude'),
          h('h2', { class: 'h2' }, 'Não é só contar. É contar direito.'),
          h('p', { class: 'lead' }, 'Cada repetição ganha uma nota de amplitude. Desceu até o fim, fica verde. Ficou no meio do caminho, a articulação acende em laranja e a voz avisa, sem repetir a mesma bronca a cada rep.')),
        h('div', { class: 'amp-demo' },
          ampRow(0.92, 'Boa profundidade', 'Agachamento · joelho passou de 90°'),
          ampRow(0.64, 'Desce mais', 'Agachamento · faltou descer'),
          ampRow(0.86, 'Boa flexão', 'Flexão · peito perto do chão')))));

  const catalog = h('section', { class: 'section', style: 'padding-top:0' },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('div', { class: 'eyebrow' }, `${CATALOG.length} exercícios`),
        h('h2', { class: 'h2' }, 'Peso corporal, do aquecimento ao burpee.'),
        h('p', { class: 'lead' }, 'Cada exercício tem guia animado, detector próprio e dica de correção. Flexão, prancha, abdominal e ponte pedem a câmera baixa, de lado.')),
      h('div', { class: 'catalog' },
        ...CATALOG.map((ex) => {
          const f = createFigure(ex.poseKeyframes, { size: 84, animate: !reduced });
          const tag = ex.camera === 'lateral' ? 'no chão' : ex.tipo === 'tempo' ? 'isometria' : ex.grupo.map((g) => GROUP_LABEL[g]).slice(0, 2).join(' · ');
          return h('div', { class: 'ex' }, f.el, h('div', { class: 'n' }, ex.nome), h('div', { class: 'tag' }, tag));
        }))));

  const challengeFig = createFigure('squat', { size: 72, animate: !reduced });
  const challenge = h('section', { class: 'section', id: 'desafios', style: 'padding-top:0' },
    h('div', { class: 'wrap' },
      h('div', { class: 'challenge' },
        h('div', null,
          h('div', { class: 'eyebrow' }, 'Desafios'),
          h('h2', { class: 'h2' }, 'Faça sua marca. Mande no WhatsApp.'),
          h('p', { class: 'lead' }, 'Quem recebe abre o link, faz o mesmo exercício na frente da câmera e vê na hora quem ganhou. Só vale repetição com boa amplitude.'),
          h('ul', { class: 'list' },
            h('li', null, '20 repetições no menor tempo, máximo em 60 segundos ou segurar a prancha por mais tempo.'),
            h('li', null, 'Treino inteiro: os dois fazem exatamente o mesmo treino e ganha quem somar mais reps.'),
            h('li', null, 'Sem conta. O link guarda só o exercício, seu nome e sua marca.'))),
        h('div', { class: 'ch-card' },
          h('div', { class: 'small', style: 'text-align:center;letter-spacing:.1em;text-transform:uppercase;font-weight:600' }, 'desafio recebido'),
          h('div', { style: 'font-size:26px;font-weight:600;letter-spacing:-.03em;text-align:center' }, 'Rafael te desafiou'),
          h('div', { style: 'display:flex;justify-content:space-between;align-items:center' },
            h('div', null, h('div', { class: 'small' }, 'Exercício'), h('div', { style: 'font-size:20px;font-weight:600;letter-spacing:-.02em' }, 'Agachamento'), h('div', { class: 'small' }, '20 repetições no menor tempo')),
            challengeFig.el),
          h('div', { class: 'ch-marks' },
            h('div', null, h('div', { class: 'small' }, 'Rafael'), h('div', { class: 'v num' }, '0:48')),
            h('div', null, h('div', { class: 'small' }, 'Você'), h('div', { class: 'v', style: 'color:#aab2bc' }, '—'))),
          h('div', { class: 'wa' }, 'Aceitar desafio')))));

  const extras = h('section', { class: 'section', style: 'padding-top:0' },
    h('div', { class: 'wrap' },
      h('div', { class: 'grid grid-3', style: 'margin-top:0' },
        h('div', { class: 'card' }, h('h3', null, 'Histórico da semana'), h('p', null, 'Treinos, minutos, reps e dias seguidos. Tudo salvo só no seu aparelho.')),
        h('div', { class: 'card' }, h('h3', null, 'Jogos pra quando bater a preguiça'), h('p', null, 'Corrida, helicóptero, dança, ninja das frutas e mais. Você joga com o corpo inteiro.')),
        h('div', { class: 'card card-dark' }, h('h3', null, 'Sua câmera fica com você'), h('p', null, 'O vídeo é processado no próprio navegador. Nada é gravado nem enviado pra servidor nenhum.')))));

  const final = h('section', { class: 'final' },
    h('div', { class: 'wrap' },
      h('div', { class: 'card-dark' },
        h('div', null,
          h('h2', { class: 'h2' }, 'Bora treinar?'),
          h('p', { class: 'lead', style: 'color:#aab2bc;margin-top:10px' }, 'Um treino de 5 minutos já conta. Abra no celular, apoie num canto e vai.')),
        h('a', { class: 'btn btn-secondary', href: ctaHref }, ctaLabel))));

  const footer = h('footer', null,
    h('div', { class: 'wrap' },
      h('span', null, 'MoveMove · treino em casa com a câmera'),
      h('span', null, 'Sem conta. Seus dados ficam no seu aparelho.')));

  // `replaceChildren`, e não `append`: o index.html já traz esta mesma página em HTML estático
  // (para o buscador), e ela precisa ser substituída, não duplicada.
  root.replaceChildren(nav, h('main', null, hero, how, amplitude, catalog, challenge, extras, final), footer);
}

render();
