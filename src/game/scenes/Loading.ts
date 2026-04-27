import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import type { ErrorKind } from '../../ui/errorScreen.ts';
import { showError } from '../../ui/errorScreen.ts';

export class Loading extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('Loading'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.add.text(width / 2, height / 2 - 30, strings.loading.text, {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
    }).setOrigin(0.5);
    this.statusText = this.add.text(width / 2, height / 2 + 20, '', {
      fontFamily: 'system-ui', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(0.5);

    void this.bootDetector();
  }

  private async bootDetector(): Promise<void> {
    const refs = getRefs(this);
    try {
      await refs.detector.loadModel((msg) => this.statusText.setText(msg));
      this.statusText.setText(strings.loading.statusOpeningCamera);
      await refs.detector.openCamera(refs.video);
      refs.detector.start(refs.video);
      this.statusText.setText(strings.loading.statusReady);
      const done = (() => { try { return localStorage.getItem(GAME_CONFIG.storageKeys.tutorialDone) === 'true'; } catch { return false; } })();
      this.scene.start(done ? 'Calibration' : 'Tutorial');
    } catch (err) {
      const kind = this.classifyError(err);
      const errorRoot = document.getElementById('screen-error');
      if (errorRoot) {
        showError(errorRoot, kind, () => {
          errorRoot.classList.add('hidden');
          errorRoot.setAttribute('aria-hidden', 'true');
          this.scene.start('Welcome');
        });
      }
    }
  }

  private classifyError(err: unknown): ErrorKind {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') return 'cameraDenied';
      if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'cameraNotFound';
      if (err.name === 'SecurityError') return 'insecureContext';
    }
    if (err instanceof Error && /fetch|network|loading/i.test(err.message)) return 'modelDownload';
    return 'generic';
  }
}
