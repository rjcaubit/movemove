import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import type { Lane } from '../../pose/types.ts';

const F = GAME_CONFIG.falling;

function laneX(lane: Lane): number { return F.laneXs[lane + 1]; }

type PlayerState = 'running' | 'jumping' | 'ducking';

export class Player {
  readonly sprite:   Phaser.GameObjects.Sprite;
  private state:     PlayerState = 'running';
  private lane:      Lane = 0;
  private jumpOffset = 0;
  private runFrame   = 0;
  private runAccum   = 0;
  private scene:     Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const key = scene.textures.exists('player_walk') ? 'player_walk' : 'player_run_a';
    this.sprite = scene.add.sprite(laneX(0), F.groundY, key)
      .setOrigin(0.5, 1).setDepth(10).setDisplaySize(F.playerW, F.playerH);
  }

  update(dt: number): void {
    if (this.state === 'running') {
      this.runAccum += dt;
      if (this.runAccum >= 0.14) {
        this.runAccum = 0;
        this.runFrame = 1 - this.runFrame;
        const k0 = this.scene.textures.exists('player_walk')  ? 'player_walk'  : 'player_run_a';
        const k1 = this.scene.textures.exists('player_stand') ? 'player_stand' : 'player_run_b';
        this.sprite.setTexture(this.runFrame === 0 ? k0 : k1);
      }
    }
  }

  getLane():  Lane        { return this.lane; }
  getState(): PlayerState { return this.state; }

  getTop(): number {
    if (this.state === 'ducking') return F.groundY - F.playerDuckH;
    return F.groundY - F.playerH + this.jumpOffset;
  }
  getBottom(): number { return F.groundY + this.jumpOffset; }

  setLane(lane: Lane): void {
    if (this.lane === lane) return;
    this.lane = lane;
    this.scene.tweens.add({
      targets: this.sprite,
      x: laneX(lane),
      duration: F.laneChangeDurMs,
      ease: 'Sine.easeOut',
    });
  }

  jump(): void {
    if (this.state !== 'running') return;
    this.state = 'jumping';
    const key = this.scene.textures.exists('player_jump') ? 'player_jump' : 'player_run_a';
    this.sprite.setTexture(key).setDisplaySize(F.playerW, F.playerH);
    this.scene.tweens.add({
      targets: this.sprite,
      y: F.groundY - F.jumpHeightPx,
      duration: F.jumpDurMs / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
      onUpdate: () => { this.jumpOffset = this.sprite.y - F.groundY; },
      onComplete: () => {
        this.state = 'running';
        this.jumpOffset = 0;
        this.sprite.setY(F.groundY);
        const k = this.scene.textures.exists('player_walk') ? 'player_walk' : 'player_run_a';
        this.sprite.setTexture(k).setDisplaySize(F.playerW, F.playerH);
      },
    });
    if (this.scene.cache.audio.exists('sfx')) {
      (this.scene.sound as unknown as { playAudioSprite?: (k: string, m: string, cfg: object) => void })
        .playAudioSprite?.('sfx', 'jump', { volume: 0.5 });
    }
  }

  duck(): void {
    if (this.state !== 'running') return;
    this.state = 'ducking';
    const key = this.scene.textures.exists('player_duck') ? 'player_duck' : 'player_run_a';
    this.sprite.setTexture(key).setDisplaySize(F.playerW, F.playerDuckH).setY(F.groundY);
    this.scene.time.delayedCall(F.duckDurMs, () => {
      if (this.state !== 'ducking') return;
      this.state = 'running';
      const k = this.scene.textures.exists('player_walk') ? 'player_walk' : 'player_run_a';
      this.sprite.setTexture(k).setDisplaySize(F.playerW, F.playerH).setY(F.groundY);
    });
  }

  destroy(): void { this.sprite.destroy(); }
}
