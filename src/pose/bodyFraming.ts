import { KP, type PoseFrame } from './types.ts';

/**
 * Lógica pura de "corpo inteiro visível" — extraída da cena BodyCheck pra ser
 * usada tanto pelo Phaser (jogos) quanto pela tela de Preparação do app.
 */
export type FramingIssue =
  | 'noBody'
  | 'tooFar'
  | 'tooClose'
  | 'offLeft'
  | 'offRight'
  | 'headCut'
  | 'hipCut'
  | 'feetCut'
  | null;

/** 'standing' = de frente, em pé. 'floor' = deitado/apoiado no chão, câmera lateral e baixa. */
export type FramingMode = 'standing' | 'floor';

/** Faixa normalizada (0..1) do frame que está visível na tela (vídeo em object-fit: cover). */
export interface VisibleRect { x0: number; x1: number; y0: number; y1: number }

const FULL: VisibleRect = { x0: 0, x1: 1, y0: 0, y1: 1 };

const vis = (v: number | undefined): number => v ?? 1;

/** Regra original do BodyCheck (mantida idêntica quando `visible` é o frame inteiro). */
export function detectFramingIssue(frame: PoseFrame, visible: VisibleRect = FULL): FramingIssue {
  if (frame.confidence < 0.4) return 'noBody';
  const ls = frame.keypoints[KP.LEFT_SHOULDER];
  const rs = frame.keypoints[KP.RIGHT_SHOULDER];
  const lh = frame.keypoints[KP.LEFT_HIP];
  const rh = frame.keypoints[KP.RIGHT_HIP];
  const nose = frame.keypoints[KP.NOSE];
  if (!ls || !rs || !lh || !rh) return 'noBody';

  const w = visible.x1 - visible.x0;
  const h = visible.y1 - visible.y0;
  const nx = (x: number): number => (x - visible.x0) / w;
  const ny = (y: number): number => (y - visible.y0) / h;

  const shoulderWidth = Math.abs(rs.x - ls.x) / w;
  const hipCenterX = nx((lh.x + rh.x) / 2);
  const hipMaxY = ny(Math.max(lh.y, rh.y));
  const headY = ny(nose ? nose.y : Math.min(ls.y, rs.y) - 0.05);

  if (headY < 0.05) return 'headCut';
  if (hipMaxY > 0.92) return 'hipCut';
  if (shoulderWidth < 0.13) return 'tooFar';
  if (shoulderWidth > 0.42) return 'tooClose';
  if (hipCenterX < 0.32) return 'offRight';
  if (hipCenterX > 0.68) return 'offLeft';
  return null;
}

/**
 * Enquadramento pra exercícios no chão (câmera baixa, de lado): exige ombro,
 * quadril e tornozelo de pelo menos um lado visíveis e dentro da tela.
 */
export function detectFloorFramingIssue(frame: PoseFrame, visible: VisibleRect = FULL): FramingIssue {
  if (frame.confidence < 0.3) return 'noBody';
  const kp = frame.keypoints;
  const pick = (l: number, r: number) => (vis(kp[l]?.visibility) >= vis(kp[r]?.visibility) ? kp[l] : kp[r]);
  const sh = pick(KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER);
  const hip = pick(KP.LEFT_HIP, KP.RIGHT_HIP);
  const ank = pick(KP.LEFT_ANKLE, KP.RIGHT_ANKLE);
  const head = kp[KP.NOSE];
  if (!sh || !hip || vis(sh.visibility) < 0.4 || vis(hip.visibility) < 0.4) return 'noBody';
  if (!ank || vis(ank.visibility) < 0.3) return 'feetCut';
  const pts = [sh, hip, ank, ...(head ? [head] : [])];
  const xs = pts.map((p) => (p.x - visible.x0) / (visible.x1 - visible.x0));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  if (minX < 0.02) return 'offRight';
  if (maxX > 0.98) return 'offLeft';
  // Deitado (flexão) o corpo é largo; na cadeira (tríceps) é mais alto: vale o maior lado.
  const ys = pts.map((p) => (p.y - visible.y0) / (visible.y1 - visible.y0));
  if (Math.max(maxX - minX, Math.max(...ys) - Math.min(...ys)) < 0.3) return 'tooFar';
  return null;
}

export function detectIssueFor(mode: FramingMode, frame: PoseFrame, visible?: VisibleRect): FramingIssue {
  return mode === 'floor' ? detectFloorFramingIssue(frame, visible) : detectFramingIssue(frame, visible);
}

/**
 * Calcula a faixa do frame visível quando o vídeo (vw×vh) é mostrado em
 * object-fit: cover dentro de uma caixa bw×bh.
 */
export function coverVisibleRect(vw: number, vh: number, bw: number, bh: number): VisibleRect {
  if (!vw || !vh || !bw || !bh) return FULL;
  const scale = Math.max(bw / vw, bh / vh);
  const visW = bw / scale / vw;
  const visH = bh / scale / vh;
  return { x0: (1 - visW) / 2, x1: (1 + visW) / 2, y0: (1 - visH) / 2, y1: (1 + visH) / 2 };
}

/** Rastreador de estabilidade: "ok" contínuo por `stableMs` → pronto. */
export class FramingStabilizer {
  private okSince = 0;
  constructor(private readonly stableMs = 1500) {}
  reset(): void { this.okSince = 0; }
  /** Retorna progresso 0..1; 1 = estável o suficiente. */
  update(issue: FramingIssue, now: number): number {
    if (issue !== null) { this.okSince = 0; return 0; }
    if (this.okSince === 0) this.okSince = now;
    return Math.min(1, (now - this.okSince) / this.stableMs);
  }
}
