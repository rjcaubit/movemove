import * as Phaser from 'phaser';

export class AudioBus {
  private musicSound:   Phaser.Sound.BaseSound | null = null;
  private musicVolume   = 0.4;
  private duckedVolume  = 0.15;
  private isDucked      = false;
  private duckTimer:    number | null = null;
  private scene:        Phaser.Scene;
  private sfxEnabled    = true;

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  startMusic(): void {
    if (!this.scene.cache.audio.exists('music_run_loop')) return;
    if (this.musicSound) return;
    this.musicSound = this.scene.sound.add('music_run_loop',
      { loop: true, volume: this.musicVolume });
    this.musicSound.play();
  }

  stopMusic(): void {
    if (this.musicSound) { this.musicSound.stop(); this.musicSound = null; }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicSound && !this.isDucked)
      (this.musicSound as Phaser.Sound.BaseSound & { setVolume?(v: number): void }).setVolume?.(this.musicVolume);
  }

  duck(): void {
    if (!this.musicSound) return;
    this.isDucked = true;
    (this.musicSound as Phaser.Sound.BaseSound & { setVolume?(v: number): void }).setVolume?.(this.duckedVolume);
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
  }

  restore(delayMs = 500): void {
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
    this.duckTimer = window.setTimeout(() => {
      this.isDucked = false;
      if (this.musicSound)
        (this.musicSound as Phaser.Sound.BaseSound & { setVolume?(v: number): void }).setVolume?.(this.musicVolume);
    }, delayMs);
  }

  /** Toca um SFX via audioSprite. Gated: não falha se asset não carregou. */
  playSfx(marker: string): void {
    if (!this.sfxEnabled) return;
    if (!this.scene.cache.audio.exists('sfx')) return;
    try {
      (this.scene.sound as Phaser.Sound.BaseSoundManager & {
        playAudioSprite?(key: string, marker: string, config?: object): void;
      }).playAudioSprite?.('sfx', marker, { volume: 0.6 });
    } catch { /* silencioso — marker pode não existir no placeholder */ }
  }

  setSfxEnabled(v: boolean): void { this.sfxEnabled = v; }
  getMusicVolume(): number { return this.musicVolume; }
}
