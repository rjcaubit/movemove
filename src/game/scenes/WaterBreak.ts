import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class WaterBreak extends Phaser.Scene {
  private startedAtMs = 0;
  private countdownEl!: Phaser.GameObjects.Text;
  private dismissEl!: Phaser.GameObjects.Text;
  private dismissEnabled = false;

  constructor() { super('WaterBreak'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x000000);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setDepth(0);

    this.add.text(width / 2, 100, '💧', { fontSize: '120px' }).setOrigin(0.5);
    this.add.text(width / 2, 240, strings.play.waterBreak, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '36px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.countdownEl = this.add.text(width / 2, 320, '30', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '72px', color: '#0a84ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.dismissEl = this.add.text(width / 2, height - 80, strings.play.waterDismiss, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#8a8d92', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dismissEl.setName('btn-dismiss');
    this.dismissEl.on('pointerup', () => {
      if (!this.dismissEnabled) return;
      this.scene.stop().resume('Play');
    });

    if (this.cache.audio.exists('snd_water_break')) this.sound.play('snd_water_break');
    this.startedAtMs = performance.now();
  }

  update(): void {
    const elapsed = (performance.now() - this.startedAtMs) / 1000;
    const remaining = Math.max(0, 30 - Math.floor(elapsed));
    this.countdownEl.setText(String(remaining));
    if (elapsed >= 10 && !this.dismissEnabled) {
      this.dismissEnabled = true;
      this.dismissEl.setBackgroundColor('#4cd964').setColor('#0b0d10');
    }
    if (remaining === 0) {
      this.scene.stop().resume('Play');
    }
  }
}
