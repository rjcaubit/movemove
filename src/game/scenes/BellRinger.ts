import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { Bell } from '../entities/Bell.ts';
import { handAt } from '../../pose/spatialQueries.ts';
import { getRng } from '../systems/rng.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

const DURATION_MS = 75000;
const BASE_BEAT_MS = 1000;
const MIN_BEAT_MS = 450;
const MAX_BEAT_MS = 1600;
const BEAT_STEP_MS = 70;
const WINDOW_MS = 700;
const INTRO_MS = 4000;

const BLUE = 0x0a84ff;
const RED = 0xff453a;

type Phase = 'intro' | 'play' | 'done';

export class BellRinger extends Phaser.Scene {
  private bells: Bell[] = [];
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private nextBeatAt = 0;
  private startedAt = 0;
  private introStartedAt = 0;
  private phase: Phase = 'intro';
  private leftColor: number = BLUE;
  private rightColor: number = RED;
  private introOverlay: Phaser.GameObjects.Container | null = null;
  private introCountdownEl: Phaser.GameObjects.Text | null = null;
  private scorePill!: Pill;
  private comboPill!: Pill;
  private timePill!: Pill;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private rng: () => number = Math.random;
  private backdrop: CameraBackdrop | null = null;
  private currentBeatMs = BASE_BEAT_MS;
  private recentReactions: number[] = [];

  constructor() { super('BellRinger'); }

  create(data?: { session?: string[] }): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x1a1a14);
    this.session = data?.session ?? [];
    this.score = 0; this.combo = 0; this.bestCombo = 0;
    this.bells = [];
    this.rng = getRng();

    if (this.rng() < 0.5) { this.leftColor = BLUE; this.rightColor = RED; }
    else { this.leftColor = RED; this.rightColor = BLUE; }

    this.phase = 'intro';
    this.introStartedAt = performance.now();
    this.startedAt = 0;
    this.nextBeatAt = 0;
    this.currentBeatMs = BASE_BEAT_MS;
    this.recentReactions = [];

    addThemedFrame(this, 'bell');
    addTitleBanner(this, width / 2, 50, strings.miniGames.bellTitle, 0xffae0a, 0xffffff);
    this.scorePill = new Pill(this, 130, 50, '0', {
      width: 200, fill: 0xff453a, stroke: 0xffffff,
      textColor: '#fff8d8', fontSize: 28, icon: '🔔', origin: [0.5, 0.5],
    });
    this.comboPill = new Pill(this, 130, 110, '0', {
      width: 160, height: 38, fill: 0x0a84ff, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 22, icon: '⚡', origin: [0.5, 0.5],
    });
    this.timePill = new Pill(this, width - 130, 50, '75s', {
      width: 180, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
    });
    this.add.text(width / 2, 110, this.legendText(), {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#f5f5f5', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));

    this.buildIntroOverlay();
    this.narrator.speak(this.introNarration(), 2);
    addBackButton(this);
  }

  private colorName(c: number): string {
    return c === BLUE ? strings.miniGames.colorBlue : strings.miniGames.colorRed;
  }

  private legendText(): string {
    const l = this.colorName(this.leftColor);
    const r = this.colorName(this.rightColor);
    return `${strings.miniGames.handLeft}: ${l}   •   ${strings.miniGames.handRight}: ${r}`;
  }

  private introNarration(): string {
    const l = this.colorName(this.leftColor);
    const r = this.colorName(this.rightColor);
    return `${strings.miniGames.bellIntroPrefix} ${l} ${strings.miniGames.bellIntroLeft}, ${r} ${strings.miniGames.bellIntroRight}.`;
  }

  private buildIntroOverlay(): void {
    const { width, height } = GAME_CONFIG;
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0, 0);
    const title = this.add.text(width / 2, height / 2 - 130, strings.miniGames.bellIntroTitle, {
      fontFamily: 'VT323, ui-monospace', fontSize: '28px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    const dotL = this.add.circle(width / 2 - 140, height / 2 - 30, 38, this.leftColor).setStrokeStyle(4, 0xffffff);
    const dotR = this.add.circle(width / 2 + 140, height / 2 - 30, 38, this.rightColor).setStrokeStyle(4, 0xffffff);
    const labL = this.add.text(width / 2 - 140, height / 2 + 30, `← ${strings.miniGames.handLeft}`, {
      fontFamily: 'VT323, ui-monospace', fontSize: '18px', color: '#f5f5f5', fontStyle: 'bold',
    }).setOrigin(0.5);
    const labR = this.add.text(width / 2 + 140, height / 2 + 30, `${strings.miniGames.handRight} →`, {
      fontFamily: 'VT323, ui-monospace', fontSize: '18px', color: '#f5f5f5', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.introCountdownEl = this.add.text(width / 2, height / 2 + 110, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '64px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.introOverlay = this.add.container(0, 0, [bg, title, dotL, dotR, labL, labR, this.introCountdownEl]).setDepth(100);
  }

  private startPlay(): void {
    this.phase = 'play';
    this.startedAt = performance.now();
    this.nextBeatAt = this.startedAt + 500;
    if (this.introOverlay) { this.introOverlay.destroy(); this.introOverlay = null; }
    this.introCountdownEl = null;
  }

  private handleFrame(frame: PoseFrame): void {
    if (this.phase !== 'play') return;
    for (const bell of this.bells) {
      if (!bell.alive) continue;
      const target = { x: bell.normX, y: bell.normY, r: 0.10 };
      if (handAt(frame, bell.hand, target)) {
        const reaction = performance.now() - bell.bornAtMs;
        bell.ring(this, () => {/* destroyed */});
        this.score += 10;
        this.combo += 1;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        this.scorePill.setText(String(this.score));
        this.comboPill.setText(String(this.combo));
        if (this.combo === 5 || this.combo % 10 === 0) this.narrator.speak(narratorLines.bellOnBeat(), 1);
        this.adaptPaceOnHit(reaction);
      }
    }
  }

  update(): void {
    const now = performance.now();

    if (this.phase === 'intro') {
      const introElapsed = now - this.introStartedAt;
      const remaining = Math.max(0, Math.ceil((INTRO_MS - introElapsed) / 1000));
      if (this.introCountdownEl) this.introCountdownEl.setText(remaining > 0 ? String(remaining) : strings.miniGames.go);
      if (introElapsed >= INTRO_MS) this.startPlay();
      return;
    }
    if (this.phase !== 'play') return;

    const elapsed = now - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timePill.setText(`${remaining}s`);

    if (now >= this.nextBeatAt && elapsed < DURATION_MS) {
      this.nextBeatAt += this.currentBeatMs;
      const hand: 'L' | 'R' = this.rng() < 0.5 ? 'L' : 'R';
      const x = 0.2 + this.rng() * 0.6;
      const y = 0.35 + this.rng() * 0.25;
      const color = hand === 'L' ? this.leftColor : this.rightColor;
      this.bells.push(new Bell(this, x, y, hand, color, WINDOW_MS));
    }

    for (const b of this.bells) {
      if (b.alive && b.isExpired()) {
        b.destroy();
        this.combo = 0;
        this.comboPill.setText('0');
        this.adaptPaceOnMiss();
      }
    }
    this.bells = this.bells.filter((b) => b.alive);

    if (elapsed >= DURATION_MS) { this.finish(); return; }

    if (this.backdrop) {
      const toHex = (c: number) => '#' + c.toString(16).padStart(6, '0');
      const activeHands = new Set(this.bells.filter((b) => b.alive).map((b) => b.hand));
      this.backdrop.handGlows = [
        { idx: 15, color: toHex(this.leftColor),  alpha: activeHands.has('L') ? 1.0 : 0.28 },
        { idx: 16, color: toHex(this.rightColor), alpha: activeHands.has('R') ? 1.0 : 0.28 },
      ];
    }
  }

  private adaptPaceOnHit(reactionMs: number): void {
    this.recentReactions.push(reactionMs);
    if (this.recentReactions.length > 4) this.recentReactions.shift();
    if (this.recentReactions.length < 3) return;
    const avg = this.recentReactions.reduce((s, v) => s + v, 0) / this.recentReactions.length;
    if (avg < WINDOW_MS * 0.45) {
      this.currentBeatMs = Math.max(MIN_BEAT_MS, this.currentBeatMs - BEAT_STEP_MS);
    } else if (avg > WINDOW_MS * 0.75) {
      this.currentBeatMs = Math.min(MAX_BEAT_MS, this.currentBeatMs + BEAT_STEP_MS);
    }
  }

  private adaptPaceOnMiss(): void {
    this.currentBeatMs = Math.min(MAX_BEAT_MS, this.currentBeatMs + BEAT_STEP_MS * 2);
    this.recentReactions = [];
  }

  private finish(): void {
    this.phase = 'done';
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    for (const b of this.bells) b.destroy();
    this.scene.start('MiniGameResult', {
      gameKey: 'BellRinger',
      score: this.score, scoreLabel: strings.miniGames.score,
      extra: { [strings.miniGames.bestCombo]: this.bestCombo },
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    if (this.introOverlay) { this.introOverlay.destroy(); this.introOverlay = null; }
    for (const b of this.bells) b.destroy();
    this.bells = [];
  }
}
