import * as Phaser from 'phaser';

export class AudioBus {
  private musicSound: Phaser.Sound.BaseSound | null = null;
  private musicVolume = 0.4;
  private duckedVolume = 0.15;
  private isDucked = false;
  private duckRestoreTimer: number | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  startMusic(): void {
    if (!this.scene.cache.audio.exists('music_run_loop')) return;
    if (this.musicSound) return;
    this.musicSound = this.scene.sound.add('music_run_loop', { loop: true, volume: this.musicVolume });
    this.musicSound.play();
  }

  stopMusic(): void {
    if (this.musicSound) { this.musicSound.stop(); this.musicSound = null; }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicSound && !this.isDucked) {
      (this.musicSound as Phaser.Sound.BaseSound & { setVolume?: (v: number) => void }).setVolume?.(this.musicVolume);
    }
  }

  duck(): void {
    if (!this.musicSound) return;
    this.isDucked = true;
    (this.musicSound as Phaser.Sound.BaseSound & { setVolume?: (v: number) => void }).setVolume?.(this.duckedVolume);
    if (this.duckRestoreTimer !== null) clearTimeout(this.duckRestoreTimer);
  }

  restore(delayMs = 500): void {
    if (this.duckRestoreTimer !== null) clearTimeout(this.duckRestoreTimer);
    this.duckRestoreTimer = window.setTimeout(() => {
      this.isDucked = false;
      if (this.musicSound) (this.musicSound as Phaser.Sound.BaseSound & { setVolume?: (v: number) => void }).setVolume?.(this.musicVolume);
    }, delayMs);
  }

  getMusicVolume(): number { return this.musicVolume; }
}
