import { strings } from '../i18n/strings.ts';

let progressEl: HTMLParagraphElement | null = null;

export function showLoading(root: HTMLElement): void {
  root.innerHTML = '';
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');

  const h1 = document.createElement('h1');
  h1.textContent = strings.loading.text;

  const p = document.createElement('p');
  p.textContent = strings.loading.subtext;

  // Spinner indeterminado simples (CSS animation é dispensável; usar um pulse de texto).
  const spinner = document.createElement('div');
  spinner.setAttribute('role', 'progressbar');
  spinner.setAttribute('aria-busy', 'true');
  spinner.setAttribute('aria-label', 'Carregando');
  spinner.style.width = '48px';
  spinner.style.height = '48px';
  spinner.style.border = '4px solid rgba(245,245,245,0.2)';
  spinner.style.borderTopColor = '#4cd964';
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'movemove-spin 0.9s linear infinite';

  // Injeta keyframes inline uma única vez
  if (!document.getElementById('movemove-spin-style')) {
    const style = document.createElement('style');
    style.id = 'movemove-spin-style';
    style.textContent = '@keyframes movemove-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  progressEl = document.createElement('p');
  progressEl.textContent = '';
  progressEl.style.fontSize = '14px';
  progressEl.style.color = '#8a8d92';

  root.append(h1, p, spinner, progressEl);
}

export function setLoadingStatus(msg: string): void {
  if (progressEl) progressEl.textContent = msg;
}

export function hideLoading(root: HTMLElement): void {
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
  progressEl = null;
}
