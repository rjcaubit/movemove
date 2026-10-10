import * as Phaser from 'phaser';
import { GAME_CONFIG, isPortrait } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { detectFramingIssue } from '../../pose/bodyFraming.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
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
const DOT_PULSE_MS = 600;

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

  private guideEl!: Phaser.GameObjects.Graphics;
  private statusPill!: Phaser.GameObjects.Text;
  private dotEls: Phaser.GameObjects.Graphics[] = [];
  private dotTimer = 0;
  private dotPhase = 0;

  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private backdrop: CameraBackdrop | null = null;

  // Oval dimensions (set in create)
  private ow = 340;
  private oh = 440;
  private cx = 0;
  private cy = 0;

  constructor() { super('BodyCheck'); }

  create(data: BodyCheckData): void {
    const { width, height } = GAME_CONFIG;
    const portrait = isPortrait();
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
    this.dotTimer = 0;
    this.dotPhase = 0;

    this.ow = portrait ? 280 : 340;
    this.oh = portrait ? 400 : 450;
    this.cx = width / 2;
    this.cy = height / 2 + (portrait ? 10 : 0);

    // Camera backdrop (behind everything)
    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.65);

    // Dark overlay for readability
    const overlay = this.add.graphics().setDepth(1);
    overlay.fillStyle(0x000000, 0.45);
    overlay.fillRect(0, 0, width, height);

    // Title above oval
    const titleY = this.cy - this.oh / 2 - (portrait ? 70 : 66);
    this.add.text(this.cx, titleY, 'Entre no contorno', {
      fontFamily: 'VT323, ui-monospace',
      fontSize: portrait ? '52px' : '46px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);

    this.add.text(this.cx, titleY + (portrait ? 46 : 40), 'Corpo inteiro visível, da cabeça aos pés.', {
      fontFamily: 'VT323, ui-monospace',
      fontSize: portrait ? '22px' : '20px',
      color: '#cccccc',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(30);

    // Oval guide
    this.guideEl = this.add.graphics().setDepth(20);
    this.drawGuide(0x00e5ff, 0.8);

    // Status pill below oval
    const pillY = this.cy + this.oh / 2 + (portrait ? 60 : 55);
    this.statusPill = this.add.text(this.cx, pillY, 'Procurando você...', {
      fontFamily: 'VT323, ui-monospace',
      fontSize: portrait ? '30px' : '26px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.65)',
      padding: { x: 28, y: 14 },
    }).setOrigin(0.5).setDepth(30);

    // 3 progress dots
    const dotsY = height - (portrait ? 110 : 90);
    const dotSpacing = 22;
    this.dotEls = [];
    for (let i = 0; i < 3; i++) {
      const g = this.add.graphics().setDepth(30);
      const dx = this.cx + (i - 1) * dotSpacing;
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(dx, dotsY, 7);
      this.dotEls.push(g);
    }

    // Pulse tween on status pill
    this.tweens.add({
      targets: this.statusPill,
      scaleX: 1.04, scaleY: 1.04,
      yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut',
    });

    // 2-player labels
    if (this.numPlayers === 2) {
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

    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((f) => this.handleFrame(f));
    addBackButton(this);
  }

  private drawGuide(color: number, alpha: number): void {
    this.guideEl.clear();
    // Outer glow ring
    this.guideEl.lineStyle(18, color, alpha * 0.12);
    this.guideEl.strokeEllipse(this.cx, this.cy, this.ow + 22, this.oh + 22);
    // Mid glow
    this.guideEl.lineStyle(10, color, alpha * 0.25);
    this.guideEl.strokeEllipse(this.cx, this.cy, this.ow + 10, this.oh + 10);
    // Main border
    this.guideEl.lineStyle(5, color, alpha);
    this.guideEl.strokeEllipse(this.cx, this.cy, this.ow, this.oh);
  }

  private setDots(active: number): void {
    for (let i = 0; i < 3; i++) {
      const portrait = isPortrait();
      const dotsY = GAME_CONFIG.height - (portrait ? 110 : 90);
      const dx = this.cx + (i - 1) * 22;
      this.dotEls[i].clear();
      this.dotEls[i].fillStyle(0xffffff, i < active ? 1 : 0.25);
      this.dotEls[i].fillCircle(dx, dotsY, 7);
    }
  }

  private setStatusText(text: string, color: string): void {
    this.statusPill.setText(text).setColor(color);
  }

  private detectIssue(frame: PoseFrame): Issue {
    const issue = detectFramingIssue(frame);
    return issue === 'feetCut' ? 'hipCut' : issue;
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
        this.drawGuide(0x4cd964, 0.9);
        this.setStatusText('✓ Posição boa!', '#4cd964');
      } else {
        this.okStartedAt = 0;
        this.drawGuide(0xff453a, 0.8);
        this.setStatusText(issueText(issue), '#ff453a');
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
      this.drawGuide(0x00e5ff, 0.8);
    }
  }

  update(_time: number, delta: number): void {
    if (this.phase !== 'countdown') {
      // Animate "searching" dots
      this.dotTimer += delta;
      if (this.dotTimer >= DOT_PULSE_MS) {
        this.dotTimer = 0;
        this.dotPhase = (this.dotPhase + 1) % 4;
        this.setDots(this.dotPhase % 3 === 0 ? 0 : this.dotPhase);
        if (this.currentIssue === 'noBody') {
          const dots = '.'.repeat((this.dotPhase % 3) + 1);
          this.setStatusText(`Procurando você${dots}`, '#ffffff');
        }
      }
      return;
    }

    const elapsed = performance.now() - this.countdownStartedAt;
    const remaining = Math.max(0, COUNTDOWN_MS - elapsed);
    const sec = Math.ceil(remaining / 1000);

    // Light dots progressively
    const activeDots = 3 - sec;
    this.setDots(activeDots);

    if (sec > 0) {
      this.setStatusText(`Começando em ${sec}...`, '#ffd60a');
    } else {
      this.setStatusText('Vai!', '#4cd964');
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
