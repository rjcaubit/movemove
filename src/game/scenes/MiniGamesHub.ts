import * as Phaser from 'phaser';
import { GAME_CONFIG, isPortrait } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

export class MiniGamesHub extends Phaser.Scene {
  constructor() { super('MiniGamesHub'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor('#7ed4ff');

    if (this.textures.exists('hub_bg')) {
      const tex = this.textures.get('hub_bg').getSourceImage() as HTMLImageElement;
      const scale = width / tex.width; // cover por largura, pinado no topo
      this.add.image(width / 2, 0, 'hub_bg').setOrigin(0.5, 0).setScale(scale).setDepth(-10);
    } else {
      this.add.text(width / 2, 50, strings.miniGames.hubTitle, {
        fontFamily: 'VT323, ui-monospace', fontSize: '36px', color: '#ffae0a',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5);
    }

    const go = (target: string): () => void => () => this.scene.start('BodyCheck', { next: target });
    const cards: Array<[string, string, string, number, () => void]> = [
      [strings.miniGames.runnerTitle,  strings.miniGames.runnerDesc,  '🏃', 0xff453a, () => this.scene.start('Calibration')],
      [strings.miniGames.catchTitle,   strings.miniGames.catchDesc,   '🪰', 0x4cd964, go('CatchBicho')],
      [strings.miniGames.trunkTitle,   strings.miniGames.trunkDesc,   '🌀', 0xbf5af2, go('TrunkTwist')],
      [strings.miniGames.bellTitle,    strings.miniGames.bellDesc,    '🔔', 0xffae0a, go('BellRinger')],
      [strings.miniGames.chickenTitle, strings.miniGames.chickenDesc, '🐔', 0x4cd964, go('ChickenGame')],
      [strings.miniGames.danceTitle,   strings.miniGames.danceDesc,   '💃', 0xff2bd6, go('DanceDance')],
      [strings.miniGames.castorTitle,  strings.miniGames.castorDesc,  '🦫', 0x8b4513, () => this.scene.start('CastorModePicker')],
      [strings.miniGames.birdTitle,    strings.miniGames.birdDesc,    '🐦', 0x4cd964, go('BirdGame')],
    ];
    if (isPortrait()) {
      const cols = 2;
      const cardW = 320;
      const cardH = 260;
      const gapX = 16;
      const gapY = 20;
      const numRows = Math.ceil(cards.length / cols);
      const totalW = cols * cardW + (cols - 1) * gapX;
      const startX = (width - totalW) / 2 + cardW / 2;
      const startY = height - numRows * cardH - (numRows - 1) * gapY - 160 + cardH / 2;
      cards.forEach(([title, desc, icon, color, onClick], i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);
        this.makeCard(x, y, cardW, cardH, title, desc, icon, color, onClick);
      });
    } else {
      const gap = 16;
      const cardH = 200;
      const cardW = Math.min(180, Math.floor((width - 40 - (cards.length - 1) * gap) / cards.length));
      const totalW = cards.length * cardW + (cards.length - 1) * gap;
      const startX = (width - totalW) / 2 + cardW / 2;
      const cardY = height - cardH / 2 - 90;
      cards.forEach(([title, desc, icon, color, onClick], i) => {
        const x = startX + i * (cardW + gap);
        this.makeCard(x, cardY, cardW, cardH, title, desc, icon, color, onClick);
      });
    }

    this.makePill(width / 2, height - 50, `🎯 ${strings.miniGames.guidedSession}`,
      0xffd60a, 0xffffff, '#ffffff',
      () => this.scene.start('GuidedSessionPicker'));

    this.makePill(80, 38, '← ' + strings.miniGames.back,
      0x000000, 0xffffff, '#ffffff',
      () => this.scene.start('Welcome'), 0.55);
  }

  private makeCard(
    x: number, y: number, w: number, h: number,
    title: string, desc: string, icon: string, color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const r = 16;
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, r);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.lineStyle(5, color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    const header = this.add.graphics();
    header.fillStyle(color, 1);
    header.fillRoundedRect(-w / 2, -h / 2, w, 60, { tl: r, tr: r, bl: 0, br: 0 });
    const portrait = isPortrait();
    const iconSize = portrait ? '60px' : '46px';
    const titleSize = portrait ? '26px' : '20px';
    const descSize = portrait ? '16px' : '12px';
    const headerH = portrait ? 78 : 60;
    const titleY = portrait ? -h / 2 + 105 : -h / 2 + 80;
    const descY = portrait ? h / 2 - 64 : h / 2 - 50;
    const iconY = portrait ? -h / 2 + 38 : -h / 2 + 30;
    header.clear();
    header.fillStyle(color, 1);
    header.fillRoundedRect(-w / 2, -h / 2, w, headerH, { tl: r, tr: r, bl: 0, br: 0 });
    const iconEl = this.add.text(0, iconY, icon, { fontSize: iconSize }).setOrigin(0.5);
    const titleEl = this.add.text(0, titleY, title, {
      fontFamily: 'VT323, ui-monospace', fontSize: titleSize, color: '#1a0b2a',
      fontStyle: 'bold', align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5);
    const descEl = this.add.text(0, descY, desc, {
      fontFamily: 'VT323, ui-monospace', fontSize: descSize, color: '#454545',
      align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5);
    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const container = this.add.container(x, y, [shadow, bg, header, iconEl, titleEl, descEl, hit]).setDepth(10);
    hit.on('pointerover', () => container.setScale(1.04));
    hit.on('pointerout',  () => container.setScale(1));
    hit.on('pointerup', onClick);
    return container;
  }

  private makePill(
    x: number, y: number, label: string,
    fill: number, stroke: number, textColor: string,
    onClick: () => void, fillAlpha = 1,
  ): Phaser.GameObjects.Container {
    const portrait = isPortrait();
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'VT323, ui-monospace', fontSize: portrait ? '28px' : '20px', color: textColor,
      fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    const w = txt.width + (portrait ? 56 : 40);
    const h = portrait ? 60 : 44;
    const r = h / 2;
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, r);
    const bg = this.add.graphics();
    bg.fillStyle(fill, fillAlpha);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.lineStyle(3, stroke, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerup', onClick);
    return this.add.container(x, y, [shadow, bg, txt, hit]).setDepth(20);
  }
}
