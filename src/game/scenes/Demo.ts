import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Road } from '../systems/road.ts';
import { Parallax } from '../systems/parallax.ts';
import { Spawner } from '../systems/spawner.ts';
import { Player } from '../entities/Player.ts';
import { Obstacle } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { BillboardLayer } from '../systems/billboard.ts';
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
  private parallax!: Parallax;
  private spawner!: Spawner;
  private player!: Player;
  private speedLines!: SpeedLines;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private speedMps = 10;
  private speedEl!: Phaser.GameObjects.Text;

  constructor() { super('Demo'); }

  create(): void {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.bgColor);
    this.parallax   = new Parallax(this);
    this.road       = new Road(this);
    new BillboardLayer(this);
    this.player     = new Player(this);
    this.spawner    = new Spawner(mulberry32(42));
    new PostFxOverlay(this);
    this.speedLines = new SpeedLines(this);
    this.obstacles  = [];
    this.coins      = [];

    this.add.text(GAME_CONFIG.width / 2, 10, 'DEMO  ↑↓ velocidade · ←→ lane · SPACE pula · D agacha · O spawn oponente', {
      fontFamily: 'VT323, ui-monospace', fontSize: '16px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 0).setDepth(100);

    this.speedEl = this.add.text(10, GAME_CONFIG.height - 10, `${this.speedMps} m/s`, {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#ffd60a',
      backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 6, y: 2 },
    }).setOrigin(0, 1).setDepth(100);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP',    () => { this.speedMps = Math.min(30, this.speedMps + 2); });
      this.input.keyboard.on('keydown-DOWN',  () => { this.speedMps = Math.max(0,  this.speedMps - 2); });
      this.input.keyboard.on('keydown-LEFT',  () => this.player.setLane(Math.max(-1, this.player.getLane() - 1) as -1|0|1));
      this.input.keyboard.on('keydown-RIGHT', () => this.player.setLane(Math.min( 1, this.player.getLane() + 1) as -1|0|1));
      this.input.keyboard.on('keydown-SPACE', () => this.player.jump());
      this.input.keyboard.on('keydown-D',     () => this.player.duck());
      this.input.keyboard.on('keydown-O',     () => {
        // Força spawn de oponente/obstáculo imediato
        const lanes: (-1|0|1)[] = [-1, 0, 1];
        const lane = lanes[Math.floor(Math.random() * 3)];
        const kinds = ['barrier','low_barrier','jump_brick','jump_column','duck_log','duck_banner','laser_beam'] as const;
        this.obstacles.push(new Obstacle(this, kinds[Math.floor(Math.random() * kinds.length)], lane));
      });
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;

    this.parallax.update(this.speedMps, dt);
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
