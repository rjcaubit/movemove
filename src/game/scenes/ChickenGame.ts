import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { armsLateralOut, hipDropFromBaseline, hipY } from '../../pose/spatialQueries.ts';
import { getRng } from '../systems/rng.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import { getAgeGroup, type AgeGroup } from '../../tuning.ts';
import type { PoseFrame } from '../../pose/types.ts';

type Action = 'flap' | 'scratch';
type Phase = 'baseline' | 'play' | 'done';

const DURATION_MS = 70000;
const BASELINE_MS = 3500;
const BASELINE_MIN_SAMPLES = 12;
const ACTIVE_WINDOW_MS = 700;
const LATE_GRACE_MS = 300;
const SQUAT_THRESHOLD = 0.045;

// Beat base por idade (metrônomo lento). O beat real adapta com acertos/erros.
const BEAT_BY_AGE: Record<AgeGroup, number> = {
  '5-7': 2200,
  '8-10': 1800,
  '11-12': 1500,
};
const BEAT_MIN_MS = 900;
const BEAT_MAX_MS = 2600;
const BEAT_STEP_MS = 80;

export class ChickenGame extends Phaser.Scene {
  private phase: Phase = 'baseline';
  private hipBaseline = 0;
  private hipSamples: number[] = [];
  private baselineStartedAt = 0;
  private startedAt = 0;
  private nextBeatAt = 0;
  private beatMs = BEAT_BY_AGE['8-10'];
  private currentAction: Action | null = null;
  private actionShownAt = 0;
  private actionResolved = false;
  private prevAction: Action | null = null;
  private flapState = false;
  private scratchState = false;
  private score = 0;
  private flaps = 0;
  private scratches = 0;
  private combo = 0;
  private bestCombo = 0;
  private rng: () => number = Math.random;

  private scorePill!: Pill;
  private comboPill!: Pill;
  private timePill!: Pill;
  private promptEl!: Phaser.GameObjects.Text;
  private subPromptEl!: Phaser.GameObjects.Text;
  private flashRect!: Phaser.GameObjects.Rectangle;

  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private backdrop: CameraBackdrop | null = null;
  private audioCtx: AudioContext | null = null;
  private tickCount = 0;

  constructor() { super('ChickenGame'); }

  create(data?: { session?: string[] }): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x1d1408);
    this.session = data?.session ?? [];
    this.score = 0; this.flaps = 0; this.scratches = 0;
    this.combo = 0; this.bestCombo = 0;
    this.hipSamples = [];
    this.hipBaseline = 0;
    this.currentAction = null;
    this.prevAction = null;
    this.actionResolved = false;
    this.flapState = false;
    this.scratchState = false;
    this.phase = 'baseline';
    this.baselineStartedAt = performance.now();
    this.startedAt = 0;
    this.nextBeatAt = 0;
    this.beatMs = BEAT_BY_AGE[getAgeGroup()];
    this.rng = getRng();

    addThemedFrame(this, 'chicken');
    addTitleBanner(this, width / 2, 50, strings.miniGames.chickenTitle, 0xffae0a, 0xffffff);
    this.scorePill = new Pill(this, 130, 50, '0', {
      width: 200, fill: 0xff453a, stroke: 0xffffff,
      textColor: '#fff8d8', fontSize: 28, icon: '🐔', origin: [0.5, 0.5],
    });
    this.comboPill = new Pill(this, 130, 110, '0', {
      width: 160, height: 38, fill: 0x4cd964, stroke: 0xffffff,
      textColor: '#0b1a08', fontSize: 22, icon: '⚡', origin: [0.5, 0.5],
    });
    this.timePill = new Pill(this, width - 130, 50, `${Math.ceil(DURATION_MS / 1000)}s`, {
      width: 180, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
    });

    this.flashRect = this.add.rectangle(0, 0, width, height, 0x4cd964, 0).setOrigin(0, 0).setDepth(5);
    this.promptEl = this.add.text(width / 2, height / 2 - 20, strings.miniGames.chickenIntroBaseline, {
      fontFamily: 'VT323, ui-monospace', fontSize: '52px', color: '#ffd60a', fontStyle: 'bold',
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5).setDepth(20);
    this.subPromptEl = this.add.text(width / 2, height / 2 + 70, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '18px', color: '#f5f5f5',
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5).setDepth(20);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));

    this.narrator.speak(`${strings.miniGames.chickenIntroFlap} ${strings.miniGames.chickenIntroScratch}`, 2);
    addBackButton(this);
  }

  private handleFrame(frame: PoseFrame): void {
    if (this.phase === 'baseline') {
      const y = hipY(frame);
      if (y !== null) this.hipSamples.push(y);
      return;
    }
    if (this.phase !== 'play' || !this.currentAction) return;

    const flapping = armsLateralOut(frame);
    const scratching = hipDropFromBaseline(frame, this.hipBaseline, SQUAT_THRESHOLD);

    let triggered: Action | null = null;
    if (flapping && !this.flapState) triggered = 'flap';
    if (scratching && !this.scratchState) triggered = triggered ?? 'scratch';
    this.flapState = flapping;
    this.scratchState = scratching;
    if (!triggered || this.actionResolved) return;

    const elapsed = performance.now() - this.actionShownAt;
    const inWindow = elapsed <= ACTIVE_WINDOW_MS;
    const inGrace = elapsed <= ACTIVE_WINDOW_MS + LATE_GRACE_MS;
    const correct = triggered === this.currentAction;

    if (correct && (inWindow || inGrace)) {
      this.actionResolved = true;
      const points = inWindow ? 10 : 5;
      this.score += points;
      this.combo += 1;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      if (triggered === 'flap') this.flaps += 1; else this.scratches += 1;
      this.scorePill.setText(String(this.score));
      this.comboPill.setText(String(this.combo));
      this.flashFeedback(0x4cd964);
      if (this.combo === 5 || this.combo % 10 === 0) this.narrator.speak(narratorLines.chickenHit(triggered), 1);
      this.adaptBeatOnHit(inWindow);
    } else if (!correct && inWindow) {
      this.actionResolved = true;
      this.combo = 0;
      this.comboPill.setText('0');
      this.flashFeedback(0xff453a);
      this.adaptBeatOnMiss();
    }
  }

  private playTick(strong: boolean): void {
    try {
      if (!this.audioCtx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new Ctor();
      }
      const ctx = this.audioCtx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.type = 'sine';
      const freq = strong ? 880 : 660;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.05);
      const peak = strong ? 0.22 : 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.start(t); osc.stop(t + 0.09);
    } catch { /* ignore */ }
  }

  private adaptBeatOnHit(perfect: boolean): void {
    // Acerto no tempo acelera; acerto na graça mantém
    if (perfect) this.beatMs = Math.max(BEAT_MIN_MS, this.beatMs - BEAT_STEP_MS);
  }

  private adaptBeatOnMiss(): void {
    // Erro / ação errada desacelera mais (dá tempo de respirar)
    this.beatMs = Math.min(BEAT_MAX_MS, this.beatMs + BEAT_STEP_MS * 2);
  }

  private flashFeedback(color: number): void {
    this.flashRect.fillColor = color;
    this.flashRect.alpha = 0.25;
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 250 });
  }

  private showAction(action: Action): void {
    this.currentAction = action;
    this.actionShownAt = performance.now();
    this.actionResolved = false;
    const label = action === 'flap' ? strings.miniGames.chickenLabelFlap : strings.miniGames.chickenLabelScratch;
    this.promptEl.setText(label).setColor(action === 'flap' ? '#ffd60a' : '#ff9f0a');
    this.promptEl.setScale(0.6);
    this.tweens.add({ targets: this.promptEl, scale: 1, duration: 180, ease: 'Back.out' });
    this.subPromptEl.setText('');
  }

  private startPlay(): void {
    if (this.hipSamples.length < BASELINE_MIN_SAMPLES) {
      // baseline frágil: reseta janela e tenta de novo (até 6s no total)
      if (performance.now() - this.baselineStartedAt < BASELINE_MS * 2) return;
    }
    const sorted = [...this.hipSamples].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)] ?? 0.7;
    this.hipBaseline = mid;
    this.phase = 'play';
    this.startedAt = performance.now();
    this.nextBeatAt = this.startedAt + 1200; // pausa inicial pra entrar no compasso
    this.promptEl.setText('');
    this.subPromptEl.setText('');
  }

  private pickNextAction(): Action {
    if (!this.prevAction) return this.rng() < 0.5 ? 'flap' : 'scratch';
    // 80% alterna, 20% repete (variação)
    if (this.rng() < 0.8) return this.prevAction === 'flap' ? 'scratch' : 'flap';
    return this.prevAction;
  }

  update(): void {
    const now = performance.now();

    if (this.phase === 'baseline') {
      const remaining = Math.max(0, Math.ceil((BASELINE_MS - (now - this.baselineStartedAt)) / 1000));
      this.subPromptEl.setText(remaining > 0 ? `${remaining}…` : '');
      if (now - this.baselineStartedAt >= BASELINE_MS) this.startPlay();
      return;
    }
    if (this.phase !== 'play') return;

    const elapsed = now - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timePill.setText(`${remaining}s`);

    if (now >= this.nextBeatAt && elapsed < DURATION_MS) {
      // Resolve combo se ação anterior expirou sem hit
      if (this.currentAction && !this.actionResolved) {
        this.combo = 0;
        this.comboPill.setText('0');
        this.adaptBeatOnMiss();
      }
      this.nextBeatAt = now + this.beatMs;
      const next = this.pickNextAction();
      this.prevAction = next;
      this.showAction(next);
      this.playTick(this.tickCount % 2 === 0);
      this.tickCount += 1;
    }

    if (elapsed >= DURATION_MS) this.finish();
  }

  private finish(): void {
    this.phase = 'done';
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.audioCtx) { void this.audioCtx.close(); this.audioCtx = null; }
    const refs = getRefs(this);
    void refs.missions.tick({
      chickenFlaps: this.flaps,
      chickenScratches: this.scratches,
    });
    this.scene.start('MiniGameResult', {
      gameKey: 'ChickenGame',
      score: this.score,
      scoreLabel: strings.miniGames.score,
      extra: {
        [strings.miniGames.chickenFlaps]: this.flaps,
        [strings.miniGames.chickenScratches]: this.scratches,
        [strings.miniGames.bestCombo]: this.bestCombo,
      },
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    if (this.audioCtx) { void this.audioCtx.close(); this.audioCtx = null; }
  }
}
