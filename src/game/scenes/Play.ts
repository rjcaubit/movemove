import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Player } from '../entities/Player.ts';
import { Obstacle } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { Road } from '../systems/road.ts';
import { Parallax } from '../systems/parallax.ts';
import { Spawner } from '../systems/spawner.ts';
import { Scoring } from '../systems/scoring.ts';
import { checkCollisions } from '../systems/collision.ts';
import { HUD } from '../ui/hud.ts';
import { getRng } from '../systems/rng.ts';
import { CameraPreview } from '../ui/cameraPreview.ts';
import { getRefs } from '../orchestrator.ts';
import { POSE_CONFIG } from '../../pose/config.ts';
import { strings } from '../../i18n/strings.ts';
import type { GameEvent, Lane, PoseFrame } from '../../pose/types.ts';

const C = GAME_CONFIG;

export class Play extends Phaser.Scene {
  private player!: Player;
  private road!: Road;
  private parallax!: Parallax;
  private spawner!: Spawner;
  private scoring!: Scoring;
  private hud!: HUD;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private speedMps: number = C.speedInitial;
  private elapsedMs = 0;
  private muted = false;
  private cameraPreview: CameraPreview | null = null;
  private noBodyOverlay: Phaser.GameObjects.Container | null = null;
  private lastFrameAt = 0;
  private lowConfSince: number | null = null;
  private driftSuggestedAt: number | null = null;
  private bannerEl: HTMLDivElement | null = null;
  private unsubFrame: (() => void) | null = null;
  private eventListener: ((e: Event) => void) | null = null;
  private isPaused = false;

  constructor() { super('Play'); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.parallax = new Parallax(this);
    this.road = new Road(this);
    this.player = new Player(this);
    this.spawner = new Spawner(getRng());
    this.scoring = new Scoring();
    this.hud = new HUD(this);
    this.obstacles = [];
    this.coins = [];
    this.speedMps = C.speedInitial;
    this.elapsedMs = 0;
    this.lastFrameAt = performance.now();
    this.lowConfSince = null;
    this.driftSuggestedAt = null;

    this.muted = (() => { try { return localStorage.getItem(C.storageKeys.muted) === 'true'; } catch { return false; } })();
    this.sound.mute = this.muted;
    const muteBtn = this.add.text(C.width - 20, C.height - 20, this.muted ? '🔇' : '🔊', {
      fontFamily: 'system-ui', fontSize: '24px', color: '#f5f5f5',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 4 },
    }).setOrigin(1, 1).setDepth(100).setInteractive({ useHandCursor: true });
    muteBtn.setName('btn-mute');
    muteBtn.on('pointerup', () => {
      this.muted = !this.muted;
      this.sound.mute = this.muted;
      muteBtn.setText(this.muted ? '🔇' : '🔊');
      try { localStorage.setItem(C.storageKeys.muted, String(this.muted)); } catch {/* ignore */}
    });

    const refs = getRefs(this);
    const previewHost = document.getElementById('camera-preview');
    if (previewHost) this.cameraPreview = new CameraPreview(previewHost, refs.video, refs.onSmoothedFrame);

    this.eventListener = (e: Event) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      switch (ev.type) {
        case 'jump': this.player.jump(); break;
        case 'duck': this.player.duck(); break;
        case 'lane_change': this.player.setLane(ev.lane as Lane); break;
        // arms_up/cadence/jumping_jack ignorados pelo gameplay nesta fase
      }
    };
    refs.eventDetector.addEventListener('event', this.eventListener);

    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));

    // Keyboard fallback (também redundante via KeyboardDebug → bus, mas mantém atalho local)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.player.jump());
      this.input.keyboard.on('keydown-DOWN', () => this.player.duck());
      this.input.keyboard.on('keydown-LEFT', () => this.player.setLane(this.shiftLane(-1)));
      this.input.keyboard.on('keydown-RIGHT', () => this.player.setLane(this.shiftLane(1)));
    }
  }

  private shiftLane(dir: -1 | 1): Lane {
    const cur = this.player.getLane();
    const raw = cur + dir;
    return (raw < -1 ? -1 : raw > 1 ? 1 : raw) as Lane;
  }

  private handleFrame(frame: PoseFrame): void {
    this.lastFrameAt = frame.timestamp;
    this.hideNoBody();

    if (frame.confidence < POSE_CONFIG.lowConfidenceThreshold) {
      if (this.lowConfSince === null) this.lowConfSince = frame.timestamp;
      const dur = frame.timestamp - this.lowConfSince;
      if (dur > POSE_CONFIG.lowConfidenceWarnDurationMs && !this.bannerEl) {
        this.showBanner(strings.states.lowLight, false);
      }
      if (dur > POSE_CONFIG.driftRecalibrateSuggestMs && this.driftSuggestedAt === null) {
        this.driftSuggestedAt = frame.timestamp;
        this.showBanner(strings.states.driftCalibration, true);
      }
    } else {
      this.lowConfSince = null;
      this.driftSuggestedAt = null;
      this.hideBanner();
    }

    const refs = getRefs(this);
    refs.eventDetector.ingest(frame);
  }

  update(_time: number, deltaMs: number): void {
    const noBody = performance.now() - this.lastFrameAt > POSE_CONFIG.noBodyTimeoutMs;
    if (noBody && !this.isPaused) {
      this.showNoBody();
      this.isPaused = true;
      // Pausa tweens/timers/sons (RF12). update() ainda roda pra detectar volta dos keypoints.
      this.tweens.pauseAll();
      this.time.paused = true;
      this.sound.pauseAll();
    } else if (!noBody && this.isPaused) {
      this.isPaused = false;
      this.tweens.resumeAll();
      this.time.paused = false;
      this.sound.resumeAll();
    }
    if (this.isPaused) return;

    const dt = deltaMs / 1000;
    this.elapsedMs += deltaMs;

    const steps = Math.floor(this.elapsedMs / C.speedIncreaseIntervalMs);
    this.speedMps = Math.min(C.speedMax, C.speedInitial + steps * C.speedIncreasePerInterval);

    this.parallax.update(this.speedMps, dt);
    this.road.update(this.speedMps, dt);
    this.player.update(dt);

    for (const o of this.obstacles) o.update(this.speedMps, dt);
    for (const c of this.coins) c.update(this.speedMps, dt);
    this.obstacles = this.obstacles.filter((o) => o.alive);
    this.coins = this.coins.filter((c) => c.alive);

    this.spawner.update(this, dt, this.speedMps, this.obstacles, this.coins);

    const result = checkCollisions(this.player, this.obstacles, this.coins);
    if (result.collidedObstacle) {
      if (this.cache.audio.exists('snd_hit')) this.sound.play('snd_hit');
      if (this.cache.audio.exists('snd_gameover')) this.sound.play('snd_gameover');
      const distance = this.scoring.getDistance();
      const coins = this.scoring.getCoins();
      this.cleanup();
      this.scene.start('GameOver', { distance, coins });
      return;
    }
    for (const coin of result.collectedCoins) {
      coin.collect();
      this.scoring.addCoin();
      if (this.cache.audio.exists('snd_coin')) this.sound.play('snd_coin');
    }

    this.scoring.addDistance(dt, this.speedMps);
    this.hud.setDistance(this.scoring.getDistance());
    this.hud.setCoins(this.scoring.getCoins());
    this.hud.setFps(this.game.loop.actualFps);
  }

  private showNoBody(): void {
    if (this.noBodyOverlay) return;
    const bg = this.add.rectangle(C.width / 2, C.height / 2, C.width, C.height, 0x0b0d10, 0.7);
    const text = this.add.text(C.width / 2, C.height / 2, strings.states.noBody, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '36px', color: '#f5f5f5', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.noBodyOverlay = this.add.container(0, 0, [bg, text]).setDepth(200);
  }

  private hideNoBody(): void {
    if (!this.noBodyOverlay) return;
    this.noBodyOverlay.destroy();
    this.noBodyOverlay = null;
  }

  private showBanner(text: string, withRecalibrate: boolean): void {
    this.hideBanner();
    const el = document.createElement('div');
    el.className = 'banner';
    el.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#ffd60a;color:#000;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:600;z-index:150;display:flex;align-items:center;gap:8px;';
    const span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    if (withRecalibrate) {
      const btn = document.createElement('button');
      btn.textContent = strings.states.recalibrate;
      btn.style.cssText = 'min-height:32px;padding:4px 10px;font-size:13px;';
      btn.addEventListener('click', () => {
        this.cleanup();
        this.scene.start('Calibration');
      }, { once: true });
      el.appendChild(btn);
    }
    document.body.appendChild(el);
    this.bannerEl = el;
  }

  private hideBanner(): void {
    if (this.bannerEl && this.bannerEl.parentElement) this.bannerEl.parentElement.removeChild(this.bannerEl);
    this.bannerEl = null;
  }

  private cleanup(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.eventListener) {
      const refs = getRefs(this);
      refs.eventDetector.removeEventListener('event', this.eventListener);
      this.eventListener = null;
    }
    if (this.cameraPreview) { this.cameraPreview.destroy(); this.cameraPreview = null; }
    this.hideBanner();
    this.hideNoBody();
  }

  shutdown(): void { this.cleanup(); }
}
