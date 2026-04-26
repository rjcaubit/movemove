import { strings } from '../i18n/strings.ts';

export function showLoading(root: HTMLElement): void {
  root.innerHTML = '';
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');

  const h1 = document.createElement('h1');
  h1.textContent = strings.loading.text;

  const p = document.createElement('p');
  p.textContent = strings.loading.subtext;

  root.append(h1, p);
}

export function hideLoading(root: HTMLElement): void {
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
}
