import { h } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState } from '../state.ts';
import { toast } from '../ui/common.ts';
import { loadPrefs, savePrefs } from '../services/prefs.ts';
import {
  challengeId, challengeModeLabel, challengeTitle, challengeUrl, compareMarks, formatMark, upsertChallenge, whatsappUrl,
  type ChallengePayload,
} from '../services/challenges.ts';

export function challengeResultScreen(root: HTMLElement): void {
  const out = appState.challengeOutcome;
  if (!out) { queueMicrotask(() => navigate('/desafios', true)); return; }
  const { spec, incoming, marca } = out;
  let nome = loadPrefs().nome;

  let headline = 'Desafio feito';
  let eyebrow = 'resultado';
  if (marca === null) { headline = 'Não deu dessa vez'; }
  else if (incoming) {
    const cmp = compareMarks(spec.modo, marca, incoming.marca);
    headline = cmp > 0 ? 'Você venceu' : cmp < 0 ? `${incoming.nome} venceu` : 'Empate';
    eyebrow = cmp > 0 ? 'vitória' : cmp < 0 ? 'quase' : 'empate';
  } else if (out.record) { headline = 'Novo recorde'; }

  const markBox = (who: string, v: string, win: boolean): HTMLElement =>
    h('div', { class: 'card-col', style: `background:${win ? 'var(--mm-ink)' : 'var(--mm-bg)'};color:${win ? '#fff' : 'inherit'};border-radius:20px;padding:16px` },
      h('div', { class: 'small', style: win ? 'color:#aab2bc' : '' }, who),
      h('div', { class: 'num', style: 'font-size:30px;font-weight:300;letter-spacing:-.03em' }, v));

  const iWin = marca !== null && incoming ? compareMarks(spec.modo, marca, incoming.marca) > 0 : false;
  const theyWin = marca === null || (incoming ? compareMarks(spec.modo, marca, incoming.marca) < 0 : false);

  const nameInput = h('input', {
    class: 'input', placeholder: 'Seu nome', value: nome, maxLength: 24,
    on: { input: (e: Event) => { nome = (e.target as HTMLInputElement).value; sync(); } },
  });

  const payload = (): ChallengePayload | null => (marca === null || !nome.trim() ? null : {
    v: 1, nome: nome.trim(), exercicio: spec.exercicio, modo: spec.modo, alvo: spec.alvo, marca, data: Date.now(),
  });
  const send = (via: 'wa' | 'copy'): void => {
    const p = payload(); if (!p) return;
    savePrefs({ nome: p.nome });
    upsertChallenge({ id: challengeId(p, 'enviado'), dir: 'enviado', at: Date.now(), payload: p });
    if (via === 'wa') window.open(whatsappUrl(p), '_blank', 'noopener');
    else navigator.clipboard.writeText(challengeUrl(p)).then(() => toast('Link copiado'), () => prompt('Copie o link:', challengeUrl(p)));
  };
  const wa = h('button', { class: 'btn btn-green', on: { click: () => send('wa') } }, incoming ? 'Desafiar de volta' : 'Enviar no WhatsApp');
  const copy = h('button', { class: 'btn btn-secondary btn-sm', on: { click: () => send('copy') } }, 'Copiar link');
  const sync = (): void => { const ok = !!payload(); wa.disabled = !ok; copy.disabled = !ok; };
  sync();

  root.append(h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', { class: 'eyebrow' }, eyebrow), h('h1', { class: 'h1' }, headline)),
    h('div', { class: 'card card-lg', style: 'display:flex;flex-direction:column;gap:18px' },
      h('div', { class: 'card-col', style: 'gap:4px' },
        h('div', { class: 'h2' }, challengeTitle(spec)),
        h('div', { class: 'small', style: 'font-size:13px' }, challengeModeLabel(spec))),
      h('div', { class: 'pair', style: 'gap:12px' },
        incoming ? markBox(incoming.nome, formatMark(spec.modo, incoming.marca), theyWin && !!incoming) : null,
        markBox('Você', marca === null ? '—' : formatMark(spec.modo, marca), iWin || (!incoming && marca !== null)),
      ),
      marca === null ? h('div', { class: 'body' }, spec.modo === 'reps_tempo' ? `Precisa completar ${spec.alvo} repetições com boa amplitude.` : 'Sem marca registrada.') : null,
    ),
    marca !== null ? h('div', { class: 'field' }, h('div', { class: 'label' }, 'Seu nome'), nameInput) : null,
    h('div', { class: 'page-foot' },
      marca !== null ? wa : null,
      marca !== null ? copy : null,
      h('button', {
        class: marca === null ? 'btn btn-primary' : 'btn btn-ghost', on: {
          click: () => {
            appState.session = { kind: 'challenge', spec, purpose: incoming ? 'accept' : 'mark', incoming };
            navigate('/sessao');
          },
        },
      }, 'Tentar de novo'),
      h('button', { class: 'btn btn-ghost', on: { click: () => navigate('/desafios') } }, 'Ver desafios'),
    ),
  ));
}
