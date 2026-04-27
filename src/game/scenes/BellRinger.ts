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

export class BellRinger extends Phaser.Scene {
  private bells: Bell[] = [];
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private nextBeatAt = 0;
  private startedAt = 0;
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
    this.startedAt = performance.now();
    this.nextBeatAt = this.startedAt + 1000;
    this.rng = getRng();

    this.add.text(width / 2, 30, strings.miniGames.bellTitle, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreEl = this.add.text(20, 20, `${strings.miniGames.score}: 0`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#f5f5f5', stroke: '#000', strokeThickness: 3,
    });
    this.comboEl = this.add.text(20, 50, `${strings.miniGames.combo}: 0`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '16px', color: '#0a84ff', stroke: '#000', strokeThickness: 3,
    });
    this.timeEl = this.add.text(width - 20, 20, '75s', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#ffd60a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));
  }

  private handleFrame(frame: PoseFrame): void {
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
      } else if (handAt(frame, bell.hand === 'L' ? 'R' : 'L', target)) {
        bell.ring(this, () => {/* destroyed */});
        this.combo = 0;
        this.comboEl.setText(`${strings.miniGames.combo}: 0`);
      }
    }
  }

  update(): void {
    const now = performance.now();
    const elapsed = now - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timeEl.setText(`${remaining}s`);

    if (now >= this.nextBeatAt && elapsed < DURATION_MS) {
      this.nextBeatAt += BEAT_MS;
      const hand: 'L' | 'R' = this.rng() < 0.5 ? 'L' : 'R';
      const x = hand === 'L' ? 0.25 : 0.75;
      const y = 0.4 + this.rng() * 0.2;
      this.bells.push(new Bell(this, x, y, hand, WINDOW_MS));
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
    for (const b of this.bells) b.destroy();
    this.bells = [];
  }
}
