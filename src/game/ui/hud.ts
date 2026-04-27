import * as Phaser from 'phaser';
import { strings } from '../../i18n/strings.ts';
import { GAME_CONFIG } from '../config.ts';

const MAX_LIVES = 3;
const VT    = { fontFamily: 'VT323, ui-monospace', stroke: '#000', strokeThickness: 3 } as const;
const PANEL = { fillColor: 0x000000, fillAlpha: 0.55 } as const;

export class HUD {
  private distEl:  Phaser.GameObjects.Text;
  private coinsEl: Phaser.GameObjects.Text;
  private livesEl: Phaser.GameObjects.Text;
  private bpmEl:   Phaser.GameObjects.Text;
  private fpsEl:   Phaser.GameObjects.Text | null = null;
  private scene:   Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const W   = GAME_CONFIG.width;
    const H   = GAME_CONFIG.height;
    const pad = 10;

    const mkPanel = (x: number, y: number, w: number, h: number) =>
      scene.add.rectangle(x, y, w, h, PANEL.fillColor, PANEL.fillAlpha)
        .setOrigin(0, 0).setDepth(99);

    // Topo esquerdo — distância
    mkPanel(pad, pad, 160, 42);
    this.distEl = scene.add.text(pad + 8, pad + 6, '0 m',
      { ...VT, fontSize: '28px', color: '#ffffff' }).setDepth(100);

    // Topo direito — coins
    mkPanel(W - 140 - pad, pad, 140, 42);
    this.coinsEl = scene.add.text(W - 136, pad + 6, `0 ${strings.play.coins}`,
      { ...VT, fontSize: '26px', color: '#ffd60a' }).setDepth(100).setOrigin(0, 0);

    // Base esquerda — BPM
    mkPanel(pad, H - 52 - pad, 130, 42);
    this.bpmEl = scene.add.text(pad + 8, H - 50,
      '— BPM', { ...VT, fontSize: '24px', color: '#ff6688' }).setDepth(100);

    // Base direita — vidas
    mkPanel(W - 140 - pad, H - 52 - pad, 140, 42);
    this.livesEl = scene.add.text(W - 136, H - 50,
      '❤️❤️❤️', { fontSize: '24px' }).setDepth(100).setOrigin(0, 0);

    if (new URLSearchParams(window.location.search).get('fps') === '1') {
      this.fpsEl = scene.add.text(W / 2, pad + 6, '0 FPS',
        { ...VT, fontSize: '18px', color: '#8a8d92' }).setOrigin(0.5, 0).setDepth(100);
    }
  }

  setDistance(m: number): void { this.distEl.setText(`${Math.floor(m)} ${strings.play.distance}`); }
  setCoins(n: number):    void { this.coinsEl.setText(`${n} ${strings.play.coins}`); }
  setFps(fps: number):    void { if (this.fpsEl) this.fpsEl.setText(`${Math.round(fps)} FPS`); }
  setBpm(bpm: number):    void { this.bpmEl.setText(`${Math.round(bpm)} BPM`); }

  setLives(n: number): void {
    const full  = '❤️'.repeat(Math.max(0, n));
    const empty = '🖤'.repeat(Math.max(0, MAX_LIVES - n));
    this.livesEl.setText(full + empty);
    if (n < MAX_LIVES) {
      this.scene.tweens.add({
        targets: this.livesEl, scale: { from: 1.4, to: 1 },
        duration: 300, ease: 'Cubic.easeOut',
      });
    }
  }
}
