import * as Phaser from 'phaser';

/**
 * Boot scene. Gera texturas placeholder programaticamente — substitui o
 * download manual de assets Kenney da spec. Real sprites + bitmap font ficam
 * pra issue de polish posterior. Documentado em 04-acceptance.md.
 */
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    // Sprites reais Kenney Desert Shooter Pack
    this.load.image('player_walk',  '/assets/sprites/player_walk.png');
    this.load.image('player_run_b', '/assets/sprites/player_run_b.png');
    this.load.image('player_stand', '/assets/sprites/player_stand.png');
    this.load.image('player_jump',  '/assets/sprites/player_jump.png');
    this.load.image('player_duck',  '/assets/sprites/player_duck.png');
    this.load.image('player_hurt',  '/assets/sprites/player_hurt.png');
    this.load.image('enemy_a',      '/assets/sprites/enemy_a.png');
    this.load.image('enemy_b',      '/assets/sprites/enemy_b.png');
    this.load.image('enemy_c',      '/assets/sprites/enemy_c.png');
    this.load.image('enemy_d',      '/assets/sprites/enemy_d.png');

    // Obstáculos / coletáveis Kenney Desert Shooter
    this.load.image('obs_barrier',     '/assets/sprites/obs_barrier.png');
    this.load.image('obs_wall_lane',   '/assets/sprites/obs_wall_lane.png');
    this.load.image('obs_jump_brick',  '/assets/sprites/obs_jump_brick.png');
    this.load.image('obs_jump_column', '/assets/sprites/obs_jump_column.png');
    this.load.image('coin_k',          '/assets/sprites/coin_k.png');
    this.load.image('heart_k',         '/assets/sprites/heart_k.png');

    // Inimigos Kenney — 4 frames cada para animação de caminhada
    for (let i = 0; i < 4; i++) {
      this.load.image(`robot_${i}`,  `/assets/sprites/robot_${i}.png`);
      this.load.image(`animal_${i}`, `/assets/sprites/animal_${i}.png`);
      this.load.image(`zombie_${i}`, `/assets/sprites/zombie_${i}.png`);
      this.load.image(`ghost_${i}`,  `/assets/sprites/ghost_${i}.png`);
    }

    this.load.image('welcome_bg',    '/assets/sprites/welcome_bg.png');
    this.load.image('hub_bg',        '/assets/sprites/hub_bg.png');
    this.load.spritesheet('pictograms', '/assets/sprites/pictograms_sheet.png', { frameWidth: 124, frameHeight: 124 });
    this.load.image('bg_tile',       '/assets/sprites/bg_tile.png');
    this.load.image('bg_purple_a',   '/assets/sprites/bg_purple_a.png');
    this.load.image('bg_purple_b',   '/assets/sprites/bg_purple_b.png');
    this.load.image('bg_purple_c',   '/assets/sprites/bg_purple_c.png');

    this.makeRect('px-white', 4, 4, 0xffffff);
    // player_run_a: único fallback procedural para caso PNG falhe
    this.makePlayer('player_run_a', 0x4cd964, 1);
    this.makeRect('mascot', 32, 48, 0x4cd964);

    // Obstáculos: PNGs Kenney são carregados acima; fallback procedural
    // específico fica em Obstacle.ts via ensureTexture quando o PNG faltar.

    // Coin (círculo amarelo) — fallback caso coin_k.png falhe
    this.makeCircle('coin', 16, 0xffd60a);

    // Backgrounds — gradiente / cor sólida
    this.makeRect('bg_sky', 1280, 320, 0x0d1530);
    this.makeRect('bg_far', 1280, 107, 0x0a0e1a);
    this.makeRect('bg_near', 1280, 80, 0x0a0e1a);

    // Áudio carregado em Loading.ts via audiosprite — não carrega aqui para
    // evitar EncodingError não tratado com arquivos placeholder.
  }

  create(): void {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo') === '1';
    const danceCheck = params.get('dance') === 'check';
    const recMode = params.get('rec') === '1';
    if (danceCheck) {
      this.scene.start('Loading', { next: 'DanceDance' });
      return;
    }
    if (recMode) {
      this.scene.start('Loading', { next: 'Rec' });
      return;
    }
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
