import { h, clear } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState } from '../state.ts';
import { backHeader } from '../ui/common.ts';
import { EQUIP_LABEL, GOAL_LABEL, GROUP_LABEL, type Equipment, type Goal, type MuscleGroup } from '../services/catalog.ts';
import { LEVEL_LABEL, describeOptions, generateWorkout, type DurationMin, type Level, type WorkoutOptions } from '../services/generateWorkout.ts';
import { loadPrefs, savePrefs } from '../services/prefs.ts';

export function builderScreen(root: HTMLElement): void {
  const opts: WorkoutOptions = { ...loadPrefs().lastOptions };
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:22px' });
  const summary = h('div', { class: 'small', style: 'text-align:center;font-size:13px' });

  const chips = <T extends string>(label: string, labels: Record<T, string>, key: keyof WorkoutOptions): HTMLElement => {
    const wrap = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': label });
    for (const [value, text] of Object.entries(labels) as Array<[T, string]>) {
      const on = opts[key] === value;
      wrap.append(h('button', {
        class: `chip${on ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(on),
        on: { click: () => { (opts as unknown as Record<string, unknown>)[key] = value; render(); } },
      }, text));
    }
    return h('div', { class: 'field' }, h('div', { class: 'label' }, label), wrap);
  };

  const render = (): void => {
    clear(body);
    body.append(
      chips<MuscleGroup>('Grupo muscular', GROUP_LABEL, 'grupo'),
      chips<Goal>('Objetivo', GOAL_LABEL, 'objetivo'),
      h('div', { class: 'field' },
        h('div', { class: 'label' }, 'Duração'),
        h('div', { class: 'tiles', role: 'radiogroup', 'aria-label': 'Duração' },
          ...([5, 7, 10, 15] as DurationMin[]).map((d) => h('button', {
            class: `tile${opts.duracao === d ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(opts.duracao === d),
            on: { click: () => { opts.duracao = d; render(); } },
          }, String(d), h('span', null, 'min'))),
        ),
      ),
      h('div', { class: 'field' },
        h('div', { class: 'label' }, 'Nível'),
        h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Nível' },
          ...(Object.entries(LEVEL_LABEL) as Array<[Level, string]>).map(([lv, txt]) => h('button', {
            class: opts.nivel === lv ? 'is-on' : '', role: 'radio', 'aria-checked': String(opts.nivel === lv),
            on: { click: () => { opts.nivel = lv; render(); } },
          }, txt)),
        ),
      ),
      chips<Equipment>('Equipamento', EQUIP_LABEL, 'equipamento'),
    );
    summary.textContent = describeOptions(opts);
  };
  render();

  root.append(h('div', { class: 'page has-back' },
    backHeader('Montar treino', '/'),
    body,
    h('div', { class: 'page-foot' },
      summary,
      h('button', {
        class: 'btn btn-primary',
        on: {
          click: () => {
            savePrefs({ lastOptions: opts });
            appState.session = { kind: 'workout', workout: generateWorkout(opts) };
            navigate('/sessao');
          },
        },
      }, 'Gerar treino'),
    ),
  ));
}
