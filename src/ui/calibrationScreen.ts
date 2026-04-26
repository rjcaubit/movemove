import { strings } from '../i18n/strings.ts';
import { POSE_CONFIG } from '../pose/config.ts';

export class CalibrationScreen {
  private container: HTMLElement;
  private countdownEl: HTMLDivElement;
  private instructionEl: HTMLParagraphElement;
  private statusEl: HTMLParagraphElement;
  private timer: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.innerHTML = '';

    this.instructionEl = document.createElement('p');
    this.instructionEl.textContent = strings.calibration.instruction;

    this.countdownEl = document.createElement('div');
    this.countdownEl.className = 'countdown';

    this.statusEl = document.createElement('p');
    this.statusEl.textContent = '';

    this.container.append(this.instructionEl, this.countdownEl, this.statusEl);
  }

  startCountdown(onDone: () => void): void {
    let remaining = POSE_CONFIG.calibrationCountdownSec;
    this.countdownEl.textContent = strings.calibration.countdown(remaining);
    this.timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        this.countdownEl.textContent = strings.calibration.countdown(remaining);
      } else {
        if (this.timer !== null) clearInterval(this.timer);
        this.timer = null;
        this.countdownEl.textContent = '🎯';
        this.statusEl.textContent = strings.calibration.capturing;
        onDone();
      }
    }, 1000);
  }

  showRetry(): void {
    this.statusEl.textContent = strings.calibration.retry;
  }

  showOk(): void {
    this.countdownEl.textContent = '✅';
    this.statusEl.textContent = strings.calibration.ok;
  }

  destroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.container.innerHTML = '';
  }
}
