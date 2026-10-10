import { h, icon } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState } from '../state.ts';
import { blockCards } from '../ui/blockDetail.ts';
import { getExercise, GOAL_LABEL, GROUP_LABEL } from '../services/catalog.ts';
import { blockStats } from '../services/blockStats.ts';
import { fmtClock, fmtPct } from '../services/format.ts';
import { generateWorkout, LEVEL_LABEL } from '../services/generateWorkout.ts';
import { CHALLENGE_MIN_AMPLITUDE, type BlockResult } from '../services/sessionRunner.ts';

const GOOD = '#5fd6a2';
const WARN = '#f0a94e';

export function summaryScreen(root: HTMLElement): void {
  const out = appState.lastWorkoutOutcome;
  if (!out) { queueMicrotask(() => navigate('/', true)); return; }
  const { workout, summary } = out;
  const o = workout.options;

  const blocks = summary.blocks.map((b, i) => {
    const ex = getExercise(b.exerciseId);
    const isHold = ex?.tipo === 'tempo';
    const measured = !b.skipped && (isHold ? b.holdMs > 0 : b.attempts.length > 0);
    const stats = blockStats(b);
    if (isHold) stats.fatigue = null;
    return { b, i, ex, isHold, measured, stats, target: workout.blocks[i]?.targetReps };
  });
  const measured = blocks.filter((x) => x.measured);
  const best = measured.length > 1 ? measured.reduce((a, x) => (x.b.amplitude > a.b.amplitude ? x : a)) : null;
  const tired = blocks.filter((x) => x.stats.fatigue !== null && x.stats.fatigue >= 0.08)
    .reduce<typeof blocks[number] | null>((a, x) => (!a || x.stats.fatigue! > a.stats.fatigue! ? x : a), null);

  const highlight = (label: string, color: string, name: string, sub: string): HTMLElement =>
    h('div', { class: 'st-card' },
      h('div', { class: 'st-label', style: `color:${color}` }, label),
      h('div', { class: 'st-title' }, name),
      h('div', { class: 'st-sub' }, sub));

  const ampChart = measured.length > 1
    ? h('div', { class: 'st-card' },
      h('div', { class: 'st-row' }, h('div', { class: 'st-title' }, 'Amplitude ao longo do treino'), h('div', { class: 'st-sub' }, 'por exercício')),
      h('div', { class: 'sum-amps', role: 'img', 'aria-label': `Amplitude média de cada exercício: ${measured.map((x) => fmtPct(x.b.amplitude)).join(', ')}` },
        ...measured.map((x) => h('div', null,
          h('span', null, fmtPct(x.b.amplitude)),
          h('i', { style: `height:${Math.round(8 + Math.max(0, Math.min(1, x.b.amplitude)) * 60)}px;background:${x.b.amplitude >= CHALLENGE_MIN_AMPLITUDE ? '#3ec2dc' : WARN}` }),
          h('em', null, String(x.i + 1))))))
    : null;

  const doneLabel = (b: BlockResult, isHold: boolean): string => (b.skipped ? 'pulado' : isHold ? `${Math.round(b.holdMs / 1000)} s` : String(b.reps));

  const rows = blocks.map((x) => {
    const detail = h('div', { class: 'sum-detail', hidden: true });
    const row = h('button', { class: 'sum-row', 'aria-expanded': 'false', on: { click: () => {
      const open = detail.hidden;
      if (open && !detail.firstChild) detail.append(...blockCards(x.b, x.ex, x.target));
      detail.hidden = !open;
      row.setAttribute('aria-expanded', String(open));
      row.classList.toggle('is-open', open);
    } } },
      h('span', { class: 'n' }, String(x.i + 1)),
      h('span', { class: 'name', style: x.b.skipped ? 'color:#8a929c' : '' }, x.ex?.nome ?? x.b.exerciseId),
      h('span', { class: 'v' }, doneLabel(x.b, x.isHold)),
      h('span', { class: 'v', style: x.measured ? `color:${x.b.amplitude >= CHALLENGE_MIN_AMPLITUDE ? GOOD : WARN}` : 'color:#8a929c' }, x.measured ? fmtPct(x.b.amplitude) : '—'),
      h('span', { class: 'v', style: x.stats.fatigue !== null && x.stats.fatigue >= 0.25 ? `color:${WARN}` : '' }, x.stats.fatigue !== null ? `${Math.round(x.stats.fatigue * 100)}%` : '—'),
      icon.chevron(14));
    return [row, detail];
  });

  root.append(h('div', { class: 'sum-bg' }, h('div', { class: 'page sum-dark' },
    h('div', { class: 'sum-col' },
      h('div', { class: 'sum-eyebrow' }, `${GROUP_LABEL[o.grupo]} · ${GOAL_LABEL[o.objetivo]} · ${LEVEL_LABEL[o.nivel]}`),
      h('h1', { class: 'sum-h1', style: 'font-size:30px' }, 'Treino concluído')),
    h('div', { class: 'sum-three' },
      h('div', { class: 'st-card' }, h('div', { class: 'st-label' }, 'Tempo'), h('div', { class: 'st-mid2' }, fmtClock(summary.durationMs))),
      h('div', { class: 'st-card' }, h('div', { class: 'st-label' }, 'Repetições'), h('div', { class: 'st-mid2' }, String(summary.totalReps))),
      h('div', { class: 'st-card' }, h('div', { class: 'st-label' }, 'Amplitude'),
        h('div', { class: 'st-mid2', style: `color:${summary.amplitude >= CHALLENGE_MIN_AMPLITUDE ? GOOD : WARN}` }, measured.length ? fmtPct(summary.amplitude) : '—'))),
    best || tired ? h('div', { class: 'st-pair' },
      best ? highlight('Melhor execução', GOOD, best.ex?.nome ?? '', `amplitude média de ${fmtPct(best.b.amplitude)}`) : null,
      tired ? highlight('Mais cansou', WARN, tired.ex?.nome ?? '', `${Math.round(tired.stats.fatigue! * 100)}% mais lento no fim`) : null) : null,
    ampChart,
    h('div', { class: 'st-card sum-table' },
      h('div', { class: 'sum-row sum-th' }, h('span'), h('span', null, 'Exercício'), h('span', { class: 'v' }, 'Feito'), h('span', { class: 'v' }, 'Ampl.'), h('span', { class: 'v' }, 'Fadiga'), h('span')),
      ...rows.flat(),
      h('div', { class: 'st-sub', style: 'padding:10px 0 12px' }, 'Toque em um exercício para ver o gráfico e o ritmo de cada repetição.')),
    h('div', { class: 'sum-foot' },
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-line', on: { click: () => { appState.session = { kind: 'workout', workout: generateWorkout(o) }; navigate('/sessao'); } } }, 'Repetir'),
        h('button', { class: 'btn btn-cyan', on: { click: () => navigate('/desafios/novo') } }, 'Desafiar alguém')),
      h('button', { class: 'btn btn-ghost', style: 'color:#d5dbe2', on: { click: () => navigate('/') } }, 'Voltar ao início')),
  )));
}
