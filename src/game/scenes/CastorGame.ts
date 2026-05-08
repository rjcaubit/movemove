import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { Castor } from '../entities/Castor.ts';
import { handAt } from '../../pose/spatialQueries.ts';
import { getRng } from '../systems/rng.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

const DURATION_MS = 60_000;
const BASE_WINDOW_MS = 2200;
const MIN_WINDOW_MS = 900;
const MAX_WINDOW_MS = 3200;
const BASE_SPAWN_DELAY_MS = 700;
const MIN_SPAWN_DELAY_MS = 280;
const MAX_SPAWN_DELAY_MS = 1200;
const WINDOW_STEP_MS = 160;
const SPAWN_STEP_MS = 80;

const BAD_SPAWN_CHANCE = 0.28;
const BAD_GRACE_MS = 4000;

const SLOT_XS_1P = [0.15, 0.30, 0.50, 0.70, 0.85];
const SLOT_XS_P1 = [0.12, 0.27, 0.42];
const SLOT_XS_P2 = [0.58, 0.73, 0.88];
const SLOT_Y = 0.82;
const HIT_Y_OFFSET = -0.08;
const HIT_R = 0.14;

interface CastorData {
  session?: string[];
  mode?: '1p' | '2p';
}

interface PlayerState {
  castor: Castor | null;
  score: number;
  lastSlotIdx: number;
  nextSpawnAt: number;
  windowMs: number;
  delayMs: number;
  frame: PoseFrame | null;
  unsub: (() => void) | null;
  scorePill: Pill | null;
  slots: number[];
}

export class CastorGame extends Phaser.Scene {
  private mode: '1p' | '2p' | null = null;
  private players: [PlayerState, PlayerState] | null = null;
  private timePill!: Pill;
  private startedAt = 0;
  private narrator!: Narrator;
  private session: string[] = [];
  private rng: () => number = Math.random;
  private backdrop: CameraBackdrop | null = null;
  private done = false;
  private modeOverlay: Phaser.GameObjects.GameObject[] = [];

  constructor() { super('CastorGame'); }

  create(data: CastorData): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0d1400);
    this.session = data?.session ?? [];
    this.done = false;
    this.mode = null;
    this.players = null;
    this.modeOverlay = [];
    this.rng = getRng();

    addThemedFrame(this, 'castor');

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame);
    this.narrator = new Narrator(null, true);

    if (data?.mode) {
      this.startGame(data.mode);
    } else {
      this.showModeSelector(width, height);
    }
    addBackButton(this);
  }

  private showModeSelector(width: number, height: number): void {
    const icon = this.add.text(width / 2, height * 0.18, '🦫', { fontSize: '72px' })
      .setOrigin(0.5).setDepth(60);
    this.modeOverlay.push(icon);

    const title = this.add.text(width / 2, height * 0.33, strings.miniGames.castorModeTitle, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: '42px',
      color: '#fff8d8',
      stroke: '#3d1800',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60);
    this.modeOverlay.push(title);

    const btn1p = this.makeBtn(width / 2 - width * 0.22, height * 0.55, strings.miniGames.castor1p, 0x8b4513, () => this.startGame('1p'));
    const btn2p = this.makeBtn(width / 2 + width * 0.22, height * 0.55, strings.miniGames.castor2p, 0x1a5276, () => this.startGame('2p'));
    this.modeOverlay.push(...btn1p, ...btn2p);
  }

  private makeBtn(x: number, y: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.GameObject[] {
    const bg = this.add.rectangle(x, y, 230, 90, color, 1)
      .setStrokeStyle(3, 0xffffff, 1)
      .setDepth(60)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => bg.setFillStyle(color, 0.65))
      .on('pointerout', () => bg.setFillStyle(color, 1));
    const txt = this.add.text(x, y, label, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: '34px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(61);
    return [bg, txt];
  }

  private clearModeOverlay(): void {
    for (const obj of this.modeOverlay) obj.destroy();
    this.modeOverlay = [];
  }

  private startGame(mode: '1p' | '2p'): void {
    this.mode = mode;
    this.clearModeOverlay();

    const { width } = GAME_CONFIG;
    const now = performance.now();
    this.startedAt = now;
    this.done = false;

    const refs = getRefs(this);

    const makePlayer = (slots: number[], pill: Pill | null, unsub: (() => void) | null): PlayerState => ({
      castor: null,
      score: 0,
      lastSlotIdx: -1,
      nextSpawnAt: now + 900,
      windowMs: BASE_WINDOW_MS,
      delayMs: BASE_SPAWN_DELAY_MS,
      frame: null,
      unsub,
      scorePill: pill,
      slots,
    });

    if (mode === '1p') {
      this.backdrop!.handGlows = [
        { idx: 15, color: '#ffd60a', alpha: 0.75 },
        { idx: 16, color: '#ffd60a', alpha: 0.75 },
      ];

      addTitleBanner(this, width / 2, 50, strings.miniGames.castorTitle, 0x8b4513, 0xffffff);

      const scorePill = new Pill(this, 130, 50, '0', {
        width: 200, fill: 0x8b4513, stroke: 0xffffff,
        textColor: '#fff8d8', fontSize: 28, icon: '🦫', origin: [0.5, 0.5],
      });
      this.timePill = new Pill(this, width - 130, 50, '60s', {
        width: 180, fill: 0xffd60a, stroke: 0xffffff,
        textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
      });

      for (const nx of SLOT_XS_1P) this.drawHole(nx);

      const p1Unsub = refs.onSmoothedFrame((f: PoseFrame) => { this.players![0].frame = f; });
      this.players = [
        makePlayer(SLOT_XS_1P, scorePill, p1Unsub),
        makePlayer([], null, null),
      ];
    } else {
      const divider = this.add.graphics().setDepth(30);
      divider.fillStyle(0xffffff, 0.25);
      divider.fillRect(GAME_CONFIG.width / 2 - 1, 0, 3, GAME_CONFIG.height);

      addTitleBanner(this, width * 0.25, 50, 'P1', 0x8b4513, 0xffffff);
      addTitleBanner(this, width * 0.75, 50, 'P2', 0x1a5276, 0xffffff);

      const scoreP1 = new Pill(this, width * 0.11, 50, '0', {
        width: 150, fill: 0x8b4513, stroke: 0xffffff,
        textColor: '#fff8d8', fontSize: 26, icon: '🦫', origin: [0.5, 0.5],
      });
      const scoreP2 = new Pill(this, width * 0.89, 50, '0', {
        width: 150, fill: 0x1a5276, stroke: 0xffffff,
        textColor: '#e8f4fd', fontSize: 26, icon: '🦫', origin: [0.5, 0.5],
      });
      this.timePill = new Pill(this, width / 2, 50, '60s', {
        width: 140, fill: 0xffd60a, stroke: 0xffffff,
        textColor: '#ffffff', fontSize: 24, icon: '⏱', origin: [0.5, 0.5],
      });

      for (const nx of SLOT_XS_P1) this.drawHole(nx);
      for (const nx of SLOT_XS_P2) this.drawHole(nx);

      const p1Unsub = refs.onSmoothedFrame((f: PoseFrame) => { this.players![0].frame = f; });
      const p2Unsub = refs.onSmoothedFrameP2((f: PoseFrame) => { this.players![1].frame = f; });

      this.players = [
        makePlayer(SLOT_XS_P1, scoreP1, p1Unsub),
        makePlayer(SLOT_XS_P2, scoreP2, p2Unsub),
      ];
    }
  }

  private drawHole(nx: number): void {
    const { width, height } = GAME_CONFIG;
    const px = nx * width;
    const py = SLOT_Y * height + 14;
    const hole = this.add.ellipse(px, py, 92, 30, 0x1a0800, 0.88);
    hole.setStrokeStyle(3, 0x3d1800, 1);
    hole.setDepth(14);
  }

  update(): void {
    if (this.done || !this.players || !this.mode) return;
    const now = performance.now();
    const elapsed = now - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timePill.setText(`${remaining}s`);

    if (elapsed >= DURATION_MS) { this.finish(); return; }

    this.tickPlayer(this.players[0], now);
    if (this.mode === '2p') this.tickPlayer(this.players[1], now);
  }

  private tickPlayer(p: PlayerState, now: number): void {
    if (!p.scorePill || p.slots.length === 0) return;

    if (p.castor?.alive && p.frame) {
      const tx = p.castor.normX;
      const ty = p.castor.normY + HIT_Y_OFFSET;
      const target = { x: tx, y: ty, r: HIT_R };
      if (handAt(p.frame, 'L', target) || handAt(p.frame, 'R', target)) {
        const wasBad = p.castor.kind === 'bad';
        const px = tx * GAME_CONFIG.width;
        const py = ty * GAME_CONFIG.height;
        if (wasBad) {
          p.score = Math.max(0, p.score - 1);
          p.scorePill.setText(String(p.score));
          this.showThumbsDown(px, py);
          this.narrator.speak(narratorLines.castorBadHit(), 1);
        } else {
          p.score += 1;
          p.scorePill.setText(String(p.score));
          this.showThumbsUp(px, py);
          if (p.score === 1 || p.score % 5 === 0) this.narrator.speak(narratorLines.castorHit(), 1);
        }
        p.castor.whack(() => {});
        p.castor = null;
        p.windowMs = Math.max(MIN_WINDOW_MS, p.windowMs - WINDOW_STEP_MS);
        p.delayMs = Math.max(MIN_SPAWN_DELAY_MS, p.delayMs - SPAWN_STEP_MS);
        p.nextSpawnAt = now + p.delayMs;
      }
    }

    if (p.castor?.alive && p.castor.isExpired()) {
      p.castor.retreat(() => {});
      p.castor = null;
      p.windowMs = Math.min(MAX_WINDOW_MS, p.windowMs + WINDOW_STEP_MS);
      p.delayMs = Math.min(MAX_SPAWN_DELAY_MS, p.delayMs + SPAWN_STEP_MS);
      p.nextSpawnAt = now + p.delayMs;
    }

    if (!p.castor && now >= p.nextSpawnAt) {
      const available = p.slots
        .map((nx, i) => ({ nx, i }))
        .filter(({ i }) => i !== p.lastSlotIdx);
      const pick = available[Math.floor(this.rng() * available.length)];
      p.lastSlotIdx = pick.i;
      const elapsed = now - this.startedAt;
      const kind = elapsed > BAD_GRACE_MS && this.rng() < BAD_SPAWN_CHANCE ? 'bad' : 'good';
      p.castor = new Castor(this, pick.nx, SLOT_Y, p.windowMs, kind);
    }
  }

  private showThumbsUp(px: number, py: number): void {
    const txt = this.add.text(px, py, '👍', {
      fontSize: '52px',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: txt,
      y: py - 120,
      alpha: 0,
      duration: 750,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  private showThumbsDown(px: number, py: number): void {
    const txt = this.add.text(px, py, '👎', {
      fontSize: '52px',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: txt,
      y: py - 120,
      alpha: 0,
      duration: 750,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
    this.cameras.main.shake(180, 0.005);
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;

    const [p1, p2] = this.players!;
    if (p1.unsub) { p1.unsub(); p1.unsub = null; }
    if (p2.unsub) { p2.unsub(); p2.unsub = null; }
    if (p1.castor) { p1.castor.destroy(); p1.castor = null; }
    if (p2.castor) { p2.castor.destroy(); p2.castor = null; }

    if (this.mode === '1p') {
      const refs = getRefs(this);
      void refs.missions.tick({ castorHits: p1.score });
      this.scene.start('MiniGameResult', {
        gameKey: 'CastorGame',
        score: p1.score,
        scoreLabel: strings.miniGames.castorHits,
        session: this.session,
      });
      return;
    }

    // 2p — resolve winner in scene
    const { width, height } = GAME_CONFIG;
    let winnerLabel: string;
    let winSide: 'left' | 'right' | 'tie';

    if (p1.score > p2.score) {
      winnerLabel = strings.miniGames.castorWinP1;
      winSide = 'left';
    } else if (p2.score > p1.score) {
      winnerLabel = strings.miniGames.castorWinP2;
      winSide = 'right';
    } else {
      winnerLabel = strings.miniGames.castorTie;
      winSide = 'tie';
    }

    if (winSide === 'left' || winSide === 'tie') {
      this.showWinnerSide('left', p1.score);
      this.launchConfetti('left');
    }
    if (winSide === 'right' || winSide === 'tie') {
      this.showWinnerSide('right', p2.score);
      this.launchConfetti('right');
    }
    if (winSide === 'left') this.showLoserSide('right', p2.score);
    if (winSide === 'right') this.showLoserSide('left', p1.score);

    this.add.text(width / 2, height * 0.12, winnerLabel, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: '52px',
      color: '#ffd60a',
      stroke: '#3d1800',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(82);

    this.time.delayedCall(3500, () => {
      if (!this.scene.isActive('CastorGame')) return;
      this.add.text(width / 2, height * 0.9, '▶ ' + strings.miniGames.playAgain, {
        fontFamily: 'VT323, ui-monospace',
        fontSize: '36px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 18, y: 10 },
      })
        .setOrigin(0.5).setDepth(90)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('CastorGame', { session: this.session }));
    });
  }

  private showWinnerSide(side: 'left' | 'right', score: number): void {
    const { width, height } = GAME_CONFIG;
    const cx = side === 'left' ? width * 0.25 : width * 0.75;

    const trophy = this.add.text(cx, height * 0.42, '🏆', { fontSize: '90px' })
      .setOrigin(0.5).setDepth(80).setScale(0);
    this.tweens.add({ targets: trophy, scale: 1, duration: 500, ease: 'Back.Out' });

    this.add.text(cx, height * 0.68, `${score} 🦫`, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: '40px',
      color: '#ffd60a',
    }).setOrigin(0.5).setDepth(80);
  }

  private showLoserSide(side: 'left' | 'right', score: number): void {
    const { width, height } = GAME_CONFIG;
    const cx = side === 'left' ? width * 0.25 : width * 0.75;

    this.add.text(cx, height * 0.42, '🥈', { fontSize: '72px' })
      .setOrigin(0.5).setDepth(80);
    this.add.text(cx, height * 0.68, `${score} 🦫`, {
      fontFamily: 'VT323, ui-monospace',
      fontSize: '40px',
      color: '#cccccc',
    }).setOrigin(0.5).setDepth(80);
  }

  private launchConfetti(side: 'left' | 'right'): void {
    const { width, height } = GAME_CONFIG;
    const xMin = side === 'left' ? 0 : width * 0.5;
    const xMax = side === 'left' ? width * 0.5 : width;
    const emojis = ['🎉', '✨', '🎊', '⭐', '🌟', '🏅'];

    for (let i = 0; i < 35; i++) {
      const piece = this.add.text(
        xMin + Math.random() * (xMax - xMin),
        -30 - Math.random() * 80,
        emojis[Math.floor(Math.random() * emojis.length)],
        { fontSize: `${20 + Math.floor(Math.random() * 22)}px` },
      ).setOrigin(0.5).setDepth(70);

      this.tweens.add({
        targets: piece,
        y: height + 40,
        x: piece.x + (Math.random() - 0.5) * 120,
        rotation: (Math.random() - 0.5) * 6,
        duration: 1800 + Math.random() * 1400,
        delay: Math.random() * 800,
        ease: 'Linear',
        onComplete: () => piece.destroy(),
      });
    }
  }

  shutdown(): void {
    if (this.players) {
      for (const p of this.players) {
        if (p.unsub) { p.unsub(); p.unsub = null; }
        if (p.castor) { p.castor.destroy(); p.castor = null; }
      }
    }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
  }
}
