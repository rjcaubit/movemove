import { getExercise } from './catalog.ts';
import type { WorkoutBlock } from './generateWorkout.ts';

/**
 * Máquina de estados de uma sessão (treino ou desafio). Pura: o tempo entra
 * por `tick(now)` e os eventos de pose por `rep()`/`hold()` — sem DOM, sem
 * timers próprios. A UI só lê o estado e renderiza.
 */
export type Phase = 'exercise' | 'rest' | 'done';

export interface SessionConfig {
  blocks: WorkoutBlock[];
  restMs: number;
  /** Se definido, reps abaixo dessa amplitude não contam (desafios). */
  minAmplitude?: number;
  /** Termina o bloco ao atingir `targetReps` (desafio "N reps no menor tempo"). */
  endOnTarget?: boolean;
  /** Termina o bloco quando parar de segurar por esse tempo (desafio de prancha). */
  endOnHoldBreakMs?: number;
}

export interface RepRecord { atMs: number; amplitude: number; counted: boolean }

export interface BlockResult {
  exerciseId: string;
  reps: number;
  attempts: RepRecord[];
  holdMs: number;
  /** Tempo ativo no bloco (sem pausas). */
  activeMs: number;
  /** Amplitude média 0–1 (reps) ou qualidade média (isométrico). */
  amplitude: number;
  skipped: boolean;
  /** ms até atingir a meta (desafio de menor tempo). */
  targetReachedMs?: number;
}

export type SessionEvent =
  | { type: 'phase'; phase: Phase; index: number }
  | { type: 'rep'; record: RepRecord; index: number }
  | { type: 'done' };

export class SessionRunner {
  phase: Phase = 'exercise';
  index = 0;
  paused = false;
  /** ms decorridos na fase atual (sem pausas). */
  phaseElapsed = 0;
  totalActiveMs = 0;
  readonly results: BlockResult[];
  holding = false;
  holdQuality = 0;
  private lastTick: number | null = null;
  private holdStarted = false;
  private notHoldingMs = 0;
  private qualitySum = 0;
  private qualityN = 0;
  private listeners = new Set<(e: SessionEvent) => void>();

  constructor(readonly config: SessionConfig) {
    this.results = config.blocks.map((b) => ({
      exerciseId: b.exerciseId, reps: 0, attempts: [], holdMs: 0, activeMs: 0, amplitude: 0, skipped: false,
    }));
    if (config.blocks.length === 0) this.phase = 'done';
  }

  on(cb: (e: SessionEvent) => void): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  private emit(e: SessionEvent): void { for (const cb of this.listeners) cb(e); }

  get block(): WorkoutBlock | undefined { return this.config.blocks[this.index]; }
  get result(): BlockResult | undefined { return this.results[this.index]; }
  get isHoldBlock(): boolean {
    const b = this.block;
    return !!b && getExercise(b.exerciseId)?.tipo === 'tempo';
  }

  get phaseDurationMs(): number {
    if (this.phase === 'rest') return this.config.restMs;
    return this.block?.durationMs ?? 0;
  }

  get phaseRemainingMs(): number { return Math.max(0, this.phaseDurationMs - this.phaseElapsed); }

  /** Restante estimado da sessão inteira (fase atual + blocos e descansos seguintes). */
  get totalRemainingMs(): number {
    if (this.phase === 'done') return 0;
    let ms = this.phaseRemainingMs;
    for (let i = this.index + 1; i < this.config.blocks.length; i++) ms += this.config.blocks[i].durationMs + this.config.restMs;
    return ms;
  }

  tick(now: number): void {
    const dt = this.lastTick === null ? 0 : Math.min(1000, now - this.lastTick);
    this.lastTick = now;
    if (this.paused || this.phase === 'done') return;
    this.phaseElapsed += dt;
    this.totalActiveMs += dt;
    if (this.phase === 'exercise') {
      const r = this.result!;
      r.activeMs += dt;
      if (this.isHoldBlock) {
        if (this.holding) {
          r.holdMs += dt;
          this.holdStarted = true;
          this.notHoldingMs = 0;
        } else if (this.holdStarted) {
          this.notHoldingMs += dt;
        }
        if (this.config.endOnHoldBreakMs && this.holdStarted && this.notHoldingMs >= this.config.endOnHoldBreakMs) {
          this.advance();
          return;
        }
      }
    }
    if (this.phaseElapsed >= this.phaseDurationMs) this.advance();
  }

  /** Registra uma rep detectada. */
  rep(amplitude: number): RepRecord | null {
    if (this.phase !== 'exercise' || this.paused) return null;
    const r = this.result!;
    const min = this.config.minAmplitude;
    const record: RepRecord = { atMs: r.activeMs, amplitude, counted: min === undefined || amplitude >= min };
    r.attempts.push(record);
    if (record.counted) r.reps += 1;
    r.amplitude = r.attempts.reduce((a, x) => a + x.amplitude, 0) / r.attempts.length;
    this.emit({ type: 'rep', record, index: this.index });
    const target = this.block?.targetReps;
    if (this.config.endOnTarget && target && r.reps >= target) {
      r.targetReachedMs = r.activeMs;
      this.advance();
    }
    return record;
  }

  /** Estado do isométrico no frame atual. */
  hold(holding: boolean, quality: number): void {
    this.holding = holding;
    this.holdQuality = quality;
    if (this.phase !== 'exercise' || this.paused || !this.isHoldBlock) return;
    if (holding) {
      this.qualitySum += quality;
      this.qualityN += 1;
      this.result!.amplitude = this.qualitySum / this.qualityN;
    }
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; this.lastTick = null; }

  /** Pula o exercício atual (marca como pulado) ou o descanso. */
  skip(): void {
    if (this.phase === 'exercise' && this.result) this.result.skipped = this.result.attempts.length === 0 && this.result.holdMs === 0;
    this.advance();
  }

  /** Encerra a sessão agora (botão fechar). */
  finish(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.emit({ type: 'done' });
  }

  private advance(): void {
    this.phaseElapsed = 0;
    this.holding = false;
    this.holdStarted = false;
    this.notHoldingMs = 0;
    this.qualitySum = 0;
    this.qualityN = 0;
    if (this.phase === 'exercise') {
      const last = this.index >= this.config.blocks.length - 1;
      if (last) {
        this.phase = 'done';
        this.emit({ type: 'done' });
        return;
      }
      if (this.config.restMs > 0) {
        this.phase = 'rest';
        this.emit({ type: 'phase', phase: 'rest', index: this.index });
        return;
      }
      this.index += 1;
      this.emit({ type: 'phase', phase: 'exercise', index: this.index });
      return;
    }
    if (this.phase === 'rest') {
      this.index += 1;
      this.phase = 'exercise';
      this.emit({ type: 'phase', phase: 'exercise', index: this.index });
    }
  }
}

export interface SessionSummary {
  durationMs: number;
  totalReps: number;
  /** Reps com amplitude ≥ limiar (marca de desafio de treino inteiro). */
  validReps: number;
  amplitude: number;
  blocks: BlockResult[];
}

export const CHALLENGE_MIN_AMPLITUDE = 0.75;

export function summarize(runner: SessionRunner, minAmp = CHALLENGE_MIN_AMPLITUDE): SessionSummary {
  const done = runner.results.filter((r) => !r.skipped && (r.attempts.length > 0 || r.holdMs > 0 || r.activeMs > 0));
  const withAmp = done.filter((r) => r.attempts.length > 0 || r.holdMs > 0);
  const amplitude = withAmp.length ? withAmp.reduce((a, r) => a + r.amplitude, 0) / withAmp.length : 0;
  return {
    durationMs: runner.totalActiveMs,
    totalReps: done.reduce((a, r) => a + r.reps, 0),
    validReps: done.reduce((a, r) => a + r.attempts.filter((x) => x.amplitude >= minAmp).length, 0),
    amplitude,
    blocks: runner.results,
  };
}
