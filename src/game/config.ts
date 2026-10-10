import {
  SPEED_INITIAL_MPS, SPEED_MAX_MPS,
  SPEED_INCREASE_STEP_MPS, SPEED_INCREASE_INTERVAL_MS,
} from '../tuning.ts';

export const GAME_CONFIG = {
  /** Resolução lógica do canvas. Phaser escala pra tela. */
  width: 1280,
  height: 720,
  bgColor: 0x0a0e1a,

  /** Mundo / pseudo-3D */
  horizonY: 293,
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
  spawnIntervalMsInitial: 3500,
  spawnIntervalMsAfter20s: 2200,
  spawnIntervalMsAfter60s: 1500,
  coinClusterEveryMeters: 50,
  coinClusterSize: 5,
  coinSpacingMeters: 2,

  /** Player (px lógicos no canvas) */
  playerY: 587,
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

  /** Falling Object Game — objetos caem de cima, jogador desvia esq/dir */
  falling: {
    laneXs:          [240, 640, 1040] as [number, number, number],
    groundY:          612,
    spawnY:           -90,
    despawnY:         800,
    pxPerMeter:       35,
    playerW:           72,
    playerH:           72,
    playerDuckH:       36,
    jumpHeightPx:     175,
    jumpDurMs:        460,
    duckDurMs:        660,
    collisionTop:     525,  // y acima disto = objeto ainda longe do chão
    airObjY:          360,
    airCollTop:       306,
    airCollBot:       427,
    breakRadiusPx:    213,
    laneChangeDurMs:  120,
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;

export function isPortrait(): boolean {
  return GAME_CONFIG.height > GAME_CONFIG.width;
}
