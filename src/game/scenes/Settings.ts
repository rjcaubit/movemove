import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';

interface SettingsData { from?: 'Welcome' | 'Summary' }

const KEYS = {
  music: 'movemove.audio.music',
  sfx: 'movemove.audio.sfx',
  voice: 'movemove.audio.voice',
  narratorEnabled: 'movemove.narrator.enabled',
  captions: 'movemove.narrator.captions',
  age: 'movemove.ageGroup',
};

export class Settings extends Phaser.Scene {
  constructor() { super('Settings'); }

  create(data: SettingsData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0b0d10);

    this.add.text(width / 2, 60, strings.settings.title, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '32px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    let y = 130;
    this.makeSlider(width / 2, y, strings.settings.music, KEYS.music, 40); y += 60;
    this.makeSlider(width / 2, y, strings.settings.sfx, KEYS.sfx, 80); y += 60;
    this.makeSlider(width / 2, y, strings.settings.voice, KEYS.voice, 80); y += 80;

    this.makeToggle(width / 2, y, strings.settings.narratorOn, KEYS.narratorEnabled, true); y += 50;
    this.makeToggle(width / 2, y, strings.settings.captionsOn, KEYS.captions, false); y += 80;

    this.makeAgeRadio(width / 2, y);

    const back = this.add.text(width / 2, height - 60, strings.settings.back, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.setName('btn-back');
    back.on('pointerup', () => this.scene.start(data?.from === 'Summary' ? 'Summary' : 'Welcome'));
  }

  private makeSlider(x: number, y: number, label: string, key: string, defaultVal: number): void {
    const cur = (() => { try { const v = localStorage.getItem(key); return v == null ? defaultVal : Number(v); } catch { return defaultVal; } })();
    this.add.text(x - 200, y, label, { fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5' }).setOrigin(0, 0.5);
    const valueEl = this.add.text(x + 200, y, String(cur), { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#ffd60a' }).setOrigin(1, 0.5);
    const minus = this.add.text(x + 80, y, '−', {
      fontFamily: 'system-ui', fontSize: '24px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 10, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const plus = this.add.text(x + 140, y, '+', {
      fontFamily: 'system-ui', fontSize: '24px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 10, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    let val = cur;
    const apply = (delta: number): void => {
      val = Math.max(0, Math.min(100, val + delta));
      try { localStorage.setItem(key, String(val)); } catch { /* ignore */ }
      valueEl.setText(String(val));
    };
    minus.on('pointerup', () => apply(-10));
    plus.on('pointerup', () => apply(10));
  }

  private makeToggle(x: number, y: number, label: string, key: string, defaultVal: boolean): void {
    const cur = (() => { try { const v = localStorage.getItem(key); return v == null ? defaultVal : v === 'true'; } catch { return defaultVal; } })();
    this.add.text(x - 200, y, label, { fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5' }).setOrigin(0, 0.5);
    let val = cur;
    const btn = this.add.text(x + 100, y, val ? 'ON' : 'OFF', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#0b0d10',
      backgroundColor: val ? '#4cd964' : '#8a8d92', padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => {
      val = !val;
      btn.setText(val ? 'ON' : 'OFF').setBackgroundColor(val ? '#4cd964' : '#8a8d92');
      try { localStorage.setItem(key, String(val)); } catch { /* ignore */ }
    });
  }

  private makeAgeRadio(x: number, y: number): void {
    const cur = (() => { try { return localStorage.getItem(KEYS.age) ?? '8-10'; } catch { return '8-10'; } })();
    this.add.text(x - 200, y, strings.settings.age, { fontFamily: 'system-ui', fontSize: '16px', color: '#f5f5f5' }).setOrigin(0, 0.5);
    const opts = [
      { v: '5-7', label: strings.settings.age_5_7 },
      { v: '8-10', label: strings.settings.age_8_10 },
      { v: '11-12', label: strings.settings.age_11_12 },
    ];
    const buttons: Phaser.GameObjects.Text[] = [];
    opts.forEach((o, i) => {
      const bx = x + 50 + i * 100;
      const isCur = cur === o.v;
      const b = this.add.text(bx, y, o.label, {
        fontFamily: 'system-ui', fontSize: '12px', color: isCur ? '#0b0d10' : '#f5f5f5',
        backgroundColor: isCur ? '#4cd964' : '#8a8d92', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      buttons.push(b);
      b.on('pointerup', () => {
        try { localStorage.setItem(KEYS.age, o.v); } catch { /* ignore */ }
        opts.forEach((oo, ii) => {
          const isNow = oo.v === o.v;
          buttons[ii].setColor(isNow ? '#0b0d10' : '#f5f5f5').setBackgroundColor(isNow ? '#4cd964' : '#8a8d92');
        });
      });
    });
  }
}
