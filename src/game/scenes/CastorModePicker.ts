import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { addBackButton } from '../ui/backButton.ts';
import { addThemedFrame } from '../ui/hudStyle.ts';

interface PickerData {
  session?: string[];
}

export class CastorModePicker extends Phaser.Scene {
  constructor() { super('CastorModePicker'); }

  create(data: PickerData): void {
    const { width, height } = GAME_CONFIG;
    const session = data?.session ?? [];
    this.cameras.main.setBackgroundColor(0x0d1400);

    addThemedFrame(this, 'castor');

    this.add.text(width / 2, height * 0.18, '🦫', { fontSize: '80px' }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, height * 0.34, strings.miniGames.castorModeTitle, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: '44px',
      color: '#fff8d8',
      stroke: '#3d1800',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    this.makeBtn(
      width / 2 - width * 0.22, height * 0.56,
      strings.miniGames.castor1p, 0x8b4513,
      () => this.scene.start('BodyCheck', { next: 'CastorGame', nextData: { mode: '1p', session } }),
    );
    this.makeBtn(
      width / 2 + width * 0.22, height * 0.56,
      strings.miniGames.castor2p, 0x1a5276,
      () => this.scene.start('BodyCheck', { next: 'CastorGame', nextData: { mode: '2p', session }, numPlayers: 2 }),
    );

    addBackButton(this);
  }

  private makeBtn(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 240, 95, color, 1)
      .setStrokeStyle(3, 0xffffff, 1)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => bg.setFillStyle(color, 0.65))
      .on('pointerout', () => bg.setFillStyle(color, 1));
    this.add.text(x, y, label, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: '36px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);
  }
}
