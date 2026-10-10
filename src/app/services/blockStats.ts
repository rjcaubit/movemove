import type { BlockResult } from './sessionRunner.ts';

/**
 * Estatísticas de um exercício já feito, calculadas só a partir do que a
 * sessão registrou (instante e amplitude de cada repetição). Sem DOM.
 */
export interface BlockStats {
  /** Tempo entre uma repetição e a seguinte (N-1 valores). */
  repTimesMs: number[];
  fastestMs: number | null;
  /** Quanto o fim ficou mais lento que o começo (0.24 = 24%); null se não dá pra medir. */
  fatigue: number | null;
  ampBest: number | null;
  ampWorst: number | null;
  /** Tentativas que não contaram (amplitude abaixo do mínimo do desafio). */
  notCounted: number;
}

const MIN_INTERVALS_FOR_FATIGUE = 4;

const mean = (xs: number[]): number => xs.reduce((a, x) => a + x, 0) / xs.length;

export function blockStats(b: BlockResult): BlockStats {
  const repTimesMs: number[] = [];
  for (let i = 1; i < b.attempts.length; i++) repTimesMs.push(b.attempts[i].atMs - b.attempts[i - 1].atMs);
  let fatigue: number | null = null;
  if (repTimesMs.length >= MIN_INTERVALS_FOR_FATIGUE) {
    const first = mean(repTimesMs.slice(0, 2));
    const last = mean(repTimesMs.slice(-2));
    if (first > 0) fatigue = Math.max(0, last / first - 1);
  }
  const amps = b.attempts.map((a) => a.amplitude);
  return {
    repTimesMs,
    fastestMs: repTimesMs.length ? Math.min(...repTimesMs) : null,
    fatigue,
    ampBest: amps.length ? Math.max(...amps) : null,
    ampWorst: amps.length ? Math.min(...amps) : null,
    notCounted: b.attempts.filter((a) => !a.counted).length,
  };
}

/** Frase curta sobre a fadiga, no mesmo tom da voz do app. */
export function fatigueText(f: number): { title: string; sub: string } {
  const pct = Math.round(f * 100);
  if (pct < 8) return { title: 'Ritmo firme do começo ao fim.', sub: 'As últimas repetições saíram no mesmo tempo das primeiras.' };
  if (pct < 25) return { title: 'Ficou um pouco mais lento no fim.', sub: `As últimas repetições levaram ${pct}% mais tempo que as primeiras.` };
  return { title: 'Cansou no fim.', sub: `As últimas repetições levaram ${pct}% mais tempo que as primeiras.` };
}
