import { strings } from '../i18n/strings.ts';

export function renderWelcome(root: HTMLElement, onStart: () => void): void {
  root.innerHTML = '';
  root.setAttribute('aria-hidden', 'false');
  root.classList.remove('hidden');

  const h1 = document.createElement('h1');
  h1.textContent = strings.welcome.headline;

  const p = document.createElement('p');
  p.textContent = strings.welcome.explainer;

  const btn = document.createElement('button');
  btn.textContent = strings.welcome.cta;
  btn.setAttribute('aria-label', strings.welcome.cta);
  btn.addEventListener('click', () => onStart(), { once: true });

  root.append(h1, p, btn);
}

export function hideWelcome(root: HTMLElement): void {
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
}
