import { strings } from '../../i18n/strings.ts';

export function installOrientationGuard(): void {
  const overlay = document.getElementById('orientation-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  const icon = document.createElement('div');
  icon.className = 'icon'; icon.textContent = '📱↻';
  const text = document.createElement('p');
  text.textContent = strings.orientation.rotate;
  const btn = document.createElement('button');
  btn.textContent = strings.orientation.continue;
  btn.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.append(icon, text, btn);

  const mql = window.matchMedia('(orientation: portrait)');
  const isMobile = window.innerWidth < 900;
  const apply = (): void => {
    if (mql.matches && isMobile) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
  };
  apply();
  mql.addEventListener('change', apply);
}
