import './app.css';
import { h, icon, clear } from './ui/dom.ts';
import { route, resolve, currentPath, navigate, type Cleanup, type Tab } from './router.ts';
import { homeScreen } from './screens/home.ts';
import { builderScreen } from './screens/builder.ts';
import { sessionScreen } from './screens/session.ts';
import { summaryScreen } from './screens/summary.ts';
import { challengesScreen } from './screens/challenges.ts';
import { challengeCreateScreen } from './screens/challengeCreate.ts';
import { challengeReceiveScreen } from './screens/challengeReceive.ts';
import { challengeResultScreen } from './screens/challengeResult.ts';
import { historyScreen } from './screens/history.ts';
import { gamesScreen } from './screens/games.ts';
import { closeGames, openGames } from './games.ts';

route('/', homeScreen, 'treino');
route('/montar', builderScreen);
route('/sessao', sessionScreen);
route('/resumo', summaryScreen);
route('/desafios', challengesScreen, 'desafios');
route('/desafios/novo', challengeCreateScreen);
route('/desafio/:payload', challengeReceiveScreen);
route('/desafio-resultado', challengeResultScreen);
route('/jogos', gamesScreen, 'jogos');
route('/historico', historyScreen, 'historico');

const TABS: Array<{ id: Exclude<Tab, null>; label: string; path: string; icon: () => SVGSVGElement }> = [
  { id: 'treino', label: 'Treino', path: '/', icon: icon.tabTreino },
  { id: 'desafios', label: 'Desafios', path: '/desafios', icon: icon.tabDesafios },
  { id: 'jogos', label: 'Jogos', path: '/jogos', icon: icon.tabJogos },
  { id: 'historico', label: 'Histórico', path: '/historico', icon: icon.tabHistorico },
];

function tabbar(active: Tab): HTMLElement {
  return h('nav', { class: 'tabbar', 'aria-label': 'Navegação principal' },
    ...TABS.map((t) => h('button', {
      class: `tab${t.id === active ? ' is-on' : ''}`, 'aria-current': t.id === active ? 'page' : undefined,
      on: { click: () => navigate(t.path) },
    }, t.icon(), t.label)));
}

export function startMoveMove(): void {
  const root = document.getElementById('mm-root');
  if (!root) throw new Error('#mm-root not found');
  let cleanup: Cleanup | void;

  const render = (): void => {
    if (cleanup) { try { cleanup(); } catch (err) { console.error(err); } cleanup = undefined; }
    clear(root);
    const path = currentPath();
    const match = resolve(path) ?? resolve('/')!;
    const main = h('main', { class: 'shell-main' });
    if (match.tab) {
      root.append(h('div', { class: 'shell' }, main, tabbar(match.tab)));
    } else {
      main.style.height = '100%';
      root.append(main);
    }
    cleanup = match.screen(main, match.params);
    main.scrollTop = 0;
  };

  window.addEventListener('hashchange', render);
  render();

  // Atalhos de desenvolvimento: ?games=1 abre direto o módulo de jogos (fluxo antigo).
  const params = new URLSearchParams(location.search);
  if (params.get('games') === '1' || params.get('dance') === 'check' || params.get('rec') === '1' || params.get('jump') === '1' || params.get('demo') === '1') {
    void openGames();
  }
  (window as unknown as { __mm2: unknown }).__mm2 = { navigate, openGames, closeGames };
}
