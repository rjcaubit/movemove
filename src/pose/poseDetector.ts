import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { POSE_CONFIG } from './config.ts';
import { strings } from '../i18n/strings.ts';
import type { Keypoint, PoseFrame } from './types.ts';

const RELEVANT_KP_INDICES = [0, 2, 5, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private frameCallbacks = new Set<(frame: PoseFrame) => void>();
  private frame2Callbacks = new Set<(frame: PoseFrame) => void>();

  async loadModel(onProgress?: (msg: string) => void): Promise<void> {
    onProgress?.(strings.loading.statusInitWasm);
    const vision = await FilesetResolver.forVisionTasks(POSE_CONFIG.wasmPath);
    onProgress?.(strings.loading.statusDownloadingModel);
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: POSE_CONFIG.modelAssetPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: POSE_CONFIG.numPoses,
      minPoseDetectionConfidence: POSE_CONFIG.mediapipeMinConfidence,
      minPosePresenceConfidence: POSE_CONFIG.mediapipeMinConfidence,
      minTrackingConfidence: POSE_CONFIG.mediapipeMinConfidence,
    });
    onProgress?.(strings.loading.statusReady);
  }

  /**
   * @param opts.wide  Campo de visão máximo: pede 4:3 (formato nativo do
   *   sensor, sem corte) na orientação da tela e aplica o zoom mínimo que a
   *   câmera suportar. Sem `opts`, mantém o comportamento original (16:9),
   *   do qual as heurísticas dos jogos dependem.
   */
  async openCamera(video: HTMLVideoElement, opts?: { wide?: boolean; portrait?: boolean; deviceId?: string }): Promise<void> {
    // Em contextos não-seguros (IP LAN sem HTTPS), navigator.mediaDevices é
    // undefined. Falhar com erro nomeado para o orquestrador classificar.
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new DOMException(
        'navigator.mediaDevices unavailable — requires HTTPS or localhost',
        'SecurityError',
      );
    }
    if (opts?.wide) {
      const portrait = opts.portrait ?? false;
      const w = portrait ? 480 : 640;
      const h = portrait ? 640 : 480;
      const size = { width: { ideal: w }, height: { ideal: h }, aspectRatio: { ideal: w / h } };
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: opts.deviceId ? { deviceId: { exact: opts.deviceId }, ...size } : { facingMode: 'user', ...size },
          audio: false,
        });
      } catch (err) {
        // Câmera salva sumiu (outro aparelho, permissão trocada): volta pra frontal.
        if (!opts.deviceId) throw err;
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', ...size }, audio: false });
      }
      await this.zoomOutFully();
    } else {
      // Detecta modo retrato pra trocar dimensões e pedir aspect portrait do device
      const portrait = (() => {
        try { return new URLSearchParams(window.location.search).get('portrait') === '1'; }
        catch { return false; }
      })();
      const w = portrait ? POSE_CONFIG.videoIdealHeight : POSE_CONFIG.videoIdealWidth;
      const h = portrait ? POSE_CONFIG.videoIdealWidth : POSE_CONFIG.videoIdealHeight;
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: w },
          height: { ideal: h },
          aspectRatio: { ideal: w / h },
        },
        audio: false,
      });
    }
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

  /** Câmera em uso: id e se é frontal (vídeo deve ser espelhado na tela). */
  activeCamera(): { deviceId: string; label: string; front: boolean } | null {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return null;
    const st = track.getSettings();
    const label = track.label ?? '';
    const front = st.facingMode ? st.facingMode === 'user' : !/back|rear|traseira|environment/i.test(label);
    return { deviceId: st.deviceId ?? '', label, front };
  }

  /** Câmeras de vídeo do aparelho (labels só aparecem depois da permissão). */
  static async listCameras(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'videoinput');
  }

  /** Aplica o menor zoom suportado (alguns celulares abrem a frontal já com zoom). */
  private async zoomOutFully(): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') return;
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
      if (caps.zoom && typeof caps.zoom.min === 'number') {
        await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as MediaTrackConstraintSet] });
      }
    } catch { /* sem suporte a zoom: segue normal */ }
  }

  start(video: HTMLVideoElement, onError?: (err: unknown) => void): void {
    if (!this.landmarker) throw new Error('PoseDetector: loadModel() first');
    let lastTs = -1;
    const tick = () => {
      const ts = performance.now();
      if (video.currentTime !== lastTs && video.readyState >= 2) {
        lastTs = video.currentTime;
        try {
          const result = this.landmarker!.detectForVideo(video, ts);
          const frame = this.toFrameAt(result, ts, 0);
          if (frame) for (const cb of this.frameCallbacks) cb(frame);
          const frame2 = this.toFrameAt(result, ts, 1);
          if (frame2) for (const cb of this.frame2Callbacks) cb(frame2);
        } catch (err) {
          // Loop não pode morrer por uma falha pontual de inferência (ex: WASM
          // momentaneamente indisponível, perda de contexto GPU). Logar e seguir;
          // se onError for passado, o orquestrador pode mostrar feedback.
          console.error('PoseDetector.tick:', err);
          onError?.(err);
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

  onFrame2(cb: (frame: PoseFrame) => void): () => void {
    this.frame2Callbacks.add(cb);
    return () => this.frame2Callbacks.delete(cb);
  }

  private toFrameAt(result: PoseLandmarkerResult, ts: number, idx: number): PoseFrame | null {
    const lm = result.landmarks[idx];
    if (!lm || lm.length === 0) return null;
    const keypoints: Keypoint[] = lm.map((p) => ({
      x: 1 - p.x,
      y: p.y,
      z: p.z,
      visibility: p.visibility,
    }));
    let sum = 0;
    let n = 0;
    for (const i of RELEVANT_KP_INDICES) {
      const v = keypoints[i]?.visibility;
      if (typeof v === 'number') { sum += v; n++; }
    }
    const confidence = n > 0 ? sum / n : 0;
    return { keypoints, confidence, timestamp: ts };
  }
}
