import { h, icon } from './ui/dom.ts';
import type { GamesHandle, LaunchOptions } from '../game/launch.ts';
import { getPoseRuntime } from '../pose/runtime.ts';
import { mountPrepareGate } from './ui/prepareGate.ts';

/**
 * Sobe o módulo de jogos (Phaser, import dinâmico) numa camada acima do app.
 * Ao sair, o jogo é destruído e o app volta a aparecer.
 */
let handle: GamesHandle | null = null;
let layer: HTMLElement | null = null;
let disposeGate: (() => void) | null = null;
let opening = false;

export async function openGames(opts: LaunchOptions = {}): Promise<void> {
  if (handle || opening) return;
  opening = true;
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
  if (!opening) return;
  opening = false;
  handle = launchGames(host, { ...opts, onExit: () => { window.setTimeout(closeGames, 0); } });
}

/**
 * Abre um jogo passando antes pela mesma preparação do treino ("Entre no
 * contorno", com a voz do app). A câmera segue ligada na passagem pro jogo.
 */
export function openGame(scene: string): void {
  if (handle || opening || disposeGate) return;
  const appRoot = document.getElementById('mm-root');
  if (!appRoot) return;
  disposeGate = mountPrepareGate(appRoot, {
    onReady: () => {
      const gate = disposeGate;
      disposeGate = null;
      void openGames({ scene: 'Loading', sceneData: { next: scene } }).finally(() => gate?.());
    },
    onClose: () => closeGames(),
  });
  // Saiu da aba pelo voltar do navegador: desliga a preparação junto.
  window.addEventListener('hashchange', () => { if (disposeGate) closeGames(); }, { once: true });
}

export function closeGames(): void {
  opening = false;
  disposeGate?.();
  disposeGate = null;
  handle?.close();
  handle = null;
  if (layer) { layer.innerHTML = ''; layer.classList.add('is-hidden'); }
  document.getElementById('mm-root')?.classList.remove('is-hidden');
  getPoseRuntime().stop();
}
