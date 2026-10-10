import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Road } from '../systems/road.ts';
import { Spawner } from '../systems/spawner.ts';
import { Player } from '../entities/Player.ts';
import { Obstacle } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { PostFxOverlay } from '../ui/postfx.ts';
import { SpeedLines } from '../ui/speedLines.ts';
import { mulberry32 } from '../systems/rng.ts';

/**
 * Demo scene — visual completo sem câmera, sem colisão, sem game over.
 * Acessada via `?demo=1`.
 *
 * Controles:
 *   ↑/↓   — velocidade
 *   ←/→   — mudar lane do jogador
 *   SPACE  — pular
 *   D      — agachar
 *   O      — spawnar oponente aleatório imediatamente
 */
export class Demo extends Phaser.Scene {
  private road!: Road;
  private spawner!: Spawner;
  private player!: Player;
  private speedLines!: SpeedLines;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private speedMps = 10;
  private speedEl!: Phaser.GameObjects.Text;

  constructor() { super('Demo'); }

  preload(): void {
    // Sprites — remove placeholders procedurais e força carga dos PNGs reais
    const sprites: [string, string][] = [
      ['player_walk',  '/assets/sprites/player_walk.png'],
      ['player_run_b', '/assets/sprites/player_run_b.png'],
      ['player_stand', '/assets/sprites/player_stand.png'],
      ['player_jump',  '/assets/sprites/player_jump.png'],
      ['player_duck',  '/assets/sprites/player_duck.png'],
      ['enemy_a',      '/assets/sprites/enemy_a.png'],
      ['enemy_b',      '/assets/sprites/enemy_b.png'],
      ['enemy_c',      '/assets/sprites/enemy_c.png'],
      ['enemy_d',      '/assets/sprites/enemy_d.png'],
      ['bg_tile',      '/assets/sprites/bg_tile.png'],
      ['bg_purple_a',  '/assets/sprites/bg_purple_a.png'],
      ['bg_purple_b',  '/assets/sprites/bg_purple_b.png'],
      ['bg_purple_c',  '/assets/sprites/bg_purple_c.png'],
    ];
    for (const [key, path] of sprites) {
      this.textures.remove(key);       // descarta placeholder procedural
      this.load.image(key, path);
    }

    // Sons do Kenney Desert Shooter Pack
    if (!this.cache.audio.exists('sfx_jump'))     this.load.audio('sfx_jump',    '/assets/audio/sfx_jump.ogg');
    if (!this.cache.audio.exists('sfx_coin'))     this.load.audio('sfx_coin',    '/assets/audio/sfx_coin.ogg');
    if (!this.cache.audio.exists('sfx_hurt'))     this.load.audio('sfx_hurt',    '/assets/audio/sfx_hurt.ogg');
    if (!this.cache.audio.exists('sfx_gameover')) this.load.audio('sfx_gameover','/assets/audio/sfx_gameover.ogg');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);
    this.road    = new Road(this);
    this.road.drawNow();
    this.player  = new Player(this);
    this.spawner = new Spawner(mulberry32(42));
    new PostFxOverlay(this);
    this.speedLines = new SpeedLines(this);
    this.obstacles  = [];
    this.coins      = [];

    this.add.text(GAME_CONFIG.width / 2, 10,
      'DEMO  ↑↓ velocidade · ←→ lane · SPACE pula · D agacha · O spawn', {
        fontFamily: 'VT323, ui-monospace', fontSize: '16px', color: '#ffcc44',
        backgroundColor: 'rgba(0,0,0,0.65)', padding: { x: 10, y: 4 },
      }).setOrigin(0.5, 0).setDepth(100);

    this.speedEl = this.add.text(10, GAME_CONFIG.height - 10, `${this.speedMps} m/s`, {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#ffcc00',
      backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 6, y: 2 },
    }).setOrigin(0, 1).setDepth(100);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP',   () => { this.speedMps = Math.min(30, this.speedMps + 2); });
      this.input.keyboard.on('keydown-DOWN', () => { this.speedMps = Math.max(0,  this.speedMps - 2); });
      this.input.keyboard.on('keydown-LEFT', () =>
        this.player.setLane(Math.max(-1, this.player.getLane() - 1) as -1|0|1));
      this.input.keyboard.on('keydown-RIGHT', () =>
        this.player.setLane(Math.min( 1, this.player.getLane() + 1) as -1|0|1));
      this.input.keyboard.on('keydown-SPACE', () => {
        this.player.jump();
        if (this.cache.audio.exists('sfx_jump')) this.sound.play('sfx_jump', { volume: 0.5 });
      });
      this.input.keyboard.on('keydown-D', () => {
        this.player.duck();
      });
      this.input.keyboard.on('keydown-O', () => {
        const lanes: (-1|0|1)[] = [-1, 0, 1];
        const lane = lanes[Math.floor(Math.random() * 3)];
        const kinds = ['barrier','low_barrier','jump_brick','jump_column','duck_log','duck_banner','laser_beam'] as const;
        this.obstacles.push(new Obstacle(this, kinds[Math.floor(Math.random() * kinds.length)], lane));
      });
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;

    this.road.update(this.speedMps, dt);
    this.player.update(dt);

    for (const o of this.obstacles) o.update(this.speedMps, dt);
    for (const c of this.coins)     c.update(this.speedMps, dt);
    this.obstacles = this.obstacles.filter(o => o.alive);
    this.coins     = this.coins.filter(c => c.alive);

    this.spawner.update(this, dt, this.speedMps, this.obstacles, this.coins, [], 3);

    if (GAME_CONFIG.fx.speedLines) {
      this.speedLines.setVisible(this.speedMps >= 12);
      this.speedLines.update(0.8);
    }

    this.speedEl.setText(`${this.speedMps} m/s`);
  }
}
