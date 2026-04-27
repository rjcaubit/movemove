import type { AudioBus } from './audioBus.ts';

export class Narrator {
  private audioBus: AudioBus | null;
  private enabled: boolean;
  private lastSpeakAt = 0;
  private cooldownMs = 3000;
  private voice: SpeechSynthesisVoice | null = null;

  constructor(audioBus: AudioBus | null, enabled = true) {
    this.audioBus = audioBus;
    this.enabled = enabled;
    this.detectVoice();
  }

  private detectVoice(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const pick = (): void => {
      const voices = window.speechSynthesis.getVoices();
      this.voice = voices.find((v) => v.lang.startsWith('pt')) ?? voices[0] ?? null;
    };
    pick();
    if (!this.voice && window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', pick, { once: true });
    }
  }

  speak(text: string, priority = 1): void {
    if (!this.enabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const now = performance.now();
    if (now - this.lastSpeakAt < this.cooldownMs && priority <= 1) return;
    this.lastSpeakAt = now;

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'pt-BR';
      if (this.voice) utter.voice = this.voice;
      utter.rate = 1.05;
      utter.pitch = 1.1;
      if (this.audioBus) {
        this.audioBus.duck();
        utter.onend = (): void => this.audioBus?.restore(500);
      }
      window.speechSynthesis.speak(utter);
    } catch {
      // Fallback gracioso — alguns browsers podem lançar
    }
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }
  isEnabled(): boolean { return this.enabled; }
}
