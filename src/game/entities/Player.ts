import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { laneToX } from '../systems/pseudo3d.ts';
import type { Lane } from '../../pose/types.ts';

const C = GAME_CONFIG;

type PlayerState = 'running' | 'jumping' | 'ducking';

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private lane: Lane = 0;
  private state: PlayerState = 'running';
  private runFrame = 0;
  private runFrameAccum = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.sprite = scene.add.sprite(laneToX(0, 0), C.playerY, 'player_idle')
      .setOrigin(0.5, 1).setScale(2.5).setDepth(10);
  }

  update(dtSec: number): void {
    if (this.state === 'running') {
      this.runFrameAccum += dtSec;
      if (this.runFrameAccum >= 0.12) {
        this.runFrameAccum = 0;
        this.runFrame = (this.runFrame + 1) % 2;
        this.sprite.setTexture(this.runFrame === 0 ? 'player_run_a' : 'player_run_b');
      }
    }
  }

  getLane(): Lane { return this.lane; }
  getState(): PlayerState { return this.state; }

  setLane(lane: Lane): void {
    if (this.lane === lane) return;
    this.lane = lane;
    this.scene.tweens.add({
      targets: this.sprite,
      x: laneToX(lane, 0),
      duration: 80,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.sprite,
      angle: lane === -1 ? -C.playerLaneTiltDeg : lane === 1 ? C.playerLaneTiltDeg : 0,
      duration: C.playerLaneTiltDurationMs,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => this.sprite.setAngle(0),
    });
  }

  jump(): void {
    if (this.state !== 'running') return;
    this.state = 'jumping';
    this.sprite.setTexture('player_jump');
    if (this.scene.cache.audio.exists('snd_jump')) this.scene.sound.play('snd_jump');
    this.scene.tweens.add({
      targets: this.sprite,
      y: C.playerY - C.playerJumpHeightPx,
      duration: C.playerJumpDurationMs / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.state = 'running';
        this.sprite.setTexture('player_run_a');
      },
    });
  }

  duck(): void {
    if (this.state !== 'running') return;
    this.state = 'ducking';
    this.sprite.setTexture('player_duck');
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 1.5,
      duration: C.playerDuckDurationMs / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.state = 'running';
        this.sprite.setScale(2.5);
        this.sprite.setTexture('player_run_a');
      },
    });
  }

  destroy(): void { this.sprite.destroy(); }
}
