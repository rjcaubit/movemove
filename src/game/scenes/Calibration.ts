import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';

type Phase = 'capturing' | 'getReady';

export class Calibration extends Phaser.Scene {
  private bigEl!: Phaser.GameObjects.Text;
  private statusEl!: Phaser.GameObjects.Text;
  private phase: Phase = 'capturing';
  private getReadyStartedAt = 0;
  private unsubFrame: (() => void) | null = null;

  constructor() { super('Calibration'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x000000);

    this.add.text(width / 2, 60, strings.calibration.instruction, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5',
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    this.bigEl = this.add.text(width / 2, height / 2, '...', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '120px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.statusEl = this.add.text(width / 2, height - 60, strings.calibration.capturing, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#ffd60a',
    }).setOrigin(0.5);

    const refs = getRefs(this);
    refs.calibrator.abort();
    refs.eventDetector.reset();
    refs.smoother.reset();

    this.phase = 'capturing';
    refs.calibrator.start();

    this.unsubFrame = refs.onSmoothedFrame((frame) => {
      if (this.phase !== 'capturing') return;
      const outcome = refs.calibrator.feed(frame);
      if (outcome) {
        if (outcome.ok) {
          refs.eventDetector.setBaseline(outcome.baseline);
          this.phase = 'getReady';
          this.getReadyStartedAt = this.time.now;
          this.statusEl.setText(strings.calibration.ok);
        } else {
          this.statusEl.setText(strings.calibration.retry);
          refs.calibrator.start();
        }
      }
    });
  }

  update(): void {
    if (this.phase === 'capturing') {
      // Pulse "..." pra dar feedback de "capturando"
      const dot = Math.floor((this.time.now / 400) % 4);
      this.bigEl.setText('.'.repeat(dot + 1));
      return;
    }
    // getReady: 3-2-1-GO
    const elapsed = this.time.now - this.getReadyStartedAt;
    const remaining = 3 - Math.floor(elapsed / 1000);
    if (remaining > 0) {
      this.bigEl.setText(String(remaining));
    } else if (remaining === 0) {
      this.bigEl.setText('GO');
    }
    if (elapsed > 3500) {
      this.scene.start('Play', { skipPrep: true });
    }
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
  }
}
