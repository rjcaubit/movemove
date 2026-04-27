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
    this.makeRoller('obs_barrier', 80, 28, 0xff453a);   // rolo no chão: PULAR
    this.makeTorii('obs_low', 72, 64, 0xff9f0a);        // trave horizontal alta: AGACHAR
    this.makeRect('obs_wall', 64, 96, 0xbf5af2);        // parede: MUDAR LANE

    // Coin (círculo amarelo)
    this.makeCircle('coin', 16, 0xffd60a);

    // Backgrounds — gradiente / cor sólida
    this.makeRect('bg_sky', 960, 240, 0x87ceeb);
    this.makeRect('bg_far', 960, 80, 0x6a8caf);
    this.makeRect('bg_near', 960, 60, 0x4a6a8a);

    // Sons opcionais: tenta carregar mas não bloqueia se 404 (assets reais
    // ficam pra polish issue A/V). cache.audio.exists() guarda chamadas play().
    this.load.audio('music_run_loop', '/assets/sounds/music/run-loop.ogg');
    this.load.audio('snd_shield_on', '/assets/sounds/shield_on.ogg');
    this.load.audio('snd_jack_done', '/assets/sounds/jack_done.ogg');
    this.load.audio('snd_water_break', '/assets/sounds/water_break.ogg');
    this.load.audio('snd_mission_complete', '/assets/sounds/mission_complete.ogg');
    this.load.on('loaderror', (file: { src: string }): void => {
      // Esperado em ambiente sem assets reais; gated por cache.audio.exists() depois.
      console.warn('Audio not loaded (placeholder ok):', file.src);
    });
  }

  create(): void {
    const demo = new URLSearchParams(window.location.search).get('demo') === '1';
    this.scene.start(demo ? 'Demo' : 'Welcome');
  }

  private makeRect(key: string, w: number, h: number, color: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1).fillRect(0, 0, w, h);
    g.lineStyle(2, 0x000000, 0.6).strokeRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** Rolo horizontal no chão — lê como "pular por cima". */
  private makeRoller(key: string, w: number, h: number, color: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    const r = h / 2;
    g.fillStyle(color, 1);
    g.fillRect(r, 0, w - 2 * r, h);
    g.fillCircle(r, r, r);
    g.fillCircle(w - r, r, r);
    g.lineStyle(2, 0x000000, 0.7);
    g.strokeCircle(r, r, r);
    g.strokeCircle(w - r, r, r);
    g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.strokePath();
    g.beginPath(); g.moveTo(r, h); g.lineTo(w - r, h); g.strokePath();
    // 3 listras pra dar sensação de volume cilíndrico
    g.lineStyle(1, 0x000000, 0.4);
    for (let i = 1; i <= 3; i++) {
      const x = r + (w - 2 * r) * (i / 4);
      g.beginPath(); g.moveTo(x, 4); g.lineTo(x, h - 4); g.strokePath();
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** Torii: 2 postes verticais + trave horizontal no topo — lê como "agache pra passar por baixo". */
  private makeTorii(key: string, w: number, h: number, color: number): void {
    if (this.textures.exists(key)) return;
    const postW = 8;
    const beamH = 10;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    // postes
    g.fillRect(0, beamH, postW, h - beamH);
    g.fillRect(w - postW, beamH, postW, h - beamH);
    // trave horizontal (sobressai um pouco dos postes)
    g.fillRect(-4, 0, w + 8, beamH);
    // borda
    g.lineStyle(2, 0x000000, 0.7);
    g.strokeRect(0, beamH, postW, h - beamH);
    g.strokeRect(w - postW, beamH, postW, h - beamH);
    g.strokeRect(-4, 0, w + 8, beamH);
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
