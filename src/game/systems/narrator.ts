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
    const now = performance.now();
    if (now - this.lastSpeakAt < this.cooldownMs && priority <= 1) return;
    this.lastSpeakAt = now;

    // Legenda visual opcional (RF15): se setting captions=true, mostra HTML overlay
    // mesmo quando speechSynthesis indisponível, ou em complemento à fala.
    const showCaption = (() => { try { return localStorage.getItem('movemove.narrator.captions') === 'true'; } catch { return false; } })();
    if (showCaption) Narrator.showCaption(text);

    if (typeof window === 'undefined' || !window.speechSynthesis) return;
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

  private static captionEl: HTMLDivElement | null = null;
  private static captionTimer: number | null = null;
  private static showCaption(text: string): void {
    if (Narrator.captionEl == null) {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:8px 14px;border-radius:8px;font:600 16px system-ui;z-index:200;max-width:80vw;text-align:center;';
      document.body.appendChild(el);
      Narrator.captionEl = el;
    }
    Narrator.captionEl.textContent = text;
    if (Narrator.captionTimer !== null) clearTimeout(Narrator.captionTimer);
    Narrator.captionTimer = window.setTimeout(() => {
      if (Narrator.captionEl) { Narrator.captionEl.remove(); Narrator.captionEl = null; }
    }, 2500);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }
  isEnabled(): boolean { return this.enabled; }
}
