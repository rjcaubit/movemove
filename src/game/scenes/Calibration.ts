import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { POSE_CONFIG } from '../../pose/config.ts';
import { getRefs } from '../orchestrator.ts';

export class Calibration extends Phaser.Scene {
  private countdownEl!: Phaser.GameObjects.Text;
  private statusEl!: Phaser.GameObjects.Text;
  private countdownStartAt = 0;
  private countdownDone = false;
  private unsubFrame: (() => void) | null = null;

  constructor() { super('Calibration'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x000000);

    this.add.text(width / 2, 60, strings.calibration.instruction, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5',
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    this.countdownEl = this.add.text(width / 2, height / 2, '3', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '120px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.statusEl = this.add.text(width / 2, height - 60, '', {
      fontFamily: 'system-ui', fontSize: '16px', color: '#ffd60a',
    }).setOrigin(0.5);

    const refs = getRefs(this);
    refs.calibrator.abort();
    refs.eventDetector.reset();
    refs.smoother.reset();

    this.countdownStartAt = this.time.now;
    this.countdownDone = false;

    this.unsubFrame = refs.onSmoothedFrame((frame) => {
      if (!this.countdownDone) return;
      const outcome = refs.calibrator.feed(frame);
      if (outcome) {
        if (outcome.ok) {
          refs.eventDetector.setBaseline(outcome.baseline);
          this.statusEl.setText(strings.calibration.ok);
          this.countdownEl.setText('OK');
          this.time.delayedCall(600, () => this.scene.start('Play'));
        } else {
          this.statusEl.setText(strings.calibration.retry);
          this.countdownDone = false;
          this.countdownStartAt = this.time.now;
        }
      }
    });
  }

  update(): void {
    if (this.countdownDone) return;
    const elapsed = this.time.now - this.countdownStartAt;
    const remaining = POSE_CONFIG.calibrationCountdownSec - Math.floor(elapsed / 1000);
    if (remaining > 0) {
      this.countdownEl.setText(strings.calibration.countdown(remaining));
    } else {
      this.countdownEl.setText('GO');
      this.countdownDone = true;
      this.statusEl.setText(strings.calibration.capturing);
      const refs = getRefs(this);
      refs.calibrator.start();
    }
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
  }
}
