import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { Player } from '../entities/Player.ts';
import { Obstacle } from '../entities/Obstacle.ts';
import { Coin } from '../entities/Coin.ts';
import { HeartPickup } from '../entities/HeartPickup.ts';
import { Road } from '../systems/road.ts';
import { Parallax } from '../systems/parallax.ts';
import { Spawner } from '../systems/spawner.ts';
import { Scoring } from '../systems/scoring.ts';
import { checkCollisions, checkOpponentCollisions } from '../systems/collision.ts';
import { HUD } from '../ui/hud.ts';
import { getRng } from '../systems/rng.ts';
import { CameraPreview } from '../ui/cameraPreview.ts';
import { getRefs } from '../orchestrator.ts';
import { POSE_CONFIG } from '../../pose/config.ts';
import { strings } from '../../i18n/strings.ts';
import { EnergySystem } from '../systems/energy.ts';
import { ZoneManager } from '../systems/zones.ts';
import { ShieldEffect } from '../systems/shield.ts';
import { EnergyBar } from '../ui/energyBar.ts';
import { AudioBus } from '../systems/audioBus.ts';
import { Narrator } from '../systems/narrator.ts';
import { PostFxOverlay } from '../ui/postfx.ts';
import { BillboardLayer } from '../systems/billboard.ts';
import { SpeedLines } from '../ui/speedLines.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { GameEvent, Lane, PoseFrame } from '../../pose/types.ts';
import { AGE_GROUPS, getAgeGroup, FX_SHAKE_AMPLITUDE_PX, FX_SHAKE_DURATION_MS, FX_CHROMATIC_STRENGTH, FX_PARTICLE_COIN_COUNT, FX_PARTICLE_HIT_COUNT } from '../../tuning.ts';

const C = GAME_CONFIG;

export class Play extends Phaser.Scene {
  private player!: Player;
  private road!: Road;
  private parallax!: Parallax;
  private spawner!: Spawner;
  private scoring!: Scoring;
  private hud!: HUD;
  private energy!: EnergySystem;
  private zones!: ZoneManager;
  private shield!: ShieldEffect;
  private energyBar!: EnergyBar;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private hearts: HeartPickup[] = [];
  private lives = 3;
  private invincibleUntil = 0;
  private speedMps: number = C.speedInitial;
  private speedBase: number = C.speedInitial;
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
  private prepCountdownMs = 3000;
  private prepText: Phaser.GameObjects.Text | null = null;
  private currentBpm = 0;
  private static cumulativePlayMs = 0;
  private static lastWaterBreakAt = 0;
  // Tracking pra Summary/RunHistory (preenchidos durante o run; usados na Fase C)
  private cumulativeJumps = 0;
  private cumulativeDucks = 0;
  private cumulativeJacks = 0;
  private cumulativeArmsUp = 0;
  private audioBus!: AudioBus;
  private narrator!: Narrator;
  private postFx!: PostFxOverlay;
  private billboard!: BillboardLayer;
  private speedLines!: SpeedLines;
  private bpmTrack: number[] = [];
  private bpmSampleAccum = 0;
  private startedAtMs = 0;
  private energyLowSince: number | null = null;
  private armsUpThisFrame = false;

  constructor() { super('Play'); }

  init(data: { skipPrep?: boolean }): void {
    this.prepCountdownMs = data?.skipPrep ? 0 : 3000;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.parallax  = new Parallax(this);
    this.road      = new Road(this);
    this.billboard = new BillboardLayer(this);
    this.player = new Player(this);
    this.spawner = new Spawner(getRng());
    this.scoring = new Scoring();
    this.hud = new HUD(this);
    this.hud.setLives(3);
    this.energy = new EnergySystem();
    this.zones = new ZoneManager(this, getRng());
    this.shield = new ShieldEffect(this, this.player);
    this.energyBar = new EnergyBar(this);
    this.obstacles = [];
    this.coins = [];
    this.hearts = [];
    this.lives = 3;
    this.invincibleUntil = 0;
    this.speedBase = AGE_GROUPS[getAgeGroup()].speedInitial;
    this.speedMps = this.speedBase;
    this.elapsedMs = 0;
    this.lastFrameAt = performance.now();
    this.lowConfSince = null;
    this.driftSuggestedAt = null;
    this.currentBpm = 0;
    this.cumulativeJumps = 0;
    this.cumulativeDucks = 0;
    this.cumulativeJacks = 0;
    this.cumulativeArmsUp = 0;
    this.bpmTrack = [];
    this.bpmSampleAccum = 0;
    this.startedAtMs = performance.now();
    this.energyLowSince = null;
    this.audioBus   = new AudioBus(this);
    this.audioBus.startMusic();
    this.postFx     = new PostFxOverlay(this);
    this.speedLines = new SpeedLines(this);
    const narratorEnabled = (() => { try { return localStorage.getItem('movemove.narrator.enabled') !== 'false'; } catch { return true; } })();
    this.narrator = new Narrator(this.audioBus, narratorEnabled);
    if (this.prepCountdownMs > 0) {
      this.prepText = this.add.text(C.width / 2, C.height / 2 - 40, '3', {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '120px', color: '#4cd964',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(150);
    } else {
      this.prepText = null;
    }

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
        case 'jump': this.player.jump(); this.cumulativeJumps += 1; break;
        case 'duck': this.player.duck(); this.cumulativeDucks += 1; break;
        case 'lane_change': this.player.setLane(ev.lane); break;
        case 'cadence':
          if (ev.intensity) this.energy.setIntensity(ev.intensity);
          if (typeof ev.bpm === 'number') this.currentBpm = ev.bpm;
          break;
        case 'jumping_jack': {
          this.cumulativeJacks += 1;
          const z = this.zones.activeJackZone();
          if (z) {
            const completed = z.tickJack();
            if (completed) {
              for (let i = 0; i < 5; i++) this.scoring.addCoin();
            }
          }
          if (this.cumulativeJacks === 1) this.narrator.speak(narratorLines.firstJack(), 2);
          else if (this.cumulativeJacks % 5 === 0) this.narrator.speak(narratorLines.comboJack(this.cumulativeJacks), 1);
          break;
        }
        case 'arms_up': {
          this.cumulativeArmsUp += 1;
          this.armsUpThisFrame = true;
          const z = this.zones.activeArmsZone();
          if (z) z.registerArmsUp(50);
          break;
        }
      }
    };
    refs.eventDetector.addEventListener('event', this.eventListener);

    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => { this.player.jump(); this.cumulativeJumps += 1; });
      this.input.keyboard.on('keydown-DOWN', () => { this.player.duck(); this.cumulativeDucks += 1; });
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

    if (this.prepCountdownMs > 0) {
      this.prepCountdownMs -= deltaMs;
      const remaining = Math.ceil(this.prepCountdownMs / 1000);
      if (this.prepText) {
        if (this.prepCountdownMs > 0) this.prepText.setText(remaining > 0 ? String(remaining) : 'GO');
        if (this.prepCountdownMs <= 0) {
          this.prepText.setText('GO');
          this.tweens.add({
            targets: this.prepText, alpha: 0, scale: 1.5, duration: 400,
            onComplete: () => { this.prepText?.destroy(); this.prepText = null; },
          });
        }
      }
      this.parallax.update(this.speedMps * 0.3, dt);
      this.road.update(this.speedMps * 0.3, dt);
      this.player.update(dt);
      return;
    }

    this.elapsedMs += deltaMs;
    Play.cumulativePlayMs += deltaMs;
    const waterBreakInterval = AGE_GROUPS[getAgeGroup()].waterBreakIntervalMs;
    if (Play.cumulativePlayMs - Play.lastWaterBreakAt > waterBreakInterval) {
      Play.lastWaterBreakAt = Play.cumulativePlayMs;
      this.scene.pause().launch('WaterBreak');
      return;
    }

    // Energy + zones + shield
    this.energy.tick(dt);
    this.zones.tickDistance(this.speedMps * dt);
    this.zones.update(this.speedMps, dt);
    this.shield.update();
    for (const z of this.zones.arms) {
      if (z.isCompleted() && !this.shield.hasCharge()) this.shield.activate();
    }

    // Velocidade base aumenta com tempo (auto-walk: não depende de energia)
    const steps = Math.floor(this.elapsedMs / C.speedIncreaseIntervalMs);
    const ageInitial = AGE_GROUPS[getAgeGroup()].speedInitial;
    this.speedBase = Math.min(C.speedMax, ageInitial + steps * C.speedIncreasePerInterval);
    this.speedMps  = this.speedBase;
    this.energy.setIntensity('running'); // mantém barra e FX no máximo

    this.parallax.update(this.speedMps, dt);
    this.road.update(this.speedMps, dt);
    this.player.update(dt);

    const now = performance.now();

    for (const o of this.obstacles) o.update(this.speedMps, dt);
    for (const c of this.coins) c.update(this.speedMps, dt);
    for (const h of this.hearts) h.update(this.speedMps, dt);
    this.obstacles = this.obstacles.filter((o) => o.alive);
    this.coins = this.coins.filter((c) => c.alive);
    this.hearts = this.hearts.filter((h) => h.alive);

    this.spawner.update(this, dt, this.speedMps, this.obstacles, this.coins, this.hearts, this.lives);

    const invincible = now < this.invincibleUntil;
    const result = checkCollisions(this.player, this.obstacles, this.coins, this.hearts);

    if (result.collidedObstacle && !invincible) {
      if (this.shield.consume()) {
        result.collidedObstacle.destroy();
      } else {
        result.collidedObstacle.destroy();
        this.lives -= 1;
        this.hud.setLives(this.lives);
        if (this.cache.audio.exists('snd_hit')) this.sound.play('snd_hit');

        if (this.lives <= 0) {
          this.narrator.speak(narratorLines.gameOver(), 2);
          this.audioBus.stopMusic();
          this.tweens.killAll();
          this.sound.stopAll();
          if (this.cache.audio.exists('snd_gameover')) this.sound.play('snd_gameover');
          const distance = this.scoring.getDistance();
          const coins = this.scoring.getCoins();
          const durationS = (performance.now() - this.startedAtMs) / 1000;
          const bpmAvg = this.bpmTrack.length ? this.bpmTrack.reduce((a, b) => a + b, 0) / this.bpmTrack.length : 0;
          const refs = getRefs(this);
          void refs.runHistory.push({
            id: `${Date.now()}`, startedAt: this.startedAtMs, durationS,
            distance, coins, jacks: this.cumulativeJacks, armsUp: this.cumulativeArmsUp,
            jumps: this.cumulativeJumps, ducks: this.cumulativeDucks, bpmAvg,
            bpmTrack: this.bpmTrack.slice(-60),
          });
          void refs.profileStore.load().then((p) => refs.profileStore.update({
            totalRuns: p.totalRuns + 1,
            totalDistance: p.totalDistance + distance,
            totalCoins: p.totalCoins + coins,
            totalJacks: p.totalJacks + this.cumulativeJacks,
            totalArmsUp: p.totalArmsUp + this.cumulativeArmsUp,
          }));
          void refs.missions.tick({
            distance, jacks: this.cumulativeJacks, coins,
            armsUp: this.cumulativeArmsUp, durationS,
          }).then((completed) => {
            if (completed.length > 0) this.narrator.speak(narratorLines.missionComplete(), 2);
          });
          this.cleanup();
          const target = this.scene.manager.keys['Summary'] ? 'Summary' : 'GameOver';
          const data = target === 'Summary'
            ? { distance, coins, jacks: this.cumulativeJacks, armsUp: this.cumulativeArmsUp, jumps: this.cumulativeJumps, ducks: this.cumulativeDucks, durationS, bpmAvg, bpmTrack: this.bpmTrack.slice(-60) }
            : { distance, coins };
          this.scene.start(target, data);
          return;
        }

        // Perdeu vida mas ainda tem vidas: 2s de invencibilidade + shake + flash
        this.invincibleUntil = now + 2000;
        if (C.fx.screenShake) {
          this.cameras.main.shake(FX_SHAKE_DURATION_MS, FX_SHAKE_AMPLITUDE_PX / C.width);
        }
        if (C.fx.flash) {
          const flash = this.add.rectangle(C.width / 2, C.height / 2, C.width, C.height, 0xffffff, 0.5)
            .setDepth(150);
          this.tweens.add({ targets: flash, alpha: 0, duration: 150, onComplete: () => flash.destroy() });
        }
        if (C.fx.particles && result.collidedObstacle) {
          const obs = result.collidedObstacle;
          for (let i = 0; i < FX_PARTICLE_HIT_COUNT; i++) {
            const p = this.add.circle(obs.sprite.x, obs.sprite.y, 5, 0xff4444).setDepth(20);
            this.tweens.add({
              targets: p,
              x: obs.sprite.x + (Math.random() - 0.5) * 50,
              y: obs.sprite.y - Math.random() * 30,
              alpha: 0, scale: 0,
              duration: 300 + Math.random() * 150,
              onComplete: () => p.destroy(),
            });
          }
        }
        this.tweens.add({
          targets: this.player.sprite,
          alpha: { from: 0.2, to: 1 },
          duration: 150,
          repeat: 6,
          yoyo: true,
          onComplete: () => { this.player.sprite.setAlpha(1); },
        });
        this.narrator.speak(narratorLines.lostLife(this.lives), 2);
      }
    }

    // Colisão com oponentes
    const oppResult = checkOpponentCollisions(
      this.player, this.spawner.getOpponents(), this.spawner.getBoss(), this.armsUpThisFrame,
    );
    this.armsUpThisFrame = false;
    if (oppResult.hitOpponent && !invincible) {
      this.lives -= 1;
      this.hud.setLives(this.lives);
      this.invincibleUntil = now + 2000;
      if (C.fx.screenShake) this.cameras.main.shake(FX_SHAKE_DURATION_MS, FX_SHAKE_AMPLITUDE_PX / C.width);
      if (C.fx.flash) {
        const flash2 = this.add.rectangle(C.width / 2, C.height / 2, C.width, C.height, 0xffffff, 0.5).setDepth(150);
        this.tweens.add({ targets: flash2, alpha: 0, duration: 150, onComplete: () => flash2.destroy() });
      }
      if (this.lives <= 0) { this.audioBus.stopMusic(); this.cleanup(); this.scene.start('GameOver', { distance: this.scoring.getDistance(), coins: this.scoring.getCoins() }); return; }
    }
    if (oppResult.bossDead) {
      this.audioBus.playSfx('boss_defeat');
      for (let i = 0; i < 10; i++) this.scoring.addCoin();
    }

    for (const coin of result.collectedCoins) {
      if (C.fx.particles) {
        for (let i = 0; i < FX_PARTICLE_COIN_COUNT; i++) {
          const p = this.add.circle(coin.sprite.x, coin.sprite.y - 20, 4, 0xffd700).setDepth(20);
          this.tweens.add({
            targets: p,
            x: coin.sprite.x + (Math.random() - 0.5) * 60,
            y: coin.sprite.y - 20 - Math.random() * 40,
            alpha: 0, scale: 0,
            duration: 400 + Math.random() * 200,
            onComplete: () => p.destroy(),
          });
        }
      }
      coin.collect();
      this.scoring.addCoin();
      if (this.cache.audio.exists('snd_coin')) this.sound.play('snd_coin');
    }

    if (result.collectedHeart) {
      result.collectedHeart.collect();
      this.lives = Math.min(3, this.lives + 1);
      this.hud.setLives(this.lives);
      this.narrator.speak(narratorLines.heartCollected(), 1);
    }

    this.scoring.addDistance(dt, this.speedMps);
    this.hud.setDistance(this.scoring.getDistance());
    this.hud.setCoins(this.scoring.getCoins());
    this.hud.setFps(this.game.loop.actualFps);
    this.hud.setBpm(this.currentBpm);

    // Speed lines + chromatic — baseados na intensidade de energia
    const intensity = this.energy.getIntensity();
    const isRunning = intensity === 'running';
    if (C.fx.speedLines) {
      this.speedLines.setVisible(isRunning);
      this.speedLines.update(0.8);
    }
    const fps = this.game.loop.actualFps;
    this.setChromaticAberration(isRunning && fps >= 40 ? FX_CHROMATIC_STRENGTH : 0);
    this.energyBar.update(this.energy.getValue(), this.energy.getIntensity(), this.currentBpm);

    // BPM track sample (1Hz)
    this.bpmSampleAccum += deltaMs;
    if (this.bpmSampleAccum >= 1000) {
      this.bpmSampleAccum = 0;
      this.bpmTrack.push(this.currentBpm);
      if (this.bpmTrack.length > 600) this.bpmTrack.shift();
    }

    // Narrator: energia baixa por 3s
    if (this.energy.getValue() < 20) {
      if (this.energyLowSince === null) this.energyLowSince = performance.now();
      else if (performance.now() - this.energyLowSince > 3000) {
        this.narrator.speak(narratorLines.energyLow(), 1);
        this.energyLowSince = performance.now() + 5000; // não repete por 8s
      }
    } else {
      this.energyLowSince = null;
    }
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
    for (const h of this.hearts) h.collect();
    this.hearts = [];
    if (this.zones) this.zones.destroy();
    if (this.shield) this.shield.reset();
    this.hideBanner();
    this.hideNoBody();
  }

  private setChromaticAberration(strength: number): void {
    if (!C.fx.chromatic) return;
    const canvas = this.game.canvas;
    canvas.style.filter = strength > 0
      ? `drop-shadow(${strength}px 0 0 rgba(255,0,0,0.4)) drop-shadow(-${strength}px 0 0 rgba(0,255,255,0.4))`
      : '';
  }

  shutdown(): void {
    this.setChromaticAberration(0);
    this.cleanup();
    this.postFx?.destroy();
    this.billboard?.destroy();
    this.speedLines?.destroy();
  }
}
