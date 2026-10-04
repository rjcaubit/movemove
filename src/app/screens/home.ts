import { h, icon } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState } from '../state.ts';
import { figure } from '../ui/common.ts';
import { fmtLongDate, greeting } from '../services/format.ts';
import { loadLastWorkout } from '../services/prefs.ts';
import { generateWorkout, workoutSubtitle } from '../services/generateWorkout.ts';
import { listHistory, weekStats } from '../services/history.ts';
import { challengeShortLabel, formatMark, latestBest, parseMarkKey } from '../services/challenges.ts';

export function homeScreen(root: HTMLElement): () => void {
  const now = new Date();
  const hero = figure('jumpingJack', 78, '#fff');
  const last = loadLastWorkout();
  const week = weekStats(listHistory());
  const best = latestBest();
  const bestSpec = best ? parseMarkKey(best.key) : null;

  const repeat = last
    ? h('button', {
      class: 'card card-row card-link',
      on: {
        click: () => {
          appState.session = { kind: 'workout', workout: generateWorkout(last.options) };
          navigate('/sessao');
        },
      },
    },
    h('div', { class: 'card-col' }, h('div', { class: 'small' }, 'Repetir último'), h('div', { class: 'card-title' }, workoutSubtitle(last.options))),
    h('div', { class: 'round' }, icon.chevron()))
    : null;

  const challengeCard = h('button', { class: 'card card-col card-link', on: { click: () => navigate('/desafios/novo') } },
    h('div', { class: 'small' }, 'Desafio'),
    bestSpec
      ? h('div', { class: 'card-title' }, challengeShortLabel(bestSpec))
      : h('div', { class: 'card-title' }, 'Desafie alguém'),
    h('div', { class: 'small', style: 'color:var(--mm-accent);margin-top:6px' },
      bestSpec && best ? `Seu melhor ${formatMark(bestSpec.modo, best.marca)}` : 'Sem conta, por link'),
  );

  const weekCard = h('button', { class: 'card card-col card-link', on: { click: () => navigate('/historico') } },
    h('div', { class: 'small' }, 'Semana'),
    h('div', { class: 'card-title' }, `${week.workouts} ${week.workouts === 1 ? 'treino' : 'treinos'}`),
    h('div', { class: 'small', style: 'margin-top:6px' }, `${week.reps} reps`),
  );

  root.append(h('div', { class: 'page' },
    h('div', { class: 'head' },
      h('div', { class: 'date' }, fmtLongDate(now)),
      h('h1', { class: 'h1' }, greeting(now)),
    ),
    h('div', { class: 'card card-lg card-dark hero' },
      h('div', { class: 'card-row', style: 'align-items:flex-start' },
        h('div', { class: 'card-col' },
          h('div', { class: 'eyebrow' }, 'novo treino'),
          h('div', { class: 'hero-title' }, 'Monte um treino', h('br'), 'do seu jeito'),
        ),
        hero.el,
      ),
      h('button', { class: 'btn btn-secondary btn-sm', on: { click: () => navigate('/montar') } }, 'Montar treino'),
    ),
    repeat,
    h('div', { class: 'pair' }, challengeCard, weekCard),
  ));
  return () => hero.destroy();
}
