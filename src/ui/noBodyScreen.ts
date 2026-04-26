import { strings } from '../i18n/strings.ts';

export function setNoBodyVisible(host: HTMLElement, visible: boolean): void {
  const span = host.querySelector('span');
  if (!span) return;
  span.textContent = strings.states.noBody;
  if (visible) host.classList.remove('hidden');
  else host.classList.add('hidden');
}
