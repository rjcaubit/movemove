export const GAME_CONFIG = {
  /** Resolução lógica do canvas. Phaser escala pra tela. */
  width: 960,
  height: 540,
  bgColor: 0x0b0d10,

  /** Mundo / pseudo-3D */
  horizonY: 220,
  laneXOffsetAtNear: 200,
  laneXOffsetAtHorizon: 30,
  zMin: 0,
  zMax: 1,
  zStep: 0.2,
  scaleAtNear: 1.5,
  scaleAtHorizon: 0.1,

  /** Velocidade do mundo (m/s) */
  speedInitial: 5,
  speedIncreasePerInterval: 1,
  speedIncreaseIntervalMs: 30000,
  speedMax: 15,

  /** Spawning */
  spawnIntervalMsInitial: 2500,
  spawnIntervalMsAfter20s: 1500,
  spawnIntervalMsAfter60s: 1000,
  coinClusterEveryMeters: 50,
  coinClusterSize: 5,
  coinSpacingMeters: 2,

  /** Player (px lógicos no canvas) */
  playerY: 440,
  playerJumpHeightPx: 80,
  playerJumpDurationMs: 600,
  playerDuckDurationMs: 800,
  playerLaneTiltDurationMs: 200,
  playerLaneTiltDeg: 15,

  /** Colisão */
  collisionZThreshold: 0.15,
  /** Coleta de moeda (RF09 — mais permissivo que collisão de obstáculo) */
  coinPickupZThreshold: 0.10,

  /** Persistência */
  storageKeys: {
    bestDistance: 'movemove.bestDistance',
    tutorialDone: 'movemove.tutorialDone',
    muted: 'movemove.muted',
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
