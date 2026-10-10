import { h } from '../ui/dom.ts';
import { fmtClock, fmtPct, fmtRelativeDay, monthName } from '../services/format.ts';
import { listHistory, weekStats } from '../services/history.ts';
import { CHALLENGE_MIN_AMPLITUDE } from '../services/sessionRunner.ts';

export function historyScreen(root: HTMLElement): void {
  const items = listHistory();
  const week = weekStats(items);
  const maxMin = Math.max(10, ...week.days.map((d) => d.minutes));

  const bars = h('div', { class: 'week', role: 'img', 'aria-label': 'Minutos por dia nesta semana' },
    ...week.days.map((d) => h('div', { class: d.isToday ? 'today' : '' },
      h('div', {
        class: 'b',
        style: `height:${d.minutes > 0 ? Math.max(12, (d.minutes / maxMin) * 100) : 6}%;background:${d.minutes > 0 ? (d.isToday ? 'var(--mm-accent)' : 'var(--mm-ink)') : 'var(--mm-line)'}`,
      }),
      h('div', { class: 'd' }, d.label))));

  const rows = items.slice(0, 60).map((e) => {
    const sub = e.kind === 'treino'
      ? `${fmtRelativeDay(e.at)} · ${fmtClock(e.durationMs)} · ${e.reps} reps`
      : `${fmtRelativeDay(e.at)} · ${e.markLabel ?? ''}${e.resultLabel ? ` · ${e.resultLabel}` : ''}`;
    const right = e.kind === 'desafio' && e.record
      ? h('div', { style: 'font-size:14px;font-weight:600;color:var(--mm-accent)' }, 'recorde')
      : h('div', { style: `font-size:14px;font-weight:600;color:${e.amplitude >= CHALLENGE_MIN_AMPLITUDE ? 'var(--mm-good)' : 'var(--mm-warn)'}` }, fmtPct(e.amplitude));
    return h('div', { class: 'card card-row', style: 'border-radius:22px;padding:16px 20px' },
      h('div', { class: 'card-col' }, h('div', { class: 'card-title' }, e.title), h('div', { class: 'small' }, sub)),
      right);
  });

  const streak = week.streak;
  root.append(h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', { class: 'date' }, monthName(new Date())), h('h1', { class: 'h1' }, 'Histórico')),
    h('div', { class: 'card card-lg', style: 'display:flex;flex-direction:column;gap:18px;padding:22px 24px' },
      h('div', { class: 'card-row', style: 'align-items:baseline' },
        h('div', { class: 'card-col', style: 'gap:2px' },
          h('div', { class: 'small' }, 'Esta semana'),
          h('div', { class: 'h2', style: 'font-size:24px' }, `${week.workouts} ${week.workouts === 1 ? 'treino' : 'treinos'} · ${Math.round(week.minutes)} min`)),
        streak > 1 ? h('div', { style: 'font-size:13px;color:var(--mm-accent);font-weight:600;flex:none' }, `${streak} dias seguidos`) : null),
      bars),
    rows.length
      ? h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, ...rows)
      : h('div', { class: 'empty' }, 'Seu primeiro treino aparece aqui.'),
    h('div', { class: 'faint', style: 'margin-top:auto;padding-top:12px' }, 'Salvo só neste aparelho'),
  ));
}
