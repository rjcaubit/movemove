import * as Phaser from 'phaser';
import { GAME_CONFIG, isPortrait } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

type Category = 'cardio' | 'rhythm' | 'aim';

interface HubData {
  category?: Category;
}

interface GameCard {
  title: string;
  desc: string;
  icon: string;
  color: number;
  /** Como entrar no jogo. Cuida do BodyCheck/picker quando necessário. */
  start: (scene: Phaser.Scene) => void;
}

interface CategoryCard {
  id: Category;
  title: string;
  desc: string;
  icon: string;
  color: number;
}

const CATEGORIES: CategoryCard[] = [
  { id: 'cardio', title: strings.miniGames.categoryCardio, desc: strings.miniGames.categoryCardioDesc, icon: '🏃', color: 0xff453a },
  { id: 'rhythm', title: strings.miniGames.categoryRhythm, desc: strings.miniGames.categoryRhythmDesc, icon: '🎵', color: 0xff2bd6 },
  { id: 'aim',    title: strings.miniGames.categoryAim,    desc: strings.miniGames.categoryAimDesc,    icon: '🎯', color: 0x4cd964 },
];

// Helper: rota padrão dos mini-jogos passa pelo BodyCheck pra o usuário se
// posicionar antes (resolve o problema de "começar com pé cortado").
const goCheck = (target: string): (s: Phaser.Scene) => void =>
  (s) => s.scene.start('BodyCheck', { next: target });

const GAMES_BY_CATEGORY: Record<Category, GameCard[]> = {
  cardio: [
    { title: strings.miniGames.runnerTitle, desc: strings.miniGames.runnerDesc, icon: '🏃', color: 0xff453a, start: goCheck('Calibration') },
    { title: strings.miniGames.helicopterTitle, desc: strings.miniGames.helicopterDesc, icon: '🚁', color: 0x4cd964, start: goCheck('HelicopterGame') },
    { title: strings.miniGames.chickenTitle, desc: strings.miniGames.chickenDesc, icon: '🐔', color: 0xffae0a, start: goCheck('ChickenGame') },
  ],
  rhythm: [
    { title: strings.miniGames.bellTitle,  desc: strings.miniGames.bellDesc,  icon: '🔔', color: 0xffae0a, start: goCheck('BellRinger') },
    { title: strings.miniGames.danceTitle, desc: strings.miniGames.danceDesc, icon: '💃', color: 0xff2bd6, start: goCheck('DanceDance') },
  ],
  aim: [
    { title: strings.miniGames.catchTitle,  desc: strings.miniGames.catchDesc,  icon: '🪰', color: 0x4cd964, start: goCheck('CatchBicho') },
    { title: strings.miniGames.castorTitle, desc: strings.miniGames.castorDesc, icon: '🦫', color: 0x8b4513, start: (s) => s.scene.start('CastorModePicker') },
    { title: strings.miniGames.trunkTitle,  desc: strings.miniGames.trunkDesc,  icon: '🌀', color: 0xbf5af2, start: goCheck('TrunkTwist') },
  ],
};

export class MiniGamesHub extends Phaser.Scene {
  private category: Category | null = null;

  constructor() { super('MiniGamesHub'); }

  init(data: HubData): void {
    this.category = data?.category ?? null;
  }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor('#7ed4ff');

    if (this.textures.exists('hub_bg')) {
      const tex = this.textures.get('hub_bg').getSourceImage() as HTMLImageElement;
      const scale = width / tex.width;
      this.add.image(width / 2, 0, 'hub_bg').setOrigin(0.5, 0).setScale(scale).setDepth(-10);
    } else {
      this.add.text(width / 2, 50, strings.miniGames.hubTitle, {
        fontFamily: 'VT323, ui-monospace', fontSize: '36px', color: '#ffae0a',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5);
    }

    if (this.category === null) {
      this.renderCategoryPicker();
    } else {
      this.renderCategoryGames(this.category);
    }

    // GuidedSession sempre acessível (independe de categoria)
    this.makePill(width / 2, height - 50, `🎯 ${strings.miniGames.guidedSession}`,
      0xffd60a, 0xffffff, '#ffffff',
      () => this.scene.start('GuidedSessionPicker'));

    // Botão de voltar — pra Welcome se estamos na home, pra home se em categoria
    this.makePill(80, 38, '← ' + strings.miniGames.back,
      0x000000, 0xffffff, '#ffffff',
      () => {
        if (this.category !== null) this.scene.restart({} as HubData);
        else this.scene.start('Welcome');
      },
      0.55);
  }

  private renderCategoryPicker(): void {
    const { width, height } = GAME_CONFIG;
    const portrait = isPortrait();

    if (portrait) {
      const cardW = 360;
      const cardH = 160;
      const gap = 18;
      const totalH = CATEGORIES.length * cardH + (CATEGORIES.length - 1) * gap;
      const startY = (height - totalH) / 2 - 30;
      CATEGORIES.forEach((cat, i) => {
        this.makeCategoryCard(width / 2, startY + cardH / 2 + i * (cardH + gap), cardW, cardH, cat);
      });
    } else {
      const cardW = 320;
      const cardH = 220;
      const gap = 24;
      const totalW = CATEGORIES.length * cardW + (CATEGORIES.length - 1) * gap;
      const startX = (width - totalW) / 2 + cardW / 2;
      const cardY = height / 2 - 20;
      CATEGORIES.forEach((cat, i) => {
        this.makeCategoryCard(startX + i * (cardW + gap), cardY, cardW, cardH, cat);
      });
    }
  }

  private renderCategoryGames(category: Category): void {
    const { width, height } = GAME_CONFIG;
    const portrait = isPortrait();
    const games = GAMES_BY_CATEGORY[category];
    const catLabel = CATEGORIES.find((c) => c.id === category);
    if (catLabel) {
      this.add.text(width / 2, 110, `${catLabel.icon} ${catLabel.title}`, {
        fontFamily: 'VT323, ui-monospace', fontSize: portrait ? '40px' : '32px',
        color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(5);
    }

    if (portrait) {
      const cols = 2;
      const cardW = 320;
      const cardH = 250;
      const gapX = 16;
      const gapY = 20;
      const numRows = Math.ceil(games.length / cols);
      const totalW = cols * cardW + (cols - 1) * gapX;
      const startX = (width - totalW) / 2 + cardW / 2;
      const startY = height - numRows * cardH - (numRows - 1) * gapY - 160 + cardH / 2;
      games.forEach((g, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);
        this.makeGameCard(x, y, cardW, cardH, g);
      });
    } else {
      const gap = 16;
      const cardH = 220;
      const cardW = Math.min(220, Math.floor((width - 80 - (games.length - 1) * gap) / games.length));
      const totalW = games.length * cardW + (games.length - 1) * gap;
      const startX = (width - totalW) / 2 + cardW / 2;
      const cardY = height / 2 + 40;
      games.forEach((g, i) => {
        this.makeGameCard(startX + i * (cardW + gap), cardY, cardW, cardH, g);
      });
    }
  }

  private makeCategoryCard(
    x: number, y: number, w: number, h: number, cat: CategoryCard,
  ): Phaser.GameObjects.Container {
    const r = 18;
    const portrait = isPortrait();
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, r);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.lineStyle(6, cat.color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    const ribbon = this.add.graphics();
    ribbon.fillStyle(cat.color, 0.92);
    ribbon.fillRoundedRect(-w / 2, -h / 2, w, 16, { tl: r, tr: r, bl: 0, br: 0 });

    const iconSize = portrait ? '78px' : '64px';
    const titleSize = portrait ? '34px' : '32px';
    const descSize = portrait ? '20px' : '18px';
    const iconEl = this.add.text(-w / 2 + (portrait ? 80 : 70), 0, cat.icon, { fontSize: iconSize }).setOrigin(0.5);
    const titleEl = this.add.text(portrait ? -w / 2 + 160 : -w / 2 + 130, -h / 2 + 50, cat.title, {
      fontFamily: 'VT323, ui-monospace', fontSize: titleSize, color: '#1a0b2a',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    const descEl = this.add.text(portrait ? -w / 2 + 160 : -w / 2 + 130, -h / 2 + 95, cat.desc, {
      fontFamily: 'VT323, ui-monospace', fontSize: descSize, color: '#454545',
      wordWrap: { width: w - (portrait ? 180 : 150) },
    }).setOrigin(0, 0);
    const arrow = this.add.text(w / 2 - 30, 0, '›', {
      fontFamily: 'VT323, ui-monospace', fontSize: '56px', color: '#454545', fontStyle: 'bold',
    }).setOrigin(0.5);

    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const container = this.add.container(x, y, [shadow, bg, ribbon, iconEl, titleEl, descEl, arrow, hit]).setDepth(10);
    hit.on('pointerover', () => container.setScale(1.04));
    hit.on('pointerout', () => container.setScale(1));
    hit.on('pointerup', () => this.scene.restart({ category: cat.id } as HubData));
    return container;
  }

  private makeGameCard(
    x: number, y: number, w: number, h: number, g: GameCard,
  ): Phaser.GameObjects.Container {
    const r = 16;
    const portrait = isPortrait();
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, r);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.lineStyle(5, g.color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

    const headerH = portrait ? 78 : 60;
    const header = this.add.graphics();
    header.fillStyle(g.color, 1);
    header.fillRoundedRect(-w / 2, -h / 2, w, headerH, { tl: r, tr: r, bl: 0, br: 0 });

    const iconSize = portrait ? '60px' : '46px';
    const titleSize = portrait ? '26px' : '20px';
    const descSize = portrait ? '16px' : '12px';
    const iconY = portrait ? -h / 2 + 38 : -h / 2 + 30;
    const titleY = portrait ? -h / 2 + 105 : -h / 2 + 80;
    const descY = portrait ? h / 2 - 64 : h / 2 - 50;
    const iconEl = this.add.text(0, iconY, g.icon, { fontSize: iconSize }).setOrigin(0.5);
    const titleEl = this.add.text(0, titleY, g.title, {
      fontFamily: 'VT323, ui-monospace', fontSize: titleSize, color: '#1a0b2a',
      fontStyle: 'bold', align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5);
    const descEl = this.add.text(0, descY, g.desc, {
      fontFamily: 'VT323, ui-monospace', fontSize: descSize, color: '#454545',
      align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5);

    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const container = this.add.container(x, y, [shadow, bg, header, iconEl, titleEl, descEl, hit]).setDepth(10);
    hit.on('pointerover', () => container.setScale(1.04));
    hit.on('pointerout', () => container.setScale(1));
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
