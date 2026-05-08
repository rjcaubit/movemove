import type { Keypoint } from '../pose/types.ts';

const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [27, 31], [28, 30], [28, 32],
  [2, 5], [9, 10],
];

export interface HandGlow {
  idx: number;
  color: string;
  alpha?: number;
}

export class KeypointOverlay {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  resizeToVideo(video: HTMLVideoElement): void {
    this.canvas.width = video.videoWidth || 640;
    this.canvas.height = video.videoHeight || 480;
  }

  clear(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(keypoints: Keypoint[], confidence: number, glows?: HandGlow[]): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;

    const skeletonAlpha = glows && glows.length > 0 ? 0.15 : 1;

    ctx.save();
    ctx.globalAlpha = skeletonAlpha;
    ctx.strokeStyle = confidence > 0.6 ? 'rgba(76,217,100,0.9)' : 'rgba(255,214,10,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [a, b] of POSE_CONNECTIONS) {
      const ka = keypoints[a];
      const kb = keypoints[b];
      if (!ka || !kb) continue;
      ctx.moveTo(ka.x * W, ka.y * H);
      ctx.lineTo(kb.x * W, kb.y * H);
    }
    ctx.stroke();

    for (let i = 0; i < keypoints.length; i++) {
      const k = keypoints[i];
      const v = k.visibility ?? 1;
      ctx.fillStyle = v > 0.6 ? 'rgba(76,217,100,1)' : 'rgba(255,69,58,0.9)';
      ctx.beginPath();
      ctx.arc(k.x * W, k.y * H, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (!glows || glows.length === 0) return;

    for (const g of glows) {
      const kp = keypoints[g.idx];
      if (!kp) continue;
      const px = kp.x * W;
      const py = kp.y * H;
      const alpha = g.alpha ?? 1;

      ctx.save();
      ctx.globalAlpha = alpha * 0.25;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 40;
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(px, py, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.6;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, 26, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.95;
      ctx.shadowBlur = 10;
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
