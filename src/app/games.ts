import { h, icon } from './ui/dom.ts';
import type { GamesHandle, LaunchOptions } from '../game/launch.ts';
import { getPoseRuntime } from '../pose/runtime.ts';

/**
 * Sobe o módulo de jogos (Phaser, import dinâmico) numa camada acima do app.
 * Ao sair, o jogo é destruído e o app volta a aparecer.
 */
let handle: GamesHandle | null = null;
let layer: HTMLElement | null = null;

export async function openGames(opts: LaunchOptions = {}): Promise<void> {
  if (handle) return;
  const appRoot = document.getElementById('mm-root');
  layer = document.getElementById('game-layer');
  if (!layer) {
    layer = h('div', { id: 'game-layer' });
    document.body.append(layer);
  }
  layer.innerHTML = '';
  const host = h('div', { class: 'game-host', id: 'game' });
  const exit = h('button', { class: 'game-exit', 'aria-label': 'Sair dos jogos', on: { click: () => closeGames() } }, icon.close(12), 'Sair');
  layer.append(host, exit);
  layer.classList.remove('is-hidden');
  appRoot?.classList.add('is-hidden');
  const { launchGames } = await import('../game/launch.ts');
  handle = launchGames(host, opts);
}

export function closeGames(): void {
  handle?.close();
  handle = null;
  if (layer) { layer.innerHTML = ''; layer.classList.add('is-hidden'); }
  document.getElementById('mm-root')?.classList.remove('is-hidden');
  getPoseRuntime().stop();
}
