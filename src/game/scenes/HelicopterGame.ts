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
// Gravidade progressiva — começa BEM suave e cresce devagar até o teto em 12s.
const GRAVITY_INITIAL = 0.08;  // normalized/s² (queda inicial bem leve)
const GRAVITY_MAX = 0.32;       // queda no fim ainda controlável
const GRAVITY_RAMP_MS = 12_000;
const MAX_FALL_VY = 0.55;       // velocidade terminal de queda (era 0.85)
// Pulo
const JUMP_VY = -0.55;          // impulso forte pra cima
const JUMP_STACK_FACTOR = 0.7;  // pulo enquanto já sobe adiciona 70% do impulso
const JUMP_VY_CAP = -1.10;      // teto de velocidade ascendente
// Hover — após um pulo, gravidade fica reduzida por 1.5s (rotor ainda dando força)
const HOVER_DURATION_MS = 1500;
const HOVER_GRAVITY_FLOOR = 0.15; // logo após pulo, gravidade vira 15% da normal
// Posição
const FLOOR_Y = 0.84;
const CEIL_Y = 0.06;
const START_Y = 0.10;
const LIVES = 3;
const HIT_INVINCIBILITY_MS = 1500;
const FLASH_INTERVAL_MS = 120;

interface HelicopterData {
  session?: string[];
}

export class HelicopterGame extends Phaser.Scene {
  private heliY = START_Y;
  private heliVY = 0.0;
  private lives = LIVES;
  private score = 0; // seconds survived
  private startedAt = 0;
  private lastHitAt = -Infinity;
  private done = false;

  private heli!: Phaser.GameObjects.Text;
  private ground!: Phaser.GameObjects.Graphics;
  private livesText!: Phaser.GameObjects.Text;
  private timePill!: Pill;

  private backdrop: CameraBackdrop | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private eventListener: ((e: Event) => void) | null = null;
  private flashTimer = 0;
  private lastJumpAt = -Infinity;

  constructor() { super('HelicopterGame'); }

  create(data: HelicopterData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a1a2a);
    this.session = data?.session ?? [];
    this.heliY = START_Y;
    this.heliVY = 0;
    this.lives = LIVES;
    this.score = 0;
    this.done = false;
    this.startedAt = performance.now();
    this.lastHitAt = -Infinity;
    this.flashTimer = 0;
    this.lastJumpAt = -Infinity;

    addThemedFrame(this, 'helicopter');
    addTitleBanner(this, width / 2, 50, strings.miniGames.helicopterTitle, 0x4cd964, 0xffffff);

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

    // Helicopter
    this.heli = this.add.text(width * 0.35, this.heliY * height, '🚁', {
      fontSize: '56px',
    }).setOrigin(0.5).setDepth(20);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.6);
    this.backdrop.handGlows = [
      { idx: 15, color: '#4cd964', alpha: 0.55 },
      { idx: 16, color: '#4cd964', alpha: 0.55 },
    ];

    this.narrator = new Narrator(null, true);
    this.narrator.speak(narratorLines.helicopterStart(), 2);

    this.eventListener = (e: Event) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      if (ev.type === 'jump') this.onJump();
    };
    refs.eventDetector.addEventListener('event', this.eventListener);

    // SPACE como fallback de teclado
    this.input.keyboard?.on('keydown-SPACE', () => this.onJump());

    addBackButton(this);
  }

  private onJump(): void {
    if (this.done) return;
    if (this.heliVY < 0) {
      // Já estava subindo — pulo empilha impulso (pumping up). Limita pelo cap
      // pra não disparar pro infinito se o jogador pular freneticamente.
      this.heliVY = Math.max(JUMP_VY_CAP, this.heliVY + JUMP_VY * JUMP_STACK_FACTOR);
    } else {
      // Estava caindo / parado — impulso completo
      this.heliVY = JUMP_VY;
    }
    this.lastJumpAt = performance.now();
    // Pulso do rotor — squash visual no eixo Y
    this.tweens.add({
      targets: this.heli,
      scaleY: 0.8,
      duration: 80,
      yoyo: true,
    });
  }

  private currentGravity(elapsed: number, now: number): number {
    const ramp = Math.min(1, elapsed / GRAVITY_RAMP_MS);
    const base = GRAVITY_INITIAL + (GRAVITY_MAX - GRAVITY_INITIAL) * ramp;
    // Hover phase: logo após o pulo a gravidade vira HOVER_GRAVITY_FLOOR×base
    // e cresce linearmente de volta a 1× ao longo de HOVER_DURATION_MS.
    const sinceJump = now - this.lastJumpAt;
    if (sinceJump < HOVER_DURATION_MS) {
      const k = sinceJump / HOVER_DURATION_MS; // 0 → 1
      const factor = HOVER_GRAVITY_FLOOR + (1 - HOVER_GRAVITY_FLOOR) * k;
      return base * factor;
    }
    return base;
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

    // Física com gravidade progressiva + hover após pulo
    const g = this.currentGravity(elapsed, now);
    this.heliVY = Math.min(MAX_FALL_VY, this.heliVY + g * dt);
    this.heliY += this.heliVY * dt;

    // Teto
    if (this.heliY < CEIL_Y) { this.heliY = CEIL_Y; this.heliVY = 0; }

    // Inclina pra frente quando sobe, pra trás quando cai (helicóptero pousando)
    this.heli.setRotation(Phaser.Math.Clamp(this.heliVY * 0.6, -0.30, 0.85));
    this.heli.setY(this.heliY * GAME_CONFIG.height);

    // Piscada de invencibilidade
    const inInvincibility = now - this.lastHitAt < HIT_INVINCIBILITY_MS;
    if (inInvincibility) {
      this.flashTimer += delta;
      this.heli.setAlpha(Math.floor(this.flashTimer / FLASH_INTERVAL_MS) % 2 === 0 ? 1 : 0.15);
    } else {
      this.heli.setAlpha(1);
      this.flashTimer = 0;
    }

    // Colisão com chão
    if (this.heliY >= FLOOR_Y && !inInvincibility) {
      this.heliY = FLOOR_Y - 0.01;
      this.heliVY = JUMP_VY * 0.5; // bouncezinho
      this.lastHitAt = now;
      this.lives -= 1;
      this.livesText.setText(this.livesStr());

      if (this.lives <= 0) {
        this.finish(false);
      } else {
        this.cameras.main.shake(200, 0.012);
        this.narrator.speak(narratorLines.helicopterHitGround(this.lives), 1);
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
    // Asfalto/terra
    this.ground.fillStyle(0x5c3317, 1);
    this.ground.fillRect(0, gy, width, height - gy);
    // Faixa de grama
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

    if (survived) this.narrator.speak(narratorLines.helicopterSurvived(), 2);

    const refs = getRefs(this);
    void refs.missions.tick({ helicopterSeconds: this.score });
    this.scene.start('MiniGameResult', {
      gameKey: 'HelicopterGame',
      score: this.score,
      scoreLabel: strings.miniGames.helicopterSeconds,
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
