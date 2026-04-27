import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Player } from '../entities/Player.ts';
import { Obstacle } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { Road } from '../systems/road.ts';
import { Parallax } from '../systems/parallax.ts';
import { Spawner } from '../systems/spawner.ts';
import { Scoring } from '../systems/scoring.ts';
import { checkCollisions } from '../systems/collision.ts';
import { HUD } from '../ui/hud.ts';
import { getRng } from '../systems/rng.ts';
import type { Lane } from '../../pose/types.ts';

const C = GAME_CONFIG;

export class Play extends Phaser.Scene {
  private player!: Player;
  private road!: Road;
  private parallax!: Parallax;
  private spawner!: Spawner;
  private scoring!: Scoring;
  private hud!: HUD;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private speedMps: number = C.speedInitial;
  private elapsedMs = 0;
  private muted = false;

  constructor() { super('Play'); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.parallax = new Parallax(this);
    this.road = new Road(this);
    this.player = new Player(this);
    this.spawner = new Spawner(getRng());
    this.scoring = new Scoring();
    this.hud = new HUD(this);
    this.obstacles = [];
    this.coins = [];
    this.speedMps = C.speedInitial;
    this.elapsedMs = 0;

    this.muted = (() => { try { return localStorage.getItem(C.storageKeys.muted) === 'true'; } catch { return false; } })();
    this.sound.mute = this.muted;
    const muteBtn = this.add.text(C.width - 20, C.height - 20, this.muted ? '🔇' : '🔊', {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 4 },
    }).setOrigin(1, 1).setDepth(100).setInteractive({ useHandCursor: true });
    muteBtn.setName('btn-mute');
    muteBtn.setData('action', 'mute');
    muteBtn.on('pointerup', () => {
      this.muted = !this.muted;
      this.sound.mute = this.muted;
      muteBtn.setText(this.muted ? '🔇' : '🔊');
      try { localStorage.setItem(C.storageKeys.muted, String(this.muted)); } catch {/* ignore */}
    });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.player.jump());
      this.input.keyboard.on('keydown-DOWN', () => this.player.duck());
      this.input.keyboard.on('keydown-LEFT', () => this.player.setLane(this.shiftLane(-1)));
      this.input.keyboard.on('keydown-RIGHT', () => this.player.setLane(this.shiftLane(1)));
    }
  }

  private shiftLane(dir: -1 | 1): Lane {
    const cur = this.player.getLane();
    const next = Math.max(-1, Math.min(1, cur + dir)) as Lane;
    return next;
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.elapsedMs += deltaMs;

    const steps = Math.floor(this.elapsedMs / C.speedIncreaseIntervalMs);
    this.speedMps = Math.min(C.speedMax, C.speedInitial + steps * C.speedIncreasePerInterval);

    this.parallax.update(this.speedMps, dt);
    this.road.update(this.speedMps, dt);
    this.player.update(dt);

    for (const o of this.obstacles) o.update(this.speedMps, dt);
    for (const c of this.coins) c.update(this.speedMps, dt);
    this.obstacles = this.obstacles.filter((o) => o.alive);
    this.coins = this.coins.filter((c) => c.alive);

    this.spawner.update(this, dt, this.speedMps, this.obstacles, this.coins);

    const result = checkCollisions(this.player, this.obstacles, this.coins);
    if (result.collidedObstacle) {
      if (this.cache.audio.exists('snd_hit')) this.sound.play('snd_hit');
      if (this.cache.audio.exists('snd_gameover')) this.sound.play('snd_gameover');
      this.scene.start('GameOver', { distance: this.scoring.getDistance(), coins: this.scoring.getCoins() });
      return;
    }
    for (const coin of result.collectedCoins) {
      coin.collect();
      this.scoring.addCoin();
      if (this.cache.audio.exists('snd_coin')) this.sound.play('snd_coin');
    }

    this.scoring.addDistance(dt, this.speedMps);
    this.hud.setDistance(this.scoring.getDistance());
    this.hud.setCoins(this.scoring.getCoins());
    this.hud.setFps(this.game.loop.actualFps);
  }
}
