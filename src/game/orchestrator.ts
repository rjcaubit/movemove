import * as Phaser from 'phaser';
import { GAME_CONFIG } from './config.ts';
import { Boot } from './scenes/Boot.ts';
import { Welcome } from './scenes/Welcome.ts';
import { Loading } from './scenes/Loading.ts';
import { Tutorial } from './scenes/Tutorial.ts';
import { Calibration } from './scenes/Calibration.ts';
import { Play } from './scenes/Play.ts';
import { GameOver } from './scenes/GameOver.ts';
import { Demo } from './scenes/Demo.ts';
import { Settings } from './scenes/Settings.ts';
import { Summary } from './scenes/Summary.ts';
import { WaterBreak } from './scenes/WaterBreak.ts';
import { MiniGamesHub } from './scenes/MiniGamesHub.ts';
import { CatchBicho } from './scenes/CatchBicho.ts';
import { TrunkTwist } from './scenes/TrunkTwist.ts';
import { BellRinger } from './scenes/BellRinger.ts';
import { MiniGameResult } from './scenes/MiniGameResult.ts';

import { PoseDetector } from '../pose/poseDetector.ts';
import { EmaSmoother } from '../pose/smoother.ts';
import { POSE_CONFIG } from '../pose/config.ts';
import { Calibrator } from '../pose/calibration.ts';
import { EventDetector } from '../pose/events.ts';
import { KeyboardDebug } from '../debug/keyboard.ts';
import { DebugPanel } from '../ui/debugPanel.ts';
import { installOrientationGuard } from './ui/orientationGuard.ts';
import { ProfileStore } from './storage/profile.ts';
import { RunHistoryStore } from './storage/runHistory.ts';
import { MissionSystem } from './systems/missions.ts';
import type { GameEvent, PoseFrame } from '../pose/types.ts';

export interface AppRefs {
  detector: PoseDetector;
  smoother: EmaSmoother;
  calibrator: Calibrator;
  eventDetector: EventDetector;
  video: HTMLVideoElement;
  /** Subscribe to smoothed PoseFrame stream (after EMA). Returns unsubscribe. */
  onSmoothedFrame: (cb: (f: PoseFrame) => void) => () => void;
  profileStore: ProfileStore;
  runHistory: RunHistoryStore;
  missions: MissionSystem;
  /** True quando loadModel + openCamera + start já rodaram (Loading idempotente). */
  detectorReady: boolean;
  markDetectorReady: () => void;
}

export function startApp(): Phaser.Game {
  const video = document.getElementById('video') as HTMLVideoElement | null;
  if (!video) throw new Error('#video not found');

  installOrientationGuard();

  const detector = new PoseDetector();
  const smoother = new EmaSmoother(POSE_CONFIG.emaAlpha);
  const calibrator = new Calibrator();
  const eventDetector = new EventDetector();
  const keyboardDebug = new KeyboardDebug((ev: GameEvent) => {
    eventDetector.dispatchEvent(new CustomEvent('event', { detail: ev }));
  });
  if (KeyboardDebug.isEnabledByQuery()) keyboardDebug.enable();

  const debugToggleEl = document.getElementById('debug-toggle');
  const debugPanelEl = document.getElementById('debug-panel');
  let debugPanel: DebugPanel | null = null;
  if (KeyboardDebug.isEnabledByQuery() && debugToggleEl && debugPanelEl) {
    debugToggleEl.classList.remove('hidden');
    debugPanel = new DebugPanel(debugPanelEl, debugToggleEl);
  }

  const smoothedSubs = new Set<(f: PoseFrame) => void>();
  detector.onFrame((raw: PoseFrame) => {
    const smoothed = smoother.smooth(raw.keypoints);
    const frame: PoseFrame = { ...raw, keypoints: smoothed };
    if (debugPanel) {
      debugPanel.tickFps(raw.timestamp);
      debugPanel.setConfidence(raw.confidence);
    }
    for (const cb of smoothedSubs) cb(frame);
  });

  if (debugPanel) {
    eventDetector.addEventListener('event', (e) => {
      const ev = (e as CustomEvent<GameEvent>).detail;
      debugPanel!.appendEvent(ev);
      if (ev.type === 'lane_change') debugPanel!.setLane(ev.lane);
      if (ev.type === 'cadence') debugPanel!.setCadence(ev.stepsPerSec);
    });
  }

  const profileStore = new ProfileStore();
  const runHistory = new RunHistoryStore();
  const missions = new MissionSystem(profileStore);
  void missions.load();

  const refs: AppRefs = {
    detector, smoother, calibrator, eventDetector, video,
    onSmoothedFrame: (cb) => { smoothedSubs.add(cb); return () => smoothedSubs.delete(cb); },
    profileStore, runHistory, missions,
    detectorReady: false,
    markDetectorReady: () => { refs.detectorReady = true; },
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: GAME_CONFIG.bgColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_CONFIG.width,
      height: GAME_CONFIG.height,
    },
    scene: [Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver, Demo, Settings, Summary, WaterBreak, MiniGamesHub, CatchBicho, TrunkTwist, BellRinger, MiniGameResult],
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    render: { pixelArt: true, antialias: false },
  });
  game.registry.set('refs', refs);
  return game;
}

export function getRefs(scene: Phaser.Scene): AppRefs {
  const r = scene.game.registry.get('refs');
  if (!r) throw new Error('AppRefs not registered');
  return r as AppRefs;
}
