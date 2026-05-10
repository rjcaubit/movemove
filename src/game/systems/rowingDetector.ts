import { WristVelocityTracker } from './wristVelocity.ts';
import { type PoseFrame } from '../../pose/types.ts';

// "Soco" / pedalada: detecta velocidade alta do pulso em qualquer direção.
// Sem filtro Y (não exige descida) e sem alternância.
// Emite 'BOTH' quando ambos pulsos passam o threshold no mesmo push.

export type PunchSide = 'L' | 'R' | 'BOTH';
export type RejectReason = 'cooldown' | 'speed';

export interface SideDebug {
  speed: number;
  cooldownMs: number;
  lastReject: RejectReason | null;
}

export interface DetectorDebug {
  L: SideDebug;
  R: SideDebug;
  lastPunch: PunchSide | null;
  lastPunchAt: number;
}

export class RowingDetector {
  private tracker = new WristVelocityTracker();
  private refractoryUntil: Record<'L' | 'R', number> = { L: 0, R: 0 };

  private debug: DetectorDebug = {
    L: { speed: 0, cooldownMs: 0, lastReject: null },
    R: { speed: 0, cooldownMs: 0, lastReject: null },
    lastPunch: null,
    lastPunchAt: 0,
  };

  constructor(
    private readonly speedThreshold: number,
    private readonly refractoryMs: number,
    private readonly onPunch: (side: PunchSide) => void,
  ) {}

  push(frame: PoseFrame): void {
    this.tracker.push(frame);
    const now = performance.now();

    const speedL = this.tracker.speedNorm('L');
    const speedR = this.tracker.speedNorm('R');

    const lFiring = speedL >= this.speedThreshold && now >= this.refractoryUntil.L;
    const rFiring = speedR >= this.speedThreshold && now >= this.refractoryUntil.R;

    let punched: PunchSide | null = null;
    if (lFiring && rFiring) {
      this.refractoryUntil.L = now + this.refractoryMs;
      this.refractoryUntil.R = now + this.refractoryMs;
      punched = 'BOTH';
    } else if (lFiring) {
      this.refractoryUntil.L = now + this.refractoryMs;
      punched = 'L';
    } else if (rFiring) {
      this.refractoryUntil.R = now + this.refractoryMs;
      punched = 'R';
    }

    // Atualizar debug snapshot ANTES do callback (callback pode ler)
    this.debug.L.speed = speedL;
    this.debug.R.speed = speedR;
    this.debug.L.cooldownMs = Math.max(0, this.refractoryUntil.L - now);
    this.debug.R.cooldownMs = Math.max(0, this.refractoryUntil.R - now);
    this.debug.L.lastReject = lFiring ? null : (now < this.refractoryUntil.L ? 'cooldown' : 'speed');
    this.debug.R.lastReject = rFiring ? null : (now < this.refractoryUntil.R ? 'cooldown' : 'speed');

    if (punched) {
      this.debug.lastPunch = punched;
      this.debug.lastPunchAt = now;
      this.onPunch(punched);
    }
  }

  getDebug(): DetectorDebug {
    return this.debug;
  }

  reset(): void {
    this.tracker.reset();
    this.refractoryUntil = { L: 0, R: 0 };
    this.debug = {
      L: { speed: 0, cooldownMs: 0, lastReject: null },
      R: { speed: 0, cooldownMs: 0, lastReject: null },
      lastPunch: null,
      lastPunchAt: 0,
    };
  }
}
