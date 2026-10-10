import { KP, type Keypoint, type PoseFrame } from '../../pose/types.ts';
import { coverVisibleRect, type VisibleRect } from '../../pose/bodyFraming.ts';
import { h } from './dom.ts';

/**
 * Vídeo da câmera espelhado (object-fit: cover) + esqueleto desenhado em canvas
 * por cima. Recebe o MediaStream do runtime de pose — não abre câmera.
 */
const BONES: Array<[number, number]> = [
  [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER],
  [KP.LEFT_SHOULDER, KP.LEFT_ELBOW], [KP.LEFT_ELBOW, KP.LEFT_WRIST],
  [KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW], [KP.RIGHT_ELBOW, KP.RIGHT_WRIST],
  [KP.LEFT_SHOULDER, KP.LEFT_HIP], [KP.RIGHT_SHOULDER, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.LEFT_KNEE], [KP.LEFT_KNEE, KP.LEFT_ANKLE],
  [KP.RIGHT_HIP, KP.RIGHT_KNEE], [KP.RIGHT_KNEE, KP.RIGHT_ANKLE],
];

const JOINTS = [
  KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER, KP.LEFT_ELBOW, KP.RIGHT_ELBOW, KP.LEFT_WRIST, KP.RIGHT_WRIST,
  KP.LEFT_HIP, KP.RIGHT_HIP, KP.LEFT_KNEE, KP.RIGHT_KNEE, KP.LEFT_ANKLE, KP.RIGHT_ANKLE,
];

export interface SkeletonStyle {
  color: string;
  /** Articulações destacadas (ex: amplitude insuficiente) e sua cor. */
  highlight?: { joints: readonly number[]; color: string } | null;
  visible?: boolean;
  /** Valor ao vivo ao lado de uma articulação (ex: "98°"), com arco na cor de destaque. */
  badges?: ReadonlyArray<{ joint: number; text: string }> | null;
}

const BADGE_COLOR = '#e8843c';

/**
 * 'auto' = preenche a tela (cover) só quando o corte é pequeno; se o cover
 * esconder mais de ~20% do quadro, mostra o quadro inteiro (contain).
 */
export type FitMode = 'auto' | 'cover' | 'contain';

const MAX_AUTO_CROP = 0.2;

export class CameraView {
  readonly el: HTMLDivElement;
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private frame: PoseFrame | null = null;
  private style: SkeletonStyle = { color: '#3ec2dc' };
  private rafId: number | null = null;
  private ro: ResizeObserver | null = null;
  private fitMode: FitMode = 'auto';
  private appliedFit: 'cover' | 'contain' | null = null;
  private mirrored = true;
  private lastResumeAt = 0;

  constructor(className = '') {
    this.video = h('video', { class: 'cam-video', playsInline: true, muted: true, autoplay: true });
    this.video.setAttribute('playsinline', '');
    this.canvas = h('canvas', { class: 'cam-canvas' });
    this.el = h('div', { class: `cam ${className}` }, this.video, this.canvas);
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.el);
    }
    this.loop();
  }

  attach(stream: MediaStream | null): void {
    if (this.video.srcObject === stream) return;
    this.video.srcObject = stream;
    // Faixas do modo "ver tudo" ficam lisas (o listrado é só placeholder sem câmera).
    this.video.style.background = stream ? '#14181d' : '';
    if (stream) void this.video.play().catch(() => { /* autoplay bloqueado: segue sem vídeo */ });
  }

  setFrame(f: PoseFrame | null): void { this.frame = f; }

  setFit(mode: FitMode): void { this.fitMode = mode; }

  /**
   * Frontal = espelhado (como um espelho). Traseira = sem espelho. Os keypoints
   * já chegam espelhados do detector, então sem espelho o x é desvirado aqui.
   */
  setMirrored(m: boolean): void {
    this.mirrored = m;
    this.video.style.transform = m ? 'scaleX(-1)' : 'none';
  }
  get fit(): FitMode { return this.fitMode; }

  /** Ajuste efetivo agora (resolve o 'auto' pelo formato do vídeo × caixa). */
  effectiveFit(): 'cover' | 'contain' {
    if (this.fitMode !== 'auto') return this.fitMode;
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    const r = this.el.getBoundingClientRect();
    if (!vw || !vh || !r.width || !r.height) return 'cover';
    const va = vw / vh;
    const ba = r.width / r.height;
    const crop = 1 - Math.min(va, ba) / Math.max(va, ba);
    return crop > MAX_AUTO_CROP ? 'contain' : 'cover';
  }
  setStyle(st: SkeletonStyle): void { this.style = st; }

  /** Faixa do frame da câmera visível na caixa (pra checagem de enquadramento). */
  visibleRect(): VisibleRect {
    if (this.effectiveFit() === 'contain') return { x0: 0, x1: 1, y0: 0, y1: 1 };
    const r = this.el.getBoundingClientRect();
    return coverVisibleRect(this.video.videoWidth, this.video.videoHeight, r.width, r.height);
  }

  private resize(): void {
    const r = this.el.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
  }

  private loop = (): void => {
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * O navegador pausa o vídeo quando ele sai da página (tela de descanso);
   * ao voltar, ficaria congelado no último quadro.
   */
  private resumeIfPaused(): void {
    if (!this.video.paused || !this.video.srcObject || !this.video.isConnected) return;
    const now = performance.now();
    if (now - this.lastResumeAt < 300) return;
    this.lastResumeAt = now;
    void this.video.play().catch(() => { /* autoplay bloqueado: segue sem vídeo */ });
  }

  private draw(): void {
    this.resumeIfPaused();
    const fit = this.effectiveFit();
    if (fit !== this.appliedFit) {
      this.video.style.objectFit = fit;
      this.appliedFit = fit;
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    const f = this.frame;
    if (!f || this.style.visible === false) return;
    const vw = this.video.videoWidth || 16;
    const vh = this.video.videoHeight || 9;
    const scale = fit === 'cover' ? Math.max(cw / vw, ch / vh) : Math.min(cw / vw, ch / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const ox = (cw - dw) / 2;
    const oy = (ch - dh) / 2;
    const P = (k: Keypoint): [number, number] => [ox + (this.mirrored ? k.x : 1 - k.x) * dw, oy + k.y * dh];
    const ok = (i: number): Keypoint | null => {
      const k = f.keypoints[i];
      return k && (k.visibility ?? 1) >= 0.35 ? k : null;
    };
    const unit = Math.max(2.5, Math.min(cw, ch) / 95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Tronco fechado, com preenchimento leve.
    const trunk = [ok(KP.LEFT_SHOULDER), ok(KP.RIGHT_SHOULDER), ok(KP.RIGHT_HIP), ok(KP.LEFT_HIP)];
    if (trunk.every((k) => k)) {
      ctx.beginPath();
      trunk.forEach((k, i) => { const [x, y] = P(k!); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.closePath();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = this.style.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = unit;
    ctx.strokeStyle = this.style.color;
    ctx.shadowColor = this.style.color;
    ctx.shadowBlur = unit * 2.2;
    ctx.beginPath();
    for (const [a, b] of BONES) {
      const ka = ok(a); const kb = ok(b);
      if (!ka || !kb) continue;
      const [x1, y1] = P(ka); const [x2, y2] = P(kb);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    const hl = this.style.highlight;
    for (const j of JOINTS) {
      const k = ok(j);
      if (!k) continue;
      const [x, y] = P(k);
      const isHl = !!hl && hl.joints.includes(j);
      ctx.fillStyle = isHl ? hl!.color : this.style.color;
      ctx.beginPath();
      ctx.arc(x, y, unit * (isHl ? 1.9 : 1.3), 0, Math.PI * 2);
      ctx.fill();
    }
    const nose = ok(KP.NOSE);
    if (nose) {
      const [x, y] = P(nose);
      ctx.fillStyle = this.style.color;
      ctx.beginPath();
      ctx.arc(x, y, unit * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawBadges(ctx, ok, P, unit, cw);
  }

  /** Arco + etiqueta com o valor ao vivo, do lado de fora do corpo. */
  private drawBadges(
    ctx: CanvasRenderingContext2D, ok: (i: number) => Keypoint | null, P: (k: Keypoint) => [number, number], unit: number, cw: number,
  ): void {
    const badges = this.style.badges;
    if (!badges || badges.length === 0) return;
    const lh = ok(KP.LEFT_HIP); const rh = ok(KP.RIGHT_HIP);
    const midX = lh && rh ? (P(lh)[0] + P(rh)[0]) / 2 : cw / 2;
    const fontPx = Math.round(unit * 4.6);
    ctx.font = `700 ${fontPx}px Sora, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    for (const b of badges) {
      const k = ok(b.joint);
      if (!k) continue;
      const [x, y] = P(k);
      const dir = x >= midX ? 1 : -1;
      const r = unit * 5.2;
      ctx.lineWidth = unit * 0.9;
      ctx.strokeStyle = BADGE_COLOR;
      ctx.beginPath();
      if (dir > 0) ctx.arc(x, y, r, -Math.PI / 3, Math.PI / 3);
      else ctx.arc(x, y, r, Math.PI * 2 / 3, Math.PI * 4 / 3);
      ctx.stroke();
      const tw = ctx.measureText(b.text).width;
      const padX = fontPx * 0.55;
      const bw = tw + padX * 2;
      const bh = fontPx * 1.7;
      let bx = dir > 0 ? x + r + unit * 2 : x - r - unit * 2 - bw;
      bx = Math.max(unit, Math.min(cw - bw - unit, bx));
      const by = y - bh / 2;
      ctx.fillStyle = 'rgba(20, 24, 29, .86)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, bh / 2);
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, unit * 0.35);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(b.text, bx + padX, y + fontPx * 0.05);
    }
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.ro?.disconnect();
    this.video.srcObject = null;
  }
}
