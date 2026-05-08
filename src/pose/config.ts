// Thresholds expressos em FRAÇÃO de H_corpo (Seção 3.3 do EXERGAME_PROJETO.md).
// NUNCA usar valores em pixels absolutos — quebra com criança vs adulto.
// Parâmetros jogáveis (joelho, cadência) vivem em src/tuning.ts.

import { KNEE_RAISE_FRAC, CADENCE_WINDOW_MS } from '../tuning.ts';

export const POSE_CONFIG = {
  /** EMA — fator de suavização (ADR-5 do study #1) */
  emaAlpha: 0.5,

  /** Calibração */
  calibrationDurationMs: 2000,
  calibrationCountdownSec: 3,
  minConfidenceForCalibration: 0.6,

  /** Estados especiais (Seção 3.4) */
  noBodyTimeoutMs: 1500,
  lowConfidenceThreshold: 0.6,
  lowConfidenceWarnDurationMs: 3000,
  driftRecalibrateSuggestMs: 10000,

  /** Heurística JUMP */
  jumpThresholdFracHCorpo: 0.10,
  jumpCooldownMs: 400,

  /** Heurística DUCK */
  duckThresholdFracHCorpo: 0.15,
  duckSustainMs: 200,

  /** Heurística LANE CHANGE */
  laneThresholdFracOmbros: 0.55,
  laneHysteresisFrac: 0.18,
  laneCooldownMs: 400,

  /** Heurística RUNNING CADENCE — valores em src/tuning.ts */
  cadenceKneeRaiseFracHCorpo: KNEE_RAISE_FRAC,
  cadenceWindowMs: CADENCE_WINDOW_MS,

  /** Heurística JUMPING JACK */
  jackAnkleSpreadFactorOmbros: 1.5,
  jackCooldownMs: 600,

  /** Heurística ARMS UP */
  armsUpEmitMinIntervalMs: 500,

  /** MediaPipe */
  modelAssetPath: '/models/pose_landmarker_lite.task',
  wasmPath: '/wasm',
  videoIdealWidth: 854,
  videoIdealHeight: 480,
  numPoses: 2,
  /** Confiança mínima usada nos 3 thresholds de detecção/presença/tracking do MediaPipe */
  mediapipeMinConfidence: 0.5,

  /** Debug */
  debugLogMaxEntries: 20,
} as const;
