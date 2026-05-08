import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { Bicho, type BichoColor } from '../entities/Bicho.ts';
import { handAt } from '../../pose/spatialQueries.ts';
import { KP } from '../../pose/types.ts';
import { getRng } from '../systems/rng.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

interface CatchData {
  session?: string[];
}

const DURATION_MS = 60000;
const BICHO_LIFETIME_MS = 3000;
const BASE_SPAWN_MS = 1500;
const MIN_SPAWN_MS = 600;
const MAX_SPAWN_MS = 2400;
const SPAWN_STEP_MS = 100;

export class CatchBicho extends Phaser.Scene {
  private bichos: Bicho[] = [];
  private score = 0;
  private startedAt = 0;
  private nextSpawnAt = 0;
  private scorePill!: Pill;
  private timePill!: Pill;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private rng: () => number = Math.random;
  private backdrop: CameraBackdrop | null = null;
  private lastFrame: PoseFrame | null = null;
  private currentSpawnMs = BASE_SPAWN_MS;
  private recentReactions: number[] = [];

  constructor() { super('CatchBicho'); }

  create(data: CatchData): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0d1a14);
    this.session = data?.session ?? [];
    this.score = 0;
    this.bichos = [];
    this.startedAt = performance.now();
    this.nextSpawnAt = this.startedAt + 500;
    this.currentSpawnMs = BASE_SPAWN_MS;
    this.recentReactions = [];
    this.rng = getRng();

    addThemedFrame(this, 'ghost');
    addTitleBanner(this, width / 2, 50, strings.miniGames.catchTitle, 0x4cd964, 0xffffff);
    this.scorePill = new Pill(this, 130, 50, '0', {
      width: 200, fill: 0xff453a, stroke: 0xffffff,
      textColor: '#fff8d8', fontSize: 28, icon: '🪰', origin: [0.5, 0.5],
    });
    this.timePill = new Pill(this, width - 130, 50, '60', {
      width: 180, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
    });

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));
    addBackButton(this);
  }

  private handleFrame(frame: PoseFrame): void {
    this.lastFrame = frame;
    const lw = frame.keypoints[KP.LEFT_WRIST];
    const rw = frame.keypoints[KP.RIGHT_WRIST];
    if (!lw || !rw) return;
    // Palmas: pulsos próximos um do outro (proxy de bater palmas)
    const handsClose = Math.hypot(lw.x - rw.x, lw.y - rw.y) < 0.12;
    for (const b of this.bichos) {
      if (!b.alive) continue;
      const target = { x: b.normX, y: b.normY, r: 0.12 };
      if (handsClose && handAt(frame, 'L', target) && handAt(frame, 'R', target)) {
        const reaction = performance.now() - b.bornAtMs;
        b.catch(this, () => {/* destroyed */});
        this.score += 1;
        this.scorePill.setText(String(this.score));
        if (this.score === 1 || this.score % 5 === 0) this.narrator.speak(narratorLines.bichoCaught(), 1);
        this.adaptPaceOnHit(reaction);
      }
    }
  }

  update(): void {
    const elapsed = performance.now() - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timePill.setText(`${remaining}s`);

    if (performance.now() >= this.nextSpawnAt && elapsed < DURATION_MS) {
      this.nextSpawnAt = performance.now() + this.currentSpawnMs;
      const { x, y } = this.pickSpawnPosition();
      const palette: BichoColor[] = ['red', 'blue', 'green', 'yellow'];
      const color = palette[Math.floor(this.rng() * palette.length)];
      this.bichos.push(new Bicho(this, x, y, color, BICHO_LIFETIME_MS));
    }

    for (const b of this.bichos) {
      if (b.alive && b.isExpired()) {
        b.destroy();
        this.adaptPaceOnMiss();
      }
    }
    this.bichos = this.bichos.filter((b) => b.alive);

    if (elapsed >= DURATION_MS) this.finish();
  }

  private adaptPaceOnHit(reactionMs: number): void {
    this.recentReactions.push(reactionMs);
    if (this.recentReactions.length > 4) this.recentReactions.shift();
    if (this.recentReactions.length < 3) return;
    const avg = this.recentReactions.reduce((s, v) => s + v, 0) / this.recentReactions.length;
    if (avg < BICHO_LIFETIME_MS * 0.4) {
      this.currentSpawnMs = Math.max(MIN_SPAWN_MS, this.currentSpawnMs - SPAWN_STEP_MS);
    } else if (avg > BICHO_LIFETIME_MS * 0.7) {
      this.currentSpawnMs = Math.min(MAX_SPAWN_MS, this.currentSpawnMs + SPAWN_STEP_MS);
    }
  }

  private adaptPaceOnMiss(): void {
    this.currentSpawnMs = Math.min(MAX_SPAWN_MS, this.currentSpawnMs + SPAWN_STEP_MS * 1.5);
    this.recentReactions = [];
  }

  private pickSpawnPosition(): { x: number; y: number } {
    const body = this.bodyBox();
    for (let i = 0; i < 8; i++) {
      const x = 0.12 + this.rng() * 0.76;
      const y = 0.22 + this.rng() * 0.55;
      if (!body || !this.intersectsBody(x, y, body)) return { x, y };
    }
    // fallback: empurra pra fora horizontalmente
    if (body) {
      const y = 0.22 + this.rng() * 0.55;
      const left = body.minX - 0.06;
      const right = body.maxX + 0.06;
      const useLeft = left > 0.12 && (right > 0.88 || this.rng() < 0.5);
      const x = useLeft ? Math.max(0.12, left) : Math.min(0.88, right);
      return { x, y };
    }
    return { x: 0.15 + this.rng() * 0.7, y: 0.25 + this.rng() * 0.5 };
  }

  private bodyBox(): { minX: number; maxX: number; minY: number; maxY: number } | null {
    const f = this.lastFrame;
    if (!f) return null;
    const ls = f.keypoints[KP.LEFT_SHOULDER];
    const rs = f.keypoints[KP.RIGHT_SHOULDER];
    const lh = f.keypoints[KP.LEFT_HIP];
    const rh = f.keypoints[KP.RIGHT_HIP];
    const nose = f.keypoints[KP.NOSE];
    if (!ls || !rs || !lh || !rh) return null;
    const PAD = 0.06;
    const minX = Math.min(ls.x, rs.x, lh.x, rh.x) - PAD;
    const maxX = Math.max(ls.x, rs.x, lh.x, rh.x) + PAD;
    const topY = (nose ? nose.y : Math.min(ls.y, rs.y)) - PAD;
    const botY = Math.max(lh.y, rh.y) + PAD;
    return { minX, maxX, minY: topY, maxY: botY };
  }

  private intersectsBody(x: number, y: number, b: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
    return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
  }

  private finish(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    for (const b of this.bichos) b.destroy();
    const refs = getRefs(this);
    void refs.missions.tick({ bichosCaught: this.score });
    this.scene.start('MiniGameResult', {
      gameKey: 'CatchBicho', score: this.score, scoreLabel: strings.miniGames.bichosCaught,
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    for (const b of this.bichos) b.destroy();
    this.bichos = [];
  }
}
