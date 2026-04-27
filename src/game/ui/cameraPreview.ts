import { KeypointOverlay } from '../../ui/keypointOverlay.ts';
import type { PoseFrame } from '../../pose/types.ts';

export class CameraPreview {
  private host: HTMLElement;
  private canvas: HTMLCanvasElement;
  private overlay: KeypointOverlay;
  private video: HTMLVideoElement;
  private rafId: number | null = null;
  private lastFrame: PoseFrame | null = null;
  private unsub: (() => void) | null = null;

  constructor(host: HTMLElement, video: HTMLVideoElement, onSmoothedFrame: (cb: (f: PoseFrame) => void) => () => void) {
    this.host = host;
    this.video = video;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160; this.canvas.height = 90;
    host.innerHTML = '';
    host.appendChild(this.canvas);
    host.classList.remove('hidden');
    this.overlay = new KeypointOverlay(this.canvas);

    this.unsub = onSmoothedFrame((f) => { this.lastFrame = f; });
    this.tick();
  }

  private tick = (): void => {
    const ctx = this.canvas.getContext('2d');
    if (ctx && this.video.videoWidth > 0) {
      // Espelha o vídeo pra alinhar com o flip de x feito em poseDetector.toFrame.
      ctx.save();
      ctx.translate(this.canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
      if (this.lastFrame) this.overlay.draw(this.lastFrame.keypoints, this.lastFrame.confidence);
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.unsub) this.unsub();
    this.host.innerHTML = '';
    this.host.classList.add('hidden');
  }
}
