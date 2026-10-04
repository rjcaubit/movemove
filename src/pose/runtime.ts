import { PoseDetector } from './poseDetector.ts';
import { EmaSmoother } from './smoother.ts';
import { POSE_CONFIG } from './config.ts';
import type { PoseFrame } from './types.ts';

/**
 * Dono único da câmera + MediaPipe. App (treino) e jogos (Phaser) assinam o
 * mesmo stream suavizado — a câmera nunca é aberta duas vezes.
 */
export class PoseRuntime {
  readonly detector = new PoseDetector();
  private readonly smoother = new EmaSmoother(POSE_CONFIG.emaAlpha);
  private readonly smoother2 = new EmaSmoother(POSE_CONFIG.emaAlpha);
  private readonly subs = new Set<(f: PoseFrame) => void>();
  private readonly subs2 = new Set<(f: PoseFrame) => void>();
  private modelPromise: Promise<void> | null = null;
  private startPromise: Promise<void> | null = null;
  private running = false;
  /** Incrementa a cada stop(): um start em andamento de geração antiga se desfaz. */
  private generation = 0;
  lastFrame: PoseFrame | null = null;
  lastFrameAt = 0;

  constructor(readonly video: HTMLVideoElement) {
    this.detector.onFrame((raw) => {
      const frame: PoseFrame = { ...raw, keypoints: this.smoother.smooth(raw.keypoints) };
      this.lastFrame = frame;
      this.lastFrameAt = raw.timestamp;
      for (const cb of this.subs) cb(frame);
    });
    this.detector.onFrame2((raw) => {
      const frame: PoseFrame = { ...raw, keypoints: this.smoother2.smooth(raw.keypoints) };
      for (const cb of this.subs2) cb(frame);
    });
  }

  get isRunning(): boolean { return this.running; }

  /** Carrega modelo (1x), abre câmera e inicia o loop. Idempotente. */
  ensureStarted(onProgress?: (msg: string) => void, camera?: { wide?: boolean; portrait?: boolean; deviceId?: string }): Promise<void> {
    if (this.running) return Promise.resolve();
    if (this.startPromise) return this.startPromise;
    const gen = this.generation;
    this.startPromise = (async () => {
      if (!this.modelPromise) this.modelPromise = this.detector.loadModel(onProgress);
      try {
        await this.modelPromise;
      } catch (err) {
        this.modelPromise = null;
        throw err;
      }
      if (gen !== this.generation) throw new DOMException('Câmera cancelada', 'AbortError');
      await this.detector.openCamera(this.video, camera);
      if (gen !== this.generation) {
        this.detector.stop();
        this.video.srcObject = null;
        throw new DOMException('Câmera cancelada', 'AbortError');
      }
      this.smoother.reset();
      this.smoother2.reset();
      this.detector.start(this.video);
      this.running = true;
    })().finally(() => { this.startPromise = null; });
    return this.startPromise;
  }

  /** Troca de câmera: desliga a atual e liga a escolhida. */
  async switchCamera(camera: { wide?: boolean; portrait?: boolean; deviceId?: string }): Promise<void> {
    this.stop();
    await this.ensureStarted(undefined, camera);
  }

  /** Desliga câmera (modelo continua em memória). */
  stop(): void {
    this.generation += 1;
    if (!this.running) return;
    this.detector.stop();
    this.video.srcObject = null;
    this.running = false;
    this.lastFrame = null;
  }

  onFrame(cb: (f: PoseFrame) => void): () => void {
    this.subs.add(cb);
    return () => { this.subs.delete(cb); };
  }

  onFrame2(cb: (f: PoseFrame) => void): () => void {
    this.subs2.add(cb);
    return () => { this.subs2.delete(cb); };
  }
}

let _runtime: PoseRuntime | null = null;

export function getPoseRuntime(): PoseRuntime {
  if (_runtime) return _runtime;
  const video = document.getElementById('video') as HTMLVideoElement | null;
  if (!video) throw new Error('#video not found');
  _runtime = new PoseRuntime(video);
  return _runtime;
}
