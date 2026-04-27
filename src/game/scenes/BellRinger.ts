import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { Bell } from '../entities/Bell.ts';
import { handAt } from '../../pose/spatialQueries.ts';
import { getRng } from '../systems/rng.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

const DURATION_MS = 75000;
const BPM = 100;
const BEAT_MS = 60000 / BPM;
const WINDOW_MS = 600;
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
  private scoreEl!: Phaser.GameObjects.Text;
  private comboEl!: Phaser.GameObjects.Text;
  private timeEl!: Phaser.GameObjects.Text;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private rng: () => number = Math.random;
  private backdrop: CameraBackdrop | null = null;

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

    this.add.text(width / 2, 30, strings.miniGames.bellTitle, {
      fontFamily: 'VT323, ui-monospace', fontSize: '24px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreEl = this.add.text(20, 20, `${strings.miniGames.score}: 0`, {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#f5f5f5', stroke: '#000', strokeThickness: 3,
    });
    this.comboEl = this.add.text(20, 50, `${strings.miniGames.combo}: 0`, {
      fontFamily: 'VT323, ui-monospace', fontSize: '16px', color: '#0a84ff', stroke: '#000', strokeThickness: 3,
    });
    this.timeEl = this.add.text(width - 20, 20, '75s', {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#ffd60a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);
    this.add.text(width / 2, 64, this.legendText(), {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#f5f5f5', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));

    this.buildIntroOverlay();
    this.narrator.speak(this.introNarration(), 2);
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
        bell.ring(this, () => {/* destroyed */});
        this.score += 10;
        this.combo += 1;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        this.scoreEl.setText(`${strings.miniGames.score}: ${this.score}`);
        this.comboEl.setText(`${strings.miniGames.combo}: ${this.combo}`);
        if (this.combo === 5 || this.combo % 10 === 0) this.narrator.speak(narratorLines.bellOnBeat(), 1);
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
    this.timeEl.setText(`${remaining}s`);

    if (now >= this.nextBeatAt && elapsed < DURATION_MS) {
      this.nextBeatAt += BEAT_MS;
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
        this.comboEl.setText(`${strings.miniGames.combo}: 0`);
      }
    }
    this.bells = this.bells.filter((b) => b.alive);

    if (elapsed >= DURATION_MS) this.finish();
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
