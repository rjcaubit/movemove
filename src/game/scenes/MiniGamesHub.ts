import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class MiniGamesHub extends Phaser.Scene {
  constructor() { super('MiniGamesHub'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    this.add.text(width / 2, 40, strings.miniGames.hubTitle, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '36px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 86, strings.miniGames.hubSubtitle, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#8a8d92', align: 'center',
    }).setOrigin(0.5);

    const cards: Array<[string, string, string, () => void]> = [
      [strings.miniGames.catchTitle, strings.miniGames.catchDesc, '🦋', () => this.scene.start('CatchBicho', { mode: 'alternating' })],
      [strings.miniGames.trunkTitle, strings.miniGames.trunkDesc, '🌀', () => this.scene.start('TrunkTwist')],
      [strings.miniGames.bellTitle, strings.miniGames.bellDesc, '🔔', () => this.scene.start('BellRinger')],
    ];
    cards.forEach(([title, desc, icon, onClick], i) => {
      const x = (i + 0.5) * (width / 3);
      const y = height / 2 - 20;
      const bg = this.add.rectangle(x, y, 240, 180, 0x1a2030, 0.8).setStrokeStyle(2, 0x4cd964, 0.5);
      this.add.text(x, y - 50, icon, { fontSize: '60px' }).setOrigin(0.5);
      this.add.text(x, y + 10, title, {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '18px', color: '#f5f5f5', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(x, y + 40, desc, {
        fontFamily: 'system-ui', fontSize: '12px', color: '#8a8d92', align: 'center',
        wordWrap: { width: 220 },
      }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', onClick);
    });

    const guided = this.add.text(width / 2, height - 110, `🎯 ${strings.miniGames.guidedSession}`, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#ffd60a', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    guided.setName('btn-guided');
    guided.on('pointerup', () => this.scene.start('CatchBicho', { mode: 'alternating', session: ['CatchBicho', 'TrunkTwist', 'BellRinger'] }));

    const back = this.add.text(40, 40, '← ' + strings.miniGames.back, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 12, y: 6 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Welcome'));
  }
}
