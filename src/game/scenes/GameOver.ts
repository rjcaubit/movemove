import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface GameOverData { distance: number; coins: number }

export class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: GameOverData): void {
    const { width, height } = GAME_CONFIG;
    const distance = Math.floor(data?.distance ?? 0);
    const coins = data?.coins ?? 0;
    const best = (() => { try { return Number(localStorage.getItem(GAME_CONFIG.storageKeys.bestDistance) ?? 0); } catch { return 0; } })();
    const isNewRecord = distance > best;
    if (isNewRecord) {
      try { localStorage.setItem(GAME_CONFIG.storageKeys.bestDistance, String(distance)); } catch {/* ignore */}
    }

    this.cameras.main.setBackgroundColor(0x1a0d10);

    this.add.text(width / 2, 80, strings.gameOver.title, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '56px', color: '#ff453a', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 200, strings.gameOver.distance, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '18px', color: '#8a8d92',
    }).setOrigin(0.5);
    this.add.text(width / 2, 240, `${distance} ${strings.play.distance}`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '40px', color: '#f5f5f5', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 300, strings.gameOver.coins, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '18px', color: '#8a8d92',
    }).setOrigin(0.5);
    this.add.text(width / 2, 330, String(coins), {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '32px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (isNewRecord) {
      this.add.text(width / 2, 380, strings.gameOver.newRecord, {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', color: '#4cd964', fontStyle: 'bold',
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, 380, `${strings.gameOver.best}: ${best} ${strings.play.distance}`, {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '18px', color: '#8a8d92',
      }).setOrigin(0.5);
    }

    const btn1 = this.add.text(width / 2 - 110, height - 70, strings.gameOver.playAgain, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn1.setName('btn-play-again');
    btn1.on('pointerup', () => this.scene.start('Play'));

    const btn2 = this.add.text(width / 2 + 110, height - 70, strings.gameOver.recalibrate, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f5f5f5',
      backgroundColor: '#8a8d92', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn2.setName('btn-recalibrate');
    btn2.on('pointerup', () => this.scene.start('Calibration'));
  }
}
