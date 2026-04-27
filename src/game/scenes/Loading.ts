import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

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

    // Placeholder Fase A: simula 800ms e segue. Fase D substitui por loadModel real.
    this.statusText.setText(strings.loading.statusReady);
    this.time.delayedCall(800, () => {
      const done = (() => { try { return localStorage.getItem(GAME_CONFIG.storageKeys.tutorialDone) === 'true'; } catch { return false; } })();
      this.scene.start(done ? 'Calibration' : 'Tutorial');
    });
  }
}
