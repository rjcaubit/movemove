import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { KP, type PoseFrame } from '../../pose/types.ts';

/**
 * JumpTester — pagina de diagnóstico (?jump=1).
 * Roda 6 estratégias de detecção de pulo em paralelo e indica visualmente
 * qual delas dispararia, pra a gente entender qual é a mais sensível
 * na prática.
 *
 * Calibragem própria: 60 frames iniciais → mean Y de cada keypoint.
 */

type StratId = 'shoulder' | 'shoulder_lo' | 'shoulder_nosc' | 'hip' | 'nose' | 'ankle' | 'velocity';

interface Strategy {
  id: StratId;
  name: string;
  description: string;
  /** Retorna true se a estratégia dispararia neste frame. */
  test: (s: Sample, h: History) => boolean;
}

interface Sample {
  nose: number;
  shoulder: number;
  hip: number;
  ankle: number;
  t: number;
}

interface History {
  baseline: Sample;
  prev: Sample | null;
  /** Mais antigo → mais recente (200ms window). */
  recent: Sample[];
}

interface StratState {
  lastFire: number;
  flashMs: number;
  currentValue: string;
}

const COOLDOWN_MS = 400;
const FLASH_MS = 350;

export class JumpTester extends Phaser.Scene {
  private backdrop: CameraBackdrop | null = null;
  private unsubFrame: (() => void) | null = null;
  private calibrationSamples: Sample[] = [];
  private baseline: Sample | null = null;
  private history: Sample[] = [];
  private prevSample: Sample | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private rows: Map<StratId, { label: Phaser.GameObjects.Text; box: Phaser.GameObjects.Rectangle; value: Phaser.GameObjects.Text }> = new Map();
  private stratState: Map<StratId, StratState> = new Map();
  private strategies: Strategy[] = [];

  constructor() { super('JumpTester'); }

  create(): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a0e1a);

    this.add.text(width / 2, 28, 'JUMP TESTER (?jump=1)', {
      fontFamily: 'VT323, ui-monospace', fontSize: '28px', color: '#ffd60a',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(20);

    this.statusText = this.add.text(width / 2, 60, 'fique parado: calibrando…', {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(20);

    // Botão de voltar
    this.add.text(16, 16, '← voltar', {
      fontFamily: 'VT323, ui-monospace', fontSize: '24px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3, backgroundColor: '#222',
    }).setPadding(8, 4, 8, 4).setDepth(30).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Welcome'));

    // Botão recalibrar
    this.add.text(width - 16, 16, '↻ recalibrar', {
      fontFamily: 'VT323, ui-monospace', fontSize: '24px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3, backgroundColor: '#222',
    }).setOrigin(1, 0).setPadding(8, 4, 8, 4).setDepth(30).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.beginCalibration());

    // Backdrop câmera
    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.45);

    this.defineStrategies();
    this.buildRows();
    this.beginCalibration();

    this.unsubFrame = refs.onSmoothedFrame((f: PoseFrame) => this.onFrame(f));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    // Keyboard manual trigger (sanity check)
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.statusText.setText('SPACE pressionado — comparar com flashes acima');
    });
  }

  private defineStrategies(): void {
    const T_DEFAULT = 0.10;
    const T_LO = 0.05;
    this.strategies = [
      {
        id: 'shoulder',
        name: 'A) Ombro + ascending (atual)',
        description: 'shoulderY < base - 10% hCorpo E ascendendo',
        test: (s, h) => {
          const thr = h.baseline.shoulder - T_DEFAULT * bodyHeight(h.baseline);
          return s.shoulder < thr && !!h.prev && s.shoulder < h.prev.shoulder;
        },
      },
      {
        id: 'shoulder_lo',
        name: 'B) Ombro threshold 5%',
        description: 'shoulderY < base - 5% hCorpo (mais sensível)',
        test: (s, h) => {
          const thr = h.baseline.shoulder - T_LO * bodyHeight(h.baseline);
          return s.shoulder < thr && !!h.prev && s.shoulder < h.prev.shoulder;
        },
      },
      {
        id: 'shoulder_nosc',
        name: 'C) Ombro SEM ascending check',
        description: 'só cruzar threshold (sem exigir Δy negativo)',
        test: (s, h) => {
          const thr = h.baseline.shoulder - T_DEFAULT * bodyHeight(h.baseline);
          return s.shoulder < thr;
        },
      },
      {
        id: 'hip',
        name: 'D) Quadril + ascending (original)',
        description: 'hipY < base - 10% hCorpo E ascendendo',
        test: (s, h) => {
          const thr = h.baseline.hip - T_DEFAULT * bodyHeight(h.baseline);
          return s.hip < thr && !!h.prev && s.hip < h.prev.hip;
        },
      },
      {
        id: 'nose',
        name: 'E) Nariz (cabeça sobe)',
        description: 'noseY < base - 10% hCorpo',
        test: (s, h) => {
          const thr = h.baseline.nose - T_DEFAULT * bodyHeight(h.baseline);
          return s.nose < thr && !!h.prev && s.nose < h.prev.nose;
        },
      },
      {
        id: 'ankle',
        name: 'F) Tornozelo (pés saem do chão)',
        description: 'ankleY < base - 5% hCorpo',
        test: (s, h) => {
          const thr = h.baseline.ankle - T_LO * bodyHeight(h.baseline);
          return s.ankle < thr;
        },
      },
      {
        id: 'velocity',
        name: 'G) Velocidade do ombro (200ms)',
        description: 'Δ shoulderY / Δt > 0.6 (rápido pra cima)',
        test: (s, h) => {
          if (h.recent.length < 2) return false;
          const oldest = h.recent[0];
          const dt = (s.t - oldest.t) / 1000;
          if (dt < 0.05) return false;
          const dy = (oldest.shoulder - s.shoulder) / dt; // positivo se subindo
          return dy > 0.6;
        },
      },
    ];
  }

  private buildRows(): void {
    const { width } = GAME_CONFIG;
    const startY = 110;
    const rowH = 56;
    this.strategies.forEach((strat, i) => {
      const y = startY + i * rowH;
      const box = this.add.rectangle(36, y + 18, 36, 36, 0x2a2a3e).setOrigin(0.5).setStrokeStyle(2, 0x4cd964).setDepth(20);
      const label = this.add.text(64, y, `${strat.name}\n${strat.description}`, {
        fontFamily: 'VT323, ui-monospace', fontSize: '18px', color: '#ffffff',
        stroke: '#000', strokeThickness: 2,
      }).setDepth(20);
      const value = this.add.text(width - 16, y + 18, '—', {
        fontFamily: 'VT323, ui-monospace', fontSize: '16px', color: '#cccccc',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0.5).setDepth(20);
      this.rows.set(strat.id, { label, box, value });
      this.stratState.set(strat.id, { lastFire: -Infinity, flashMs: 0, currentValue: '' });
    });
  }

  private beginCalibration(): void {
    this.calibrationSamples = [];
    this.baseline = null;
    this.history = [];
    this.prevSample = null;
    this.statusText.setText('fique parado: calibrando…').setColor('#ffd60a');
  }

  private onFrame(frame: PoseFrame): void {
    const sample = sampleFromFrame(frame);
    if (sample === null) {
      this.statusText.setText('sem pose detectada').setColor('#ff6b6b');
      return;
    }

    if (!this.baseline) {
      this.calibrationSamples.push(sample);
      const pct = Math.min(100, Math.round((this.calibrationSamples.length / 60) * 100));
      this.statusText.setText(`fique parado: calibrando… ${pct}%`).setColor('#ffd60a');
      if (this.calibrationSamples.length >= 60) {
        this.baseline = meanSample(this.calibrationSamples);
        this.statusText.setText(`baseline ok — agora pula! base shY=${this.baseline.shoulder.toFixed(3)} hipY=${this.baseline.hip.toFixed(3)}`).setColor('#4cd964');
      }
      return;
    }

    // Histórico curto (200ms)
    this.history.push(sample);
    const cutoff = sample.t - 250;
    while (this.history.length > 0 && this.history[0].t < cutoff) this.history.shift();

    const ctx: History = { baseline: this.baseline, prev: this.prevSample, recent: this.history };

    for (const strat of this.strategies) {
      const state = this.stratState.get(strat.id)!;
      const fired = strat.test(sample, ctx);
      if (fired && sample.t - state.lastFire > COOLDOWN_MS) {
        state.lastFire = sample.t;
        state.flashMs = FLASH_MS;
      }
      // decay
      if (state.flashMs > 0) state.flashMs = Math.max(0, state.flashMs - 16);
      const lit = state.flashMs > 0;
      const row = this.rows.get(strat.id)!;
      row.box.setFillStyle(lit ? 0xffd60a : 0x2a2a3e);
      row.box.setStrokeStyle(2, lit ? 0xffd60a : 0x4cd964);
      row.value.setText(this.formatValue(strat.id, sample, ctx)).setColor(lit ? '#ffd60a' : '#cccccc');
    }

    this.prevSample = sample;
  }

  private formatValue(id: StratId, s: Sample, h: History): string {
    const bh = bodyHeight(h.baseline);
    switch (id) {
      case 'shoulder':
      case 'shoulder_lo':
      case 'shoulder_nosc': {
        const t = id === 'shoulder_lo' ? 0.05 : 0.10;
        const thr = h.baseline.shoulder - t * bh;
        return `shY=${s.shoulder.toFixed(3)} thr=${thr.toFixed(3)}`;
      }
      case 'hip': {
        const thr = h.baseline.hip - 0.10 * bh;
        return `hipY=${s.hip.toFixed(3)} thr=${thr.toFixed(3)}`;
      }
      case 'nose': {
        const thr = h.baseline.nose - 0.10 * bh;
        return `noseY=${s.nose.toFixed(3)} thr=${thr.toFixed(3)}`;
      }
      case 'ankle': {
        const thr = h.baseline.ankle - 0.05 * bh;
        return `ankY=${s.ankle.toFixed(3)} thr=${thr.toFixed(3)}`;
      }
      case 'velocity': {
        if (h.recent.length < 2) return 'v=…';
        const oldest = h.recent[0];
        const dt = (s.t - oldest.t) / 1000;
        const v = dt > 0 ? (oldest.shoulder - s.shoulder) / dt : 0;
        return `v=${v.toFixed(2)}/s`;
      }
    }
  }

  private cleanup(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
  }
}

function bodyHeight(base: Sample): number {
  // Aproximação: distância nariz → tornozelo na baseline (sem olhos).
  return Math.max(0.05, Math.abs(base.ankle - base.nose));
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
  return {
    nose: nose!,
    shoulder: (ls! + rs!) / 2,
    hip: (lh! + rh!) / 2,
    ankle: (la! + ra!) / 2,
    t: frame.timestamp,
  };
}

function meanSample(samples: Sample[]): Sample {
  const n = samples.length;
  const sum = samples.reduce((acc, s) => ({
    nose: acc.nose + s.nose,
    shoulder: acc.shoulder + s.shoulder,
    hip: acc.hip + s.hip,
    ankle: acc.ankle + s.ankle,
    t: 0,
  }), { nose: 0, shoulder: 0, hip: 0, ankle: 0, t: 0 });
  return { nose: sum.nose / n, shoulder: sum.shoulder / n, hip: sum.hip / n, ankle: sum.ankle / n, t: performance.now() };
}
