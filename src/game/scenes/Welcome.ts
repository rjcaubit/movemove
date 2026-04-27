import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class Welcome extends Phaser.Scene {
  constructor() { super('Welcome'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    this.add.image(width / 2, height / 2 - 100, 'mascot').setScale(4);

    this.add.text(width / 2, height / 2 + 0, 'MOVEMOVE', {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '40px',
      color: '#4cd964',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 60, strings.welcome.headline, {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#8a8d92',
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    const cta = this.add.text(width / 2, height - 80, strings.welcome.cta, {
      fontFamily: 'system-ui',
      fontSize: '24px',
      color: '#0b0d10',
      backgroundColor: '#4cd964',
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cta.setName('btn-start');
    cta.on('pointerup', () => this.scene.start('Loading'));
  }
}
