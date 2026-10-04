import type { Workout } from './services/generateWorkout.ts';
import type { ChallengeMode, ChallengePayload, WorkoutTarget } from './services/challenges.ts';
import type { SessionSummary } from './services/sessionRunner.ts';

/** Estado em memória entre telas (não persiste — o que precisa persistir vai pros services). */
export interface ChallengeSpec { exercicio: string; modo: ChallengeMode; alvo: number | WorkoutTarget }

export type SessionRequest =
  | { kind: 'workout'; workout: Workout }
  | { kind: 'challenge'; spec: ChallengeSpec; purpose: 'mark' | 'accept'; incoming?: ChallengePayload };

export interface WorkoutOutcome { workout: Workout; summary: SessionSummary; at: number }

export interface ChallengeOutcome {
  spec: ChallengeSpec;
  incoming?: ChallengePayload;
  /** null = não completou (ex: não chegou nas N reps). */
  marca: number | null;
  record: boolean;
  summary: SessionSummary;
}

export const appState: {
  session: SessionRequest | null;
  lastWorkoutOutcome: WorkoutOutcome | null;
  challengeOutcome: ChallengeOutcome | null;
  /** Seleção da tela "Desafiar alguém" preservada ao ir fazer a marca. */
  challengeDraft: ChallengeSpec | null;
} = {
  session: null,
  lastWorkoutOutcome: null,
  challengeOutcome: null,
  challengeDraft: null,
};
