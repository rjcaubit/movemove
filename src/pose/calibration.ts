import { POSE_CONFIG } from './config.ts';
import { KP, type Baseline, type PoseFrame } from './types.ts';

export type CalibrationOutcome =
  | { ok: true; baseline: Baseline }
  | { ok: false; reason: 'low_confidence' | 'no_body' | 'aborted' };

export class Calibrator {
  private samples: PoseFrame[] = [];
  private startedAt = 0;
  private active = false;

  start(): void {
    this.samples = [];
    this.startedAt = performance.now();
    this.active = true;
  }

  abort(): void {
    this.active = false;
    this.samples = [];
  }

  isActive(): boolean { return this.active; }

  feed(frame: PoseFrame): CalibrationOutcome | null {
    if (!this.active) return null;
    // Seção 3.1: requer 2s CONTÍNUOS de baixa pose com confiança ≥ 0.6.
    // Se a confiança cair, reset o relógio e descarta amostras anteriores —
    // assim a janela só fecha após 2s ininterruptos válidos.
    if (frame.confidence < POSE_CONFIG.minConfidenceForCalibration) {
      this.startedAt = performance.now();
      this.samples = [];
      return null;
    }
    this.samples.push(frame);
    const elapsed = performance.now() - this.startedAt;
    if (elapsed < POSE_CONFIG.calibrationDurationMs) return null;
    return this.finalize();
  }

  private finalize(): CalibrationOutcome {
    this.active = false;
    if (this.samples.length < 10) {
      return { ok: false, reason: 'low_confidence' };
    }
    const avgConf =
      this.samples.reduce((s, f) => s + f.confidence, 0) / this.samples.length;
    if (avgConf < POSE_CONFIG.minConfidenceForCalibration) {
      return { ok: false, reason: 'low_confidence' };
    }

    const meanY = (idx: number) =>
      this.samples.reduce((s, f) => s + f.keypoints[idx].y, 0) / this.samples.length;
    const meanX = (idx: number) =>
      this.samples.reduce((s, f) => s + f.keypoints[idx].x, 0) / this.samples.length;

    const yEyes = (meanY(KP.LEFT_EYE) + meanY(KP.RIGHT_EYE)) / 2;
    const yAnkles = (meanY(KP.LEFT_ANKLE) + meanY(KP.RIGHT_ANKLE)) / 2;
    const hCorpo = Math.abs(yAnkles - yEyes);

    const yQuadrilBase = (meanY(KP.LEFT_HIP) + meanY(KP.RIGHT_HIP)) / 2;
    const xCentroBase = (meanX(KP.LEFT_HIP) + meanX(KP.RIGHT_HIP)) / 2;

    const xLS = meanX(KP.LEFT_SHOULDER);
    const xRS = meanX(KP.RIGHT_SHOULDER);
    const larguraOmbros = Math.abs(xLS - xRS);

    if (hCorpo < 0.1 || larguraOmbros < 0.05) {
      return { ok: false, reason: 'low_confidence' };
    }

    return {
      ok: true,
      baseline: {
        hCorpo,
        yQuadrilBase,
        xCentroBase,
        larguraOmbros,
        capturedAt: performance.now(),
      },
    };
  }
}
