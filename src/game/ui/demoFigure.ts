import * as Phaser from 'phaser';

/**
 * Stick figure animado pra demonstrar exercícios da Sessão Guiada.
 * Pose paramétrica via ângulos de junta; animação por funções senoidais.
 */
export interface FigurePose {
  ox: number;
  oy: number;
  tilt: number;
  laShoulder: number; laElbow: number;
  raShoulder: number; raElbow: number;
  llHip: number; llKnee: number;
  rlHip: number; rlKnee: number;
}

export const NEUTRAL_POSE: FigurePose = {
  ox: 0, oy: 0, tilt: 0,
  laShoulder: 0, laElbow: 0,
  raShoulder: 0, raElbow: 0,
  llHip: 0, llKnee: 0,
  rlHip: 0, rlKnee: 0,
};

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

const DEG = Math.PI / 180;

export type Animator = (t: number) => FigurePose;

const tri = (t: number, period: number): number => {
  const phase = (t % period) / period;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
};

const swing = (t: number, period: number): number => Math.sin((t / period) * Math.PI * 2);

export const ANIMATORS: Record<string, Animator> = {
  trunkRotation: (t) => ({
    ...NEUTRAL_POSE,
    raShoulder: 90 * DEG, raElbow: -80 * DEG,
    laShoulder: 90 * DEG, laElbow: -80 * DEG,
    tilt: swing(t, 2000) * 18 * DEG,
  }),

  highKneeHandsHead: (t) => {
    const p = swing(t, 1000);
    const left = p > 0;
    return {
      ...NEUTRAL_POSE,
      laShoulder: 150 * DEG, laElbow: -120 * DEG,
      raShoulder: 150 * DEG, raElbow: -120 * DEG,
      llHip: left ? 70 * DEG * Math.abs(p) : 0,
      llKnee: left ? -100 * DEG * Math.abs(p) : 0,
      rlHip: !left ? 70 * DEG * Math.abs(p) : 0,
      rlKnee: !left ? -100 * DEG * Math.abs(p) : 0,
    };
  },

  elbowToKneeSide: (t) => {
    const p = swing(t, 1200);
    const left = p > 0;
    const m = Math.abs(p);
    return {
      ...NEUTRAL_POSE,
      laShoulder: left ? (60 + 60 * m) * DEG : 30 * DEG,
      laElbow: left ? -110 * DEG * m : -20 * DEG,
      raShoulder: !left ? (60 + 60 * m) * DEG : 30 * DEG,
      raElbow: !left ? -110 * DEG * m : -20 * DEG,
      llHip: left ? 50 * DEG * m : 0,
      llKnee: left ? -70 * DEG * m : 0,
      rlHip: !left ? 50 * DEG * m : 0,
      rlKnee: !left ? -70 * DEG * m : 0,
      tilt: p * 8 * DEG,
    };
  },

  lateralStretch: (t) => {
    const p = swing(t, 2400);
    const left = p > 0;
    return {
      ...NEUTRAL_POSE,
      laShoulder: left ? 175 * DEG : 10 * DEG,
      raShoulder: !left ? 175 * DEG : 10 * DEG,
      tilt: -p * 22 * DEG,
    };
  },

  lungeArmsUp: (t) => {
    const p = tri(t, 1600);
    const phase = swing(t, 3200) > 0 ? 1 : -1;
    return {
      ...NEUTRAL_POSE,
      laShoulder: (40 + 130 * p) * DEG,
      raShoulder: (40 + 130 * p) * DEG,
      llHip: phase > 0 ? 35 * DEG * p : -10 * DEG * p,
      llKnee: phase > 0 ? -40 * DEG * p : 0,
      rlHip: phase < 0 ? 35 * DEG * p : -10 * DEG * p,
      rlKnee: phase < 0 ? -40 * DEG * p : 0,
      oy: -8 * (1 - p),
    };
  },

  squatLateralShift: (t) => {
    const sq = tri(t, 1200);
    const shift = swing(t, 2400);
    return {
      ...NEUTRAL_POSE,
      laShoulder: 70 * DEG, laElbow: -60 * DEG,
      raShoulder: 70 * DEG, raElbow: -60 * DEG,
      llHip: 25 * DEG * sq, llKnee: -55 * DEG * sq,
      rlHip: 25 * DEG * sq, rlKnee: -55 * DEG * sq,
      ox: shift * 14,
      oy: 18 * sq,
    };
  },

  crossKick: (t) => {
    const p = swing(t, 1100);
    const left = p > 0;
    const m = Math.abs(p);
    return {
      ...NEUTRAL_POSE,
      laShoulder: left ? 30 * DEG : (40 + 70 * m) * DEG,
      raShoulder: !left ? 30 * DEG : (40 + 70 * m) * DEG,
      llHip: left ? 0 : 70 * DEG * m,
      rlHip: !left ? 0 : 70 * DEG * m,
      tilt: p * 6 * DEG,
    };
  },

  twistKneePull: (t) => {
    const p = swing(t, 1400);
    const left = p > 0;
    const m = Math.abs(p);
    return {
      ...NEUTRAL_POSE,
      laShoulder: left ? 30 * DEG : (50 + 60 * m) * DEG,
      laElbow: left ? -20 * DEG : -100 * DEG * m,
      raShoulder: !left ? 30 * DEG : (50 + 60 * m) * DEG,
      raElbow: !left ? -20 * DEG : -100 * DEG * m,
      llHip: left ? 60 * DEG * m : 0,
      llKnee: left ? -90 * DEG * m : 0,
      rlHip: !left ? 60 * DEG * m : 0,
      rlKnee: !left ? -90 * DEG * m : 0,
      tilt: -p * 10 * DEG,
    };
  },

  lateralHopTwist: (t) => {
    const hop = Math.max(0, Math.sin((t / 600) * Math.PI * 2));
    const shift = swing(t, 1200);
    return {
      ...NEUTRAL_POSE,
      laShoulder: 60 * DEG, laElbow: -60 * DEG,
      raShoulder: 60 * DEG, raElbow: -60 * DEG,
      llHip: 5 * DEG, rlHip: 5 * DEG,
      llKnee: -10 * DEG, rlKnee: -10 * DEG,
      ox: shift * 18,
      oy: -hop * 12,
      tilt: -shift * 12 * DEG,
    };
  },
};
