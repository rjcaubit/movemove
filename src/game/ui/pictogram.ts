import * as Phaser from 'phaser';

/**
 * Pictogramas procedurais no estilo "figura colorida + setas curvas vermelhas".
 * Usado no Just Dance mini-jogo. Cada pictograma é um Container com
 * silhueta humana sólida + indicadores de movimento.
 */

export type PictoId = 'arms_up' | 'arms_out' | 'squat' | 'left_arm' | 'right_arm' | 'jumping_jack';

const ARROW_COLOR = 0xff2b4a;

interface Layout {
  // tudo em coords locais ao container; figura centralizada em (0, 0).
  headY: number;       // y do centro da cabeça
  torsoTopY: number;
  torsoBotY: number;
  // ângulos dos braços/pernas em graus, 0=down, -90=lateral fora, -180=up
  laAngle: number;     // ombro esquerdo (visto de fora: lado esquerdo da figura)
  raAngle: number;
  llAngle: number;
  rlAngle: number;
  squatOffset: number; // quanto baixar o corpo (px)
}

const NEUTRAL: Layout = {
  headY: -68, torsoTopY: -54, torsoBotY: 14,
  laAngle: 10, raAngle: -10,
  llAngle: 8, rlAngle: -8,
  squatOffset: 0,
};

const LAYOUTS: Record<PictoId, Layout> = {
  arms_up:      { ...NEUTRAL, laAngle: 170, raAngle: -170 },
  arms_out:     { ...NEUTRAL, laAngle: 90, raAngle: -90 },
  squat:        { ...NEUTRAL, squatOffset: 18, laAngle: 60, raAngle: -60, llAngle: 18, rlAngle: -18 },
  left_arm:     { ...NEUTRAL, laAngle: 165, raAngle: -10 },
  right_arm:    { ...NEUTRAL, laAngle: 10, raAngle: -165 },
  jumping_jack: { ...NEUTRAL, laAngle: 145, raAngle: -145, llAngle: 28, rlAngle: -28 },
};

const HEAD_R = 14;
const TORSO_W = 26;
const LIMB_W = 14;
const ARM_LEN = 42;
const LEG_LEN = 56;
const SHOULDER_HALF = 14;
const HIP_HALF = 12;

export interface PictoOptions {
  color?: number;
  showArrows?: boolean;
  arrowColor?: number;
}

export function drawPictogram(
  scene: Phaser.Scene,
  x: number, y: number,
  id: PictoId,
  opts: PictoOptions = {},
): Phaser.GameObjects.Container {
  const color = opts.color ?? 0xffd60a;
  const showArrows = opts.showArrows ?? true;
  const arrowColor = opts.arrowColor ?? ARROW_COLOR;
  const L = LAYOUTS[id];

  const g = scene.add.graphics();
  g.fillStyle(color, 1);

  const cx = 0;
  const torsoTop = L.torsoTopY + L.squatOffset;
  const torsoBot = L.torsoBotY + L.squatOffset;

  // Cabeça
  g.fillCircle(cx, L.headY + L.squatOffset, HEAD_R);

  // Pescoço pequeno
  g.fillRect(cx - 4, L.headY + L.squatOffset + HEAD_R - 2, 8, 8);

  // Torso (capsule)
  fillCapsule(g, cx, torsoTop, cx, torsoBot, TORSO_W);

  // Braços a partir dos ombros
  const lShoulder = { x: cx - SHOULDER_HALF, y: torsoTop + 4 };
  const rShoulder = { x: cx + SHOULDER_HALF, y: torsoTop + 4 };
  drawLimb(g, lShoulder, L.laAngle, ARM_LEN, LIMB_W, false);
  drawLimb(g, rShoulder, L.raAngle, ARM_LEN, LIMB_W, false);

  // Pernas a partir dos quadris
  const lHip = { x: cx - HIP_HALF, y: torsoBot - 2 };
  const rHip = { x: cx + HIP_HALF, y: torsoBot - 2 };
  // Para pernas, ângulo é medido a partir de "para baixo" (180 = pra cima)
  drawLimb(g, lHip, L.llAngle, LEG_LEN, LIMB_W + 2, true);
  drawLimb(g, rHip, L.rlAngle, LEG_LEN, LIMB_W + 2, true);

  const items: Phaser.GameObjects.GameObject[] = [g];

  if (showArrows) {
    const ag = scene.add.graphics();
    drawArrowsFor(ag, id, arrowColor);
    items.push(ag);
  }

  return scene.add.container(x, y, items);
}

function drawLimb(
  g: Phaser.GameObjects.Graphics,
  origin: { x: number; y: number },
  angleDeg: number,
  length: number,
  width: number,
  leg: boolean,
): void {
  // Convenção: angleDeg=0 → pra baixo (perna em pé). Positivo gira pra esquerda
  // (lado positivo do x local), negativo gira pra direita.
  // Pra braços: o "down" também é pra baixo, e angleDeg=180 leva o braço pra cima.
  const rad = (angleDeg * Math.PI) / 180;
  const baseDir = leg ? 1 : 1; // ambos partem indo pra baixo
  const dx = Math.sin(rad) * length;
  const dy = Math.cos(rad) * length * baseDir;
  fillCapsule(g, origin.x, origin.y, origin.x + dx, origin.y + dy, width);
}

function fillCapsule(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number,
  x2: number, y2: number,
  width: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const half = width / 2;
  // Polígono retangular preenchido
  g.beginPath();
  g.moveTo(x1 + px * half, y1 + py * half);
  g.lineTo(x2 + px * half, y2 + py * half);
  g.lineTo(x2 - px * half, y2 - py * half);
  g.lineTo(x1 - px * half, y1 - py * half);
  g.closePath();
  g.fillPath();
  // Tampas redondas
  g.fillCircle(x1, y1, half);
  g.fillCircle(x2, y2, half);
}

function drawArrowsFor(g: Phaser.GameObjects.Graphics, id: PictoId, color: number): void {
  g.lineStyle(5, color, 1);
  g.fillStyle(color, 1);
  switch (id) {
    case 'arms_up':
      // duas setas finas das mãos pra cima (uma de cada lado)
      drawArrow(g, -54, -100, -54, -150);
      drawArrow(g, 54, -100, 54, -150);
      break;
    case 'arms_out':
      // setas horizontais pros lados
      drawArrow(g, -64, -50, -110, -50);
      drawArrow(g, 64, -50, 110, -50);
      break;
    case 'squat':
      // setas pra baixo nos quadris
      drawArrow(g, -28, 30, -28, 70);
      drawArrow(g, 28, 30, 28, 70);
      break;
    case 'left_arm':
      drawArrow(g, -54, -100, -54, -150);
      break;
    case 'right_arm':
      drawArrow(g, 54, -100, 54, -150);
      break;
    case 'jumping_jack':
      // setas diagonais pra fora-cima dos braços
      drawArrow(g, -50, -90, -100, -130);
      drawArrow(g, 50, -90, 100, -130);
      // setas pros lados nas pernas
      drawArrow(g, -28, 60, -60, 80);
      drawArrow(g, 28, 60, 60, 80);
      break;
  }
}

function drawArrow(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number, x2: number, y2: number,
): void {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokePath();
  // Ponta da seta
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 14;
  const a1 = angle + Math.PI - 0.5;
  const a2 = angle + Math.PI + 0.5;
  g.fillTriangle(
    x2, y2,
    x2 + Math.cos(a1) * headLen, y2 + Math.sin(a1) * headLen,
    x2 + Math.cos(a2) * headLen, y2 + Math.sin(a2) * headLen,
  );
}
