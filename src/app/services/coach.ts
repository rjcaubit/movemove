import { Narrator } from '../../game/systems/narrator.ts';
import { voicePack } from './voicePack.ts';

/**
 * Voz do app: toca a frase pré-gravada (Francisca neural) quando existe e cai
 * no narrador Web Speech pra qualquer frase fora do pacote. Também aplica as
 * regras de feedback de forma com cooldown — não repete a cada rep.
 */
export type CueTone = 'good' | 'shallow';

const HINT_COOLDOWN_MS = 3000;

export class Coach {
  private narrator: Narrator;
  private enabled: boolean;
  private lastSpeakAt = 0;
  private lastCueAt = 0;
  private lastTone: CueTone | null = null;
  private goodStreak = 0;

  constructor(enabled: boolean, private readonly cueCooldownMs = 5000) {
    this.enabled = enabled;
    this.narrator = new Narrator(null, enabled);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    this.narrator.setEnabled(v);
    if (!v) this.stop();
  }

  private speak(text: string, important: boolean): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (!important && now - this.lastSpeakAt < HINT_COOLDOWN_MS) return;
    this.lastSpeakAt = now;
    if (voicePack.play(text)) {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      return;
    }
    this.narrator.speak(text, 2);
  }

  /** Frases importantes (início de exercício, descanso). */
  say(text: string): void { this.speak(text, true); }

  /** Frases de posicionamento (com cooldown). */
  hint(text: string): void { this.speak(text, false); }

  /**
   * Feedback por rep. Fala correção quando rasa (com cooldown) e elogia de vez
   * em quando depois de uma sequência boa.
   */
  onRep(tone: CueTone, text: string, now: number): void {
    if (tone === 'good') this.goodStreak += 1; else this.goodStreak = 0;
    const since = now - this.lastCueAt;
    const shouldSpeak = tone === 'shallow'
      ? since > this.cueCooldownMs || this.lastTone !== 'shallow'
      : this.goodStreak % 4 === 0 && since > this.cueCooldownMs;
    if (!shouldSpeak) return;
    this.lastCueAt = now;
    this.lastTone = tone;
    this.speak(text, true);
  }

  stop(): void {
    voicePack.stop();
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }
}
