// Thresholds expressos em FRAÇÃO de H_corpo (Seção 3.3 do EXERGAME_PROJETO.md).
// NUNCA usar valores em pixels absolutos — quebra com criança vs adulto.

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
  laneThresholdFracOmbros: 0.20,
  laneHysteresisFrac: 0.05,

  /** Heurística RUNNING CADENCE */
  cadenceKneeRaiseFracHCorpo: 0.08,
  cadenceWindowMs: 2000,

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
  numPoses: 1,

  /** Debug */
  debugLogMaxEntries: 20,
} as const;
