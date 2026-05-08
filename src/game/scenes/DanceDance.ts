import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { strings } from '../../i18n/strings.ts';
import {
  armsLateralOut, hipDropFromBaseline, hipY, bothHandsAbove,
} from '../../pose/spatialQueries.ts';
import { KP } from '../../pose/types.ts';
import { getRng } from '../systems/rng.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { Pill, addTitleBanner, addThemedFrame } from '../ui/hudStyle.ts';
import { drawPictogram, type PictoId } from '../ui/pictogram.ts';
import { getDanceSpawnMs } from './Settings.ts';

/**
 * Pool de frames curados pelo usuário (LxCy convertido pra index base-0).
 * Cada move detectável tem 1+ variantes — sorteia random no spawn.
 * Grid 13×4 (52 frames), 124×124 cada. Numeração L→R, T→B.
 */
const PICTO_POOL: Record<PictoId, number[]> = {
  arms_up:      [
    40 /* L4C2 sobe-desce braço */,
    48 /* L4C10 vira lado sobe-desce braço reto */,
    49 /* L4C11 vira outro sobe-desce braço reto */,
  ],
  arms_out:     [ 8 /* L1C9 abrir braços e girar */],
  squat:        [18 /* L2C6 mão cintura sacode quadril */],
  left_arm:     [
    10 /* L1C11 puxando bracinho */,
    13 /* L2C1 puxa braço */,
     3 /* L1C4 arco cima→baixo */,
    43 /* L4C5 cotovelada */,
    45 /* L4C7 mão no queixo */,
     9 /* L1C10 chute um lado */,
    39 /* L4C1 apontando dedo */,
  ],
  right_arm:    [
    26 /* L3C1 John Travolta */,
    14 /* L2C2 puxa braço outro */,
    42 /* L4C4 arco baixo→cima */,
    44 /* L4C6 cotovelada outro */,
    46 /* L4C8 mão queixo outro */,
    11 /* L1C12 chute outro lado */,
  ],
  jumping_jack: [
    15 /* L2C3 pulinho cabeça */,
    16 /* L2C4 pulinho cabeça outro lado */,
  ],
};
import { Narrator } from '../systems/narrator.ts';
import { narratorLines } from '../i18n/narratorLines.ts';
import type { PoseFrame } from '../../pose/types.ts';

type Phase = 'baseline' | 'play' | 'check' | 'check-done' | 'done';

const DURATION_MS = 75000;
const BASELINE_MS = 3500;
// SPAWN_INTERVAL_MS lido da config do usuário (2-10s, default 3s) — ver Settings.ts
const SLIDE_MS = 3500;            // tempo do spawn até alcançar a zona
const HOLD_MS = 1500;             // janela onde o pictograma cobra match

const MUSIC_KEYS = ['dance_You-Up-1', 'dance_Twist2', 'dance_twist', 'dance_lonely_l'];

const ZONE_X = GAME_CONFIG.width * 0.7;
const SPAWN_X = -150;
const EXIT_X = GAME_CONFIG.width + 150;
const LANE_Y = GAME_CONFIG.height / 2 + 30;

interface Move {
  id: PictoId;
  color: number;
  match: (frame: PoseFrame, baselineHipY: number) => boolean;
}

function leftArmRaised(frame: PoseFrame): boolean {
  const ls = frame.keypoints[KP.LEFT_SHOULDER];
  const lw = frame.keypoints[KP.LEFT_WRIST];
  const rs = frame.keypoints[KP.RIGHT_SHOULDER];
  const rw = frame.keypoints[KP.RIGHT_WRIST];
  if (!ls || !lw || !rs || !rw) return false;
  return lw.y < ls.y - 0.05 && rw.y > rs.y - 0.02;
}
function rightArmRaised(frame: PoseFrame): boolean {
  const ls = frame.keypoints[KP.LEFT_SHOULDER];
  const lw = frame.keypoints[KP.LEFT_WRIST];
  const rs = frame.keypoints[KP.RIGHT_SHOULDER];
  const rw = frame.keypoints[KP.RIGHT_WRIST];
  if (!ls || !lw || !rs || !rw) return false;
  return rw.y < rs.y - 0.05 && lw.y > ls.y - 0.02;
}

const MOVE_LABEL: Record<PictoId, string> = {
  arms_up: 'BRAÇOS PRA CIMA',
  arms_out: 'BRAÇOS ABERTOS',
  squat: 'AGACHA',
  left_arm: 'BRAÇO ESQUERDO',
  right_arm: 'BRAÇO DIREITO',
  jumping_jack: 'POLICHINELO',
};

const MOVE_DESC: Record<PictoId, string> = {
  arms_up: 'Levante os DOIS braços bem alto, acima dos ombros.',
  arms_out: 'Abra os braços lateralmente formando T, na altura dos ombros.',
  squat: 'Agache: dobre os joelhos e desça o quadril.',
  left_arm: 'Levante SÓ o braço esquerdo (mantenha o direito abaixado).',
  right_arm: 'Levante SÓ o braço direito (mantenha o esquerdo abaixado).',
  jumping_jack: 'Polichinelo: braços bem abertos pra cima.',
};

const MOVES: Move[] = [
  { id: 'arms_up', color: 0xffd60a, match: (f, h) => {
    const ls = f.keypoints[KP.LEFT_SHOULDER];
    if (!ls) return false;
    return bothHandsAbove(f, ls.y - 0.02) && !hipDropFromBaseline(f, h, 0.045);
  }},
  { id: 'arms_out', color: 0x4cd7e8, match: (f) => armsLateralOut(f) },
  { id: 'squat', color: 0x4cd964, match: (f, h) => hipDropFromBaseline(f, h, 0.04) },
  { id: 'left_arm', color: 0xff6a3d, match: (f) => leftArmRaised(f) },
  { id: 'right_arm', color: 0x9d6cff, match: (f) => rightArmRaised(f) },
  { id: 'jumping_jack', color: 0xff2bd6, match: (f) => {
    const ls = f.keypoints[KP.LEFT_SHOULDER];
    if (!ls) return false;
    return armsLateralOut(f) || bothHandsAbove(f, ls.y);
  }},
];

interface Card {
  move: Move;
  spawnAt: number;
  reachAt: number;   // momento em que cruza a zona (centro da janela)
  passAt: number;    // momento em que sai da zona
  resolved: boolean;
  hitFrames: number;
  totalFrames: number;
  container: Phaser.GameObjects.Container;
}

export class DanceDance extends Phaser.Scene {
  private phase: Phase = 'baseline';
  private hipBaseline = 0;
  private hipSamples: number[] = [];
  private baselineStartedAt = 0;
  private startedAt = 0;
  private nextSpawnAt = 0;
  private spawnIntervalMs = 3000;
  private musicSound: Phaser.Sound.BaseSound | null = null;
  private cards: Card[] = [];
  private prevMoveId: PictoId | null = null;
  private score = 0;
  private moves = 0;
  private combo = 0;
  private bestCombo = 0;
  private rng: () => number = Math.random;

  private checkMode = false;
  private checkQueue: Move[] = [];
  private checkResults: Array<{ id: PictoId; pictoFrame: number; matchedAtLeastOnce: boolean; hits: number; total: number; verdict: 'ok' | 'nok' }> = [];
  private checkCurrent: Move | null = null;
  private checkHits = 0;
  private checkTotal = 0;
  private checkUI: Phaser.GameObjects.Container | null = null;
  private checkLiveDot: Phaser.GameObjects.Graphics | null = null;
  private checkLiveCounter: Phaser.GameObjects.Text | null = null;
  private checkProgressEl: Phaser.GameObjects.Text | null = null;

  private feedbackEl!: Phaser.GameObjects.Text;
  private hintEl!: Phaser.GameObjects.Text;
  private barBg!: Phaser.GameObjects.Graphics;
  private barFill!: Phaser.GameObjects.Graphics;
  private zoneRing!: Phaser.GameObjects.Graphics;
  private scorePill!: Pill;
  private comboPill!: Pill;
  private timePill!: Pill;

  private unsubFrame: (() => void) | null = null;
  private narrator!: Narrator;
  private session: string[] = [];
  private backdrop: CameraBackdrop | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() { super('DanceDance'); }

  create(data?: { session?: string[] }): void {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a0214);
    this.session = data?.session ?? [];
    this.score = 0; this.moves = 0; this.combo = 0; this.bestCombo = 0;
    this.cards = [];
    this.hipSamples = [];
    this.hipBaseline = 0;
    this.prevMoveId = null;
    this.phase = 'baseline';
    this.baselineStartedAt = performance.now();
    this.startedAt = 0;
    this.nextSpawnAt = 0;
    this.spawnIntervalMs = getDanceSpawnMs();
    this.rng = getRng();

    // Modo curadoria: ativado por ?dance=check na URL
    try {
      this.checkMode = new URLSearchParams(window.location.search).get('dance') === 'check';
    } catch { this.checkMode = false; }
    this.checkResults = [];
    this.checkQueue = [];
    this.checkCurrent = null;

    addThemedFrame(this, 'dance');
    addTitleBanner(this, width / 2, 50, strings.miniGames.danceTitle, 0xff2bd6, 0xffffff);
    this.scorePill = new Pill(this, 130, 50, '0', {
      width: 200, fill: 0xff2bd6, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '💃', origin: [0.5, 0.5],
    });
    this.comboPill = new Pill(this, 130, 110, '0', {
      width: 160, height: 38, fill: 0x9d6cff, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 22, icon: '⚡', origin: [0.5, 0.5],
    });
    this.timePill = new Pill(this, width - 130, 50, `${Math.ceil(DURATION_MS / 1000)}s`, {
      width: 180, fill: 0xffd60a, stroke: 0xffffff,
      textColor: '#ffffff', fontSize: 28, icon: '⏱', origin: [0.5, 0.5],
    });

    // Pista horizontal
    const lane = this.add.graphics().setDepth(-50);
    lane.fillStyle(0xff2bd6, 0.10);
    lane.fillRect(0, LANE_Y - 130, width, 260);
    lane.lineStyle(3, 0xff2bd6, 0.4);
    lane.strokeRect(0, LANE_Y - 130, width, 260);

    // Zona ativa "AGORA"
    this.zoneRing = this.add.graphics().setDepth(-40);
    this.drawZone(0xffd60a, 0.6);
    this.add.text(ZONE_X, LANE_Y - 170, 'AGORA', {
      fontFamily: 'VT323, ui-monospace', fontSize: '22px', color: '#ffd60a',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40);

    // Barra de hold
    this.barBg = this.add.graphics().setDepth(40);
    this.barFill = this.add.graphics().setDepth(41);

    this.feedbackEl = this.add.text(width / 2, LANE_Y - 200, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '40px', color: '#ffd60a',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(45);

    this.hintEl = this.add.text(width / 2, height / 2, strings.miniGames.danceIntroBaseline, {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 5, align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5).setDepth(50);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.35);
    this.narrator = new Narrator(null, true);
    this.unsubFrame = refs.onSmoothedFrame((frame: PoseFrame) => this.handleFrame(frame));

    addBackButton(this);
  }

  private drawZone(color: number, alpha: number): void {
    this.zoneRing.clear();
    this.zoneRing.lineStyle(6, color, alpha);
    this.zoneRing.strokeRoundedRect(ZONE_X - 90, LANE_Y - 140, 180, 280, 16);
    this.zoneRing.fillStyle(color, 0.10);
    this.zoneRing.fillRoundedRect(ZONE_X - 90, LANE_Y - 140, 180, 280, 16);
  }

  private handleFrame(frame: PoseFrame): void {
    if (this.phase === 'baseline') {
      const y = hipY(frame);
      if (y !== null) this.hipSamples.push(y);
      return;
    }
    if (this.phase === 'check') {
      if (!this.checkCurrent) return;
      this.checkTotal += 1;
      const matched = this.checkCurrent.match(frame, this.hipBaseline);
      if (matched) this.checkHits += 1;
      // Atualiza UI live
      if (this.checkLiveDot) {
        this.checkLiveDot.clear();
        const c = matched ? 0x4cd964 : 0x666666;
        this.checkLiveDot.fillStyle(c, 1).fillCircle(140, 30, 22);
        this.checkLiveDot.lineStyle(3, 0xffffff, 0.9).strokeCircle(140, 30, 22);
      }
      if (this.checkLiveCounter) {
        this.checkLiveCounter.setText(`${this.checkHits} / ${this.checkTotal} frames`);
      }
      return;
    }
    if (this.phase !== 'play') return;
    // O card "ativo" é o que está na zona agora (entre reachAt - HOLD/2 e + HOLD/2)
    const now = performance.now();
    const active = this.cards.find((c) => !c.resolved
      && now >= c.reachAt - HOLD_MS / 2
      && now <= c.reachAt + HOLD_MS / 2);
    if (!active) return;
    active.totalFrames += 1;
    if (active.move.match(frame, this.hipBaseline)) active.hitFrames += 1;
  }

  private pickNextMove(): Move {
    let candidates = MOVES;
    if (this.prevMoveId) candidates = MOVES.filter((m) => m.id !== this.prevMoveId);
    const m = candidates[Math.floor(this.rng() * candidates.length)];
    this.prevMoveId = m.id;
    return m;
  }

  private spawnCard(now: number): void {
    const move = this.pickNextMove();
    let sprite: Phaser.GameObjects.Container;
    if (this.textures.exists('pictograms')) {
      const pool = PICTO_POOL[move.id];
      const frame = pool[Math.floor(this.rng() * pool.length)];
      const img = this.add.image(0, 0, 'pictograms', frame).setScale(1.4);
      // halo colorido por trás pra dar destaque
      const halo = this.add.graphics();
      halo.fillStyle(move.color, 0.22);
      halo.fillRoundedRect(-90, -110, 180, 220, 18);
      halo.lineStyle(3, move.color, 0.9);
      halo.strokeRoundedRect(-90, -110, 180, 220, 18);
      sprite = this.add.container(SPAWN_X, LANE_Y, [halo, img]);
    } else {
      sprite = drawPictogram(this, SPAWN_X, LANE_Y, move.id, {
        color: move.color, showArrows: true,
      });
    }
    sprite.setDepth(20);
    const card: Card = {
      move,
      spawnAt: now,
      reachAt: now + SLIDE_MS,
      passAt: now + SLIDE_MS + HOLD_MS / 2 + SLIDE_MS, // continua deslizando após zona
      resolved: false,
      hitFrames: 0,
      totalFrames: 0,
      container: sprite,
    };
    this.cards.push(card);
  }

  private resolveCard(card: Card): void {
    card.resolved = true;
    const ratio = card.totalFrames > 0 ? card.hitFrames / card.totalFrames : 0;
    let stars = 0; let label = ''; let color = '#ff453a';
    if (ratio >= 0.7) { stars = 3; label = '⭐⭐⭐ ' + strings.miniGames.dancePerfect; color = '#ffd60a'; }
    else if (ratio >= 0.4) { stars = 2; label = '⭐⭐ ' + strings.miniGames.danceGood; color = '#4cd964'; }
    else if (ratio >= 0.15) { stars = 1; label = '⭐ OK!'; color = '#0a84ff'; }
    else { stars = 0; label = strings.miniGames.danceMiss; color = '#ff453a'; }

    if (stars > 0) {
      this.score += stars * 50;
      this.moves += 1;
      this.combo += 1;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      if (this.combo === 5 || this.combo % 8 === 0) this.narrator.speak(narratorLines.danceCombo(this.combo), 1);
    } else {
      this.combo = 0;
    }
    this.scorePill.setText(String(this.score));
    this.comboPill.setText(String(this.combo));
    this.flashFeedback(label, color);
    // Efeito visual no card resolvido
    this.tweens.add({ targets: card.container, alpha: 0.4, duration: 150 });
  }

  private flashFeedback(text: string, color: string): void {
    this.feedbackEl.setText(text).setColor(color).setScale(0.6).setAlpha(1);
    this.tweens.add({ targets: this.feedbackEl, scale: 1, duration: 160, ease: 'Back.out' });
    this.tweens.add({ targets: this.feedbackEl, alpha: 0, duration: 700, delay: 350 });
  }

  private startMusic(): void {
    const available = MUSIC_KEYS.filter((k) => this.cache.audio.exists(k));
    if (available.length === 0) return;
    const key = available[Math.floor(this.rng() * available.length)];
    this.musicSound = this.sound.add(key, { loop: true, volume: 0.45 });
    this.musicSound.play();
  }

  private startPlay(): void {
    const sorted = [...this.hipSamples].sort((a, b) => a - b);
    this.hipBaseline = sorted[Math.floor(sorted.length / 2)] ?? 0.7;
    if (this.checkMode) {
      this.startCheck();
      return;
    }
    this.phase = 'play';
    const now = performance.now();
    this.startedAt = now;
    this.nextSpawnAt = now;
    this.hintEl.setText('');
    void this.startMusic();
  }

  private startCheck(): void {
    this.phase = 'check';
    this.checkQueue = [...MOVES];
    this.checkResults = [];
    // Esconde HUD do modo jogo
    this.scorePill.container.setVisible(false);
    this.comboPill.container.setVisible(false);
    this.timePill.container.setVisible(false);
    this.hintEl.setText('');
    this.advanceCheck();
  }

  private advanceCheck(): void {
    this.checkCurrent = this.checkQueue.shift() ?? null;
    if (!this.checkCurrent) {
      this.finishCheck();
      return;
    }
    this.checkHits = 0;
    this.checkTotal = 0;
    this.renderCheckUI();
  }

  private renderCheckUI(): void {
    if (!this.checkCurrent) return;
    if (this.checkUI) { this.checkUI.destroy(); this.checkUI = null; }
    const { width, height } = GAME_CONFIG;
    const move = this.checkCurrent;
    const pool = PICTO_POOL[move.id];
    const pictoFrame = pool[0];

    const items: Phaser.GameObjects.GameObject[] = [];

    // Header
    const header = this.add.text(0, -height / 2 + 110,
      `CURADORIA — Movimento ${MOVES.length - this.checkQueue.length} / ${MOVES.length}`, {
      fontFamily: 'VT323, ui-monospace', fontSize: '24px', color: '#ffd60a',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    items.push(header);

    // Pictograma grande
    if (this.textures.exists('pictograms')) {
      const img = this.add.image(-220, 30, 'pictograms', pictoFrame).setScale(2.0);
      const halo = this.add.graphics();
      halo.fillStyle(move.color, 0.22);
      halo.fillRoundedRect(-220 - 130, 30 - 160, 260, 320, 18);
      halo.lineStyle(4, move.color, 0.9);
      halo.strokeRoundedRect(-220 - 130, 30 - 160, 260, 320, 18);
      items.push(halo, img);
    }

    // Bloco de descrição
    const moveLabel = this.add.text(120, -100, MOVE_LABEL[move.id], {
      fontFamily: 'VT323, ui-monospace', fontSize: '36px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
      align: 'left', wordWrap: { width: 460 },
    }).setOrigin(0, 0.5);
    items.push(moveLabel);

    const moveDesc = this.add.text(120, -30, MOVE_DESC[move.id], {
      fontFamily: 'VT323, ui-monospace', fontSize: '18px', color: '#bcbcbc',
      align: 'left', wordWrap: { width: 460 },
    }).setOrigin(0, 0.5);
    items.push(moveDesc);

    // Indicador ao vivo
    this.checkLiveDot = this.add.graphics();
    this.checkLiveDot.fillStyle(0x666666, 1).fillCircle(140, 30, 22);
    this.checkLiveDot.lineStyle(3, 0xffffff, 0.9).strokeCircle(140, 30, 22);
    items.push(this.checkLiveDot);
    const liveLabel = this.add.text(180, 30, 'detecção:', {
      fontFamily: 'VT323, ui-monospace', fontSize: '18px', color: '#bcbcbc',
    }).setOrigin(0, 0.5);
    items.push(liveLabel);
    this.checkLiveCounter = this.add.text(120, 70, '0 / 0 frames', {
      fontFamily: 'VT323, ui-monospace', fontSize: '16px', color: '#8a8d92',
    }).setOrigin(0, 0.5);
    items.push(this.checkLiveCounter);

    // Botões verdict
    const okBtn = this.add.text(120, 140, '✓ FUNCIONA', {
      fontFamily: 'VT323, ui-monospace', fontSize: '22px', color: '#0b0d10',
      backgroundColor: '#4cd964', padding: { x: 18, y: 10 }, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    okBtn.on('pointerup', () => this.recordVerdict('ok'));
    items.push(okBtn);

    const nokBtn = this.add.text(320, 140, '✗ NÃO FUNCIONA', {
      fontFamily: 'VT323, ui-monospace', fontSize: '22px', color: '#ffffff',
      backgroundColor: '#ff453a', padding: { x: 18, y: 10 }, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    nokBtn.on('pointerup', () => this.recordVerdict('nok'));
    items.push(nokBtn);

    // Progress
    this.checkProgressEl = this.add.text(120, 200,
      `Faça o movimento e clique no veredito (${this.checkResults.length} de ${MOVES.length} já avaliados)`, {
      fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#8a8d92',
    }).setOrigin(0, 0.5);
    items.push(this.checkProgressEl);

    this.checkUI = this.add.container(width / 2, height / 2, items).setDepth(60);
  }

  private recordVerdict(verdict: 'ok' | 'nok'): void {
    if (!this.checkCurrent) return;
    const pool = PICTO_POOL[this.checkCurrent.id];
    this.checkResults.push({
      id: this.checkCurrent.id,
      pictoFrame: pool[0],
      matchedAtLeastOnce: this.checkHits > 0,
      hits: this.checkHits,
      total: this.checkTotal,
      verdict,
    });
    this.advanceCheck();
  }

  private finishCheck(): void {
    if (this.checkUI) { this.checkUI.destroy(); this.checkUI = null; }
    this.phase = 'check-done';
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    this.showReportModal();
  }

  private showReportModal(): void {
    const md = this.buildReportMarkdown();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.86);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:ui-monospace,monospace;';
    const card = document.createElement('div');
    card.style.cssText = 'background:#1a1a2a;color:#fff;padding:24px;border-radius:14px;max-width:92vw;max-height:92vh;display:flex;flex-direction:column;gap:14px;box-shadow:0 10px 40px rgba(0,0,0,0.5);';
    const title = document.createElement('h2');
    title.textContent = 'Relatório de Curadoria — DanceDance';
    title.style.cssText = 'margin:0;color:#ffd60a;font-size:22px;';
    card.appendChild(title);
    const ta = document.createElement('textarea');
    ta.value = md;
    ta.readOnly = true;
    ta.style.cssText = 'width:680px;max-width:84vw;height:340px;background:#0a0a14;color:#e0e0e0;padding:12px;font-family:ui-monospace,monospace;font-size:12px;border:1px solid #333;border-radius:6px;resize:vertical;';
    card.appendChild(ta);
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copiar';
    copyBtn.style.cssText = 'padding:10px 18px;background:#4cd964;color:#0b0d10;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;';
    copyBtn.onclick = (): void => {
      ta.select();
      navigator.clipboard.writeText(md).then(() => {
        copyBtn.textContent = 'Copiado!';
        setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
      }).catch(() => { /* fallback: select já feito */ });
    };
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    closeBtn.style.cssText = 'padding:10px 18px;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;';
    closeBtn.onclick = (): void => {
      overlay.remove();
      this.scene.start('MiniGamesHub');
    };
    btnRow.append(copyBtn, closeBtn);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  private buildReportMarkdown(): string {
    const lines: string[] = [];
    lines.push('# Curadoria DanceDance');
    lines.push('');
    lines.push(`Data: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('| Move | Pictograma | Detectou? | Frames | Veredito |');
    lines.push('|---|---|---|---|---|');
    for (const r of this.checkResults) {
      const verdict = r.verdict === 'ok' ? '✅ FUNCIONA' : '❌ NÃO FUNCIONA';
      const detected = r.matchedAtLeastOnce ? 'sim' : 'não';
      lines.push(`| \`${r.id}\` | frame ${r.pictoFrame} | ${detected} | ${r.hits} / ${r.total} | ${verdict} |`);
    }
    lines.push('');
    const okCount = this.checkResults.filter((r) => r.verdict === 'ok').length;
    lines.push(`**Total:** ${okCount} / ${this.checkResults.length} funcionando`);
    return lines.join('\n');
  }

  private drawHoldBar(card: Card): void {
    const x = ZONE_X - 90;
    const y = LANE_Y + 152;
    const w = 180;
    const h = 18;
    const ratio = card.totalFrames > 0 ? card.hitFrames / card.totalFrames : 0;
    this.barBg.clear();
    this.barBg.fillStyle(0x000000, 0.6);
    this.barBg.fillRoundedRect(x, y, w, h, 6);
    this.barBg.lineStyle(2, 0xffffff, 0.8);
    this.barBg.strokeRoundedRect(x, y, w, h, 6);
    this.barFill.clear();
    const fill = ratio >= 0.7 ? 0xffd60a : ratio >= 0.4 ? 0x4cd964 : ratio >= 0.15 ? 0x0a84ff : 0xff453a;
    this.barFill.fillStyle(fill, 1);
    this.barFill.fillRoundedRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, ratio)), h - 4, 5);
  }

  private clearHoldBar(): void {
    this.barBg.clear();
    this.barFill.clear();
  }

  update(): void {
    const now = performance.now();

    if (this.phase === 'baseline') {
      const remaining = Math.max(0, Math.ceil((BASELINE_MS - (now - this.baselineStartedAt)) / 1000));
      this.hintEl.setText(remaining > 0
        ? `${strings.miniGames.danceIntroBaseline}\n${remaining}…`
        : '');
      if (now - this.baselineStartedAt >= BASELINE_MS) this.startPlay();
      return;
    }
    if (this.phase !== 'play') return;

    const elapsed = now - this.startedAt;
    const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
    this.timePill.setText(`${remaining}s`);

    // Spawn fixo a cada this.spawnIntervalMs (configurável em Settings)
    if (now >= this.nextSpawnAt && elapsed < DURATION_MS - 1000) {
      this.spawnCard(now);
      this.nextSpawnAt = now + this.spawnIntervalMs;
    }

    // Atualiza posições + resolve quem passou da zona
    let activeCard: Card | null = null;
    for (const c of this.cards) {
      const tNorm = (now - c.spawnAt) / SLIDE_MS;
      c.container.x = SPAWN_X + tNorm * (ZONE_X - SPAWN_X);
      // Pulse + grow quando perto da zona
      if (now >= c.reachAt - HOLD_MS / 2 && now <= c.reachAt + HOLD_MS / 2) {
        const pulse = 1 + 0.08 * Math.sin((now / 100));
        c.container.setScale(1.25 * pulse);
        activeCard = c;
      } else {
        c.container.setScale(1);
      }
      if (!c.resolved && now > c.reachAt + HOLD_MS / 2) this.resolveCard(c);
      // Após resolvido, continua saindo de cena
      if (c.resolved) {
        const exitT = (now - (c.reachAt + HOLD_MS / 2)) / (SLIDE_MS / 2);
        c.container.x = ZONE_X + exitT * (EXIT_X - ZONE_X);
      }
    }
    // Hold bar para o card ativo
    if (activeCard) this.drawHoldBar(activeCard);
    else this.clearHoldBar();
    // Limpa cards que saíram
    this.cards = this.cards.filter((c) => {
      if (c.container.x > EXIT_X) { c.container.destroy(); return false; }
      return true;
    });

    if (elapsed >= DURATION_MS) this.finish();
  }

  private finish(): void {
    this.phase = 'done';
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.musicSound) { this.musicSound.stop(); this.musicSound = null; }
    if (this.audioCtx) { void this.audioCtx.close(); this.audioCtx = null; }
    for (const c of this.cards) c.container.destroy();
    const refs = getRefs(this);
    void refs.missions.tick({ danceMoves: this.moves });
    this.scene.start('MiniGameResult', {
      gameKey: 'DanceDance',
      score: this.score,
      scoreLabel: strings.miniGames.score,
      extra: {
        [strings.miniGames.danceMoves]: this.moves,
        [strings.miniGames.bestCombo]: this.bestCombo,
      },
      session: this.session,
    });
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    if (this.musicSound) { this.musicSound.stop(); this.musicSound = null; }
    if (this.audioCtx) { void this.audioCtx.close(); this.audioCtx = null; }
  }
}
