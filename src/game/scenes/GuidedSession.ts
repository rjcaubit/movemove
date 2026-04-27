import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { Narrator } from '../systems/narrator.ts';
import { DemoFigure, ANIMATORS, type Animator, NEUTRAL_POSE } from '../ui/demoFigure.ts';
import { DETECTORS, type RepDetector } from '../systems/exerciseRepDetectors.ts';
import type { PoseFrame } from '../../pose/types.ts';

interface Exercise {
  title: string;
  desc: string;
  cue: string;
  animator: Animator;
  detector: () => RepDetector;
}

const EXERCISE_DURATION_MS = 45000;
const REST_DURATION_MS = 5000;

function buildExercises(): Exercise[] {
  const m = strings.miniGames.guided;
  return [
    { title: m.ex1Title, desc: m.ex1Desc, cue: m.ex1Cue, animator: ANIMATORS.trunkRotation, detector: DETECTORS.trunkRotation },
    { title: m.ex2Title, desc: m.ex2Desc, cue: m.ex2Cue, animator: ANIMATORS.highKneeHandsHead, detector: DETECTORS.highKnee },
    { title: m.ex3Title, desc: m.ex3Desc, cue: m.ex3Cue, animator: ANIMATORS.elbowToKneeSide, detector: DETECTORS.elbowToKnee },
    { title: m.ex4Title, desc: m.ex4Desc, cue: m.ex4Cue, animator: ANIMATORS.lateralStretch, detector: DETECTORS.lateralLean },
    { title: m.ex5Title, desc: m.ex5Desc, cue: m.ex5Cue, animator: ANIMATORS.lungeArmsUp, detector: DETECTORS.armsUp },
    { title: m.ex6Title, desc: m.ex6Desc, cue: m.ex6Cue, animator: ANIMATORS.squatLateralShift, detector: DETECTORS.squatCycle },
    { title: m.ex7Title, desc: m.ex7Desc, cue: m.ex7Cue, animator: ANIMATORS.crossKick, detector: DETECTORS.crossKick },
    { title: m.ex8Title, desc: m.ex8Desc, cue: m.ex8Cue, animator: ANIMATORS.twistKneePull, detector: DETECTORS.twistKneePull },
    { title: m.ex9Title, desc: m.ex9Desc, cue: m.ex9Cue, animator: ANIMATORS.lateralHopTwist, detector: DETECTORS.lateralHop },
  ];
}

type Phase = 'rest' | 'exercise' | 'done';

export class GuidedSession extends Phaser.Scene {
  private exercises: Exercise[] = [];
  private idx = 0;
  private phase: Phase = 'rest';
  private phaseStartedAt = 0;
  private titleEl!: Phaser.GameObjects.Text;
  private descEl!: Phaser.GameObjects.Text;
  private timerEl!: Phaser.GameObjects.Text;
  private phaseLabelEl!: Phaser.GameObjects.Text;
  private progressEl!: Phaser.GameObjects.Text;
  private nextEl!: Phaser.GameObjects.Text;
  private narrator!: Narrator;
  private backdrop: CameraBackdrop | null = null;
  private demoFigure: DemoFigure | null = null;
  private demoStartedAt = 0;
  private lastSpokenIdx = -1;
  private lastSpokenPhase: Phase | null = null;
  private repsEl!: Phaser.GameObjects.Text;
  private repsLabelEl!: Phaser.GameObjects.Text;
  private currentDetector: RepDetector | null = null;
  private currentReps = 0;
  private repsByExercise: number[] = [];
  private unsubFrame: (() => void) | null = null;

  constructor() { super('GuidedSession'); }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a1220);
    this.exercises = buildExercises();
    this.idx = 0;
    this.phase = 'rest';
    this.phaseStartedAt = performance.now();
    this.lastSpokenIdx = -1;
    this.lastSpokenPhase = null;

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.25);
    this.narrator = new Narrator(null, true);

    this.add.rectangle(0, 0, width, 90, 0x000000, 0.55).setOrigin(0, 0);
    this.add.rectangle(0, 90, 380, height - 90, 0x0d1322, 0.7).setOrigin(0, 0);
    this.add.rectangle(0, height - 96, width, 96, 0x000000, 0.6).setOrigin(0, 0);

    this.phaseLabelEl = this.add.text(20, 22, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#8a8d92', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.titleEl = this.add.text(width / 2, 50, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '26px', color: '#4cd964', fontStyle: 'bold',
      align: 'center', wordWrap: { width: width - 200 },
    }).setOrigin(0.5);
    this.progressEl = this.add.text(width - 20, 22, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#ffd60a',
    }).setOrigin(1, 0.5);

    this.add.text(190, 110, strings.miniGames.guided.demoLabel, {
      fontFamily: 'VT323, ui-monospace', fontSize: '13px', color: '#8a8d92', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.demoFigure = new DemoFigure(this, 190, 240, 0x4cd964);
    this.demoFigure.setPose(NEUTRAL_POSE);
    this.demoStartedAt = performance.now();

    this.add.text(680, 110, strings.miniGames.guided.youLabel, {
      fontFamily: 'VT323, ui-monospace', fontSize: '13px', color: '#8a8d92', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.timerEl = this.add.text(680, 220, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '88px', color: '#ffd60a', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);
    this.repsEl = this.add.text(680, 320, '0', {
      fontFamily: 'VT323, ui-monospace', fontSize: '52px', color: '#4cd964', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.repsLabelEl = this.add.text(680, 360, strings.miniGames.guided.repsLabel, {
      fontFamily: 'VT323, ui-monospace', fontSize: '13px', color: '#8a8d92', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.descEl = this.add.text(width / 2, height - 70, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '15px', color: '#f5f5f5', align: 'center',
      wordWrap: { width: width - 60 },
    }).setOrigin(0.5);
    this.nextEl = this.add.text(width / 2, height - 22, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '12px', color: '#8a8d92',
    }).setOrigin(0.5);

    const skip = this.add.text(width - 20, height - 20, strings.miniGames.hubBack, {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#f5f5f5',
      backgroundColor: 'rgba(255,255,255,0.1)', padding: { x: 10, y: 4 },
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    skip.on('pointerup', () => this.scene.start('MiniGamesHub'));

    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));

    this.refresh();
  }

  private handleFrame(frame: PoseFrame): void {
    if (this.phase !== 'exercise' || !this.currentDetector) return;
    if (this.currentDetector.process(frame)) {
      this.currentReps += 1;
      this.repsEl.setText(String(this.currentReps));
      this.tweens.add({
        targets: this.repsEl, scale: { from: 1.3, to: 1 }, duration: 220, ease: 'Cubic.easeOut',
      });
    }
  }

  update(): void {
    if (this.phase === 'done') return;
    const now = performance.now();
    const elapsed = now - this.phaseStartedAt;
    const total = this.phase === 'exercise' ? EXERCISE_DURATION_MS : REST_DURATION_MS;
    const remaining = Math.max(0, Math.ceil((total - elapsed) / 1000));
    this.timerEl.setText(String(remaining));

    if (this.demoFigure && this.idx < this.exercises.length) {
      const animT = now - this.demoStartedAt;
      this.demoFigure.setPose(this.exercises[this.idx].animator(animT));
    }

    if (this.phase === 'rest' && this.lastSpokenPhase !== 'rest') {
      this.lastSpokenPhase = 'rest';
      const ex = this.exercises[this.idx];
      const intro = this.idx === 0
        ? `${strings.miniGames.guided.startSoon} ${ex.title}.`
        : `${strings.miniGames.guided.nextLabel} ${ex.title}.`;
      this.narrator.speak(intro, 2);
    }
    if (this.phase === 'exercise'
      && (this.lastSpokenIdx !== this.idx || this.lastSpokenPhase !== 'exercise')) {
      this.lastSpokenIdx = this.idx;
      this.lastSpokenPhase = 'exercise';
      this.narrator.speak(this.exercises[this.idx].cue, 2);
    }

    if (elapsed >= total) this.advance();
  }

  private advance(): void {
    if (this.phase === 'rest') {
      this.phase = 'exercise';
      this.phaseStartedAt = performance.now();
      this.currentDetector = this.exercises[this.idx].detector();
      this.currentReps = 0;
      this.repsEl.setText('0');
    } else if (this.phase === 'exercise') {
      this.repsByExercise[this.idx] = this.currentReps;
      this.currentDetector = null;
      this.idx += 1;
      if (this.idx >= this.exercises.length) {
        this.finish();
        return;
      }
      this.phase = 'rest';
      this.phaseStartedAt = performance.now();
      this.demoStartedAt = performance.now();
      this.currentReps = 0;
      this.repsEl.setText('0');
    }
    this.refresh();
  }

  private refresh(): void {
    if (this.phase === 'done') return;
    const ex = this.exercises[this.idx];
    const total = this.exercises.length;
    this.progressEl.setText(`${this.idx + 1} / ${total}`);
    this.titleEl.setText(ex.title);
    this.descEl.setText(ex.desc);
    if (this.phase === 'rest') {
      this.phaseLabelEl.setText(strings.miniGames.guided.getReady).setColor('#ffd60a');
    } else {
      this.phaseLabelEl.setText(strings.miniGames.guided.go).setColor('#4cd964');
    }
    const upcoming = this.exercises[this.idx + 1];
    this.nextEl.setText(upcoming ? `${strings.miniGames.guided.upcoming} ${upcoming.title}` : '');
  }

  private finish(): void {
    this.phase = 'done';
    this.narrator.speak(strings.miniGames.guided.complete, 2);
    if (this.demoFigure) { this.demoFigure.destroy(); this.demoFigure = null; }
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    const { width, height } = GAME_CONFIG;
    this.titleEl.setText(strings.miniGames.guided.complete);
    this.phaseLabelEl.setText('');
    this.descEl.setText('');
    this.timerEl.setText('🎉');
    this.nextEl.setText('');
    this.progressEl.setText(`${this.exercises.length} / ${this.exercises.length}`);

    const totalReps = this.repsByExercise.reduce((a, b) => a + b, 0);
    this.repsEl.setText(String(totalReps));
    this.repsLabelEl.setText(strings.miniGames.guided.totalRepsLabel);

    const btn = (x: number, label: string, color: string, onClick: () => void): void => {
      const t = this.add.text(x, height - 200, label, {
        fontFamily: 'VT323, ui-monospace', fontSize: '18px', color: '#0b0d10',
        backgroundColor: color, padding: { x: 18, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', onClick);
    };
    btn(width / 2 - 130, strings.miniGames.playAgain, '#4cd964', () => this.scene.start('GuidedSession'));
    btn(width / 2 + 130, strings.miniGames.hubBack, '#ffd60a', () => this.scene.start('MiniGamesHub'));
  }

  shutdown(): void {
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    if (this.demoFigure) { this.demoFigure.destroy(); this.demoFigure = null; }
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    this.currentDetector = null;
  }
}
