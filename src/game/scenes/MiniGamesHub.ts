import * as Phaser from 'phaser';
import { GAME_CONFIG, isPortrait } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface GameCard {
  title: string;
  desc: string;
  icon: string;
  color: number;
  accentColor: number;
  start: (scene: Phaser.Scene) => void;
}

const goCheck = (target: string): (s: Phaser.Scene) => void =>
  (s) => s.scene.start('BodyCheck', { next: target });

const GAMES: GameCard[] = [
  {
    title: 'Mata-Mosca',
    desc: 'Bata palmas sobre as moscas antes que fujam!',
    icon: '🪰',
    color: 0x1a8c28,
    accentColor: 0x4cd964,
    start: goCheck('CatchBicho'),
  },
  {
    title: 'Dino Pula-Pula',
    desc: 'Pule para desviar dos cactos que vêm vindo!',
    icon: '🦖',
    color: 0xb34f00,
    accentColor: 0xff7b00,
    start: goCheck('DinoGame'),
  },
];

export class MiniGamesHub extends Phaser.Scene {
  constructor() { super('MiniGamesHub'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    const portrait = isPortrait();
    this.cameras.main.setBackgroundColor('#0d0b1e');

    // Background gradient
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(0x0d0b1e, 0x0d0b1e, 0x1a1040, 0x1a1040, 1);
    bg.fillRect(0, 0, width, height);

    // Stars
    const stars = this.add.graphics().setDepth(-9);
    stars.fillStyle(0xffffff, 1);
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height * 0.7;
      const sr = 0.5 + Math.random() * 1.5;
      stars.fillCircle(sx, sy, sr);
    }

    // Title
    this.add.text(width / 2, portrait ? 70 : 55, '🎮 Mini-Jogos', {
      fontFamily: 'VT323, ui-monospace',
      fontSize: portrait ? '56px' : '48px',
      color: '#ffd60a',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, portrait ? 120 : 95, 'Escolha seu jogo e mexa o corpo!', {
      fontFamily: 'VT323, ui-monospace',
      fontSize: portrait ? '26px' : '22px',
      color: '#aaaacc',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // Cards
    if (portrait) {
      const cardW = width - 60;
      const cardH = Math.floor((height - 260) / 2) - 16;
      const startY = 160;
      const gap = 16;
      GAMES.forEach((g, i) => {
        this.makeCard(width / 2, startY + i * (cardH + gap) + cardH / 2, cardW, cardH, g);
      });
    } else {
      const cardW = Math.floor((width - 100) / 2) - 12;
      const cardH = height - 180;
      const startX = (width - (cardW * 2 + 24)) / 2 + cardW / 2;
      GAMES.forEach((g, i) => {
        this.makeCard(startX + i * (cardW + 24), height / 2 + 20, cardW, cardH, g);
      });
    }

    // Back button
    this.makePill(portrait ? 80 : 72, 38, '← ' + strings.miniGames.back,
      0x000000, 0xffffff, '#ffffff',
      () => this.scene.start('Welcome'), 0.55);
  }

  private makeCard(
    x: number, y: number, w: number, h: number, g: GameCard,
  ): Phaser.GameObjects.Container {
    const portrait = isPortrait();
    const r = 20;

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.6);
    shadow.fillRoundedRect(-w / 2 + 5, -h / 2 + 7, w, h, r);

    // Background card
    const bg = this.add.graphics();
    bg.fillStyle(0x12102a, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.lineStyle(4, g.accentColor, 0.85);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

    // Color header band
    const headerH = portrait ? Math.floor(h * 0.45) : Math.floor(h * 0.5);
    const header = this.add.graphics();
    header.fillStyle(g.color, 1);
    header.fillRoundedRect(-w / 2, -h / 2, w, headerH, { tl: r, tr: r, bl: 0, br: 0 });
    // Subtle accent at bottom of header
    header.fillStyle(g.accentColor, 0.3);
    header.fillRect(-w / 2, -h / 2 + headerH - 6, w, 6);

    // Icon
    const iconSize = portrait ? Math.min(110, Math.floor(headerH * 0.75)) : Math.min(100, Math.floor(headerH * 0.65));
    const iconEl = this.add.text(0, -h / 2 + headerH / 2, g.icon, {
      fontSize: `${iconSize}px`,
    }).setOrigin(0.5);

    // Title
    const titleFontSize = portrait ? 38 : 34;
    const titleEl = this.add.text(0, -h / 2 + headerH + (portrait ? 30 : 26), g.title, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: `${titleFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: w - 32 },
    }).setOrigin(0.5);

    // Desc
    const descFontSize = portrait ? 22 : 20;
    const descEl = this.add.text(0, h / 2 - (portrait ? 52 : 44), g.desc, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: `${descFontSize}px`,
      color: '#aaaacc',
      align: 'center',
      wordWrap: { width: w - 40 },
    }).setOrigin(0.5);

    // Play button pill
    const btnY = h / 2 - (portrait ? 20 : 16);
    const btnW = portrait ? 200 : 180;
    const btnH = portrait ? 46 : 40;
    const btnR = btnH / 2;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(g.accentColor, 1);
    btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, btnR);
    const btnTxt = this.add.text(0, btnY, 'JOGAR ▶', {
      fontFamily: 'VT323, ui-monospace',
      fontSize: portrait ? '26px' : '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const container = this.add.container(x, y, [shadow, bg, header, iconEl, titleEl, descEl, btnBg, btnTxt, hit]).setDepth(10);

    hit.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 120, ease: 'Quad.easeOut' });
    });
    hit.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Quad.easeOut' });
    });
    hit.on('pointerup', () => g.start(this));
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
