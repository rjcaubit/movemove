import * as Phaser from 'phaser';
import { GAME_CONFIG, isPortrait } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class Welcome extends Phaser.Scene {
  constructor() { super('Welcome'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor('#1a82c4');

    if (this.textures.exists('welcome_bg')) {
      const tex = this.textures.get('welcome_bg').getSourceImage() as HTMLImageElement;
      const scale = isPortrait()
        ? Math.max(width / tex.width, height / tex.height) // cover em retrato
        : width / tex.width;
      this.add.image(width / 2, 0, 'welcome_bg').setOrigin(0.5, 0).setScale(scale).setDepth(-10);
    } else {
      // Fallback se o asset não carregou
      this.add.text(width / 2, height / 2 - 100, 'MOVEMOVE', {
        fontFamily: 'VT323, ui-monospace', fontSize: '64px', color: '#ff8c1a', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5);
    }

    // Faixa inferior pra alojar os botões reais sobre uma base sólida
    if (isPortrait()) {
      const barH = 200;
      const bar = this.add.graphics().setDepth(1);
      bar.fillStyle(0x000000, 0.6);
      bar.fillRect(0, height - barH, width, barH);
      this.makeButton(width / 2, height - barH + 60, 380, 86,
        strings.welcome.cta, 0xffae0a, 0xffffff, '#ffffff',
        () => this.scene.start('Loading', { next: 'MiniGamesHub' }));
      this.makeButton(width / 2, height - 50, 280, 64,
        strings.welcome.settings, 0x6a6a6a, 0x2a2a2a, '#ffffff',
        () => this.scene.start('Settings', { from: 'Welcome' }));
    } else {
      const barH = 110;
      const bar = this.add.graphics().setDepth(1);
      bar.fillStyle(0x000000, 0.55);
      bar.fillRect(0, height - barH, width, barH);
      this.makeButton(width / 2 - 200, height - barH / 2, 280, 70,
        strings.welcome.settings, 0x6a6a6a, 0x2a2a2a, '#ffffff',
        () => this.scene.start('Settings', { from: 'Welcome' }));
      this.makeButton(width / 2 + 130, height - barH / 2, 320, 78,
        strings.welcome.cta, 0xffae0a, 0xffffff, '#ffffff',
        () => this.scene.start('Loading', { next: 'MiniGamesHub' }));
    }
  }

  private makeButton(
    x: number, y: number, w: number, h: number,
    label: string, fill: number, stroke: number, textColor: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const r = 14;
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, r);
    const bg = this.add.graphics();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.lineStyle(5, stroke, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    const ribbon = this.add.graphics();
    ribbon.fillStyle(0xffffff, 0.22);
    ribbon.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.32, 8);
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'VT323, ui-monospace', fontSize: `${Math.round(h * 0.55)}px`,
      color: textColor, fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerup', onClick);
    hit.on('pointerover', () => container.setScale(1.04));
    hit.on('pointerout',  () => container.setScale(1));
    const container = this.add.container(x, y, [shadow, bg, ribbon, txt, hit]).setDepth(10);
    return container;
  }
}
