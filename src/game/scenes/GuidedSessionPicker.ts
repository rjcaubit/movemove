import * as Phaser from 'phaser';
import { GAME_CONFIG, isPortrait } from '../config.ts';
import { addBackButton } from '../ui/backButton.ts';
import { addTitleBanner } from '../ui/hudStyle.ts';

interface DurationOption {
  label: string;
  totalMs: number;
  hint: string;
  color: number;
}

const OPTIONS: DurationOption[] = [
  { label: '5 min',  totalMs: 5 * 60 * 1000,  hint: 'Rapidinho — exercícios mais curtos', color: 0x4cd964 },
  { label: '7 min',  totalMs: 7 * 60 * 1000,  hint: 'Padrão — 9 exercícios completos',     color: 0xffd60a },
  { label: '10 min', totalMs: 10 * 60 * 1000, hint: 'Mais longo — repete alguns',          color: 0xff9f0a },
  { label: '15 min', totalMs: 15 * 60 * 1000, hint: 'Treino completo — 2 voltas',          color: 0xff453a },
];

export class GuidedSessionPicker extends Phaser.Scene {
  constructor() { super('GuidedSessionPicker'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a1220);

    addTitleBanner(this, width / 2, 60, 'Quanto tempo você tem?', 0x4cd964, 0xffffff);

    this.add.text(width / 2, 130, 'Escolha a duração da sessão guiada', {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#bcbcbc',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    if (isPortrait()) {
      // 2 colunas × 2 linhas em retrato
      const cols = 2;
      const cardW = 300;
      const cardH = 200;
      const gapX = 24;
      const gapY = 24;
      const totalW = cols * cardW + (cols - 1) * gapX;
      const startX = (width - totalW) / 2 + cardW / 2;
      const startY = height / 2 - cardH / 2 - gapY / 2;
      OPTIONS.forEach((opt, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);
        this.makeCard(x, y, cardW, cardH, opt);
      });
    } else {
      const cardW = 240;
      const cardH = 180;
      const gap = 20;
      const totalW = OPTIONS.length * cardW + (OPTIONS.length - 1) * gap;
      const startX = (width - totalW) / 2 + cardW / 2;
      const cardY = height / 2 + 20;
      OPTIONS.forEach((opt, i) => {
        const x = startX + i * (cardW + gap);
        this.makeCard(x, cardY, cardW, cardH, opt);
      });
    }

    addBackButton(this, 'MiniGamesHub');
  }

  private makeCard(x: number, y: number, w: number, h: number, opt: DurationOption): void {
    const portrait = isPortrait();
    const r = 16;
    const headerH = portrait ? 84 : 70;
    const labelSize = portrait ? '48px' : '40px';
    const hintSize = portrait ? '16px' : '13px';
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, r);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.lineStyle(5, opt.color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    const header = this.add.graphics();
    header.fillStyle(opt.color, 1);
    header.fillRoundedRect(-w / 2, -h / 2, w, headerH, { tl: r, tr: r, bl: 0, br: 0 });
    const labelEl = this.add.text(0, -h / 2 + headerH / 2, opt.label, {
      fontFamily: 'VT323, ui-monospace', fontSize: labelSize, color: '#ffffff',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);
    const hintEl = this.add.text(0, h / 2 - 56, opt.hint, {
      fontFamily: 'VT323, ui-monospace', fontSize: hintSize, color: '#454545',
      align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5);
    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const container = this.add.container(x, y, [shadow, bg, header, labelEl, hintEl, hit]).setDepth(10);
    hit.on('pointerover', () => container.setScale(1.05));
    hit.on('pointerout',  () => container.setScale(1));
    hit.on('pointerup', () => {
      this.scene.start('BodyCheck', {
        next: 'GuidedSession',
        nextData: { totalMs: opt.totalMs },
      });
    });
  }
}
