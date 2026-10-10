import type { CadenceIntensity } from '../../pose/types.ts';
import { ENERGY_RATES, ENERGY_FULL_SPEED_THRESHOLD } from '../../tuning.ts';

const RATES: Record<CadenceIntensity, number> = ENERGY_RATES;

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
    if (this.value >= ENERGY_FULL_SPEED_THRESHOLD) return 1;
    return Math.max(0, this.value / ENERGY_FULL_SPEED_THRESHOLD);
  }

  reset(): void { this.value = 50; this.intensity = 'none'; }
}
