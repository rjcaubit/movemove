/** Roteador por hash (`#/rota`). Funciona em hosting estático e em link de WhatsApp. */
export type Cleanup = () => void;
export type ScreenFn = (root: HTMLElement, params: Record<string, string>) => Cleanup | void;
export type Tab = 'treino' | 'desafios' | 'jogos' | 'historico' | null;

interface Route { pattern: RegExp; keys: string[]; screen: ScreenFn; tab: Tab }

const routes: Route[] = [];

export function route(path: string, screen: ScreenFn, tab: Tab = null): void {
  const keys: string[] = [];
  const pattern = new RegExp('^' + path.replace(/:(\w+)/g, (_, k: string) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ pattern, keys, screen, tab });
}

export function currentPath(): string {
  const raw = location.hash.replace(/^#/, '');
  return raw.startsWith('/') ? raw : '/';
}

export function navigate(path: string, replace = false): void {
  const target = `#${path}`;
  if (location.hash === target) { window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
  if (replace) history.replaceState(null, '', target); else location.hash = target;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function resolve(path: string): { screen: ScreenFn; params: Record<string, string>; tab: Tab } | null {
  for (const r of routes) {
    const m = r.pattern.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => { params[k] = m[i + 1]; });
    return { screen: r.screen, params, tab: r.tab };
  }
  return null;
}
