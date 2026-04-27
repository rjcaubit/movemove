import * as Phaser from 'phaser';
import { strings } from '../../i18n/strings.ts';

export class HUD {
  private distEl: Phaser.GameObjects.Text;
  private coinsEl: Phaser.GameObjects.Text;
  private fpsEl: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    const baseStyle = { fontFamily: 'ui-monospace, Menlo, monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 } as const;
    this.distEl = scene.add.text(20, 20, '0 m', { ...baseStyle, fontSize: '28px', color: '#f5f5f5' }).setDepth(100);
    this.coinsEl = scene.add.text(20, 60, `0 ${strings.play.coins}`, { ...baseStyle, fontSize: '20px', color: '#ffd60a' }).setDepth(100);
    if (new URLSearchParams(window.location.search).get('fps') === '1') {
      this.fpsEl = scene.add.text(20, 92, '0 FPS', { ...baseStyle, fontSize: '14px', color: '#8a8d92' }).setDepth(100);
    }
  }

  setDistance(m: number): void { this.distEl.setText(`${Math.floor(m)} ${strings.play.distance}`); }
  setCoins(n: number): void { this.coinsEl.setText(`${n} ${strings.play.coins}`); }
  setFps(fps: number): void { if (this.fpsEl) this.fpsEl.setText(`${Math.round(fps)} FPS`); }
}
