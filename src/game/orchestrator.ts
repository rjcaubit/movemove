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
import { CastorGame } from './scenes/CastorGame.ts';
import { CastorModePicker } from './scenes/CastorModePicker.ts';
import { HelicopterGame } from './scenes/HelicopterGame.ts';
import { ChickenGame } from './scenes/ChickenGame.ts';
import { DanceDance } from './scenes/DanceDance.ts';
import { BodyCheck } from './scenes/BodyCheck.ts';
import { MiniGameResult } from './scenes/MiniGameResult.ts';
import { GuidedSession } from './scenes/GuidedSession.ts';
import { GuidedSessionPicker } from './scenes/GuidedSessionPicker.ts';
import { Rec } from './scenes/Rec.ts';
import { NinjaFruit } from './scenes/NinjaFruit.ts';
import { CanoeGame } from './scenes/CanoeGame.ts';
import { JumpTester } from './scenes/JumpTester.ts';

import { PoseDetector } from '../pose/poseDetector.ts';
import { EmaSmoother } from '../pose/smoother.ts';
import { POSE_CONFIG } from '../pose/config.ts';
import { getPoseRuntime } from '../pose/runtime.ts';
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
  /** Subscribe to player 2 smoothed PoseFrame (2-player games). Returns unsubscribe. */
  onSmoothedFrameP2: (cb: (f: PoseFrame) => void) => () => void;
  profileStore: ProfileStore;
  runHistory: RunHistoryStore;
  missions: MissionSystem;
  /** True quando loadModel + openCamera + start já rodaram (Loading idempotente). */
  detectorReady: boolean;
  markDetectorReady: () => void;
  /** Liga câmera + modelo via runtime compartilhado com o app. */
  ensureDetector: (onProgress?: (msg: string) => void) => Promise<void>;
}

export interface StartAppResult {
  game: Phaser.Game;
  /** Solta assinaturas/listeners globais (a câmera fica com o runtime). */
  dispose: () => void;
}

export function startApp(parent: string | HTMLElement = 'game'): StartAppResult {
  const runtime = getPoseRuntime();
  const video = runtime.video;

  const disposeOrientation = installOrientationGuard();

  const detector = runtime.detector;
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
  // Frames já chegam suavizados pelo runtime compartilhado.
  const unsubFrame = runtime.onFrame((frame: PoseFrame) => {
    if (debugPanel) {
      debugPanel.tickFps(frame.timestamp);
      debugPanel.setConfidence(frame.confidence);
    }
    // Alimenta o EventDetector globalmente — qualquer cena que escute
    // 'event' funciona sem precisar fazer ingest manual.
    eventDetector.ingest(frame);
    for (const cb of smoothedSubs) cb(frame);
  });

  const smoothedSubs2 = new Set<(f: PoseFrame) => void>();
  const unsubFrame2 = runtime.onFrame2((frame: PoseFrame) => {
    for (const cb of smoothedSubs2) cb(frame);
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
    onSmoothedFrameP2: (cb) => { smoothedSubs2.add(cb); return () => smoothedSubs2.delete(cb); },
    profileStore, runHistory, missions,
    get detectorReady() { return runtime.isRunning; },
    markDetectorReady: () => { /* estado vive no runtime */ },
    ensureDetector: (onProgress) => runtime.ensureStarted(onProgress),
  };

  // GAME_CONFIG.width/height já foram ajustados em main.ts pra casar com
  // o viewport (em portrait, vira ~720×altura-proporcional pra fullscreen real)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: GAME_CONFIG.bgColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_CONFIG.width,
      height: GAME_CONFIG.height,
    },
    scene: [Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver, Demo, Settings, Summary, WaterBreak, MiniGamesHub, BodyCheck, CatchBicho, TrunkTwist, BellRinger, ChickenGame, DanceDance, CastorGame, CastorModePicker, HelicopterGame, NinjaFruit, CanoeGame, MiniGameResult, GuidedSession, GuidedSessionPicker, Rec, JumpTester],
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    render: { pixelArt: true, antialias: false },
  });
  game.registry.set('refs', refs);
  const dispose = (): void => {
    unsubFrame();
    unsubFrame2();
    keyboardDebug.disable?.();
    disposeOrientation();
    debugToggleEl?.classList.add('hidden');
    debugPanelEl?.classList.add('hidden');
  };
  return { game, dispose };
}

export function getRefs(scene: Phaser.Scene): AppRefs {
  const r = scene.game.registry.get('refs');
  if (!r) throw new Error('AppRefs not registered');
  return r as AppRefs;
}
