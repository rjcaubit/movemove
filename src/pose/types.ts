// 33 keypoints do MediaPipe Pose Landmarker — usar índices do enum oficial.
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

export const KP = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export interface Keypoint {
  x: number; // normalizado 0..1
  y: number; // normalizado 0..1
  z?: number;
  visibility?: number; // 0..1, se disponível
}

export interface PoseFrame {
  /** keypoints normalizados (NormalizedLandmarks do MediaPipe). 33 itens. */
  keypoints: Keypoint[];
  /** confiança média dos keypoints relevantes pras heurísticas (média de visibility) */
  confidence: number;
  /** timestamp performance.now() do frame */
  timestamp: number;
}

export interface Baseline {
  hCorpo: number;       // distância vertical olhos→tornozelos
  yQuadrilBase: number; // Y médio do quadril em repouso
  xCentroBase: number;  // X médio do quadril em repouso
  larguraOmbros: number;
  capturedAt: number;   // timestamp ms
}

export type Lane = -1 | 0 | 1;

export type GameEvent =
  | { type: 'jump'; source: 'pose' | 'kbd'; t: number }
  | { type: 'duck'; source: 'pose' | 'kbd'; t: number }
  | { type: 'lane_change'; lane: Lane; source: 'pose' | 'kbd'; t: number }
  | { type: 'jumping_jack'; source: 'pose' | 'kbd'; t: number }
  | { type: 'arms_up'; source: 'pose' | 'kbd'; t: number }
  | { type: 'cadence'; stepsPerSec: number; source: 'pose' | 'kbd'; t: number };

export type GameEventType = GameEvent['type'];
