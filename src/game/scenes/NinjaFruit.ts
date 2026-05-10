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
import { WristVelocityTracker } from '../systems/wristVelocity.ts';
import { SliceTrail } from '../ui/sliceTrail.ts';
import { handPosition } from '../../pose/spatialQueries.ts';
import { KeyboardDebug } from '../../debug/keyboard.ts';
import type { PoseFrame } from '../../pose/types.ts';
import {
  NINJA_BOMB_GRACE_MS,
  NINJA_BOMB_SPAWN_CHANCE_INITIAL,
  NINJA_BOMB_SPAWN_CHANCE_MAX,
  NINJA_SPAWN_INTERVAL_MS_INITIAL,
  NINJA_SPAWN_INTERVAL_MS_MIN,
  NINJA_SPAWN_INTERVAL_STEP_MS,
  NINJA_HIT_RADIUS,
  NINJA_VELOCITY_THRESHOLD,
  NINJA_INTRO_MS,
  NINJA_INTRO_MIN_MOVEMENT,
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
  private comboPill!: Pill;
  private combo = 0;
  private introText: Phaser.GameObjects.Text | null = null;

  private backdrop: CameraBackdrop | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private frameUnsub: (() => void) | null = null;

  private fruits: Fruit[] = [];
  private nextSpawnAt = 0;
  private spawnIntervalMs = NINJA_SPAWN_INTERVAL_MS_INITIAL;
  private lastFrameTime = 0;

  // Detecção de mão dominante
  private tracker = new WristVelocityTracker();
  private dominantHand: 'L' | 'R' | null = null;
  private accumL = 0;
  private accumR = 0;
  private prevL: { x: number; y: number } | null = null;
  private prevR: { x: number; y: number } | null = null;
  private lastPoseFrame: PoseFrame | null = null;

  private trail: SliceTrail | null = null;

  // Debug mouse
  private debugMouse = false;
  private debugMouseX = 0.5;
  private debugMouseY = 0.5;
  private debugMousePrevX = 0.5;
  private debugMousePrevY = 0.5;
  private debugMouseT = 0;

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
    this.nextSpawnAt = performance.now() + NINJA_INTRO_MS + 600;
    this.spawnIntervalMs = NINJA_SPAWN_INTERVAL_MS_INITIAL;
    this.lastFrameTime = performance.now();
    this.tracker.reset();
    this.dominantHand = null;
    this.accumL = 0;
    this.accumR = 0;
    this.prevL = null;
    this.prevR = null;
    this.lastPoseFrame = null;

    addThemedFrame(this, 'ninja');
    addTitleBanner(this, width / 2, 50, strings.miniGames.ninjaTitle, 0xff453a, 0xffffff);

    this.scorePill = new Pill(this, 130, 50, '0', {
      width: 200, fill: 0xff453a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '🍉', origin: [0.5, 0.5],
    });

    this.comboPill = new Pill(this, width / 2, 50, '', {
      width: 240, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#1a0b2a', fontSize: 26, icon: '🔥', origin: [0.5, 0.5],
    });
    this.comboPill.container.setVisible(false);
    this.combo = 0;

    this.livesText = this.add.text(width - 130, 50, this.livesStr(), {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px',
    }).setOrigin(0.5).setDepth(50);

    this.introText = this.add.text(width / 2, GAME_CONFIG.height / 2,
      strings.miniGames.ninjaIntroWave, {
        fontFamily: 'VT323, ui-monospace', fontSize: '40px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(60);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.6);
    this.backdrop.handGlows = [
      { idx: 15, color: '#ff453a', alpha: 0.55 },
      { idx: 16, color: '#ff453a', alpha: 0.55 },
    ];

    this.trail = new SliceTrail(this);
    this.frameUnsub = refs.onSmoothedFrame((f: PoseFrame) => this.onFrame(f));

    this.narrator = new Narrator(null, true);
    this.narrator.speak(narratorLines.ninjaStart(), 2);

    if (KeyboardDebug.isEnabledByQuery()) {
      this.debugMouse = true;
      this.dominantHand = 'R';
      this.nextSpawnAt = performance.now() + 600;
      if (this.introText) { this.introText.destroy(); this.introText = null; }
      this.backdrop.handGlows = [{ idx: 16, color: '#ff453a', alpha: 0.85 }];

      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        this.debugMousePrevX = this.debugMouseX;
        this.debugMousePrevY = this.debugMouseY;
        this.debugMouseT = performance.now();
        this.debugMouseX = p.x / GAME_CONFIG.width;
        this.debugMouseY = p.y / GAME_CONFIG.height;
      });
    }

    addBackButton(this);
  }

  private onFrame(f: PoseFrame): void {
    this.lastPoseFrame = f;
    this.tracker.push(f);

    if (this.dominantHand !== null) {
      const wrist = handPosition(f, this.dominantHand);
      if (wrist) {
        this.trail?.push(wrist.x * GAME_CONFIG.width, wrist.y * GAME_CONFIG.height);
      }
    }

    const elapsed = performance.now() - this.startedAt;

    if (elapsed < NINJA_INTRO_MS) {
      // Acumula deslocamento de cada pulso pra auto-detect
      const lw = handPosition(f, 'L');
      const rw = handPosition(f, 'R');
      if (lw && this.prevL) {
        this.accumL += Math.hypot(lw.x - this.prevL.x, lw.y - this.prevL.y);
      }
      if (rw && this.prevR) {
        this.accumR += Math.hypot(rw.x - this.prevR.x, rw.y - this.prevR.y);
      }
      this.prevL = lw ? { x: lw.x, y: lw.y } : null;
      this.prevR = rw ? { x: rw.x, y: rw.y } : null;

    } else if (this.dominantHand === null) {
      // Fim da intro: decide a mão dominante
      if (this.accumL > this.accumR && this.accumL > NINJA_INTRO_MIN_MOVEMENT) {
        this.dominantHand = 'L';
      } else if (this.accumR > this.accumL && this.accumR > NINJA_INTRO_MIN_MOVEMENT) {
        this.dominantHand = 'R';
      } else {
        this.dominantHand = 'R'; // fallback
      }

      const glowIdx = this.dominantHand === 'L' ? 15 : 16;
      if (this.backdrop) {
        this.backdrop.handGlows = [{ idx: glowIdx, color: '#ff453a', alpha: 0.85 }];
      }

      if (this.introText) {
        this.tweens.add({
          targets: this.introText,
          alpha: 0,
          y: GAME_CONFIG.height / 2 - 60,
          duration: 400,
          onComplete: () => { this.introText?.destroy(); this.introText = null; },
        });
      }
    }
  }

  update(_time: number, _delta: number): void {
    if (this.done) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    const elapsed = now - this.startedAt;

    // Spawn (só após a intro ou em debug)
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

    // Detecção de slice via pose (após a intro)
    if (this.dominantHand !== null && this.lastPoseFrame) {
      const speed = this.tracker.speedNorm(this.dominantHand);
      if (speed >= NINJA_VELOCITY_THRESHOLD) {
        const wrist = handPosition(this.lastPoseFrame, this.dominantHand);
        if (wrist) {
          for (const f of this.fruits) {
            if (!f.alive) continue;
            const dx = wrist.x - f.x;
            const dy = wrist.y - f.y;
            if (dx * dx + dy * dy <= NINJA_HIT_RADIUS * NINJA_HIT_RADIUS) {
              if (f.kind === 'fruit') this.onFruitSliced(f);
              else this.onBombSliced(f);
            }
          }
        }
      }
    }

    // Detecção debug mouse
    if (this.debugMouse) {
      const mNow = performance.now();
      const mDt = Math.max(0.001, (mNow - this.debugMouseT) / 1000);
      const mdx = this.debugMouseX - this.debugMousePrevX;
      const mdy = this.debugMouseY - this.debugMousePrevY;
      const debugSpeed = Math.sqrt(mdx * mdx + mdy * mdy) / mDt;
      if (debugSpeed >= NINJA_VELOCITY_THRESHOLD * 0.5) {
        for (const f of this.fruits) {
          if (!f.alive) continue;
          const ddx = this.debugMouseX - f.x;
          const ddy = this.debugMouseY - f.y;
          if (ddx * ddx + ddy * ddy <= NINJA_HIT_RADIUS * NINJA_HIT_RADIUS) {
            if (f.kind === 'fruit') this.onFruitSliced(f);
            else this.onBombSliced(f);
          }
        }
      }
    }

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

    // Trail + HUD
    this.trail?.render();
    this.livesText.setText(this.livesStr());
    this.scorePill.setText(String(this.score));
  }

  private updateCombo(slicedFruit: boolean): void {
    if (slicedFruit) {
      this.combo += 1;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      if (this.combo >= 2) {
        this.comboPill.setText(`x${this.combo} ${strings.miniGames.ninjaCombo}`);
        this.comboPill.container.setVisible(true);
        if (this.combo === 5 || this.combo % 10 === 0) {
          this.narrator.speak(narratorLines.ninjaCombo(this.combo), 1);
        }
      }
    } else {
      this.combo = 0;
      this.comboPill.container.setVisible(false);
    }
  }

  private onFruitSliced(f: Fruit): void {
    f.slice(this);
    if (this.cache.audio.exists('slice')) this.sound.play('slice', { volume: 0.4 });
    this.updateCombo(true);
    const points = 1 * Math.max(1, this.combo);
    this.score += points;
    this.scorePill.setText(String(this.score));
    this.spawnIntervalMs = Math.max(NINJA_SPAWN_INTERVAL_MS_MIN, this.spawnIntervalMs - NINJA_SPAWN_INTERVAL_STEP_MS);
    if (this.score === 1 || this.score % 15 === 0) {
      this.narrator.speak(narratorLines.ninjaSlice(), 1);
    }
  }

  private onBombSliced(f: Fruit): void {
    f.explode(this);
    if (this.cache.audio.exists('explosion')) this.sound.play('explosion', { volume: 0.5 });
    this.updateCombo(false);
    this.lives -= 1;
    this.livesText.setText(this.livesStr());
    this.cameras.main.shake(220, 0.018);
    this.cameras.main.flash(180, 255, 80, 80);
    this.narrator.speak(narratorLines.ninjaBomb(), 2);
    if (this.lives <= 0) this.finish();
    else if (this.lives === 1) this.narrator.speak(narratorLines.ninjaLastLife(), 2);
  }

  private onFruitMissed(): void {
    this.updateCombo(false);
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
    if (this.trail) { this.trail.destroy(); this.trail = null; }
    for (const f of this.fruits) f.destroy();
    this.fruits = [];
  }
}
