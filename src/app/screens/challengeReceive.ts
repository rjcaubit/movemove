import { h } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState } from '../state.ts';
import { figure } from '../ui/common.ts';
import { getExercise } from '../services/catalog.ts';
import {
  challengeId, challengeModeLabel, challengeTitle, decodeChallenge, formatMark, listChallenges, upsertChallenge,
} from '../services/challenges.ts';

export function challengeReceiveScreen(root: HTMLElement, params: Record<string, string>): () => void {
  const p = decodeChallenge(params.payload ?? '');
  if (!p) {
    root.append(h('div', { class: 'page' },
      h('div', { class: 'head' }, h('div', { class: 'eyebrow' }, 'desafio'), h('h1', { class: 'h1' }, 'Link inválido')),
      h('div', { class: 'body' }, 'Esse link de desafio está incompleto ou foi cortado. Peça pra pessoa mandar de novo.'),
      h('div', { class: 'page-foot' }, h('button', { class: 'btn btn-primary', on: { click: () => navigate('/', true) } }, 'Ir para o início')),
    ));
    return () => {};
  }
  const id = challengeId(p, 'recebido');
  const existing = listChallenges().find((c) => c.id === id);
  upsertChallenge(existing ?? { id, dir: 'recebido', at: Date.now(), payload: p });
  const mine = existing?.minhaMarca;

  const ex = getExercise(p.exercicio);
  const fig = figure(ex?.poseKeyframes ?? 'burpee', 84);
  let showHow = false;
  const how = h('div', { class: 'note', style: 'display:none;text-align:left' },
    'Você faz o mesmo exercício na frente da câmera. O app conta as repetições e só vale rep com boa amplitude. No fim, mostra quem ganhou e você pode desafiar de volta.');

  root.append(h('div', { class: 'page', style: 'align-items:center;text-align:center' },
    h('div', { class: 'eyebrow', style: 'margin-top:24px;font-size:13px' }, 'desafio recebido'),
    h('h1', { class: 'h1', style: 'font-size:30px;padding:0 8px' }, `${p.nome} te desafiou`),
    h('div', { class: 'card card-lg', style: 'width:100%;margin-top:18px;display:flex;flex-direction:column;gap:20px;text-align:left' },
      h('div', { class: 'card-row' },
        h('div', { class: 'card-col', style: 'gap:4px' },
          h('div', { class: 'small' }, p.modo === 'treino_total' ? 'Treino' : 'Exercício'),
          h('div', { class: 'h2' }, challengeTitle(p)),
          h('div', { class: 'small', style: 'font-size:13px' }, challengeModeLabel(p))),
        fig.el),
      h('div', { class: 'pair', style: 'gap:12px' },
        h('div', { class: 'card-col', style: 'background:var(--mm-bg);border-radius:20px;padding:16px' },
          h('div', { class: 'small' }, p.nome),
          h('div', { class: 'num', style: 'font-size:30px;font-weight:300;letter-spacing:-.03em' }, formatMark(p.modo, p.marca))),
        h('div', { class: 'card-col', style: 'background:var(--mm-bg);border-radius:20px;padding:16px' },
          h('div', { class: 'small' }, 'Você'),
          h('div', { class: 'num', style: `font-size:30px;font-weight:300;letter-spacing:-.03em;color:${mine !== undefined ? 'var(--mm-ink)' : '#aab2bc'}` },
            mine !== undefined ? formatMark(p.modo, mine) : '—')),
      ),
    ),
    h('div', { class: 'small', style: 'font-size:13px;line-height:1.5;padding:4px 16px' },
      ex?.camera === 'lateral'
        ? 'Precisa de câmera baixa, de lado, e espaço pra deitar. Nada é gravado nem enviado.'
        : 'Precisa de câmera e espaço pra ficar de corpo inteiro. Nada é gravado nem enviado.'),
    how,
    h('div', { class: 'page-foot', style: 'width:calc(100% + 48px)' },
      h('button', {
        class: 'btn btn-primary', on: {
          click: () => {
            appState.session = { kind: 'challenge', spec: { exercicio: p.exercicio, modo: p.modo, alvo: p.alvo }, purpose: 'accept', incoming: p };
            navigate('/sessao');
          },
        },
      }, mine !== undefined ? 'Tentar de novo' : 'Aceitar desafio'),
      h('button', { class: 'btn btn-ghost', on: { click: () => { showHow = !showHow; how.style.display = showHow ? 'block' : 'none'; } } }, 'Ver como funciona'),
    ),
  ));
  return () => fig.destroy();
}
