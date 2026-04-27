import type { CadenceIntensity } from '../../pose/types.ts';

const RATES: Record<CadenceIntensity, number> = {
  none: -8,
  walking: 5,
  jogging: 12,
  running: 25,
};

export class EnergySystem {
  private value = 50;
  private intensity: CadenceIntensity = 'none';

  setIntensity(intensity: CadenceIntensity): void {
    this.intensity = intensity;
  }

  /** Atualiza valor por dt em segundos. Chamar a cada frame do Play. */
  tick(dtSec: number): void {
    const rate = RATES[this.intensity];
    this.value = Math.max(0, Math.min(100, this.value + rate * dtSec));
  }

  getValue(): number { return this.value; }
  getIntensity(): CadenceIntensity { return this.intensity; }

  /** Multiplicador de velocidade do mundo. */
  getSpeedFactor(): number {
    if (this.value >= 30) return 1;
    return Math.max(0, this.value / 30);
  }

  reset(): void { this.value = 50; this.intensity = 'none'; }
}
