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

    const cta = this.add.text(width / 2, height - 110, strings.welcome.cta, {
      fontFamily: 'system-ui',
      fontSize: '24px',
      color: '#0b0d10',
      backgroundColor: '#4cd964',
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cta.setName('btn-start');
    cta.on('pointerup', () => this.scene.start('Loading'));

    const minigamesBtn = this.add.text(width / 2, height - 50, '🎮 ' + strings.miniGames.hubTitle, {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#0b0d10',
      backgroundColor: '#ffd60a',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    minigamesBtn.setName('btn-minigames');
    minigamesBtn.on('pointerup', () => this.scene.start('MiniGamesHub'));

    const settingsBtn = this.add.text(width - 24, 24, strings.welcome.settings, {
      fontFamily: 'system-ui', fontSize: '14px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 12, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    settingsBtn.setName('btn-settings');
    settingsBtn.on('pointerup', () => this.scene.start('Settings', { from: 'Welcome' }));
  }
}
