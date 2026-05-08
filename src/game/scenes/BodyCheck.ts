import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { KP } from '../../pose/types.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { addTitleBanner } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import type { PoseFrame } from '../../pose/types.ts';

interface BodyCheckData {
  next: string;
  nextData?: object;
  numPlayers?: number;
}

type Issue =
  | 'noBody'
  | 'tooFar'
  | 'tooClose'
  | 'offLeft'
  | 'offRight'
  | 'headCut'
  | 'hipCut'
  | null;
type Phase = 'check' | 'countdown' | 'done';

const STABLE_OK_MS = 1500;
const COUNTDOWN_MS = 3000;
const SPEAK_COOLDOWN_MS = 2200;

function issueText(issue: NonNullable<Issue>): string {
  switch (issue) {
    case 'noBody':   return strings.miniGames.bodyCheckNoBody;
    case 'tooFar':   return strings.miniGames.bodyCheckTooFar;
    case 'tooClose': return strings.miniGames.bodyCheckTooClose;
    case 'offLeft':  return strings.miniGames.bodyCheckOffLeft;
    case 'offRight': return strings.miniGames.bodyCheckOffRight;
    case 'headCut':  return strings.miniGames.bodyCheckHeadCut;
    case 'hipCut':   return strings.miniGames.bodyCheckHipCut;
  }
}

export class BodyCheck extends Phaser.Scene {
  private next = '';
  private nextData: object = {};
  private numPlayers = 1;
  private phase: Phase = 'check';
  private currentIssue: Issue = 'noBody';
  private okStartedAt = 0;
  private countdownStartedAt = 0;
  private lastSpokenIssue: Issue = null;
  private lastSpokenAt = 0;

  // 2p state
  private p1ok = false;
  private p2ok = false;
  private p1El!: Phaser.GameObjects.Text;
  private p2El!: Phaser.GameObjects.Text;
  private unsubFrame2: (() => void) | null = null;

  private statusEl!: Phaser.GameObjects.Text;
  private bigEl!: Phaser.GameObjects.Text;
  private guideRect!: Phaser.GameObjects.Graphics;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private backdrop: CameraBackdrop | null = null;

  constructor() { super('BodyCheck'); }

  create(data: BodyCheckData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a0a14);
    this.next = data.next;
    this.nextData = data.nextData ?? {};
    this.numPlayers = data.numPlayers ?? 1;
    this.phase = 'check';
    this.currentIssue = 'noBody';
    this.okStartedAt = 0;
    this.lastSpokenIssue = null;
    this.lastSpokenAt = 0;
    this.p1ok = false;
    this.p2ok = false;

    addTitleBanner(this, width / 2, 50, strings.miniGames.bodyCheckTitle, 0x4cd964, 0xffffff);

    this.guideRect = this.add.graphics().setDepth(15);
    this.drawGuide(0xffd60a, 0.7);

    this.statusEl = this.add.text(width / 2, 110, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#f5f5f5',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40);

    this.bigEl = this.add.text(width / 2, height / 2 - 20, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '64px', color: '#ffd60a',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 6,
      align: 'center', wordWrap: { width: width - 80 },
    }).setOrigin(0.5).setDepth(40);

    this.add.text(width / 2, height - 80, strings.miniGames.bodyCheckHint, {
      fontFamily: 'VT323, ui-monospace', fontSize: '18px', color: '#8a8d92',
      stroke: '#000', strokeThickness: 2, align: 'center',
    }).setOrigin(0.5).setDepth(40);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.65);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((f) => this.handleFrame(f));

    if (this.numPlayers === 2) {
      this.bigEl.setText('').setColor('#ffd60a');

      this.p1El = this.add.text(width * 0.25, height / 2, 'P1\n❓', {
        fontFamily: 'VT323, ui-monospace', fontSize: '52px', color: '#ff453a',
        align: 'center', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(40);

      this.p2El = this.add.text(width * 0.75, height / 2, 'P2\n❓', {
        fontFamily: 'VT323, ui-monospace', fontSize: '52px', color: '#ff453a',
        align: 'center', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(40);

      this.unsubFrame2 = refs.onSmoothedFrameP2((f) => this.handleFrame2(f));
    }

    addBackButton(this);
  }

  private drawGuide(color: number, alpha: number): void {
    const { width, height } = GAME_CONFIG;
    const w = 360;
    const h = 480;
    const x = (width - w) / 2;
    const y = (height - h) / 2 + 10;
    const corner = 50;
    this.guideRect.clear();
    this.guideRect.lineStyle(8, color, alpha);
    const lines: Array<[number, number, number, number]> = [
      [x, y, x + corner, y], [x, y, x, y + corner],
      [x + w, y, x + w - corner, y], [x + w, y, x + w, y + corner],
      [x, y + h, x + corner, y + h], [x, y + h, x, y + h - corner],
      [x + w, y + h, x + w - corner, y + h], [x + w, y + h, x + w, y + h - corner],
    ];
    for (const [x1, y1, x2, y2] of lines) {
      this.guideRect.beginPath();
      this.guideRect.moveTo(x1, y1);
      this.guideRect.lineTo(x2, y2);
      this.guideRect.strokePath();
    }
  }

  private detectIssue(frame: PoseFrame): Issue {
    if (frame.confidence < 0.4) return 'noBody';
    const ls = frame.keypoints[KP.LEFT_SHOULDER];
    const rs = frame.keypoints[KP.RIGHT_SHOULDER];
    const lh = frame.keypoints[KP.LEFT_HIP];
    const rh = frame.keypoints[KP.RIGHT_HIP];
    const nose = frame.keypoints[KP.NOSE];
    if (!ls || !rs || !lh || !rh) return 'noBody';

    const shoulderWidth = Math.abs(rs.x - ls.x);
    const hipCenterX = (lh.x + rh.x) / 2;
    const hipMaxY = Math.max(lh.y, rh.y);
    const headY = nose ? nose.y : Math.min(ls.y, rs.y) - 0.05;

    if (headY < 0.05) return 'headCut';
    if (hipMaxY > 0.92) return 'hipCut';
    if (shoulderWidth < 0.13) return 'tooFar';
    if (shoulderWidth > 0.42) return 'tooClose';
    if (hipCenterX < 0.32) return 'offRight';
    if (hipCenterX > 0.68) return 'offLeft';
    return null;
  }

  private handleFrame(frame: PoseFrame): void {
    if (this.phase !== 'check') return;
    const now = performance.now();

    if (this.numPlayers === 2) {
      this.p1ok = frame.confidence >= 0.4;
      this.p1El?.setText(`P1\n${this.p1ok ? '✓' : '❓'}`).setColor(this.p1ok ? '#4cd964' : '#ff453a');
      this.check2PReady(now);
      return;
    }

    const issue = this.detectIssue(frame);
    if (issue !== this.currentIssue) {
      this.currentIssue = issue;
      if (issue === null) {
        this.okStartedAt = now;
        this.statusEl.setText(strings.miniGames.bodyCheckOk).setColor('#4cd964');
        this.bigEl.setText('✓').setColor('#4cd964');
        this.drawGuide(0x4cd964, 0.9);
      } else {
        this.okStartedAt = 0;
        this.statusEl.setText('').setColor('#ff453a');
        this.bigEl.setText(issueText(issue)).setColor('#ff453a');
        this.drawGuide(0xff453a, 0.7);
        if (issue !== this.lastSpokenIssue || now - this.lastSpokenAt > SPEAK_COOLDOWN_MS) {
          this.narrator.speak(issueText(issue), 1);
          this.lastSpokenIssue = issue;
          this.lastSpokenAt = now;
        }
      }
    }

    if (issue === null && this.okStartedAt > 0 && now - this.okStartedAt > STABLE_OK_MS) {
      this.phase = 'countdown';
      this.countdownStartedAt = now;
      this.narrator.speak(strings.miniGames.bodyCheckReady, 1);
      this.drawGuide(0x4cd964, 0.9);
    }
  }

  private handleFrame2(frame: PoseFrame): void {
    if (this.phase !== 'check' || this.numPlayers !== 2) return;
    const now = performance.now();
    this.p2ok = frame.confidence >= 0.4;
    this.p2El?.setText(`P2\n${this.p2ok ? '✓' : '❓'}`).setColor(this.p2ok ? '#4cd964' : '#ff453a');
    this.check2PReady(now);
  }

  private check2PReady(now: number): void {
    const bothOk = this.p1ok && this.p2ok;
    if (bothOk) {
      this.drawGuide(0x4cd964, 0.9);
      if (this.okStartedAt === 0) this.okStartedAt = now;
      if (now - this.okStartedAt > STABLE_OK_MS) {
        this.phase = 'countdown';
        this.countdownStartedAt = now;
        this.narrator.speak(strings.miniGames.bodyCheckReady, 1);
      }
    } else {
      this.okStartedAt = 0;
      this.drawGuide(0xffd60a, 0.7);
    }
  }

  update(): void {
    if (this.phase !== 'countdown') return;
    const elapsed = performance.now() - this.countdownStartedAt;
    const remaining = Math.max(0, COUNTDOWN_MS - elapsed);
    const sec = Math.ceil(remaining / 1000);
    if (sec > 0) {
      this.bigEl.setText(String(sec)).setColor('#ffd60a');
      this.statusEl.setText(strings.miniGames.bodyCheckReady);
    } else {
      this.bigEl.setText(strings.miniGames.go).setColor('#4cd964');
    }
    if (elapsed > COUNTDOWN_MS + 400) {
      this.phase = 'done';
      this.scene.start(this.next, this.nextData);
    }
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.unsubFrame2) { this.unsubFrame2(); this.unsubFrame2 = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
  }
}
