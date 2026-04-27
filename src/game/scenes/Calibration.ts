import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

/**
 * Cena Calibration — Fase A: placeholder com countdown 3-2-1.
 * Fase D substitui por integração real com Calibrator.feed().
 */
export class Calibration extends Phaser.Scene {
  constructor() { super('Calibration'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    this.add.text(width / 2, height / 2 - 60, strings.calibration.instruction, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5', align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    let n = 3;
    const cd = this.add.text(width / 2, height / 2 + 30, strings.calibration.countdown(n), {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '96px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    const tick = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        n -= 1;
        if (n > 0) cd.setText(strings.calibration.countdown(n));
        else { cd.setText('GO'); this.time.delayedCall(600, () => this.scene.start('Play')); tick.remove(); }
      },
    });
  }
}
