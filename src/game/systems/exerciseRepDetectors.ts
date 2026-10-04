import { KP, type PoseFrame, type Keypoint } from '../../pose/types.ts';
import { trunkRotationAngle } from '../../pose/spatialQueries.ts';

/**
 * Detectores de repetição por exercício. Cada detector conta reps e mede a
 * amplitude (0–1) de cada uma: 1 = movimento completo (ex: agachamento com
 * quadril na altura do joelho), 0 = quase nada.
 *
 * `process()` continua devolvendo `true` exatamente quando uma rep termina —
 * contrato usado pela Sessão Guiada do módulo de jogos.
 */
export interface RepDetector {
  reset(): void;
  /** Process a frame; return true exactly when a rep just completed. */
  process(frame: PoseFrame): boolean;
  /** Amplitude 0–1 da última rep concluída. */
  readonly lastAmplitude: number;
  /** Amplitude 0–1 do movimento em curso (anel ao vivo). */
  readonly liveAmplitude: number;
  /** Articulações-chave (índices KP) pra colorir no esqueleto. */
  readonly focusJoints: readonly number[];
}

/** Isométricos (prancha): informa se está segurando a posição e com que qualidade. */
export interface HoldDetector {
  reset(): void;
  /** true enquanto a posição está correta. */
  process(frame: PoseFrame): boolean;
  /** Qualidade 0–1 da posição (alinhamento). */
  readonly liveAmplitude: number;
  readonly focusJoints: readonly number[];
}

const dist = (a: Keypoint, b: Keypoint): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const visible = (kp: Keypoint | undefined, min = 0.3): kp is Keypoint =>
  !!kp && (kp.visibility ?? 1) >= min;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Ângulo (graus) em b formado por a-b-c. */
export function jointAngle(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const v1x = a.x - b.x; const v1y = a.y - b.y;
  const v2x = c.x - b.x; const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n < 1e-6) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / n))) * 180) / Math.PI;
}

/** Escolhe o lado (L/R) mais visível — exercícios de perfil. */
function bestSide(frame: PoseFrame, pairs: Array<[number, number]>): 'L' | 'R' {
  let l = 0; let r = 0;
  for (const [li, ri] of pairs) {
    l += frame.keypoints[li]?.visibility ?? 0;
    r += frame.keypoints[ri]?.visibility ?? 0;
  }
  return l >= r ? 'L' : 'R';
}

const REFRACTORY_MS = 350;

abstract class AmplitudeBase {
  lastAmplitude = 0;
  liveAmplitude = 0;
  protected peak = 0;
  protected lastRepAt = 0;
  abstract readonly focusJoints: readonly number[];
  protected resetAmp(): void {
    this.lastAmplitude = 0;
    this.liveAmplitude = 0;
    this.peak = 0;
    this.lastRepAt = 0;
  }
  protected track(progress: number): void {
    this.liveAmplitude = clamp01(progress);
    if (progress > this.peak) this.peak = progress;
  }
  protected finish(now: number): void {
    this.lastAmplitude = clamp01(this.peak);
    this.peak = 0;
    this.lastRepAt = now;
  }
}

/**
 * Movimentos alternados (lado L/R). Uma rep = uma excursão completa pra um
 * lado: começa quando o sinal passa do limiar e termina quando volta — aí a
 * amplitude é o pico da excursão. Mantém a regra antiga de alternância.
 */
abstract class AlternatingDetector extends AmplitudeBase implements RepDetector {
  protected lastSide: 'L' | 'R' | null = null;
  private active: 'L' | 'R' | null = null;
  reset(): void { this.lastSide = null; this.active = null; this.resetAmp(); }

  /**
   * @param side lado dominante neste frame (ou null)
   * @param progress sinal normalizado: 1 = amplitude completa
   * @param threshold progresso mínimo pra considerar movimento
   */
  protected step(side: 'L' | 'R' | null, progress: number, threshold: number, now: number): boolean {
    this.liveAmplitude = clamp01(progress);
    if (this.active === null) {
      if (side && progress >= threshold && side !== this.lastSide) {
        this.active = side;
        this.peak = progress;
      }
      return false;
    }
    if (side === this.active && progress > this.peak) this.peak = progress;
    const ended = side !== this.active || progress < threshold * 0.55;
    if (!ended) return false;
    const endedSide = this.active;
    this.active = null;
    if (now - this.lastRepAt < REFRACTORY_MS) return false;
    this.lastSide = endedSide;
    this.finish(now);
    // Troca direta de lado: a nova excursão já começa neste frame.
    if (side && side !== endedSide && progress >= threshold) {
      this.active = side;
      this.peak = progress;
    }
    return true;
  }
  abstract process(frame: PoseFrame): boolean;
}

export class TrunkRotationRep extends AlternatingDetector {
  readonly focusJoints = [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER];
  process(frame: PoseFrame): boolean {
    const angle = trunkRotationAngle(frame);
    const dev = ((angle + 540) % 360) - 180;
    const TARGET = 28;
    const side: 'L' | 'R' | null = Math.abs(dev) < 2 ? null : dev > 0 ? 'L' : 'R';
    return this.step(side, Math.abs(dev) / TARGET, 12 / TARGET, frame.timestamp);
  }
}

export class HighKneeRep extends AlternatingDetector {
  readonly focusJoints = [KP.LEFT_KNEE, KP.RIGHT_KNEE];
  process(frame: PoseFrame): boolean {
    const lh = frame.keypoints[KP.LEFT_HIP];
    const rh = frame.keypoints[KP.RIGHT_HIP];
    const lk = frame.keypoints[KP.LEFT_KNEE];
    const rk = frame.keypoints[KP.RIGHT_KNEE];
    if (!visible(lh) || !visible(rh) || !visible(lk) || !visible(rk)) return false;
    const hipY = (lh.y + rh.y) / 2;
    // Coxa da perna de apoio como régua: joelho na altura do quadril ≈ 1.
    const thigh = Math.max(0.04, Math.max(lk.y, rk.y) - hipY);
    const lLift = (rk.y - lk.y) / thigh;
    const rLift = (lk.y - rk.y) / thigh;
    const TARGET = 0.85;
    let side: 'L' | 'R' | null = null;
    let lift = 0;
    if (lLift > rLift && lLift > 0.1) { side = 'L'; lift = lLift; }
    else if (rLift > 0.1) { side = 'R'; lift = rLift; }
    return this.step(side, lift / TARGET, 0.4 / TARGET, frame.timestamp);
  }
}

/** Hand crosses near opposite-side knee/lower body. */
export class CrossBodyRep extends AlternatingDetector {
  readonly focusJoints = [KP.LEFT_WRIST, KP.RIGHT_WRIST, KP.LEFT_KNEE, KP.RIGHT_KNEE];
  process(frame: PoseFrame): boolean {
    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];
    const lk = frame.keypoints[KP.LEFT_KNEE];
    const rk = frame.keypoints[KP.RIGHT_KNEE];
    if (!visible(lw) || !visible(rw) || !visible(lk) || !visible(rk)) return false;
    const FAR = 0.34;
    const BEST = 0.07;
    const toProgress = (d: number): number => (FAR - d) / (FAR - BEST);
    const lp = toProgress(dist(lw, rk));
    const rp = toProgress(dist(rw, lk));
    let side: 'L' | 'R' | null = null;
    if (lp > rp && lp > 0) side = 'L';
    else if (rp > 0) side = 'R';
    const p = side === 'L' ? lp : side === 'R' ? rp : 0;
    return this.step(side, p, toProgress(0.18), frame.timestamp);
  }
}

/** Lateral torso lean (shoulder line tilt) past threshold, alternating. */
export class LateralLeanRep extends AlternatingDetector {
  readonly focusJoints = [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER];
  process(frame: PoseFrame): boolean {
    const ls = frame.keypoints[KP.LEFT_SHOULDER];
    const rs = frame.keypoints[KP.RIGHT_SHOULDER];
    const lh = frame.keypoints[KP.LEFT_HIP];
    const rh = frame.keypoints[KP.RIGHT_HIP];
    if (!visible(ls) || !visible(rs) || !visible(lh) || !visible(rh)) return false;
    const shoMidX = (ls.x + rs.x) / 2;
    const hipMidX = (lh.x + rh.x) / 2;
    const dx = shoMidX - hipMidX;
    const width = Math.max(0.05, Math.abs(rs.x - ls.x));
    const TARGET = 0.55;
    const p = Math.abs(dx) / width / TARGET;
    const side: 'L' | 'R' | null = Math.abs(dx) < 0.005 ? null : dx < 0 ? 'L' : 'R';
    return this.step(side, p, 0.05 / width / TARGET, frame.timestamp);
  }
}

/** Both wrists above shoulders. Counts each cycle (sobe e desce). */
export class ArmsUpCycleRep extends AmplitudeBase implements RepDetector {
  readonly focusJoints = [KP.LEFT_WRIST, KP.RIGHT_WRIST];
  private isUp = false;
  reset(): void { this.isUp = false; this.resetAmp(); }
  process(frame: PoseFrame): boolean {
    const ls = frame.keypoints[KP.LEFT_SHOULDER];
    const rs = frame.keypoints[KP.RIGHT_SHOULDER];
    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];
    const lh = frame.keypoints[KP.LEFT_HIP];
    const rh = frame.keypoints[KP.RIGHT_HIP];
    if (!visible(ls) || !visible(rs) || !visible(lw) || !visible(rw)) return false;
    const shoY = (ls.y + rs.y) / 2;
    const torso = visible(lh) && visible(rh) ? Math.max(0.08, (lh.y + rh.y) / 2 - shoY) : 0.25;
    // Pulso mais baixo manda: os dois braços precisam subir.
    const lowWrist = Math.max(lw.y, rw.y);
    const p = (shoY - lowWrist) / (torso * 0.8);
    this.track(p);
    const now = frame.timestamp;
    const up = lw.y < shoY - 0.02 && rw.y < shoY - 0.02;
    if (up && !this.isUp && now - this.lastRepAt > 600) {
      this.isUp = true;
      return false;
    }
    if (this.isUp) {
      const shoYHigh = shoY + 0.05;
      if (lw.y > shoYHigh && rw.y > shoYHigh) {
        this.isUp = false;
        this.finish(now);
        return true;
      }
    }
    return false;
  }
}

/**
 * Agachamento pela queda do quadril, normalizada pelo comprimento da coxa em pé.
 * `targetFrac` = queda que vale amplitude 1 (1 ≈ quadril na altura do joelho, ~90°).
 */
export class SquatCycleRep extends AmplitudeBase implements RepDetector {
  readonly focusJoints = [KP.LEFT_KNEE, KP.RIGHT_KNEE];
  private baseHipY: number | null = null;
  private thigh = 0.2;
  private isDown = false;
  constructor(private readonly targetFrac = 0.85, private readonly downFrac = 0.22) { super(); }
  reset(): void { this.baseHipY = null; this.isDown = false; this.thigh = 0.2; this.resetAmp(); }
  process(frame: PoseFrame): boolean {
    const lh = frame.keypoints[KP.LEFT_HIP];
    const rh = frame.keypoints[KP.RIGHT_HIP];
    if (!visible(lh) || !visible(rh)) return false;
    const hipY = (lh.y + rh.y) / 2;
    const lk = frame.keypoints[KP.LEFT_KNEE];
    const rk = frame.keypoints[KP.RIGHT_KNEE];
    const kneeY = visible(lk) && visible(rk) ? (lk.y + rk.y) / 2 : null;
    if (this.baseHipY === null) {
      this.baseHipY = hipY;
      if (kneeY !== null) this.thigh = Math.max(0.06, kneeY - hipY);
      return false;
    }
    // Baseline acompanha devagar (usuário se mexendo), e só quando em pé.
    if (!this.isDown) {
      this.baseHipY = this.baseHipY * 0.99 + hipY * 0.01;
      if (kneeY !== null && hipY - this.baseHipY < 0.01) {
        this.thigh = this.thigh * 0.98 + Math.max(0.06, kneeY - hipY) * 0.02;
      }
    }
    const drop = (hipY - this.baseHipY) / this.thigh;
    this.track(drop / this.targetFrac);
    const now = frame.timestamp;
    if (!this.isDown && drop > this.downFrac) this.isDown = true;
    else if (this.isDown && drop < this.downFrac * 0.4 && now - this.lastRepAt > REFRACTORY_MS) {
      this.isDown = false;
      this.finish(now);
      return true;
    }
    return false;
  }
}

/**
 * Ciclo genérico por ângulo: rep = sai da posição inicial, passa do limiar e
 * volta. `progressOf` converte o sinal do frame em progresso (1 = completo).
 */
abstract class CycleDetector extends AmplitudeBase implements RepDetector {
  private isDeep = false;
  protected abstract readonly enterAt: number;
  protected abstract readonly exitAt: number;
  protected abstract progressOf(frame: PoseFrame): number | null;
  reset(): void { this.isDeep = false; this.resetAmp(); }
  process(frame: PoseFrame): boolean {
    const p = this.progressOf(frame);
    if (p === null) return false;
    this.track(p);
    const now = frame.timestamp;
    if (!this.isDeep && p >= this.enterAt) { this.isDeep = true; return false; }
    if (this.isDeep && p <= this.exitAt && now - this.lastRepAt > REFRACTORY_MS) {
      this.isDeep = false;
      this.finish(now);
      return true;
    }
    if (!this.isDeep && p <= this.exitAt) this.peak = 0;
    return false;
  }
}

/** Flexão (câmera lateral): ângulo do cotovelo. 90° = amplitude completa. */
export class PushupRep extends CycleDetector {
  readonly focusJoints = [KP.LEFT_ELBOW, KP.RIGHT_ELBOW];
  protected readonly enterAt = 0.45;
  protected readonly exitAt = 0.2;
  protected progressOf(frame: PoseFrame): number | null {
    const s = bestSide(frame, [[KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER], [KP.LEFT_ELBOW, KP.RIGHT_ELBOW], [KP.LEFT_WRIST, KP.RIGHT_WRIST]]);
    const sh = frame.keypoints[s === 'L' ? KP.LEFT_SHOULDER : KP.RIGHT_SHOULDER];
    const el = frame.keypoints[s === 'L' ? KP.LEFT_ELBOW : KP.RIGHT_ELBOW];
    const wr = frame.keypoints[s === 'L' ? KP.LEFT_WRIST : KP.RIGHT_WRIST];
    if (!visible(sh) || !visible(el) || !visible(wr)) return null;
    const angle = jointAngle(sh, el, wr);
    return (165 - angle) / (165 - 90);
  }
}

/** Abdominal (câmera lateral, deitado): elevação do tronco acima da horizontal. */
export class CrunchRep extends CycleDetector {
  readonly focusJoints = [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER];
  protected readonly enterAt = 0.55;
  protected readonly exitAt = 0.25;
  protected progressOf(frame: PoseFrame): number | null {
    const s = bestSide(frame, [[KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER], [KP.LEFT_HIP, KP.RIGHT_HIP]]);
    const sh = frame.keypoints[s === 'L' ? KP.LEFT_SHOULDER : KP.RIGHT_SHOULDER];
    const hip = frame.keypoints[s === 'L' ? KP.LEFT_HIP : KP.RIGHT_HIP];
    if (!visible(sh) || !visible(hip)) return null;
    const elev = (Math.atan2(hip.y - sh.y, Math.abs(sh.x - hip.x)) * 180) / Math.PI;
    return elev / 40;
  }
}

/** Ponte de glúteo (câmera lateral): extensão do quadril ombro–quadril–joelho. */
export class GluteBridgeRep extends CycleDetector {
  readonly focusJoints = [KP.LEFT_HIP, KP.RIGHT_HIP];
  protected readonly enterAt = 0.6;
  protected readonly exitAt = 0.3;
  protected progressOf(frame: PoseFrame): number | null {
    const s = bestSide(frame, [[KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER], [KP.LEFT_HIP, KP.RIGHT_HIP], [KP.LEFT_KNEE, KP.RIGHT_KNEE]]);
    const sh = frame.keypoints[s === 'L' ? KP.LEFT_SHOULDER : KP.RIGHT_SHOULDER];
    const hip = frame.keypoints[s === 'L' ? KP.LEFT_HIP : KP.RIGHT_HIP];
    const kn = frame.keypoints[s === 'L' ? KP.LEFT_KNEE : KP.RIGHT_KNEE];
    if (!visible(sh) || !visible(hip) || !visible(kn)) return null;
    const angle = jointAngle(sh, hip, kn);
    return (angle - 130) / (172 - 130);
  }
}

/** Polichinelo: abre pernas (tornozelos) e sobe braços; rep ao fechar. */
export class JumpingJackRep extends CycleDetector {
  readonly focusJoints = [KP.LEFT_WRIST, KP.RIGHT_WRIST, KP.LEFT_ANKLE, KP.RIGHT_ANKLE];
  protected readonly enterAt = 0.55;
  protected readonly exitAt = 0.2;
  protected progressOf(frame: PoseFrame): number | null {
    const k = frame.keypoints;
    const ls = k[KP.LEFT_SHOULDER]; const rs = k[KP.RIGHT_SHOULDER];
    const lw = k[KP.LEFT_WRIST]; const rw = k[KP.RIGHT_WRIST];
    const la = k[KP.LEFT_ANKLE]; const ra = k[KP.RIGHT_ANKLE];
    const lh = k[KP.LEFT_HIP]; const rh = k[KP.RIGHT_HIP];
    if (!visible(ls) || !visible(rs) || !visible(lw) || !visible(rw) || !visible(la) || !visible(ra)) return null;
    const sw = Math.max(0.05, Math.abs(rs.x - ls.x));
    const shoY = (ls.y + rs.y) / 2;
    const torso = visible(lh) && visible(rh) ? Math.max(0.08, (lh.y + rh.y) / 2 - shoY) : 0.25;
    const legs = (Math.abs(ra.x - la.x) / sw - 0.9) / (1.7 - 0.9);
    // Braços: pulsos de ~quadril (−1 torso) até acima da cabeça (+0.8 torso).
    const arms = ((shoY - Math.max(lw.y, rw.y)) / torso + 0.9) / 1.7;
    return Math.min(clamp01(legs) * 1.05, clamp01(arms) * 1.05);
  }
}

/** Burpee: agacha até o chão (quadril perto dos tornozelos) e volta em pé. */
export class BurpeeRep extends AmplitudeBase implements RepDetector {
  readonly focusJoints = [KP.LEFT_HIP, KP.RIGHT_HIP];
  private standHipY: number | null = null;
  private leg = 0.4;
  private isDown = false;
  reset(): void { this.standHipY = null; this.isDown = false; this.leg = 0.4; this.resetAmp(); }
  process(frame: PoseFrame): boolean {
    const k = frame.keypoints;
    const lh = k[KP.LEFT_HIP]; const rh = k[KP.RIGHT_HIP];
    const la = k[KP.LEFT_ANKLE]; const ra = k[KP.RIGHT_ANKLE];
    if (!visible(lh) || !visible(rh)) return false;
    const hipY = (lh.y + rh.y) / 2;
    const ankleY = visible(la) && visible(ra) ? (la.y + ra.y) / 2 : null;
    if (this.standHipY === null) {
      this.standHipY = hipY;
      if (ankleY !== null) this.leg = Math.max(0.15, ankleY - hipY);
      return false;
    }
    if (!this.isDown && hipY - this.standHipY < 0.02) {
      this.standHipY = this.standHipY * 0.97 + hipY * 0.03;
      if (ankleY !== null) this.leg = this.leg * 0.97 + Math.max(0.15, ankleY - hipY) * 0.03;
    }
    const drop = (hipY - this.standHipY) / this.leg;
    this.track(drop / 0.7);
    const now = frame.timestamp;
    if (!this.isDown && drop > 0.45) this.isDown = true;
    else if (this.isDown && drop < 0.1 && now - this.lastRepAt > 800) {
      this.isDown = false;
      this.finish(now);
      return true;
    }
    return false;
  }
}

/** Elevação de panturrilha: cabeça sobe em relação à linha em pé. */
export class CalfRaiseRep extends AmplitudeBase implements RepDetector {
  readonly focusJoints = [KP.LEFT_ANKLE, KP.RIGHT_ANKLE];
  private baseY: number | null = null;
  private bodyH = 0.7;
  private isUp = false;
  reset(): void { this.baseY = null; this.isUp = false; this.bodyH = 0.7; this.resetAmp(); }
  process(frame: PoseFrame): boolean {
    const k = frame.keypoints;
    const nose = k[KP.NOSE];
    const la = k[KP.LEFT_ANKLE]; const ra = k[KP.RIGHT_ANKLE];
    const ls = k[KP.LEFT_SHOULDER]; const rs = k[KP.RIGHT_SHOULDER];
    if (!visible(ls) || !visible(rs)) return false;
    const y = visible(nose) ? nose.y : (ls.y + rs.y) / 2;
    if (visible(la) && visible(ra)) this.bodyH = this.bodyH * 0.95 + Math.max(0.3, (la.y + ra.y) / 2 - y) * 0.05;
    if (this.baseY === null) { this.baseY = y; return false; }
    const rise = (this.baseY - y) / this.bodyH;
    // Baseline só desce (em pé parado), sobe devagar se o usuário se afastar.
    if (!this.isUp && rise < 0.008) this.baseY = this.baseY * 0.97 + y * 0.03;
    this.track(rise / 0.04);
    const now = frame.timestamp;
    if (!this.isUp && rise > 0.018) this.isUp = true;
    else if (this.isUp && rise < 0.007 && now - this.lastRepAt > 500) {
      this.isUp = false;
      this.finish(now);
      return true;
    }
    return false;
  }
}

/** Prancha (câmera lateral): corpo reto (ombro–quadril–tornozelo) e na horizontal. */
export class PlankHold implements HoldDetector {
  readonly focusJoints = [KP.LEFT_HIP, KP.RIGHT_HIP];
  liveAmplitude = 0;
  /** `flatness`: quanto mais alto, mais deitado precisa estar (prancha lateral é mais inclinada). */
  constructor(private readonly flatness = 1.6) {}
  reset(): void { this.liveAmplitude = 0; }
  process(frame: PoseFrame): boolean {
    const s = bestSide(frame, [[KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER], [KP.LEFT_HIP, KP.RIGHT_HIP], [KP.LEFT_ANKLE, KP.RIGHT_ANKLE]]);
    const k = frame.keypoints;
    const sh = k[s === 'L' ? KP.LEFT_SHOULDER : KP.RIGHT_SHOULDER];
    const hip = k[s === 'L' ? KP.LEFT_HIP : KP.RIGHT_HIP];
    const ank = k[s === 'L' ? KP.LEFT_ANKLE : KP.RIGHT_ANKLE];
    const kn = k[s === 'L' ? KP.LEFT_KNEE : KP.RIGHT_KNEE];
    const end = visible(ank) ? ank : visible(kn) ? kn : null;
    if (!visible(sh) || !visible(hip) || !end) { this.liveAmplitude = 0; return false; }
    const straight = jointAngle(sh, hip, end);
    const horiz = Math.abs(sh.x - end.x) > Math.abs(sh.y - end.y) * this.flatness;
    this.liveAmplitude = clamp01((straight - 140) / (172 - 140));
    return horiz && straight > 152;
  }
}

/**
 * Deslocamento lateral do quadril (afundo lateral, patinador), alternado.
 * Mede o quanto o quadril sai do centro, em larguras de ombro.
 */
export class HipShiftRep extends AlternatingDetector {
  readonly focusJoints = [KP.LEFT_HIP, KP.RIGHT_HIP, KP.LEFT_KNEE, KP.RIGHT_KNEE];
  private centerX: number | null = null;
  constructor(private readonly target = 0.9, private readonly threshold = 0.4) { super(); }
  reset(): void { super.reset(); this.centerX = null; }
  process(frame: PoseFrame): boolean {
    const k = frame.keypoints;
    const lh = k[KP.LEFT_HIP]; const rh = k[KP.RIGHT_HIP];
    const ls = k[KP.LEFT_SHOULDER]; const rs = k[KP.RIGHT_SHOULDER];
    if (!visible(lh) || !visible(rh) || !visible(ls) || !visible(rs)) return false;
    const x = (lh.x + rh.x) / 2;
    const sw = Math.max(0.05, Math.abs(rs.x - ls.x));
    if (this.centerX === null) { this.centerX = x; return false; }
    // Centro acompanha devagar: como o movimento alterna, a média fica no meio.
    this.centerX = this.centerX * 0.985 + x * 0.015;
    const dx = (x - this.centerX) / sw;
    const side: 'L' | 'R' | null = Math.abs(dx) < 0.05 ? null : dx < 0 ? 'L' : 'R';
    return this.step(side, Math.abs(dx) / this.target, this.threshold / this.target, frame.timestamp);
  }
}

/** Chute no glúteo: calcanhar sobe atrás, alternando (tornozelo sobe em relação ao da perna de apoio). */
export class ButtKickRep extends AlternatingDetector {
  readonly focusJoints = [KP.LEFT_ANKLE, KP.RIGHT_ANKLE];
  process(frame: PoseFrame): boolean {
    const k = frame.keypoints;
    const la = k[KP.LEFT_ANKLE]; const ra = k[KP.RIGHT_ANKLE];
    const lk = k[KP.LEFT_KNEE]; const rk = k[KP.RIGHT_KNEE];
    if (!visible(la) || !visible(ra) || !visible(lk) || !visible(rk)) return false;
    // Canela da perna de apoio (tornozelo mais baixo) como régua.
    const shin = Math.max(0.04, Math.max(la.y - lk.y, ra.y - rk.y));
    const lLift = (ra.y - la.y) / shin;
    const rLift = (la.y - ra.y) / shin;
    const TARGET = 0.8;
    let side: 'L' | 'R' | null = null;
    let lift = 0;
    if (lLift > rLift && lLift > 0.08) { side = 'L'; lift = lLift; }
    else if (rLift > 0.08) { side = 'R'; lift = rLift; }
    return this.step(side, lift / TARGET, 0.35 / TARGET, frame.timestamp);
  }
}

/** Elevação lateral: os dois braços abertos até a altura dos ombros. */
export class LateralRaiseRep extends CycleDetector {
  readonly focusJoints = [KP.LEFT_WRIST, KP.RIGHT_WRIST];
  protected readonly enterAt = 0.7;
  protected readonly exitAt = 0.25;
  protected progressOf(frame: PoseFrame): number | null {
    const k = frame.keypoints;
    const ls = k[KP.LEFT_SHOULDER]; const rs = k[KP.RIGHT_SHOULDER];
    const lw = k[KP.LEFT_WRIST]; const rw = k[KP.RIGHT_WRIST];
    const lh = k[KP.LEFT_HIP]; const rh = k[KP.RIGHT_HIP];
    if (!visible(ls) || !visible(rs) || !visible(lw) || !visible(rw) || !visible(lh) || !visible(rh)) return null;
    const shoY = (ls.y + rs.y) / 2;
    const hipY = (lh.y + rh.y) / 2;
    const torso = Math.max(0.08, hipY - shoY);
    // Pulso na altura do quadril = 0, na altura do ombro = 1 (vale o braço mais baixo).
    const lowWrist = Math.max(lw.y, rw.y);
    return (hipY - lowWrist) / torso;
  }
}

/** Escalador (câmera lateral): joelho vem em direção ao peito, em prancha alta. */
export class MountainClimberRep extends CycleDetector {
  readonly focusJoints = [KP.LEFT_KNEE, KP.RIGHT_KNEE];
  protected readonly enterAt = 0.55;
  protected readonly exitAt = 0.2;
  protected progressOf(frame: PoseFrame): number | null {
    const k = frame.keypoints;
    const s = bestSide(frame, [[KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER], [KP.LEFT_HIP, KP.RIGHT_HIP]]);
    const sh = k[s === 'L' ? KP.LEFT_SHOULDER : KP.RIGHT_SHOULDER];
    const hip = k[s === 'L' ? KP.LEFT_HIP : KP.RIGHT_HIP];
    const lk = k[KP.LEFT_KNEE]; const rk = k[KP.RIGHT_KNEE];
    if (!visible(sh) || !visible(hip) || (!visible(lk) && !visible(rk))) return null;
    const torso = Math.max(0.05, dist(sh, hip));
    // Qualquer joelho serve (de lado os dois se sobrepõem).
    const d = Math.min(visible(lk) ? dist(lk, sh) : 9, visible(rk) ? dist(rk, sh) : 9) / torso;
    return (1.85 - d) / (1.85 - 1.05);
  }
}

/** Elevação de pernas (câmera lateral, deitado): pernas sobem até ~70° do chão. */
export class LegRaiseRep extends CycleDetector {
  readonly focusJoints = [KP.LEFT_ANKLE, KP.RIGHT_ANKLE];
  protected readonly enterAt = 0.6;
  protected readonly exitAt = 0.2;
  protected progressOf(frame: PoseFrame): number | null {
    const s = bestSide(frame, [[KP.LEFT_HIP, KP.RIGHT_HIP], [KP.LEFT_ANKLE, KP.RIGHT_ANKLE]]);
    const hip = frame.keypoints[s === 'L' ? KP.LEFT_HIP : KP.RIGHT_HIP];
    const ank = frame.keypoints[s === 'L' ? KP.LEFT_ANKLE : KP.RIGHT_ANKLE];
    if (!visible(hip) || !visible(ank)) return null;
    const elev = (Math.atan2(hip.y - ank.y, Math.abs(ank.x - hip.x)) * 180) / Math.PI;
    return elev / 70;
  }
}

/** Super-homem (câmera lateral, de bruços): braços e pernas saem do chão. */
export class SupermanRep extends CycleDetector {
  readonly focusJoints = [KP.LEFT_WRIST, KP.RIGHT_WRIST, KP.LEFT_ANKLE, KP.RIGHT_ANKLE];
  protected readonly enterAt = 0.55;
  protected readonly exitAt = 0.2;
  protected progressOf(frame: PoseFrame): number | null {
    const k = frame.keypoints;
    const s = bestSide(frame, [[KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER], [KP.LEFT_HIP, KP.RIGHT_HIP]]);
    const sh = k[s === 'L' ? KP.LEFT_SHOULDER : KP.RIGHT_SHOULDER];
    const hip = k[s === 'L' ? KP.LEFT_HIP : KP.RIGHT_HIP];
    const wr = k[s === 'L' ? KP.LEFT_WRIST : KP.RIGHT_WRIST];
    const ank = k[s === 'L' ? KP.LEFT_ANKLE : KP.RIGHT_ANKLE];
    if (!visible(sh) || !visible(hip) || !visible(wr) || !visible(ank)) return null;
    const torso = Math.max(0.05, dist(sh, hip));
    // Elevação média de mão e pé acima da linha do quadril.
    const lift = ((hip.y - wr.y) + (hip.y - ank.y)) / 2 / torso;
    return lift / 0.35;
  }
}

/** Cadeira isométrica (de frente): coxa na horizontal = quadril na altura do joelho. */
export class WallSitHold implements HoldDetector {
  readonly focusJoints = [KP.LEFT_KNEE, KP.RIGHT_KNEE];
  liveAmplitude = 0;
  reset(): void { this.liveAmplitude = 0; }
  process(frame: PoseFrame): boolean {
    const k = frame.keypoints;
    const lh = k[KP.LEFT_HIP]; const rh = k[KP.RIGHT_HIP];
    const lk = k[KP.LEFT_KNEE]; const rk = k[KP.RIGHT_KNEE];
    const la = k[KP.LEFT_ANKLE]; const ra = k[KP.RIGHT_ANKLE];
    if (!visible(lh) || !visible(rh) || !visible(lk) || !visible(rk) || !visible(la) || !visible(ra)) { this.liveAmplitude = 0; return false; }
    const hipY = (lh.y + rh.y) / 2;
    const kneeY = (lk.y + rk.y) / 2;
    const shin = Math.max(0.05, (la.y + ra.y) / 2 - kneeY);
    // Em pé a coxa aparece ~do tamanho da canela (razão ~1); sentado na "cadeira", ~0.
    const ratio = (kneeY - hipY) / shin;
    this.liveAmplitude = clamp01((0.85 - ratio) / 0.6);
    return ratio < 0.4;
  }
}

export const DETECTORS: Record<string, () => RepDetector> = {
  trunkRotation: () => new TrunkRotationRep(),
  highKnee: () => new HighKneeRep(),
  elbowToKnee: () => new HighKneeRep(),
  lateralLean: () => new LateralLeanRep(),
  armsUp: () => new ArmsUpCycleRep(),
  squatCycle: () => new SquatCycleRep(0.5, 0.18),
  crossKick: () => new CrossBodyRep(),
  twistKneePull: () => new CrossBodyRep(),
  lateralHop: () => new LateralLeanRep(),
  // Catálogo MoveMove 2.0
  squat: () => new SquatCycleRep(0.85, 0.25),
  lunge: () => new SquatCycleRep(0.7, 0.22),
  pushup: () => new PushupRep(),
  crunch: () => new CrunchRep(),
  gluteBridge: () => new GluteBridgeRep(),
  jumpingJack: () => new JumpingJackRep(),
  burpee: () => new BurpeeRep(),
  calfRaise: () => new CalfRaiseRep(),
  sumoSquat: () => new SquatCycleRep(0.8, 0.22),
  jumpSquat: () => new SquatCycleRep(0.7, 0.22),
  lateralLunge: () => new HipShiftRep(0.9, 0.4),
  skater: () => new HipShiftRep(1.2, 0.5),
  buttKick: () => new ButtKickRep(),
  lateralRaise: () => new LateralRaiseRep(),
  mountainClimber: () => new MountainClimberRep(),
  legRaise: () => new LegRaiseRep(),
  superman: () => new SupermanRep(),
  // Tríceps no banco e flexão inclinada: mesmo critério do cotovelo da flexão.
  dip: () => new PushupRep(),
  inclinePushup: () => new PushupRep(),
};

export const HOLD_DETECTORS: Record<string, () => HoldDetector> = {
  plank: () => new PlankHold(),
  sidePlank: () => new PlankHold(1.2),
  wallSit: () => new WallSitHold(),
};
