import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { Bicho, type BichoColor } from '../entities/Bicho.ts';
import { handAt } from '../../pose/spatialQueries.ts';
import { getRng } from '../systems/rng.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

interface CatchData {
  mode?: 'same_R' | 'same_L' | 'alternating';
  session?: string[];
}

const DURATION_MS = 60000;
const SPAWN_INTERVAL_MS = 1500;

export class CatchBicho extends Phaser.Scene {
  private bichos: Bicho[] = [];
  private score = 0;
  private mode: 'same_R' | 'same_L' | 'alternating' = 'alternating';
  private nextHand: 'L' | 'R' = 'R';
  private startedAt = 0;
  private nextSpawnAt = 0;
  private scoreEl!: Phaser.GameObjects.Text;
  private timeEl!: Phaser.GameObjects.Text;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private rng: () => number = Math.random;
  private backdrop: CameraBackdrop | null = null;

  constructor() { super('CatchBicho'); }

  create(data: CatchData): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0d1a14);
    this.mode = data?.mode ?? 'alternating';
    this.session = data?.session ?? [];
    this.score = 0;
    this.bichos = [];
    this.startedAt = performance.now();
    this.nextSpawnAt = this.startedAt + 500;
    this.rng = getRng();

    this.add.text(width / 2, 30, strings.miniGames.catchTitle, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', color: '#4cd964', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreEl = this.add.text(20, 20, `${strings.miniGames.score}: 0`, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#f5f5f5', stroke: '#000', strokeThickness: 3,
    });
    this.timeEl = this.add.text(width - 20, 20, '60s', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '20px', color: '#ffd60a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));
  }

  private handleFrame(frame: PoseFrame): void {
    for (const b of this.bichos) {
      if (!b.alive) continue;
      const targetHand: 'L' | 'R' = this.mode === 'same_L' ? 'L'
        : this.mode === 'same_R' ? 'R'
        : (b.color === 'blue' ? 'L' : 'R');
      const target = { x: b.normX, y: b.normY, r: 0.10 };
      if (handAt(frame, targetHand, target)) {
        b.catch(this, () => {/* destroyed */});
        this.score += 1;
        this.scoreEl.setText(`${strings.miniGames.score}: ${this.score}`);
        if (this.score === 1 || this.score % 5 === 0) this.narrator.speak(narratorLines.bichoCaught(), 1);
      }
    }
  }

  update(): void {
    const elapsed = performance.now() - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timeEl.setText(`${remaining}s`);

    if (performance.now() >= this.nextSpawnAt && elapsed < DURATION_MS) {
      this.nextSpawnAt = performance.now() + SPAWN_INTERVAL_MS;
      const x = 0.15 + this.rng() * 0.7;
      const y = 0.25 + this.rng() * 0.5;
      const color: BichoColor = this.mode === 'alternating'
        ? (this.nextHand === 'R' ? 'red' : 'blue')
        : (this.rng() < 0.5 ? 'green' : 'yellow');
      this.bichos.push(new Bicho(this, x, y, color));
      this.nextHand = this.nextHand === 'R' ? 'L' : 'R';
    }

    for (const b of this.bichos) if (b.alive && b.isExpired()) b.destroy();
    this.bichos = this.bichos.filter((b) => b.alive);

    if (elapsed >= DURATION_MS) this.finish();
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
