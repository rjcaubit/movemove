/**
 * TUNING — parâmetros jogáveis do Movemove.
 *
 * Mexa aqui para ajustar dificuldade, sensibilidade de movimento e ritmo
 * sem precisar caçar valores espalhados pelo código.
 *
 * Unidades:
 *   FracHCorpo  = fração da altura do corpo calibrada (0.08 = 8% da altura)
 *   FracOmbros  = fração da largura dos ombros calibrada
 *   m/s         = metros por segundo (velocidade do mundo)
 *   energia/s   = pontos de energia por segundo (escala 0-100)
 *   passos/s    = passos (joelhos levantados) por segundo
 */

// ─────────────────────────────────────────────
// JOELHO — altura mínima para contar um passo
// ─────────────────────────────────────────────
// Quanto o joelho precisa subir (em fração da altura do corpo) para ser
// detectado como um passo. Aumentar = mais esforço. Diminuir = mais fácil.
//   Sugestão:  0.05 (fácil / crianças pequenas)
//              0.08 (padrão)
//              0.12 (difícil / adolescentes)
export const KNEE_RAISE_FRAC = 0.08;

// Janela de tempo (ms) usada para calcular quantos passos/s o jogador deu.
// Janela maior = média mais suave; janela menor = reage mais rápido.
export const CADENCE_WINDOW_MS = 2000;

// ─────────────────────────────────────────────
// CADÊNCIA — limiares de intensidade (passos/s)
// ─────────────────────────────────────────────
// Define em quantos passos por segundo cada faixa começa.
// Abaixo de WALKING → "parado" (energia cai).
export const CADENCE_THRESHOLDS = {
  walking: 0.5,  // passos/s — abaixo = none
  jogging: 1.5,  // passos/s — abaixo = walking
  running: 3.0,  // passos/s — abaixo = jogging, acima = running
} as const;

// ─────────────────────────────────────────────
// ENERGIA — taxa de variação por intensidade (energia/s)
// ─────────────────────────────────────────────
// Energia fica entre 0 e 100. Velocidade é máxima quando energia ≥ 30.
// Abaixo de 30 a velocidade cai proporcionalmente; em 0 o jogo para.
export const ENERGY_RATES = {
  none:    -8,   // parado: energia cai rápido
  walking:  5,   // caminhando: energia sobe devagar
  jogging: 12,   // trotando: sobe bem
  running: 25,   // correndo: sobe muito rápido
} as const;

// Energia abaixo deste valor começa a reduzir a velocidade.
export const ENERGY_FULL_SPEED_THRESHOLD = 30;

// ─────────────────────────────────────────────
// VELOCIDADE DO MUNDO
// ─────────────────────────────────────────────
// Velocidade inicial do personagem (m/s). Aumentada automaticamente pelo
// sistema de progressão abaixo.
export const SPEED_INITIAL_MPS = 5;

// Velocidade máxima possível (m/s), independente do tempo jogado.
export const SPEED_MAX_MPS = 15;

// A cada SPEED_INCREASE_INTERVAL_MS milissegundos, a velocidade base sobe
// SPEED_INCREASE_STEP m/s — até atingir SPEED_MAX_MPS.
export const SPEED_INCREASE_STEP_MPS = 1;
export const SPEED_INCREASE_INTERVAL_MS = 30_000; // 30 segundos

// ─────────────────────────────────────────────
// VELOCIDADE POR FAIXA ETÁRIA
// ─────────────────────────────────────────────
// Substitui SPEED_INITIAL_MPS para cada faixa. Também ajusta KNEE_RAISE_FRAC
// para tornar o exercício mais ou menos exigente por idade.
export const AGE_GROUPS = {
  '5-7':  { speedInitial: 4, kneeRaiseFrac: 0.06, waterBreakIntervalMs: 6 * 60_000 },
  '8-10': { speedInitial: 5, kneeRaiseFrac: 0.08, waterBreakIntervalMs: 8 * 60_000 },
  '11-12':{ speedInitial: 6, kneeRaiseFrac: 0.10, waterBreakIntervalMs: 10 * 60_000 },
} as const;

export type AgeGroup = keyof typeof AGE_GROUPS;

// ─────────────────────────────────────────────
// EFEITOS VISUAIS
// ─────────────────────────────────────────────
export const FX_CHROMATIC_STRENGTH   = 3;   // px deslocamento RGB
export const FX_SHAKE_AMPLITUDE_PX   = 8;
export const FX_SHAKE_DURATION_MS    = 200;
export const FX_SPEED_LINE_COUNT     = 12;
export const FX_PARTICLE_COIN_COUNT  = 6;
export const FX_PARTICLE_HIT_COUNT   = 4;

// Ninja Fruit
export const NINJA_DURATION_MS = 60_000;
export const NINJA_VELOCITY_THRESHOLD = 1.2;           // H_corpo/s — velocidade mínima do pulso pra cortar
export const NINJA_BOMB_GRACE_MS = 5000;               // só fruta nos primeiros 5s
export const NINJA_BOMB_SPAWN_CHANCE_INITIAL = 0.05;
export const NINJA_BOMB_SPAWN_CHANCE_MAX = 0.30;       // chega aqui ao longo de 30s
export const NINJA_SPAWN_INTERVAL_MS_INITIAL = 1100;
export const NINJA_SPAWN_INTERVAL_MS_MIN = 600;
export const NINJA_SPAWN_INTERVAL_STEP_MS = 25;        // acelera por slice
export const NINJA_HIT_RADIUS = 0.10;                  // raio normalizado do hit test
export const NINJA_INTRO_MS = 3000;
export const NINJA_INTRO_MIN_MOVEMENT = 0.05;          // deslocamento total pra detectar mão dominante

export function getAgeGroup(): AgeGroup {
  try {
    const stored = localStorage.getItem('movemove.ageGroup');
    if (stored && stored in AGE_GROUPS) return stored as AgeGroup;
  } catch { /* ignore */ }
  return '8-10';
}

// ─────────────────────────────────────────────
// CANOE GAME
// ─────────────────────────────────────────────
export const CANOE_DURATION_MS        = 60_000;
export const CANOE_SPEED_PER_STROKE   = 0.06;   // acréscimo normalizado por stroke
export const CANOE_SPEED_DECAY        = 0.9;    // multiplica speed a cada segundo sem stroke
export const CANOE_MAX_SPEED          = 0.4;    // max normalizado (0–1/s)
export const CANOE_STEER_AMOUNT       = 0.045;  // fração de largura desviada por stroke
export const CANOE_LERP               = 0.08;   // interpolação X por frame (0=lento, 1=imediato)
export const CANOE_COLLISION_BRAKE    = 0.35;   // multiplica speed em colisão
export const CANOE_ROCK_BASE_SPEED    = 0.0002; // fração de tela/ms, mínimo mesmo sem remar
export const CANOE_ROCK_SPAWN_MS      = 2200;   // ms entre spawns de pedra
export const CANOE_METERS_PER_UNIT    = 50;     // 1 unidade normalizada = 50 metros (HUD)

// ROWING DETECTOR
export const ROWING_STROKE_THRESHOLD  = 0.45;   // velocidade mínima do pulso (coords norm/s)
export const ROWING_MIN_DISPLACEMENT  = 0.05;   // deslocamento mínimo na janela (5% da altura)
export const ROWING_REFRACTORY_MS     = 350;    // ms de cooldown por lado após stroke
