import * as Phaser from 'phaser';
import { KeypointOverlay } from '../../ui/keypointOverlay.ts';
import type { PoseFrame } from '../../pose/types.ts';
import { GAME_CONFIG } from '../config.ts';

/**
 * Renderiza vídeo da câmera (espelhado) + boneco de palito de keypoints como
 * fundo da cena Phaser. Usado nas cenas de mini-jogo pra orientar o jogador.
 *
 * Implementação: bake do video + overlay num canvas offscreen → expõe como
 * texture Phaser via `textures.addCanvas` → `refresh()` por frame.
 */
export class CameraBackdrop {
  private canvas: HTMLCanvasElement;
  private overlay: KeypointOverlay;
  private image: Phaser.GameObjects.Image;
  private rafId: number | null = null;
  private unsub: (() => void) | null = null;
  private lastFrame: PoseFrame | null = null;
  private video: HTMLVideoElement;
  private scene: Phaser.Scene;
  private textureKey: string;

  constructor(
    scene: Phaser.Scene,
    video: HTMLVideoElement,
    onSmoothedFrame: (cb: (f: PoseFrame) => void) => () => void,
    opacity = 0.55,
  ) {
    this.scene = scene;
    this.video = video;
    this.canvas = document.createElement('canvas');
    this.canvas.width = GAME_CONFIG.width;
    this.canvas.height = GAME_CONFIG.height;
    this.overlay = new KeypointOverlay(this.canvas);
    this.textureKey = `camera_bg_${scene.scene.key}_${Date.now()}`;
    scene.textures.addCanvas(this.textureKey, this.canvas);
    this.image = scene.add.image(0, 0, this.textureKey)
      .setOrigin(0, 0)
      .setDepth(-100)
      .setAlpha(opacity);

    this.unsub = onSmoothedFrame((f) => { this.lastFrame = f; });
    this.tick();
  }

  private tick = (): void => {
    const ctx = this.canvas.getContext('2d');
    if (ctx && this.video.videoWidth > 0) {
      ctx.save();
      ctx.translate(this.canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
      if (this.lastFrame) this.overlay.draw(this.lastFrame.keypoints, this.lastFrame.confidence);
      const tex = this.scene.textures.get(this.textureKey) as Phaser.Textures.CanvasTexture;
      tex.refresh();
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.unsub) { this.unsub(); this.unsub = null; }
    this.image.destroy();
    if (this.scene.textures.exists(this.textureKey)) this.scene.textures.remove(this.textureKey);
  }
}
