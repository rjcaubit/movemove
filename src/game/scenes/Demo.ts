import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Road } from '../systems/road.ts';
import { Parallax } from '../systems/parallax.ts';
import { Spawner } from '../systems/spawner.ts';
import { Player } from '../entities/Player.ts';
import { Obstacle } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { mulberry32 } from '../systems/rng.ts';

/**
 * Demo scene — visual completo (estrada + paralax + jogador idle + obstáculos +
 * moedas) sem câmera, sem colisão, sem game over. Acessada via `?demo=1`.
 * Útil pra avaliar visual à distância (TV, celular apoiado), gravar vídeo curto,
 * ou tunar paleta/spawn rate.
 *
 * Controles: ↑/↓ ajustam velocidade, ←/→ trocam lane do jogador (cosmético).
 */
export class Demo extends Phaser.Scene {
  private road!: Road;
  private parallax!: Parallax;
  private spawner!: Spawner;
  private player!: Player;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private speedMps = 10;

  constructor() { super('Demo'); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.parallax = new Parallax(this);
    this.road = new Road(this);
    this.player = new Player(this);
    this.spawner = new Spawner(mulberry32(42));
    this.obstacles = [];
    this.coins = [];

    this.add.text(GAME_CONFIG.width / 2, 24, 'DEMO — sem câmera (↑/↓ velocidade · ←/→ lane)', {
      fontFamily: 'system-ui', fontSize: '13px', color: '#f5f5f5',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 0).setDepth(100);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP', () => { this.speedMps = Math.min(30, this.speedMps + 2); });
      this.input.keyboard.on('keydown-DOWN', () => { this.speedMps = Math.max(0, this.speedMps - 2); });
      this.input.keyboard.on('keydown-LEFT', () => {
        const next = Math.max(-1, this.player.getLane() - 1) as -1 | 0 | 1;
        this.player.setLane(next);
      });
      this.input.keyboard.on('keydown-RIGHT', () => {
        const next = Math.min(1, this.player.getLane() + 1) as -1 | 0 | 1;
        this.player.setLane(next);
      });
      this.input.keyboard.on('keydown-SPACE', () => this.player.jump());
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;

    this.parallax.update(this.speedMps, dt);
    this.road.update(this.speedMps, dt);
    this.player.update(dt);

    for (const o of this.obstacles) o.update(this.speedMps, dt);
    for (const c of this.coins) c.update(this.speedMps, dt);
    this.obstacles = this.obstacles.filter((o) => o.alive);
    this.coins = this.coins.filter((c) => c.alive);

    this.spawner.update(this, dt, this.speedMps, this.obstacles, this.coins);
    // Sem checkCollisions — obstáculos passam pelo jogador.
  }
}
