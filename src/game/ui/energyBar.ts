import * as Phaser from 'phaser';
import type { CadenceIntensity } from '../../pose/types.ts';

const COLOR_BY_TIER: Record<CadenceIntensity, number> = {
  none: 0x8a8d92,
  walking: 0x0a84ff,
  jogging: 0x4cd964,
  running: 0xff9f0a,
};

export class EnergyBar {
  private fill: Phaser.GameObjects.Rectangle;
  private bpmEl: Phaser.GameObjects.Text;
  private readonly maxWidth = 200;

  constructor(scene: Phaser.Scene) {
    const x = scene.scale.width - 220;
    const y = 20;
    scene.add.rectangle(x, y, this.maxWidth, 16, 0x0b0d10, 0.6).setOrigin(0, 0).setDepth(100);
    this.fill = scene.add.rectangle(x, y, this.maxWidth, 16, 0x4cd964, 1).setOrigin(0, 0).setDepth(101);
    scene.add.text(x, y - 18, 'ENERGIA', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px', color: '#f5f5f5',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(101);
    this.bpmEl = scene.add.text(x + this.maxWidth + 8, y, '0 BPM', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#ffd60a',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(101);
  }

  update(value: number, intensity: CadenceIntensity, bpm: number): void {
    this.fill.setSize(Math.max(0, this.maxWidth * (value / 100)), 16);
    this.fill.setFillStyle(COLOR_BY_TIER[intensity]);
    this.bpmEl.setText(`${Math.round(bpm)} BPM`);
  }
}
