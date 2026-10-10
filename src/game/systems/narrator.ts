import type { AudioBus } from './audioBus.ts';

let _voicePT: SpeechSynthesisVoice | null = null;
let _voiceListenerInstalled = false;

function pickBestVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const candidates = voices.filter((v) => v.lang.startsWith(lang));
  if (candidates.length === 0) return null;
  return (
    candidates.find((v) => /enhanced|premium|neural/i.test(v.name)) // iOS Enhanced/Premium, Android Neural
    ?? candidates.find((v) => /google/i.test(v.name))                // Android Google TTS
    ?? candidates.find((v) => /microsoft/i.test(v.name))             // Edge / Windows
    ?? candidates.find((v) => !v.localService)                       // qualquer voz de rede
    ?? candidates[0]
  );
}

function ensureVoiceCache(): void {
  if (_voiceListenerInstalled || typeof window === 'undefined' || !window.speechSynthesis) return;
  _voiceListenerInstalled = true;
  const refresh = (): void => { _voicePT = pickBestVoice('pt'); };
  refresh();
  // Vozes podem chegar de forma assíncrona em vários browsers.
  window.speechSynthesis.onvoiceschanged = refresh;
  setTimeout(refresh, 100);
  setTimeout(refresh, 800);
}

export class Narrator {
  private audioBus: AudioBus | null;
  private enabled: boolean;
  private lastSpeakAt = 0;
  private cooldownMs = 3000;

  constructor(audioBus: AudioBus | null, enabled = true) {
    this.audioBus = audioBus;
    this.enabled = enabled;
    ensureVoiceCache();
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
      const voice = _voicePT ?? pickBestVoice('pt');
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else {
        utter.lang = 'pt-BR';
      }
      utter.rate = 0.92;   // mais natural que 1.05
      utter.pitch = 1.0;   // sem subir o pitch (era 1.1 → soava sintético)
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
      el.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:rgba(40,40,40,0.55);color:#e8e8e8;border:1px solid #888;padding:3px 9px;border-radius:6px;font:500 12px system-ui;z-index:200;max-width:70vw;text-align:center;';
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
