import { h, clear } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState, type ChallengeSpec } from '../state.ts';
import { backHeader, toast } from '../ui/common.ts';
import { CHALLENGE_EXERCISES, getExercise } from '../services/catalog.ts';
import { loadLastWorkout, loadPrefs, savePrefs } from '../services/prefs.ts';
import {
  DEFAULT_TARGET, MODE_OPTIONS, challengeId, challengeShortLabel, challengeUrl, formatMark, getBest, markKey,
  optionsToTarget, upsertChallenge, whatsappUrl, type ChallengeMode, type ChallengePayload,
} from '../services/challenges.ts';
import { workoutSubtitle } from '../services/generateWorkout.ts';

export function challengeCreateScreen(root: HTMLElement): void {
  const last = loadLastWorkout();
  const draft = appState.challengeDraft;
  const outcome = appState.challengeOutcome;
  appState.challengeDraft = null;
  let spec: ChallengeSpec = draft ?? { exercicio: 'agachamento', modo: 'reps_tempo', alvo: DEFAULT_TARGET.reps_tempo };
  let nome = loadPrefs().nome;
  // Aviso de tentativa que não completou (ex: não chegou nas N reps).
  let notice: string | null = outcome && draft && outcome.marca === null && markKey(outcome.spec) === markKey(draft)
    ? 'Não deu pra completar. Tenta de novo quando quiser.' : null;
  appState.challengeOutcome = null;

  const body = h('div', { style: 'display:flex;flex-direction:column;gap:22px' });
  const foot = h('div', { class: 'page-foot' });

  const modesFor = (exId: string): ChallengeMode[] => {
    if (exId === 'treino') return ['treino_total'];
    return getExercise(exId)?.tipo === 'tempo' ? ['segurar'] : ['reps_tempo', 'max_reps'];
  };

  const select = (exId: string): void => {
    notice = null;
    if (exId === 'treino') {
      if (!last) return;
      spec = { exercicio: 'treino', modo: 'treino_total', alvo: optionsToTarget(last.options, last.seed) };
    } else {
      const modes = modesFor(exId);
      const modo = modes.includes(spec.modo) ? spec.modo : modes[0];
      spec = { exercicio: exId, modo, alvo: modo === 'treino_total' ? 0 : DEFAULT_TARGET[modo as Exclude<ChallengeMode, 'treino_total'>] };
    }
    render();
  };

  const render = (): void => {
    clear(body);
    clear(foot);
    const exChips = h('div', { class: 'chips' },
      ...CHALLENGE_EXERCISES.map((id) => h('button', {
        class: `chip${spec.exercicio === id ? ' is-on' : ''}`, on: { click: () => select(id) },
      }, getExercise(id)?.nome ?? id)),
      last ? h('button', { class: `chip${spec.exercicio === 'treino' ? ' is-on' : ''}`, on: { click: () => select('treino') } }, 'Treino inteiro') : null,
    );
    body.append(h('div', { class: 'field' }, h('div', { class: 'label' }, 'Exercício'), exChips));

    const modes = modesFor(spec.exercicio);
    const modeList = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    if (spec.modo === 'treino_total' && last) {
      modeList.append(h('div', { class: 'option is-on' },
        h('div', { class: 'card-col' }, h('div', { class: 'card-title' }, 'Total de reps no treino'),
          h('div', { class: 'small' }, `${workoutSubtitle(last.options)} · mesmo treino pros dois`)),
        h('div', { class: 'radio' })));
    } else {
      for (const m of MODE_OPTIONS) {
        const allowed = modes.includes(m.modo);
        const alvo = DEFAULT_TARGET[m.modo as Exclude<ChallengeMode, 'treino_total'>];
        modeList.append(h('button', {
          class: `option${spec.modo === m.modo ? ' is-on' : ''}`, disabled: !allowed,
          on: { click: () => { spec = { ...spec, modo: m.modo, alvo }; notice = null; render(); } },
        },
        h('div', { class: 'card-col' }, h('div', { class: 'card-title' }, m.titulo(alvo)), h('div', { class: 'small' }, m.sub)),
        h('div', { class: 'radio' })));
      }
    }
    body.append(h('div', { class: 'field' }, h('div', { class: 'label' }, 'Como vence'), modeList));

    const best = getBest(markKey(spec));
    const markCard = h('div', { class: 'card card-dark card-row', style: 'padding:20px' },
      h('div', { class: 'card-col' },
        h('div', { class: 'small' }, best ? 'Sua marca' : 'Ainda sem marca'),
        h('div', { class: 'card-title' }, best ? `${challengeShortLabel(spec)}${spec.modo === 'reps_tempo' ? ' em' : ''}` : 'Faça agora pra valer no link'),
      ),
      best ? h('div', { class: 'num', style: 'font-size:34px;font-weight:300;letter-spacing:-.03em' }, formatMark(spec.modo, best.marca)) : null,
    );
    body.append(markCard);
    if (notice) body.append(h('div', { class: 'note' }, notice));

    const nameInput = h('input', {
      class: 'input', placeholder: 'Seu nome (aparece pra quem receber)', value: nome, maxLength: 24, autocomplete: 'given-name',
      on: { input: (e: Event) => { nome = (e.target as HTMLInputElement).value; updateButtons(); } },
    });
    body.append(h('div', { class: 'field' }, h('div', { class: 'label' }, 'Seu nome'), nameInput));

    const doMark = (): void => {
      appState.challengeDraft = spec;
      appState.session = { kind: 'challenge', spec, purpose: 'mark' };
      navigate('/sessao');
    };
    const payload = (): ChallengePayload | null => {
      if (!best || !nome.trim()) return null;
      return { v: 1, nome: nome.trim(), exercicio: spec.exercicio, modo: spec.modo, alvo: spec.alvo, marca: best.marca, data: best.at };
    };
    const remember = (p: ChallengePayload): void => {
      savePrefs({ nome: p.nome });
      upsertChallenge({ id: challengeId(p, 'enviado'), dir: 'enviado', at: Date.now(), payload: p });
    };

    const wa = h('button', {
      class: 'btn btn-green', on: {
        click: () => {
          const p = payload(); if (!p) return;
          remember(p);
          window.open(whatsappUrl(p), '_blank', 'noopener');
        },
      },
    }, 'Enviar no WhatsApp');
    const copy = h('button', {
      class: 'btn btn-secondary btn-sm', on: {
        click: async () => {
          const p = payload(); if (!p) return;
          remember(p);
          const url = challengeUrl(p);
          try {
            if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: 'Desafio MoveMove', url });
            else { await navigator.clipboard.writeText(url); toast('Link copiado'); }
          } catch {
            try { await navigator.clipboard.writeText(url); toast('Link copiado'); } catch { prompt('Copie o link:', url); }
          }
        },
      },
    }, 'Copiar link');
    const markBtn = h('button', { class: best ? 'btn btn-ghost' : 'btn btn-primary', on: { click: doMark } }, best ? 'Fazer de novo' : 'Fazer minha marca');
    const updateButtons = (): void => {
      const ok = !!payload();
      wa.disabled = !ok;
      copy.disabled = !ok;
    };
    updateButtons();
    if (best) foot.append(wa, copy, markBtn);
    else foot.append(markBtn);
    foot.append(h('div', { class: 'faint' }, 'Sem conta. O link guarda só o exercício, seu nome e sua marca.'));
  };
  render();

  root.append(h('div', { class: 'page has-back' }, backHeader('Desafiar alguém', () => navigate('/desafios')), body, foot));
}
