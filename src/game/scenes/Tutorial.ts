import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface Slide { title: string; hint: string; icon: string }

export class Tutorial extends Phaser.Scene {
  private slides: Slide[] = [];
  private idx = 0;
  private titleEl!: Phaser.GameObjects.Text;
  private hintEl!: Phaser.GameObjects.Text;
  private iconEl!: Phaser.GameObjects.Image;
  private nextBtn!: Phaser.GameObjects.Text;

  constructor() { super('Tutorial'); }

  create(): void {
    this.slides = [
      { title: strings.tutorial.slide1Title, hint: strings.tutorial.slide1Hint, icon: 'player_jump' },
      { title: strings.tutorial.slide2Title, hint: strings.tutorial.slide2Hint, icon: 'player_duck' },
      { title: strings.tutorial.slide3Title, hint: strings.tutorial.slide3Hint, icon: 'player_idle' },
    ];
    this.idx = 0;
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);

    this.iconEl = this.add.image(width / 2, height / 2 - 80, 'player_jump').setScale(5);
    this.titleEl = this.add.text(width / 2, height / 2 + 30, '', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '36px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.hintEl = this.add.text(width / 2, height / 2 + 80, '', {
      fontFamily: 'system-ui', fontSize: '18px', color: '#f5f5f5',
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5);

    const skip = this.add.text(width - 24, 24, strings.tutorial.skip, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#8a8d92',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 12, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    skip.setName('btn-skip');
    skip.on('pointerup', () => this.finish());

    this.nextBtn = this.add.text(width / 2, height - 70, strings.tutorial.next, {
      fontFamily: 'system-ui', fontSize: '22px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.nextBtn.setName('btn-next');
    this.nextBtn.on('pointerup', () => this.advance());

    this.render();
  }

  private render(): void {
    const s = this.slides[this.idx];
    this.iconEl.setTexture(s.icon);
    this.titleEl.setText(s.title);
    this.hintEl.setText(s.hint);
    this.nextBtn.setText(this.idx === this.slides.length - 1 ? strings.tutorial.start : strings.tutorial.next);
  }

  private advance(): void {
    if (this.idx < this.slides.length - 1) { this.idx += 1; this.render(); }
    else this.finish();
  }

  private finish(): void {
    try { localStorage.setItem(GAME_CONFIG.storageKeys.tutorialDone, 'true'); } catch {/* ignore */}
    this.scene.start('Calibration');
  }
}
