import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { sparklineSvg } from '../ui/sparkline.ts';
import { getRefs } from '../orchestrator.ts';

interface SummaryData {
  distance: number; coins: number; jacks: number; armsUp: number;
  jumps: number; ducks: number; durationS: number; bpmAvg: number;
  bpmTrack: number[];
}

export class Summary extends Phaser.Scene {
  private htmlOverlay: HTMLDivElement | null = null;

  constructor() { super('Summary'); }

  async create(data: SummaryData): Promise<void> {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x111418);

    this.add.text(width / 2, 40, strings.summary.title, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '36px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);

    const grid = [
      [strings.summary.distance, `${Math.floor(data.distance)} m`],
      [strings.summary.coins, String(data.coins)],
      [strings.summary.jacks, String(data.jacks)],
      [strings.summary.jumps, String(data.jumps)],
      [strings.summary.ducks, String(data.ducks)],
      [strings.summary.cardioTime, `${Math.round(data.durationS)} s`],
      [strings.summary.bpmAvg, `${Math.round(data.bpmAvg)}`],
    ];
    grid.forEach(([k, v], i) => {
      const x = (i % 4) * 220 + 80;
      const y = 110 + Math.floor(i / 4) * 60;
      this.add.text(x, y, k, { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '13px', color: '#8a8d92' }).setOrigin(0);
      this.add.text(x, y + 18, v, { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '22px', color: '#f5f5f5', fontStyle: 'bold' }).setOrigin(0);
    });

    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;left:50%;bottom:200px;transform:translateX(-50%);background:rgba(0,0,0,0.5);padding:8px;border-radius:8px;z-index:150;';
    ov.innerHTML = `<div style="color:#8a8d92;font:12px ui-monospace;margin-bottom:4px;">${strings.summary.bpmTrack}</div>${sparklineSvg(data.bpmTrack, 360, 60, '#ffd60a')}`;
    document.body.appendChild(ov);
    this.htmlOverlay = ov;

    const refs = getRefs(this);
    const missions = await refs.missions.getActive();
    const yMission = height - 200;
    this.add.text(width / 2, yMission, strings.summary.missions, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(0.5);
    missions.forEach((m, i) => {
      const x = (i + 0.5) * (width / 3);
      const status = m.inst.completed ? '✅' : `${Math.floor(m.inst.progress)}/${m.inst.target}`;
      this.add.text(x, yMission + 30, m.def.title, {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#f5f5f5', align: 'center',
      }).setOrigin(0.5);
      this.add.text(x, yMission + 50, status, {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '16px',
        color: m.inst.completed ? '#4cd964' : '#ffd60a', fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5);
    });

    const btn = (x: number, label: string, onClick: () => void): void => {
      const t = this.add.text(x, height - 50, label, {
        fontFamily: 'system-ui', fontSize: '20px', color: '#0b0d10',
        backgroundColor: '#4cd964', padding: { x: 18, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', () => { this.cleanup(); onClick(); });
    };
    btn(width / 2 - 200, strings.gameOver.playAgain, () => this.scene.start('Play', { skipPrep: false }));
    btn(width / 2, strings.gameOver.recalibrate, () => this.scene.start('Calibration'));
    btn(width / 2 + 200, strings.summary.settings, () => this.scene.start('Settings', { from: 'Summary', data }));
  }

  private cleanup(): void {
    if (this.htmlOverlay) { this.htmlOverlay.remove(); this.htmlOverlay = null; }
  }

  shutdown(): void { this.cleanup(); }
}
