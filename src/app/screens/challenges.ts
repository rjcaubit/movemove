import { h } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState } from '../state.ts';
import { figure } from '../ui/common.ts';
import { fmtRelativeDay } from '../services/format.ts';
import { challengeShortLabel, compareMarks, encodeChallenge, formatMark, listChallenges, type ChallengeRecord } from '../services/challenges.ts';

function statusOf(c: ChallengeRecord): { text: string; color: string } {
  const p = c.payload;
  if (c.dir === 'enviado') return { text: 'enviado', color: 'var(--mm-muted)' };
  if (c.minhaMarca === undefined) return { text: 'pendente', color: 'var(--mm-accent)' };
  const cmp = compareMarks(p.modo, c.minhaMarca, p.marca);
  return cmp > 0 ? { text: 'venceu', color: 'var(--mm-good)' } : cmp < 0 ? { text: 'perdeu', color: 'var(--mm-warn)' } : { text: 'empate', color: 'var(--mm-muted)' };
}

export function challengesScreen(root: HTMLElement): () => void {
  const items = listChallenges();
  const hero = figure('lunge', 78, '#fff');

  const rows = items.map((c) => {
    const st = statusOf(c);
    const p = c.payload;
    const sub = c.dir === 'enviado'
      ? `${fmtRelativeDay(c.at)} · sua marca ${formatMark(p.modo, p.marca)}`
      : `${fmtRelativeDay(c.at)} · de ${p.nome} · ${formatMark(p.modo, p.marca)}${c.minhaMarca !== undefined ? ` vs ${formatMark(p.modo, c.minhaMarca)}` : ''}`;
    return h('button', {
      class: 'card card-row card-link', style: 'border-radius:22px;padding:16px 20px',
      on: {
        click: () => {
          if (c.dir === 'recebido') navigate(`/desafio/${encodeChallenge(p)}`);
          else { appState.challengeDraft = { exercicio: p.exercicio, modo: p.modo, alvo: p.alvo }; navigate('/desafios/novo'); }
        },
      },
    },
    h('div', { class: 'card-col' }, h('div', { class: 'card-title' }, challengeShortLabel(p)), h('div', { class: 'small' }, sub)),
    h('div', { style: `font-size:14px;font-weight:600;color:${st.color};flex:none` }, st.text));
  });

  root.append(h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', { class: 'date' }, 'Sem conta, por link'), h('h1', { class: 'h1' }, 'Desafios')),
    h('div', { class: 'card card-lg card-dark hero', style: 'min-height:200px' },
      h('div', { class: 'card-row', style: 'align-items:flex-start' },
        h('div', { class: 'card-col' },
          h('div', { class: 'eyebrow' }, 'novo desafio'),
          h('div', { class: 'hero-title' }, 'Desafie alguém', h('br'), 'no WhatsApp')),
        hero.el),
      h('button', { class: 'btn btn-secondary btn-sm', on: { click: () => navigate('/desafios/novo') } }, 'Criar desafio'),
    ),
    items.length
      ? h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, ...rows)
      : h('div', { class: 'empty' }, 'Nenhum desafio ainda. Faça sua marca, mande o link e veja quem ganha.'),
  ));
  return () => hero.destroy();
}
