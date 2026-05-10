import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import { Fruit } from '../entities/Fruit.ts';
import {
  NINJA_BOMB_GRACE_MS,
  NINJA_BOMB_SPAWN_CHANCE_INITIAL,
  NINJA_BOMB_SPAWN_CHANCE_MAX,
  NINJA_SPAWN_INTERVAL_MS_INITIAL,
  NINJA_SPAWN_INTERVAL_MS_MIN,
  NINJA_SPAWN_INTERVAL_STEP_MS,
} from '../../tuning.ts';

const LIVES = 3;

interface NinjaFruitData {
  session?: string[];
}

export class NinjaFruit extends Phaser.Scene {
  private lives = LIVES;
  private score = 0;
  private bestCombo = 0;
  private startedAt = 0;
  private done = false;

  private livesText!: Phaser.GameObjects.Text;
  private scorePill!: Pill;

  private backdrop: CameraBackdrop | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private frameUnsub: (() => void) | null = null;

  private fruits: Fruit[] = [];
  private nextSpawnAt = 0;
  private spawnIntervalMs = NINJA_SPAWN_INTERVAL_MS_INITIAL;
  private lastFrameTime = 0;

  constructor() { super('NinjaFruit'); }

  create(data: NinjaFruitData): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a0204);
    this.session = data?.session ?? [];
    this.lives = LIVES;
    this.score = 0;
    this.bestCombo = 0;
    this.startedAt = performance.now();
    this.done = false;
    this.fruits = [];
    this.nextSpawnAt = performance.now() + 800;
    this.spawnIntervalMs = NINJA_SPAWN_INTERVAL_MS_INITIAL;
    this.lastFrameTime = performance.now();

    addThemedFrame(this, 'ninja');
    addTitleBanner(this, width / 2, 50, strings.miniGames.ninjaTitle, 0xff453a, 0xffffff);

    this.scorePill = new Pill(this, 130, 50, '0', {
      width: 200, fill: 0xff453a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '🍉', origin: [0.5, 0.5],
    });

    this.livesText = this.add.text(width - 130, 50, this.livesStr(), {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px',
    }).setOrigin(0.5).setDepth(50);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.6);
    this.backdrop.handGlows = [
      { idx: 15, color: '#ff453a', alpha: 0.55 },
      { idx: 16, color: '#ff453a', alpha: 0.55 },
    ];

    this.narrator = new Narrator(null, true);
    this.narrator.speak(narratorLines.ninjaStart(), 2);

    addBackButton(this);
  }

  update(_time: number, _delta: number): void {
    if (this.done) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    const elapsed = now - this.startedAt;

    // Spawn
    if (now >= this.nextSpawnAt) {
      const bombChanceRamp = Math.min(1, elapsed / 30_000);
      const bombChance = elapsed < NINJA_BOMB_GRACE_MS
        ? 0
        : NINJA_BOMB_SPAWN_CHANCE_INITIAL +
          (NINJA_BOMB_SPAWN_CHANCE_MAX - NINJA_BOMB_SPAWN_CHANCE_INITIAL) * bombChanceRamp;
      const kind: 'fruit' | 'bomb' = Math.random() < bombChance ? 'bomb' : 'fruit';
      const normX = 0.15 + Math.random() * 0.7;
      this.fruits.push(new Fruit(this, kind, normX));
      this.nextSpawnAt = now + this.spawnIntervalMs;
    }

    // Física
    for (const f of this.fruits) f.update(dt);

    // Cleanup + penalidade por fruta perdida
    for (const f of this.fruits) {
      if (f.alive && f.isOffscreen()) {
        if (f.kind === 'fruit' && !f.wasAccounted()) {
          f.markAccounted();
          this.onFruitMissed();
        }
        f.destroy();
      }
    }
    this.fruits = this.fruits.filter((f) => f.alive);

    // HUD sync
    this.livesText.setText(this.livesStr());
    this.scorePill.setText(String(this.score));
  }

  private onFruitMissed(): void {
    this.lives -= 1;
    this.spawnIntervalMs = Math.min(
      NINJA_SPAWN_INTERVAL_MS_INITIAL,
      Math.max(NINJA_SPAWN_INTERVAL_MS_MIN, this.spawnIntervalMs + NINJA_SPAWN_INTERVAL_STEP_MS),
    );
    if (this.lives <= 0) {
      this.finish();
    } else if (this.lives === 1) {
      this.narrator.speak(narratorLines.ninjaLastLife(), 2);
    }
  }

  private livesStr(): string {
    return '❤️'.repeat(this.lives) + '🖤'.repeat(LIVES - this.lives);
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;

    if (this.frameUnsub) { this.frameUnsub(); this.frameUnsub = null; }

    const refs = getRefs(this);
    void refs.missions.tick({ ninjaSlices: this.score });
    this.scene.start('MiniGameResult', {
      gameKey: 'NinjaFruit',
      score: this.score,
      scoreLabel: strings.miniGames.ninjaSlices,
      extra: { [strings.miniGames.ninjaBestCombo]: this.bestCombo },
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.frameUnsub) { this.frameUnsub(); this.frameUnsub = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    for (const f of this.fruits) f.destroy();
    this.fruits = [];
  }
}
