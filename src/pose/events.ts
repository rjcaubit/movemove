import { POSE_CONFIG } from './config.ts';
import { KP, type Baseline, type GameEvent, type Keypoint, type Lane, type PoseFrame } from './types.ts';

/**
 * EventDetector — implementa as 6 heurísticas da Seção 3.3 do EXERGAME_PROJETO.md.
 * Emite GameEvent via EventTarget (CustomEvent 'event' com detail = GameEvent).
 *
 * Thresholds são FRAÇÕES de H_corpo (calibrado), nunca pixels.
 */
export class EventDetector extends EventTarget {
  private baseline: Baseline | null = null;

  // jump
  private lastJumpAt = 0;
  // duck
  private duckSince: number | null = null;
  // lane
  private currentLane: Lane = 0;
  // cadence
  private kneeUpHistory: Array<{ side: 'L' | 'R'; t: number }> = [];
  // jumping_jack
  private lastJackAt = 0;
  // arms_up
  private armsUpEmittedAt = 0;

  setBaseline(b: Baseline): void { this.baseline = b; }
  getBaseline(): Baseline | null { return this.baseline; }

  reset(): void {
    this.baseline = null;
    this.lastJumpAt = 0;
    this.duckSince = null;
    this.currentLane = 0;
    this.kneeUpHistory = [];
    this.lastJackAt = 0;
    this.armsUpEmittedAt = 0;
  }

  ingest(frame: PoseFrame): void {
    if (!this.baseline) return;
    const kp = frame.keypoints;
    const t = frame.timestamp;

    this.detectJump(kp, t);
    this.detectDuck(kp, t);
    this.detectLane(kp, t);
    this.detectCadence(kp, t);
    this.detectJumpingJack(kp, t);
    this.detectArmsUp(kp, t);
  }

  private hipY(kp: Keypoint[]): number {
    return (kp[KP.LEFT_HIP].y + kp[KP.RIGHT_HIP].y) / 2;
  }
  private hipX(kp: Keypoint[]): number {
    return (kp[KP.LEFT_HIP].x + kp[KP.RIGHT_HIP].x) / 2;
  }

  private emit(ev: GameEvent): void {
    this.dispatchEvent(new CustomEvent('event', { detail: ev }));
  }

  private detectJump(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    const yHip = this.hipY(kp);
    const threshold =
      this.baseline.yQuadrilBase - POSE_CONFIG.jumpThresholdFracHCorpo * this.baseline.hCorpo;
    if (yHip < threshold && t - this.lastJumpAt > POSE_CONFIG.jumpCooldownMs) {
      this.lastJumpAt = t;
      this.emit({ type: 'jump', source: 'pose', t });
    }
  }

  private detectDuck(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    const yHip = this.hipY(kp);
    const threshold =
      this.baseline.yQuadrilBase + POSE_CONFIG.duckThresholdFracHCorpo * this.baseline.hCorpo;
    if (yHip > threshold) {
      if (this.duckSince === null) this.duckSince = t;
      else if (
        Number.isFinite(this.duckSince) &&
        t - (this.duckSince as number) >= POSE_CONFIG.duckSustainMs
      ) {
        this.emit({ type: 'duck', source: 'pose', t });
        // exige sair da zona antes de emitir de novo
        this.duckSince = Number.POSITIVE_INFINITY;
      }
    } else {
      this.duckSince = null;
    }
  }

  private detectLane(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    const xHip = this.hipX(kp);
    const dx = xHip - this.baseline.xCentroBase;
    const T = POSE_CONFIG.laneThresholdFracOmbros * this.baseline.larguraOmbros;
    const Th = POSE_CONFIG.laneHysteresisFrac * this.baseline.larguraOmbros;
    let next: Lane = this.currentLane;
    if (this.currentLane === 0) {
      if (dx < -T) next = -1;
      else if (dx > T) next = 1;
    } else if (this.currentLane === -1) {
      if (dx > -T + Th) next = 0;
    } else if (this.currentLane === 1) {
      if (dx < T - Th) next = 0;
    }
    if (next !== this.currentLane) {
      this.currentLane = next;
      this.emit({ type: 'lane_change', lane: next, source: 'pose', t });
    }
  }

  private detectCadence(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    const yKneeL = kp[KP.LEFT_KNEE].y;
    const yKneeR = kp[KP.RIGHT_KNEE].y;
    const threshold =
      this.baseline.yQuadrilBase - POSE_CONFIG.cadenceKneeRaiseFracHCorpo * this.baseline.hCorpo;
    const last = this.kneeUpHistory[this.kneeUpHistory.length - 1];
    if (yKneeL < threshold && (!last || last.side !== 'L')) {
      this.kneeUpHistory.push({ side: 'L', t });
    } else if (yKneeR < threshold && (!last || last.side !== 'R')) {
      this.kneeUpHistory.push({ side: 'R', t });
    }
    const cutoff = t - POSE_CONFIG.cadenceWindowMs;
    while (this.kneeUpHistory.length > 0 && this.kneeUpHistory[0].t < cutoff) {
      this.kneeUpHistory.shift();
    }
    const stepsPerSec = (this.kneeUpHistory.length * 1000) / POSE_CONFIG.cadenceWindowMs;
    this.emit({ type: 'cadence', stepsPerSec, source: 'pose', t });
  }

  private detectJumpingJack(kp: Keypoint[], t: number): void {
    if (!this.baseline) return;
    if (t - this.lastJackAt < POSE_CONFIG.jackCooldownMs) return;
    const xAnkleL = kp[KP.LEFT_ANKLE].x;
    const xAnkleR = kp[KP.RIGHT_ANKLE].x;
    const ankleSpread = Math.abs(xAnkleL - xAnkleR);
    const yWristL = kp[KP.LEFT_WRIST].y;
    const yWristR = kp[KP.RIGHT_WRIST].y;
    const yEyeL = kp[KP.LEFT_EYE].y;
    const yEyeR = kp[KP.RIGHT_EYE].y;
    const yEyes = (yEyeL + yEyeR) / 2;
    const ankleSpreadOk =
      ankleSpread > POSE_CONFIG.jackAnkleSpreadFactorOmbros * this.baseline.larguraOmbros;
    const wristsAboveHead = yWristL < yEyes && yWristR < yEyes;
    if (ankleSpreadOk && wristsAboveHead) {
      this.lastJackAt = t;
      this.emit({ type: 'jumping_jack', source: 'pose', t });
    }
  }

  private detectArmsUp(kp: Keypoint[], t: number): void {
    const yWristL = kp[KP.LEFT_WRIST].y;
    const yWristR = kp[KP.RIGHT_WRIST].y;
    const yEyeL = kp[KP.LEFT_EYE].y;
    const yEyeR = kp[KP.RIGHT_EYE].y;
    const yEyes = (yEyeL + yEyeR) / 2;
    const both = yWristL < yEyes && yWristR < yEyes;
    if (both) {
      if (t - this.armsUpEmittedAt > POSE_CONFIG.armsUpEmitMinIntervalMs) {
        this.armsUpEmittedAt = t;
        this.emit({ type: 'arms_up', source: 'pose', t });
      }
    }
  }
}
