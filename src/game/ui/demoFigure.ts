import * as Phaser from 'phaser';

/**
 * Stick figure animado pra demonstrar exercícios da Sessão Guiada.
 * Pose paramétrica via ângulos de junta; animação por funções senoidais.
 */
import { NEUTRAL_POSE, type FigurePose } from '../../shared/figurePoses.ts';

export { NEUTRAL_POSE, ANIMATORS, type FigurePose, type Animator } from '../../shared/figurePoses.ts';

const SHOULDER_HALF = 26;
const HIP_HALF = 18;
const TORSO_LEN = 70;
const NECK_LEN = 14;
const HEAD_R = 14;
const ARM_SEG = 36;
const LEG_SEG = 46;

export class DemoFigure {
  readonly container: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private head: Phaser.GameObjects.Arc;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, color = 0x4cd964) {
    this.color = color;
    this.g = scene.add.graphics();
    this.head = scene.add.circle(0, 0, HEAD_R, 0x000000, 0).setStrokeStyle(3, color, 1);
    this.container = scene.add.container(x, y, [this.g, this.head]).setDepth(50);
    this.setPose(NEUTRAL_POSE);
  }

  setPose(p: FigurePose): void {
    const g = this.g;
    g.clear();
    g.lineStyle(4, this.color, 1);
    const cx = p.ox;
    const hipY = p.oy + TORSO_LEN / 2;
    const shoY = p.oy - TORSO_LEN / 2;

    const cos = Math.cos(p.tilt);
    const sin = Math.sin(p.tilt);
    const rotateAroundHips = (lx: number, ly: number): { x: number; y: number } => {
      const dx = lx - cx;
      const dy = ly - hipY;
      return { x: cx + dx * cos - dy * sin, y: hipY + dx * sin + dy * cos };
    };

    const lShoulder = rotateAroundHips(cx - SHOULDER_HALF, shoY);
    const rShoulder = rotateAroundHips(cx + SHOULDER_HALF, shoY);
    const lHip = { x: cx - HIP_HALF, y: hipY };
    const rHip = { x: cx + HIP_HALF, y: hipY };
    const neck = rotateAroundHips(cx, shoY - NECK_LEN);

    g.beginPath();
    g.moveTo(lShoulder.x, lShoulder.y);
    g.lineTo(rShoulder.x, rShoulder.y);
    g.lineTo(rHip.x, rHip.y);
    g.lineTo(lHip.x, lHip.y);
    g.lineTo(lShoulder.x, lShoulder.y);
    g.strokePath();

    g.beginPath();
    g.moveTo((lShoulder.x + rShoulder.x) / 2, (lShoulder.y + rShoulder.y) / 2);
    g.lineTo(neck.x, neck.y);
    g.strokePath();

    this.head.setPosition(neck.x, neck.y - HEAD_R);

    const drawLimb = (
      origin: { x: number; y: number },
      a1: number,
      a2: number,
      seg1: number,
      seg2: number,
      mirror: number,
    ): void => {
      const ang1 = a1 * mirror + p.tilt;
      const j1x = origin.x + Math.sin(ang1) * seg1;
      const j1y = origin.y + Math.cos(ang1) * seg1;
      const ang2 = ang1 + a2 * mirror;
      const j2x = j1x + Math.sin(ang2) * seg2;
      const j2y = j1y + Math.cos(ang2) * seg2;
      g.beginPath();
      g.moveTo(origin.x, origin.y);
      g.lineTo(j1x, j1y);
      g.lineTo(j2x, j2y);
      g.strokePath();
      g.fillStyle(this.color, 1);
      g.fillCircle(j1x, j1y, 3);
      g.fillCircle(j2x, j2y, 4);
    };

    drawLimb(lShoulder, p.laShoulder, p.laElbow, ARM_SEG, ARM_SEG, -1);
    drawLimb(rShoulder, p.raShoulder, p.raElbow, ARM_SEG, ARM_SEG, 1);
    drawLimb(lHip, p.llHip, p.llKnee, LEG_SEG, LEG_SEG, -1);
    drawLimb(rHip, p.rlHip, p.rlKnee, LEG_SEG, LEG_SEG, 1);
  }

  destroy(): void {
    this.container.destroy();
  }
}
