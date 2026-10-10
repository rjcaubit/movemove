import type { Keypoint } from './types.ts';

/**
 * Filtro EMA (Exponential Moving Average) — Seção 3.2 do EXERGAME_PROJETO.md.
 * Mantém um array de keypoints suavizados; primeira amostra inicializa direto.
 *
 * suavizado[t] = α * cru[t] + (1 - α) * suavizado[t-1]
 */
export class EmaSmoother {
  private last: Keypoint[] | null = null;

  constructor(private readonly alpha: number) {
    if (alpha <= 0 || alpha > 1) {
      throw new Error(`EmaSmoother: alpha must be in (0, 1], got ${alpha}`);
    }
  }

  smooth(raw: Keypoint[]): Keypoint[] {
    if (this.last === null || this.last.length !== raw.length) {
      this.last = raw.map((k) => ({ ...k }));
      return this.last;
    }
    const a = this.alpha;
    const out: Keypoint[] = new Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      const p = this.last[i];
      out[i] = {
        x: a * r.x + (1 - a) * p.x,
        y: a * r.y + (1 - a) * p.y,
        z: r.z !== undefined && p.z !== undefined ? a * r.z + (1 - a) * p.z : r.z,
        visibility: r.visibility,
      };
    }
    this.last = out;
    return out;
  }

  reset(): void {
    this.last = null;
  }
}
