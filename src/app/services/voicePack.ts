/**
 * Pacote de voz pré-gravada (MP3 gerados por `npm run voz`). Toca via Web
 * Audio: o AudioContext é destravado no primeiro toque do usuário (exigência
 * do iOS) e depois as falas podem tocar sozinhas durante o treino.
 * No React Native, trocar por expo-av/react-native-sound mantendo a interface.
 */
export const VOICE_ID = 'francisca-25';
const BASE = `/voice/${VOICE_ID}/`;

type Index = Record<string, string>;

const norm = (t: string): string => t.trim().replace(/\s+/g, ' ');

class VoicePack {
  private index: Index | null = null;
  private indexPromise: Promise<Index> | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private ctx: AudioContext | null = null;
  private current: AudioBufferSourceNode | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = (): void => { void this.context()?.resume(); };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    return this.ctx;
  }

  private loadIndex(): Promise<Index> {
    if (this.index) return Promise.resolve(this.index);
    if (!this.indexPromise) {
      this.indexPromise = fetch(`${BASE}index.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))
        .then((idx: Index) => { this.index = idx; return idx; });
    }
    return this.indexPromise;
  }

  private load(text: string): Promise<AudioBuffer | null> {
    const key = norm(text);
    const hit = this.buffers.get(key);
    if (hit) return Promise.resolve(hit);
    const pending = this.loading.get(key);
    if (pending) return pending;
    const p = this.loadIndex().then(async (idx) => {
      const file = idx[key];
      const ctx = this.context();
      if (!file || !ctx) return null;
      try {
        const res = await fetch(BASE + file);
        if (!res.ok) return null;
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(key, buf);
        return buf;
      } catch {
        return null;
      } finally {
        this.loading.delete(key);
      }
    });
    this.loading.set(key, p);
    return p;
  }

  /** Baixa e decodifica as frases (ex: as do treino atual). */
  async preload(texts: string[]): Promise<void> {
    await this.loadIndex();
    await Promise.all([...new Set(texts)].map((t) => this.load(t)));
  }

  /** Toca a frase se ela já estiver pronta. false = use a voz do navegador. */
  play(text: string): boolean {
    const buf = this.buffers.get(norm(text));
    const ctx = this.ctx;
    if (!buf || !ctx || ctx.state !== 'running') {
      if (!buf) void this.load(text);
      return false;
    }
    this.stop();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => { if (this.current === src) this.current = null; };
    src.start();
    this.current = src;
    return true;
  }

  stop(): void {
    try { this.current?.stop(); } catch { /* já terminou */ }
    this.current = null;
  }
}

export const voicePack = new VoicePack();
