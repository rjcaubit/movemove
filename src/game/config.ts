import {
  SPEED_INITIAL_MPS, SPEED_MAX_MPS,
  SPEED_INCREASE_STEP_MPS, SPEED_INCREASE_INTERVAL_MS,
} from '../tuning.ts';

export const GAME_CONFIG = {
  /** Resolução lógica do canvas. Phaser escala pra tela. */
  width: 960,
  height: 540,
  bgColor: 0x4488ff,

  /** Mundo / pseudo-3D */
  horizonY: 220,
  laneXOffsetAtNear: 280,
  laneXOffsetAtHorizon: 40,
  zMin: 0,
  zMax: 1,
  zStep: 0.2,
  scaleAtNear: 1.5,
  scaleAtHorizon: 0.1,

  /** Velocidade do mundo (m/s) — valores em src/tuning.ts */
  speedInitial: SPEED_INITIAL_MPS,
  speedIncreasePerInterval: SPEED_INCREASE_STEP_MPS,
  speedIncreaseIntervalMs: SPEED_INCREASE_INTERVAL_MS,
  speedMax: SPEED_MAX_MPS,

  /** Spawning */
  spawnIntervalMsInitial: 2500,
  spawnIntervalMsAfter20s: 1500,
  spawnIntervalMsAfter60s: 1000,
  coinClusterEveryMeters: 50,
  coinClusterSize: 5,
  coinSpacingMeters: 2,

  /** Player (px lógicos no canvas) */
  playerY: 440,
  playerJumpHeightPx: 110,
  playerJumpDurationMs: 1000,
  playerDuckDurationMs: 1200,
  playerLaneTiltDurationMs: 200,
  playerLaneTiltDeg: 15,

  /** Colisão */
  collisionZThreshold: 0.15,
  /** Coleta de moeda (RF09 — mais permissivo que collisão de obstáculo) */
  coinPickupZThreshold: 0.10,

  /** Energia (Fase 2) */
  energyInitial: 50,
  energyDeceleratesBelow: 30,

  /** Zonas especiais (Fase 2) */
  zoneSpacingMeters: 80,
  jackZoneRequired: 5,
  jackZoneWindowMs: 4000,
  armsZoneWindowMs: 3000,

  /** Bonus (Fase 2) */
  zoneBonusScore: 50,

  /** Paleta Pixel Arcade */
  palette: {
    sky:        0x4488ff,
    skyHorizon: 0x88aaff,
    grassA:     0x44bb44,
    grassB:     0x33aa33,
    roadA:      0x888899,
    roadB:      0x777788,
    stripe:     0xffff00,
    line:       0xffffff,
  },
  /** Neblina */
  fog: { enabled: true, density: 0.7, color: 0x88aaff },
  /** Flags de efeitos — desativar individualmente para performance */
  fx: {
    scanlines:   true,
    vignette:    true,
    speedLines:  true,
    particles:   true,
    chromatic:   false,
    screenShake: true,
    flash:       true,
  },

  /** Persistência */
  storageKeys: {
    bestDistance: 'movemove.bestDistance',
    tutorialDone: 'movemove.tutorialDone',
    muted: 'movemove.muted',
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
