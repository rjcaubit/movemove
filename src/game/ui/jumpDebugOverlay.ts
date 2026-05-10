import * as Phaser from 'phaser';
import { KP, type PoseFrame } from '../../pose/types.ts';

/**
 * Overlay diagnóstico das 7 estratégias de detecção de pulo.
 * Calibragem local de 60 frames (não toca no baseline global do EventDetector).
 * Use pra comparar contra o detector de produção: se as caixas piscam mas
 * o J real não, o problema está no EventDetector (baseline stale, falta de
 * ingest, etc).
 */

type StratId = 'shoulder' | 'shoulder_lo' | 'shoulder_nosc' | 'hip' | 'nose' | 'ankle' | 'velocity';

interface Sample {
  nose: number; shoulder: number; hip: number; ankle: number; t: number;
}
interface Ctx {
  baseline: Sample;
  prev: Sample | null;
  recent: Sample[];
}
interface Strategy {
  id: StratId;
  short: string;
  test: (s: Sample, h: Ctx) => boolean;
}
interface RowGfx {
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}
interface RowState { flashMs: number; lastFire: number }

const COOLDOWN_MS = 400;
const FLASH_MS = 350;

export class JumpDebugOverlay {
  private rows: Map<StratId, RowGfx> = new Map();
  private state: Map<StratId, RowState> = new Map();
  private samples: Sample[] = [];
  private baseline: Sample | null = null;
  private history: Sample[] = [];
  private prev: Sample | null = null;
  private strategies: Strategy[];
  private statusText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, private x: number, private y: number) {
    this.strategies = this.buildStrategies();
    this.statusText = scene.add.text(x, y, 'CALIB…', {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#ffd60a',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(50);
    this.buildRows();
  }

  ingestFrame(frame: PoseFrame): void {
    const s = sampleFromFrame(frame);
    if (!s) {
      this.statusText.setText('NO POSE').setColor('#ff6b6b');
      return;
    }
    if (!this.baseline) {
      this.samples.push(s);
      const pct = Math.round((this.samples.length / 60) * 100);
      this.statusText.setText(`CALIB ${pct}%`).setColor('#ffd60a');
      if (this.samples.length >= 60) {
        this.baseline = meanSample(this.samples);
        this.statusText.setText('OK').setColor('#4cd964');
      }
      return;
    }
    this.history.push(s);
    const cutoff = s.t - 260;
    while (this.history.length > 0 && this.history[0].t < cutoff) this.history.shift();
    const ctx: Ctx = { baseline: this.baseline, prev: this.prev, recent: this.history };
    for (const strat of this.strategies) {
      const st = this.state.get(strat.id)!;
      const fired = strat.test(s, ctx);
      if (fired && s.t - st.lastFire > COOLDOWN_MS) {
        st.lastFire = s.t;
        st.flashMs = FLASH_MS;
      }
      if (st.flashMs > 0) st.flashMs = Math.max(0, st.flashMs - 16);
      const lit = st.flashMs > 0;
      const row = this.rows.get(strat.id)!;
      row.box.setFillStyle(lit ? 0xffd60a : 0x2a2a3e);
      row.box.setStrokeStyle(2, lit ? 0xffd60a : 0x4cd964);
      row.label.setColor(lit ? '#1a1a2e' : '#ffffff');
    }
    this.prev = s;
  }

  recalibrate(): void {
    this.samples = [];
    this.baseline = null;
    this.history = [];
    this.prev = null;
    this.statusText.setText('CALIB…').setColor('#ffd60a');
  }

  destroy(): void {
    this.statusText.destroy();
    for (const r of this.rows.values()) {
      r.box.destroy();
      r.label.destroy();
    }
    this.rows.clear();
    this.state.clear();
  }

  private buildRows(): void {
    const startY = this.y + 22;
    const cellW = 38, cellH = 28, gap = 4;
    this.strategies.forEach((strat, i) => {
      const cellY = startY + i * (cellH + gap);
      const box = this.scene.add.rectangle(this.x + 16, cellY + cellH / 2, cellW, cellH, 0x2a2a3e)
        .setOrigin(0.5).setStrokeStyle(2, 0x4cd964).setDepth(50);
      const label = this.scene.add.text(this.x + 16, cellY + cellH / 2, strat.short, {
        fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#ffffff',
        stroke: '#000', strokeThickness: 2, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(51);
      this.rows.set(strat.id, { box, label });
      this.state.set(strat.id, { flashMs: 0, lastFire: -Infinity });
    });
  }

  private buildStrategies(): Strategy[] {
    const T_DEFAULT = 0.10;
    const T_LO = 0.05;
    return [
      {
        id: 'shoulder', short: 'A',
        test: (s, h) => {
          const thr = h.baseline.shoulder - T_DEFAULT * bodyHeight(h.baseline);
          return s.shoulder < thr && !!h.prev && s.shoulder < h.prev.shoulder;
        },
      },
      {
        id: 'shoulder_lo', short: 'B',
        test: (s, h) => {
          const thr = h.baseline.shoulder - T_LO * bodyHeight(h.baseline);
          return s.shoulder < thr && !!h.prev && s.shoulder < h.prev.shoulder;
        },
      },
      {
        id: 'shoulder_nosc', short: 'C',
        test: (s, h) => {
          const thr = h.baseline.shoulder - T_DEFAULT * bodyHeight(h.baseline);
          return s.shoulder < thr;
        },
      },
      {
        id: 'hip', short: 'D',
        test: (s, h) => {
          const thr = h.baseline.hip - T_DEFAULT * bodyHeight(h.baseline);
          return s.hip < thr && !!h.prev && s.hip < h.prev.hip;
        },
      },
      {
        id: 'nose', short: 'E',
        test: (s, h) => {
          const thr = h.baseline.nose - T_DEFAULT * bodyHeight(h.baseline);
          return s.nose < thr && !!h.prev && s.nose < h.prev.nose;
        },
      },
      {
        id: 'ankle', short: 'F',
        test: (s, h) => {
          const thr = h.baseline.ankle - T_LO * bodyHeight(h.baseline);
          return s.ankle < thr;
        },
      },
      {
        id: 'velocity', short: 'G',
        test: (s, h) => {
          if (h.recent.length < 2) return false;
          const oldest = h.recent[0];
          const dt = (s.t - oldest.t) / 1000;
          if (dt < 0.05) return false;
          return (oldest.shoulder - s.shoulder) / dt > 0.6;
        },
      },
    ];
  }
}

function bodyHeight(b: Sample): number {
  return Math.max(0.05, Math.abs(b.ankle - b.nose));
}

function sampleFromFrame(frame: PoseFrame): Sample | null {
  const kp = frame.keypoints;
  if (!kp || kp.length < 33) return null;
  const nose = kp[KP.NOSE]?.y;
  const ls = kp[KP.LEFT_SHOULDER]?.y;
  const rs = kp[KP.RIGHT_SHOULDER]?.y;
  const lh = kp[KP.LEFT_HIP]?.y;
  const rh = kp[KP.RIGHT_HIP]?.y;
  const la = kp[KP.LEFT_ANKLE]?.y;
  const ra = kp[KP.RIGHT_ANKLE]?.y;
  if ([nose, ls, rs, lh, rh, la, ra].some((v) => typeof v !== 'number' || Number.isNaN(v))) return null;
  return { nose: nose!, shoulder: (ls! + rs!) / 2, hip: (lh! + rh!) / 2, ankle: (la! + ra!) / 2, t: frame.timestamp };
}

function meanSample(arr: Sample[]): Sample {
  const n = arr.length;
  const acc = arr.reduce((a, s) => ({
    nose: a.nose + s.nose, shoulder: a.shoulder + s.shoulder, hip: a.hip + s.hip, ankle: a.ankle + s.ankle, t: 0,
  }), { nose: 0, shoulder: 0, hip: 0, ankle: 0, t: 0 });
  return { nose: acc.nose / n, shoulder: acc.shoulder / n, hip: acc.hip / n, ankle: acc.ankle / n, t: performance.now() };
}
