import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import { getRefs } from '../orchestrator.ts';
import type { ErrorKind } from '../../ui/errorScreen.ts';
import { showError } from '../../ui/errorScreen.ts';

interface LoadingData { next?: string }

export class Loading extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private nextScene = '';

  constructor() { super('Loading'); }

  init(data: LoadingData): void {
    this.nextScene = data?.next ?? '';
  }

  create(): void {
    const { width, height } = GAME_CONFIG;
    this.add.text(width / 2, height / 2 - 30, strings.loading.text, {
      fontFamily: 'VT323, ui-monospace', fontSize: '24px', color: '#f5f5f5',
    }).setOrigin(0.5);
    this.statusText = this.add.text(width / 2, height / 2 + 20, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(0.5);

    void this.bootDetector();
  }

  private async bootDetector(): Promise<void> {
    const refs = getRefs(this);
    try {
      // Pré-carregar sprites de personagens (Kenney CC0)
      const SPRITES: [string, string][] = [
        ['player_walk',       '/assets/sprites/player_walk.png'],
        ['player_run_b',      '/assets/sprites/player_run_b.png'],
        ['player_jump',       '/assets/sprites/player_jump.png'],
        ['player_duck',       '/assets/sprites/player_duck.png'],
        ['player_stand',      '/assets/sprites/player_stand.png'],
        ['player_hurt',       '/assets/sprites/player_hurt.png'],
        ['robot_kenney',      '/assets/sprites/robot_kenney.png'],
        ['zombie_kenney',     '/assets/sprites/zombie_kenney.png'],
        ['npc_runner_kenney', '/assets/sprites/npc_runner_kenney.png'],
        ['puncher_kenney',    '/assets/sprites/puncher_kenney.png'],
        ['animal_kenney',     '/assets/sprites/animal_kenney.png'],
        ['enemy_a',           '/assets/sprites/enemy_a.png'],
        ['enemy_b',           '/assets/sprites/enemy_b.png'],
        ['enemy_c',           '/assets/sprites/enemy_c.png'],
        ['enemy_d',           '/assets/sprites/enemy_d.png'],
        ['ghost_kenney',      '/assets/sprites/ghost_kenney.png'],
        ['bg_floor_a',        '/assets/sprites/bg_floor_a.png'],
        ['bg_floor_b',        '/assets/sprites/bg_floor_b.png'],
        ['bg_floor_c',        '/assets/sprites/bg_floor_c.png'],
        ['bg_purple_a',       '/assets/sprites/bg_purple_a.png'],
        ['bg_purple_b',       '/assets/sprites/bg_purple_b.png'],
        ['bg_purple_c',       '/assets/sprites/bg_purple_c.png'],
      ];
      let needsLoad = false;
      for (const [key, path] of SPRITES) {
        if (!this.textures.exists(key)) { this.load.image(key, path); needsLoad = true; }
      }
      if (needsLoad) {
        await new Promise<void>(resolve => {
          this.load.once('complete', resolve);
          this.load.once('loaderror', resolve);
          this.load.start();
        });
      }

      // Músicas do DanceDance (lazy: só carrega chaves não-cached)
      const DANCE_TRACKS = ['You-Up-1', 'Twist2', 'twist', 'lonely_l'];
      let needsAudioLoad = false;
      for (const key of DANCE_TRACKS) {
        if (!this.cache.audio.exists(`dance_${key}`)) {
          this.load.audio(`dance_${key}`, `/assets/audio/${key}.mp3`);
          needsAudioLoad = true;
        }
      }
      if (needsAudioLoad) {
        await new Promise<void>(resolve => {
          this.load.once('complete', resolve);
          this.load.once('loaderror', resolve);
          this.load.start();
        });
      }

      // Carregar audioSprite de SFX em background (gated — não bloqueia se ausente)
      if (!this.cache.audio.exists('sfx')) {
        this.load.audioSprite('sfx',
          '/assets/audio/sfx.json',
          ['/assets/audio/sfx.ogg', '/assets/audio/sfx.mp3']);
        await new Promise<void>(resolve => {
          this.load.once('complete', resolve);
          this.load.once('loaderror', resolve); // não bloqueia se asset ausente
          this.load.start();
        });
      }

      // Idempotente: se já carregou modelo + abriu câmera + iniciou, vai direto.
      if (!refs.detectorReady) {
        await refs.detector.loadModel((msg) => this.statusText.setText(msg));
        this.statusText.setText(strings.loading.statusOpeningCamera);
        await refs.detector.openCamera(refs.video);
        refs.detector.start(refs.video);
        refs.markDetectorReady();
      }
      this.statusText.setText(strings.loading.statusReady);
      // Destino:
      // - Se foi passado data.next → vai pra lá
      // - Senão fluxo original: Tutorial (1ª vez) ou Calibration
      if (this.nextScene) {
        this.scene.start(this.nextScene);
        return;
      }
      const done = (() => { try { return localStorage.getItem(GAME_CONFIG.storageKeys.tutorialDone) === 'true'; } catch { return false; } })();
      this.scene.start(done ? 'Calibration' : 'Tutorial');
    } catch (err) {
      const kind = this.classifyError(err);
      const errorRoot = document.getElementById('screen-error');
      if (errorRoot) {
        showError(errorRoot, kind, () => {
          errorRoot.classList.add('hidden');
          errorRoot.setAttribute('aria-hidden', 'true');
          this.scene.start('Welcome');
        });
      }
    }
  }

  private classifyError(err: unknown): ErrorKind {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') return 'cameraDenied';
      if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'cameraNotFound';
      if (err.name === 'SecurityError') return 'insecureContext';
    }
    if (err instanceof Error && /fetch|network|loading/i.test(err.message)) return 'modelDownload';
    return 'generic';
  }
}
