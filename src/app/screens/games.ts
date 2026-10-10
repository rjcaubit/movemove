import { h, icon } from '../ui/dom.ts';
import { openGame } from '../games.ts';

interface GameItem { title: string; emoji: string; desc: string; scene: string }

const GAMES: GameItem[] = [
  { title: 'Mata-Mosca', emoji: '🪰', desc: 'Bata palmas sobre as moscas antes que fujam!', scene: 'CatchBicho' },
  { title: 'Dino Pula-Pula', emoji: '🦖', desc: 'Pule para desviar dos cactos que vêm vindo!', scene: 'DinoGame' },
];

export function gamesScreen(root: HTMLElement): void {
  const card = (g: GameItem): HTMLElement => h('button', {
    class: 'card card-lg card-row card-link', style: 'padding:20px 20px; text-align:left',
    on: { click: () => openGame(g.scene) },
  },
  h('div', { style: 'font-size:44px;line-height:1;margin-right:16px' }, g.emoji),
  h('div', { class: 'card-col', style: 'flex:1' },
    h('div', { class: 'card-title' }, g.title),
    h('div', { class: 'small' }, g.desc),
  ),
  h('div', { class: 'round' }, icon.chevron()));

  root.append(h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', { class: 'date' }, 'Mexa o corpo brincando'), h('h1', { class: 'h1' }, 'Jogos')),
    h('div', { class: 'field', style: 'margin-top:8px; display:flex; flex-direction:column; gap:12px' },
      ...GAMES.map(card)),
    h('div', { class: 'faint', style: 'padding-top:8px' }, 'Os jogos usam a câmera do mesmo jeito que o treino. Nada é gravado.'),
  ));
}
