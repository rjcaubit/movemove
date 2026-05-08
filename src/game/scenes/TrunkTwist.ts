import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { TrunkTarget } from '../entities/TrunkTarget.ts';
import { trunkRotationAngle } from '../../pose/spatialQueries.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

const DURATION_MS = 90000;
const ROT_THRESHOLD_DEG = 25;
const SUSTAIN_MS = 200;

export class TrunkTwist extends Phaser.Scene {
  private current: TrunkTarget | null = null;
  private nextSide: 'L' | 'R' = 'R';
  private score = 0;
  private startedAt = 0;
  private rotationStartedAt = 0;
  private scorePill!: Pill;
  private timePill!: Pill;
  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private backdrop: CameraBackdrop | null = null;

  constructor() { super('TrunkTwist'); }

  create(data?: { session?: string[] }): void {
    const { width } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x140d1a);
    this.session = data?.session ?? [];
    this.score = 0;
    this.startedAt = performance.now();
    addThemedFrame(this, 'trunk');
    addTitleBanner(this, width / 2, 50, strings.miniGames.trunkTitle, 0xbf5af2, 0xffffff);
    this.scorePill = new Pill(this, 130, 50, '0', {
      width: 200, fill: 0xbf5af2, stroke: 0xffffff,
      textColor: '#fff8d8', fontSize: 28, icon: '🌀', origin: [0.5, 0.5],
    });
    this.timePill = new Pill(this, width - 130, 50, '90s', {
      width: 180, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
    });

    this.spawnNext();

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));
    addBackButton(this);
  }

  private spawnNext(): void {
    if (this.current) this.current.destroy();
    this.current = new TrunkTarget(this, this.nextSide);
    this.rotationStartedAt = 0;
  }

  private handleFrame(frame: PoseFrame): void {
    if (!this.current) return;
    const angle = trunkRotationAngle(frame);
    const deviation = ((angle + 540) % 360) - 180;
    let side: 'L' | 'R' | null = null;
    if (Math.abs(deviation) > ROT_THRESHOLD_DEG) side = deviation > 0 ? 'R' : 'L';
    if (side === this.current.side) {
      if (this.rotationStartedAt === 0) this.rotationStartedAt = performance.now();
      else if (performance.now() - this.rotationStartedAt > SUSTAIN_MS) {
        const hitSide = this.current.side;
        this.current.hit(this, () => {/* destroyed */});
        this.current = null;
        this.score += 1;
        this.scorePill.setText(String(this.score));
        if (this.score % 3 === 0) this.narrator.speak(narratorLines.trunkHit(hitSide), 1);
        this.nextSide = this.nextSide === 'L' ? 'R' : 'L';
        this.time.delayedCall(400, () => this.spawnNext());
      }
    } else {
      this.rotationStartedAt = 0;
    }
  }

  update(): void {
    const elapsed = performance.now() - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timePill.setText(`${remaining}s`);
    if (elapsed >= DURATION_MS) this.finish();
  }

  private finish(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.current) this.current.destroy();
    const refs = getRefs(this);
    void refs.missions.tick({ trunkRotations: this.score });
    this.scene.start('MiniGameResult', {
      gameKey: 'TrunkTwist', score: this.score, scoreLabel: strings.miniGames.rotations,
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    if (this.current) { this.current.destroy(); this.current = null; }
  }
}
