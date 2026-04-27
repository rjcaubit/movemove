import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface GameOverData { distance: number; coins: number }

/** Fase A: placeholder simples. Fase B reescreve com bitmap font + recorde. */
export class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: GameOverData): void {
    const { width, height } = GAME_CONFIG;
    const distance = Math.floor(data?.distance ?? 0);
    const coins = data?.coins ?? 0;

    this.add.text(width / 2, height / 2 - 100, strings.gameOver.title, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '40px', color: '#ff453a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 30, `${strings.gameOver.distance}: ${distance} m`, {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2, `${strings.gameOver.coins}: ${coins}`, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#ffd60a',
    }).setOrigin(0.5);

    const btn1 = this.add.text(width / 2 - 100, height / 2 + 80, strings.gameOver.playAgain, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn1.on('pointerup', () => this.scene.start('Play'));

    const btn2 = this.add.text(width / 2 + 100, height / 2 + 80, strings.gameOver.recalibrate, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5',
      backgroundColor: '#8a8d92', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn2.on('pointerup', () => this.scene.start('Calibration'));
  }
}
