import { h } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState } from '../state.ts';
import { ampBar } from '../ui/common.ts';
import { getExercise, GOAL_LABEL, GROUP_LABEL } from '../services/catalog.ts';
import { fmtClock, fmtPct } from '../services/format.ts';
import { generateWorkout, LEVEL_LABEL } from '../services/generateWorkout.ts';
import { CHALLENGE_MIN_AMPLITUDE } from '../services/sessionRunner.ts';

export function summaryScreen(root: HTMLElement): void {
  const out = appState.lastWorkoutOutcome;
  if (!out) { queueMicrotask(() => navigate('/', true)); return; }
  const { workout, summary } = out;
  const o = workout.options;

  const rows = summary.blocks.map((b) => {
    const ex = getExercise(b.exerciseId);
    const isHold = ex?.tipo === 'tempo';
    const val = b.skipped ? '—' : isHold ? `${Math.round(b.holdMs / 1000)}s` : String(b.reps);
    return h('div', { class: 'list-row' },
      h('div', { class: 'name', style: b.skipped ? 'color:var(--mm-faint)' : '' }, ex?.nome ?? b.exerciseId),
      h('div', { class: 'row-end' },
        b.skipped ? h('div', { class: 'small' }, 'pulado') : ampBar(b.amplitude),
        h('div', { class: 'row-val' }, val)),
    );
  });

  root.append(h('div', { class: 'page' },
    h('div', { class: 'head' },
      h('div', { class: 'date' }, `${GROUP_LABEL[o.grupo]} · ${GOAL_LABEL[o.objetivo]} · ${LEVEL_LABEL[o.nivel]}`),
      h('h1', { class: 'h1', style: 'font-size:30px' }, 'Treino concluído'),
    ),
    h('div', { class: 'pair', style: 'gap:12px' },
      h('div', { class: 'card card-col', style: 'padding:18px' }, h('div', { class: 'small' }, 'Tempo'), h('div', { class: 'stat-v' }, fmtClock(summary.durationMs))),
      h('div', { class: 'card card-col', style: 'padding:18px' }, h('div', { class: 'small' }, 'Repetições'), h('div', { class: 'stat-v' }, String(summary.totalReps))),
      h('div', { class: 'card card-col', style: 'padding:18px' }, h('div', { class: 'small' }, 'Amplitude'),
        h('div', { class: 'stat-v', style: `color:${summary.amplitude >= CHALLENGE_MIN_AMPLITUDE ? 'var(--mm-good)' : 'var(--mm-warn)'}` }, fmtPct(summary.amplitude))),
    ),
    h('div', { class: 'card', style: 'padding:6px 20px' }, h('div', { class: 'list' }, ...rows)),
    h('div', { class: 'page-foot' },
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-secondary', on: { click: () => { appState.session = { kind: 'workout', workout: generateWorkout(o) }; navigate('/sessao'); } } }, 'Repetir'),
        h('button', { class: 'btn btn-primary', on: { click: () => navigate('/desafios/novo') } }, 'Desafiar alguém'),
      ),
      h('button', { class: 'btn btn-ghost', on: { click: () => navigate('/') } }, 'Voltar ao início'),
    ),
  ));
}
