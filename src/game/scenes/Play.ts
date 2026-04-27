import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

/** Placeholder Fase A — Fase C substitui por gameplay completo. */
export class Play extends Phaser.Scene {
  constructor() { super('Play'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x1a2030);
    this.add.text(width / 2, height / 2, 'PLAY (placeholder)', {
      fontFamily: 'system-ui', fontSize: '36px', color: '#f5f5f5',
    }).setOrigin(0.5);
    this.input.on('pointerup', () => this.scene.start('GameOver', { distance: 0, coins: 0 }));
  }
}
