import { Midi } from '@tonejs/midi';

/**
 * Player simples de MIDI usando WebAudio puro. Sintetiza notas com osciladores
 * (triangle pra melodia, ruído branco curto pra drums no canal 10/index 9).
 *
 * Não pretende soar como soundfont — é um stub funcional pra prototipação.
 * Pra qualidade real, converter MIDI→OGG offline com fluidsynth + soundfont.
 */
export class MidiPlayer {
  private ctx: AudioContext;
  private master: GainNode;
  private midi: Midi | null = null;
  private startCtxTime = 0;
  private nextLoopAt = 0;
  private rafId: number | null = null;
  private playing = false;

  constructor(ctx: AudioContext, masterVolume = 0.35) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = masterVolume;
    this.master.connect(ctx.destination);
  }

  async load(url: string): Promise<void> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`MIDI fetch failed: ${r.status}`);
    const buf = await r.arrayBuffer();
    this.midi = new Midi(buf);
  }

  get bpm(): number {
    if (!this.midi) return 120;
    return this.midi.header.tempos[0]?.bpm ?? 120;
  }

  get durationSec(): number {
    return this.midi?.duration ?? 0;
  }

  /** Tempo decorrido (segundos) desde o início da música atual. Loopa. */
  getPlayTimeSec(): number {
    if (!this.playing) return 0;
    return this.ctx.currentTime - this.startCtxTime;
  }

  start(): void {
    if (!this.midi || this.playing) return;
    this.playing = true;
    this.startCtxTime = this.ctx.currentTime + 0.05;
    this.scheduleSong(this.startCtxTime);
    this.nextLoopAt = this.startCtxTime + this.durationSec;
    this.tick();
  }

  private tick = (): void => {
    if (!this.playing) return;
    // 250ms de antecedência: agenda próxima cópia da música pra continuar
    if (this.ctx.currentTime + 0.25 >= this.nextLoopAt) {
      this.startCtxTime = this.nextLoopAt;
      this.scheduleSong(this.nextLoopAt);
      this.nextLoopAt += this.durationSec;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private scheduleSong(baseTime: number): void {
    if (!this.midi) return;
    for (const track of this.midi.tracks) {
      const isDrums = track.channel === 9;
      for (const note of track.notes) {
        const t = baseTime + note.time;
        if (isDrums) this.scheduleDrumHit(t, note.midi, note.velocity);
        else this.scheduleNote(t, Math.max(0.05, note.duration), note.midi, note.velocity);
      }
    }
  }

  private scheduleNote(t: number, duration: number, midi: number, velocity: number): void {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(gain).connect(this.master);
    const peak = Math.max(0.04, velocity * 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    gain.gain.setValueAtTime(peak, t + Math.max(0.01, duration - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  private scheduleDrumHit(t: number, midi: number, velocity: number): void {
    // Mapeia notas de drum (GM Standard) em sons sintéticos básicos
    const isKick = midi >= 35 && midi <= 36;
    const isSnare = midi >= 38 && midi <= 40;
    const isClosedHat = midi === 42 || midi === 44;
    const isOpenHat = midi === 46;
    const peak = Math.max(0.05, velocity * 0.35);

    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain).connect(this.master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.10);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    } else if (isSnare || isClosedHat || isOpenHat) {
      // ruído branco simples
      const dur = isOpenHat ? 0.2 : (isSnare ? 0.12 : 0.04);
      const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = isSnare ? 2000 : 6000;
      const gain = this.ctx.createGain();
      src.connect(filter).connect(gain).connect(this.master);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak * (isSnare ? 0.7 : 0.35), t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.start(t); src.stop(t + dur + 0.02);
    }
    // Outras notas de drum ignoradas
  }

  stop(): void {
    this.playing = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
