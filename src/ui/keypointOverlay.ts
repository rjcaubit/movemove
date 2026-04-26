import type { Keypoint } from '../pose/types.ts';

const POSE_CONNECTIONS: Array<[number, number]> = [
  // tronco
  [11, 12], [11, 23], [12, 24], [23, 24],
  // braços
  [11, 13], [13, 15], [12, 14], [14, 16],
  // pernas
  [23, 25], [25, 27], [24, 26], [26, 28],
  // pés
  [27, 29], [27, 31], [28, 30], [28, 32],
  // face básica (olhos + boca)
  [2, 5], [9, 10],
];

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

  draw(keypoints: Keypoint[], confidence: number): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Connections
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

    // Keypoints
    for (let i = 0; i < keypoints.length; i++) {
      const k = keypoints[i];
      const v = k.visibility ?? 1;
      ctx.fillStyle = v > 0.6 ? 'rgba(76,217,100,1)' : 'rgba(255,69,58,0.9)';
      ctx.beginPath();
      ctx.arc(k.x * W, k.y * H, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
