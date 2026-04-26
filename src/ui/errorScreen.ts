import { strings } from '../i18n/strings.ts';

export type ErrorKind = 'cameraDenied' | 'cameraNotFound' | 'modelDownload' | 'generic';

export function showError(
  root: HTMLElement,
  kind: ErrorKind,
  onRetry: () => void,
): void {
  root.innerHTML = '';
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');

  const h1 = document.createElement('h1');
  h1.textContent = '⚠️';

  const p = document.createElement('p');
  p.textContent = strings.error[kind];

  const btn = document.createElement('button');
  btn.textContent = strings.error.retry;
  btn.setAttribute('aria-label', strings.error.retry);
  btn.addEventListener('click', () => onRetry(), { once: true });

  root.append(h1, p, btn);
}

export function hideError(root: HTMLElement): void {
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
}
