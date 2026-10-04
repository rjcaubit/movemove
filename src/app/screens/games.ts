import { h, icon } from '../ui/dom.ts';
import { strings } from '../../i18n/strings.ts';
import { openGames } from '../games.ts';

/** Aba Jogos: lista os mini-jogos existentes; cada um abre o módulo Phaser intacto. */
interface GameItem { title: string; desc: string; scene: string; data?: object }

const m = strings.miniGames;
const viaCheck = (target: string): Pick<GameItem, 'scene' | 'data'> => ({ scene: 'Loading', data: { next: 'BodyCheck', nextData: { next: target } } });

const GROUPS: Array<{ title: string; items: GameItem[] }> = [
  {
    title: 'Cardio',
    items: [
      { title: m.runnerTitle, desc: m.runnerDesc, ...viaCheck('Calibration') },
      { title: m.helicopterTitle, desc: m.helicopterDesc, ...viaCheck('HelicopterGame') },
      { title: m.chickenTitle, desc: m.chickenDesc, ...viaCheck('ChickenGame') },
      { title: m.canoeTitle, desc: m.canoeDesc, ...viaCheck('CanoeGame') },
    ],
  },
  {
    title: 'Ritmo',
    items: [
      { title: m.bellTitle, desc: m.bellDesc, ...viaCheck('BellRinger') },
      { title: m.danceTitle, desc: m.danceDesc, ...viaCheck('DanceDance') },
    ],
  },
  {
    title: 'Mira',
    items: [
      { title: m.catchTitle, desc: m.catchDesc, ...viaCheck('CatchBicho') },
      { title: m.castorTitle, desc: m.castorDesc, scene: 'Loading', data: { next: 'CastorModePicker' } },
      { title: m.trunkTitle, desc: m.trunkDesc, ...viaCheck('TrunkTwist') },
      { title: m.ninjaTitle, desc: m.ninjaDesc, ...viaCheck('NinjaFruit') },
    ],
  },
];

export function gamesScreen(root: HTMLElement): void {
  const row = (g: GameItem): HTMLElement => h('button', {
    class: 'list-row card-link', style: 'width:100%;text-align:left',
    on: { click: () => openGames({ scene: g.scene, sceneData: g.data }) },
  },
  h('div', { class: 'card-col' }, h('div', { class: 'card-title' }, g.title), h('div', { class: 'small' }, g.desc)),
  h('div', { class: 'round' }, icon.chevron()));

  root.append(h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', { class: 'date' }, 'Mexa o corpo brincando'), h('h1', { class: 'h1' }, 'Jogos')),
    h('button', {
      class: 'card card-lg card-dark card-row card-link', style: 'padding:22px 24px',
      on: { click: () => openGames({ scene: 'Loading', sceneData: { next: 'MiniGamesHub' } }) },
    },
    h('div', { class: 'card-col' }, h('div', { class: 'eyebrow' }, 'todos os jogos'), h('div', { class: 'hero-title', style: 'font-size:20px' }, 'Abrir central de jogos')),
    h('div', { class: 'round', style: 'background:#fff' }, icon.chevron())),
    ...GROUPS.map((grp) => h('div', { class: 'field', style: 'margin-top:8px' },
      h('div', { class: 'label' }, grp.title),
      h('div', { class: 'card', style: 'padding:4px 20px' }, h('div', { class: 'list' }, ...grp.items.map(row))))),
    h('div', { class: 'faint', style: 'padding-top:8px' }, 'Os jogos usam a câmera do mesmo jeito que o treino. Nada é gravado.'),
  ));
}
