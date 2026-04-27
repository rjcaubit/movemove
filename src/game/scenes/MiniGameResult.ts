import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface ResultData {
  gameKey: string;
  score: number;
  scoreLabel: string;
  extra?: Record<string, number>;
  session?: string[];
}

export class MiniGameResult extends Phaser.Scene {
  constructor() { super('MiniGameResult'); }

  create(data: ResultData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x111418);

    this.add.text(width / 2, 60, strings.miniGames.result, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '32px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 130, data.scoreLabel, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '16px', color: '#8a8d92',
    }).setOrigin(0.5);
    this.add.text(width / 2, 170, String(data.score), {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '64px', color: '#f5f5f5', fontStyle: 'bold',
    }).setOrigin(0.5);

    let y = 260;
    if (data.extra) {
      for (const [k, v] of Object.entries(data.extra)) {
        this.add.text(width / 2, y, `${k}: ${v}`, {
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '18px', color: '#ffd60a',
        }).setOrigin(0.5);
        y += 30;
      }
    }

    const session = data.session ?? [];
    const idx = session.indexOf(data.gameKey);
    const next = (idx >= 0 && idx < session.length - 1) ? session[idx + 1] : null;

    if (next) {
      this.add.text(width / 2, height - 130, `${strings.miniGames.next}: ${next}`, {
        fontFamily: 'system-ui', fontSize: '16px', color: '#8a8d92',
      }).setOrigin(0.5);
      this.time.delayedCall(3000, () => this.scene.start(next, { session }));
      return;
    }

    const btn = (x: number, label: string, onClick: () => void): void => {
      const t = this.add.text(x, height - 60, label, {
        fontFamily: 'system-ui', fontSize: '18px', color: '#0b0d10',
        backgroundColor: '#4cd964', padding: { x: 18, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', onClick);
    };
    btn(width / 2 - 130, strings.miniGames.playAgain, () => this.scene.start(data.gameKey));
    btn(width / 2 + 130, strings.miniGames.hubBack, () => this.scene.start('MiniGamesHub'));
  }
}
