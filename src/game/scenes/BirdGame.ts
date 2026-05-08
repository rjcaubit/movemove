import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { GameEvent } from '../../pose/types.ts';

const DURATION_MS = 60_000;
const GRAVITY = 0.58;        // normalized/s²
const JUMP_VY = -0.42;       // normalized/s (upward impulse)
const MAX_FALL_VY = 0.95;
const FLOOR_Y = 0.84;        // normalized — bird body center limit
const CEIL_Y = 0.06;
const LIVES = 3;
const HIT_INVINCIBILITY_MS = 1500;
const FLASH_INTERVAL_MS = 120;

interface BirdData {
  session?: string[];
}

export class BirdGame extends Phaser.Scene {
  private birdY = 0.45;
  private birdVY = 0.0;
  private lives = LIVES;
  private score = 0; // seconds survived
  private startedAt = 0;
  private lastHitAt = -Infinity;
  private done = false;

  private bird!: Phaser.GameObjects.Text;
  private ground!: Phaser.GameObjects.Graphics;
  private livesText!: Phaser.GameObjects.Text;
  private timePill!: Pill;

  private backdrop: CameraBackdrop | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private eventListener: ((e: Event) => void) | null = null;
  private flashTimer = 0;

  constructor() { super('BirdGame'); }

  create(data: BirdData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a1a2a);
    this.session = data?.session ?? [];
    this.birdY = 0.45;
    this.birdVY = 0;
    this.lives = LIVES;
    this.score = 0;
    this.done = false;
    this.startedAt = performance.now();
    this.lastHitAt = -Infinity;
    this.flashTimer = 0;

    addThemedFrame(this, 'bird');
    addTitleBanner(this, width / 2, 50, strings.miniGames.birdTitle, 0x4cd964, 0xffffff);

    this.timePill = new Pill(this, width - 130, 50, '60s', {
      width: 180, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
    });

    this.livesText = this.add.text(width / 2, 50, this.livesStr(), {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px',
    }).setOrigin(0.5).setDepth(50);

    // Ground strip
    this.ground = this.add.graphics().setDepth(12);
    this.drawGround();

    // Bird
    this.bird = this.add.text(width * 0.35, this.birdY * height, '🐦', {
      fontSize: '52px',
    }).setOrigin(0.5).setDepth(20);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.6);
    this.backdrop.handGlows = [
      { idx: 15, color: '#4cd964', alpha: 0.55 },
      { idx: 16, color: '#4cd964', alpha: 0.55 },
    ];

    this.narrator = new Narrator(null, true);
    this.narrator.speak(narratorLines.birdStart(), 2);

    this.eventListener = (e: Event) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      if (ev.type === 'jump') this.onJump();
    };
    refs.eventDetector.addEventListener('event', this.eventListener);

    // SPACE as keyboard fallback
    this.input.keyboard?.on('keydown-SPACE', () => this.onJump());

    addBackButton(this);
  }

  private onJump(): void {
    if (this.done) return;
    this.birdVY = JUMP_VY;
    // Wing flap visual
    this.tweens.add({
      targets: this.bird,
      scaleY: 0.7,
      duration: 80,
      yoyo: true,
    });
  }

  update(_time: number, delta: number): void {
    if (this.done) return;
    const now = performance.now();
    const elapsed = now - this.startedAt;
    const dt = delta / 1000;

    // Timer
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timePill.setText(`${remaining}s`);

    if (elapsed >= DURATION_MS) { this.finish(true); return; }

    // Physics
    this.birdVY = Math.min(MAX_FALL_VY, this.birdVY + GRAVITY * dt);
    this.birdY += this.birdVY * dt;

    // Ceiling
    if (this.birdY < CEIL_Y) { this.birdY = CEIL_Y; this.birdVY = 0; }

    // Bird tilt: nose up when rising, nose down when falling
    this.bird.setRotation(Phaser.Math.Clamp(this.birdVY * 0.9, -0.45, 1.1));
    this.bird.setY(this.birdY * GAME_CONFIG.height);

    // Flash animation during invincibility
    const inInvincibility = now - this.lastHitAt < HIT_INVINCIBILITY_MS;
    if (inInvincibility) {
      this.flashTimer += delta;
      this.bird.setAlpha(Math.floor(this.flashTimer / FLASH_INTERVAL_MS) % 2 === 0 ? 1 : 0.15);
    } else {
      this.bird.setAlpha(1);
      this.flashTimer = 0;
    }

    // Floor collision
    if (this.birdY >= FLOOR_Y && !inInvincibility) {
      this.birdY = FLOOR_Y - 0.01;
      this.birdVY = JUMP_VY * 0.5; // small bounce
      this.lastHitAt = now;
      this.lives -= 1;
      this.livesText.setText(this.livesStr());

      if (this.lives <= 0) {
        this.finish(false);
      } else {
        this.cameras.main.shake(200, 0.012);
        this.narrator.speak(narratorLines.birdHitGround(this.lives), 1);
      }
    }
  }

  private livesStr(): string {
    return '❤️'.repeat(this.lives) + '🖤'.repeat(LIVES - this.lives);
  }

  private drawGround(): void {
    const { width, height } = GAME_CONFIG;
    const gy = FLOOR_Y * height;
    this.ground.clear();
    // Dirt
    this.ground.fillStyle(0x5c3317, 1);
    this.ground.fillRect(0, gy, width, height - gy);
    // Grass strip
    this.ground.fillStyle(0x3a7d1e, 1);
    this.ground.fillRect(0, gy, width, 14);
  }

  private finish(survived: boolean): void {
    if (this.done) return;
    this.done = true;

    if (this.eventListener) {
      const refs = getRefs(this);
      refs.eventDetector.removeEventListener('event', this.eventListener);
      this.eventListener = null;
    }

    const elapsed = performance.now() - this.startedAt;
    this.score = Math.round(Math.min(DURATION_MS, elapsed) / 1000);

    if (survived) this.narrator.speak(narratorLines.birdSurvived(), 2);

    const refs = getRefs(this);
    void refs.missions.tick({ birdSeconds: this.score });
    this.scene.start('MiniGameResult', {
      gameKey: 'BirdGame',
      score: this.score,
      scoreLabel: strings.miniGames.birdSeconds,
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.eventListener) {
      try {
        const refs = getRefs(this);
        refs.eventDetector.removeEventListener('event', this.eventListener);
      } catch { /* scene may have been destroyed */ }
      this.eventListener = null;
    }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
  }
}
