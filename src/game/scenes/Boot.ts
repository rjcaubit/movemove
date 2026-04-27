import * as Phaser from 'phaser';

/**
 * Boot scene. Gera texturas placeholder programaticamente — substitui o
 * download manual de assets Kenney da spec. Real sprites + bitmap font ficam
 * pra issue de polish posterior. Documentado em 04-acceptance.md.
 */
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.makeRect('px-white', 4, 4, 0xffffff);

    // Player (3 frames de corrida + idle/jump/duck) — quadrado verde com detalhe
    this.makePlayer('player_idle', 0x4cd964, 0);
    this.makePlayer('player_run_a', 0x4cd964, 1);
    this.makePlayer('player_run_b', 0x4cd964, -1);
    this.makePlayer('player_jump', 0x4cd964, 0, true);
    this.makePlayer('player_duck', 0x4cd964, 0, false, true);
    this.makeRect('mascot', 32, 48, 0x4cd964);

    // Obstáculos
    this.makeRect('obs_barrier', 32, 64, 0xff453a);     // alto: pular
    this.makeRect('obs_low', 48, 24, 0xff9f0a);         // baixo: deslizar
    this.makeRect('obs_wall', 64, 96, 0xbf5af2);        // parede: mudar lane

    // Coin (círculo amarelo)
    this.makeCircle('coin', 16, 0xffd60a);

    // Backgrounds — gradiente / cor sólida
    this.makeRect('bg_sky', 960, 240, 0x87ceeb);
    this.makeRect('bg_far', 960, 80, 0x6a8caf);
    this.makeRect('bg_near', 960, 60, 0x4a6a8a);

    // Sons placeholder: o Boot usaria load.audio, mas em modo autonomous sem
    // arquivos reais a Web Audio API quebra o load. Pulamos o load — chamadas
    // a sound.play() viram no-op (com warning silencioso) na Fase 0 do Phaser.
  }

  create(): void {
    this.scene.start('Welcome');
  }

  private makeRect(key: string, w: number, h: number, color: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1).fillRect(0, 0, w, h);
    g.lineStyle(2, 0x000000, 0.6).strokeRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeCircle(key: string, r: number, color: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1).fillCircle(r, r, r);
    g.lineStyle(2, 0x000000, 0.6).strokeCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private makePlayer(key: string, color: number, legOffset: number, jumping = false, ducking = false): void {
    if (this.textures.exists(key)) return;
    const w = 32; const h = ducking ? 24 : (jumping ? 36 : 48);
    const g = this.make.graphics({ x: 0, y: 0 });
    // Corpo
    g.fillStyle(color, 1).fillRect(0, 0, w, h);
    g.lineStyle(2, 0x000000, 0.6).strokeRect(0, 0, w, h);
    // "Olhos"
    g.fillStyle(0x000000, 1);
    g.fillRect(8, 8, 4, 4);
    g.fillRect(20, 8, 4, 4);
    // "Pernas" (legOffset simula corrida)
    if (!ducking) {
      g.fillStyle(0x0b0d10, 1);
      g.fillRect(4 + legOffset * 2, h - 8, 8, 8);
      g.fillRect(20 - legOffset * 2, h - 8, 8, 8);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
