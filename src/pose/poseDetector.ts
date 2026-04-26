import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { POSE_CONFIG } from './config.ts';
import type { Keypoint, PoseFrame } from './types.ts';

const RELEVANT_KP_INDICES = [0, 2, 5, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private frameCallbacks = new Set<(frame: PoseFrame) => void>();

  async loadModel(onProgress?: (msg: string) => void): Promise<void> {
    onProgress?.('Inicializando WASM…');
    const vision = await FilesetResolver.forVisionTasks(POSE_CONFIG.wasmPath);
    onProgress?.('Baixando modelo…');
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: POSE_CONFIG.modelAssetPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: POSE_CONFIG.numPoses,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    onProgress?.('Pronto');
  }

  async openCamera(video: HTMLVideoElement): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: POSE_CONFIG.videoIdealWidth },
        height: { ideal: POSE_CONFIG.videoIdealHeight },
      },
      audio: false,
    });
    video.srcObject = this.stream;
    await new Promise<void>((resolve) => {
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        resolve();
      };
      video.addEventListener('loadedmetadata', onLoaded);
    });
    await video.play();
  }

  start(video: HTMLVideoElement): void {
    if (!this.landmarker) throw new Error('PoseDetector: loadModel() first');
    let lastTs = -1;
    const tick = () => {
      const ts = performance.now();
      if (video.currentTime !== lastTs && video.readyState >= 2) {
        lastTs = video.currentTime;
        const result = this.landmarker!.detectForVideo(video, ts);
        const frame = this.toFrame(result, ts);
        if (frame) {
          for (const cb of this.frameCallbacks) cb(frame);
        }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
  }

  onFrame(cb: (frame: PoseFrame) => void): () => void {
    this.frameCallbacks.add(cb);
    return () => this.frameCallbacks.delete(cb);
  }

  private toFrame(result: PoseLandmarkerResult, ts: number): PoseFrame | null {
    const lm = result.landmarks[0];
    if (!lm || lm.length === 0) return null;
    const keypoints: Keypoint[] = lm.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      visibility: p.visibility,
    }));
    let sum = 0;
    let n = 0;
    for (const i of RELEVANT_KP_INDICES) {
      const v = keypoints[i]?.visibility;
      if (typeof v === 'number') {
        sum += v;
        n++;
      }
    }
    const confidence = n > 0 ? sum / n : 0;
    return { keypoints, confidence, timestamp: ts };
  }
}
