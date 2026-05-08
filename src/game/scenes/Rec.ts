import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { getRefs } from '../orchestrator.ts';
import { CameraBackdrop } from '../ui/cameraBackdrop.ts';
import { addBackButton } from '../ui/backButton.ts';
import { addTitleBanner } from '../ui/hudStyle.ts';
import {
  loadRecordedExercises, addRecordedExercise, deleteRecordedExercise,
  updateRecordedExercise, exportToJson,
  type RecordedExercise, type RecFrame,
} from '../storage/recordedExercises.ts';
import type { PoseFrame } from '../../pose/types.ts';

/** Índices MediaPipe que vamos capturar (com elbows/ankles além dos KP do enum). */
const KP_ORDER = [
  0,  // nose
  11, 12, // shoulders L/R
  13, 14, // elbows L/R
  15, 16, // wrists L/R
  23, 24, // hips L/R
  25, 26, // knees L/R
  27, 28, // ankles L/R
];

/** Pares pra desenhar o stick figure. */
const SKELETON_LINKS: Array<[number, number]> = [
  [1, 2],   // ombros
  [1, 3], [3, 5], // braço esq (ombro→cotovelo→pulso)
  [2, 4], [4, 6], // braço dir
  [7, 8],   // quadris
  [1, 7], [2, 8], // tronco lados
  [7, 9], [9, 11], // perna esq (quadril→joelho→tornozelo)
  [8, 10], [10, 12], // perna dir
];

const REC_DURATION_MS = 15000;
const COUNTDOWN_MS = 3000;
const REPS_PER_RECORDING = 5;
const RESAMPLE_FRAMES = 60;

type View = 'list' | 'record-prep' | 'record-active' | 'record-process' | 'replay' | 'form';

export class Rec extends Phaser.Scene {
  private view: View = 'list';
  private list: RecordedExercise[] = [];

  // recording state
  private recStartedAt = 0;
  private recCountdownStartedAt = 0;
  private rawFrames: Array<{ t: number; pts: { x: number; y: number; v?: number }[] }> = [];
  private currentSegmentTick = 0;
  private audioCtx: AudioContext | null = null;

  // averaged result
  private averagedFrames: RecFrame[] = [];

  // replay state
  private replayStartedAt = 0;
  private replayGraphics: Phaser.GameObjects.Graphics | null = null;

  private bigEl!: Phaser.GameObjects.Text;
  private subEl!: Phaser.GameObjects.Text;
  private repCounterEl!: Phaser.GameObjects.Text;
  private actionsContainer!: Phaser.GameObjects.Container;
  private listContainer!: Phaser.GameObjects.Container;

  private unsubFrame: (() => void) | null = null;
  private backdrop: CameraBackdrop | null = null;

  constructor() { super('Rec'); }

  async create(): Promise<void> {
    const { width, height } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(0x0a0a14);

    addTitleBanner(this, width / 2, 50, 'REC — Gravar Movimentos', 0xff453a, 0xffffff);

    this.bigEl = this.add.text(width / 2, height / 2 - 40, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '64px', color: '#ffd60a',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 6, align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5).setDepth(40);

    this.subEl = this.add.text(width / 2, height / 2 + 40, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#bcbcbc',
      stroke: '#000', strokeThickness: 2, align: 'center',
    }).setOrigin(0.5).setDepth(40);

    this.repCounterEl = this.add.text(width / 2, 140, '', {
      fontFamily: 'VT323, ui-monospace', fontSize: '24px', color: '#ffd60a',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40);

    this.actionsContainer = this.add.container(0, 0).setDepth(45);
    this.listContainer = this.add.container(0, 0).setDepth(35);

    const refs = getRefs(this);
    this.backdrop = new CameraBackdrop(this, refs.video, refs.onSmoothedFrame, 0.4);
    this.unsubFrame = refs.onSmoothedFrame((f: PoseFrame) => this.handleFrame(f));

    addBackButton(this, 'Welcome');

    await this.refreshList();
    this.showList();
  }

  private async refreshList(): Promise<void> {
    this.list = await loadRecordedExercises();
  }

  private clearActions(): void { this.actionsContainer.removeAll(true); }
  private clearList(): void { this.listContainer.removeAll(true); }

  private button(x: number, y: number, label: string, fill: number, onClick: () => void): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#0b0d10',
      backgroundColor: '#' + fill.toString(16).padStart(6, '0'),
      padding: { x: 16, y: 8 }, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerup', onClick);
    return btn;
  }

  private showList(): void {
    this.view = 'list';
    this.clearActions();
    this.clearList();
    this.bigEl.setText('');
    this.subEl.setText('');
    this.repCounterEl.setText('');

    const { width, height } = GAME_CONFIG;
    const newBtn = this.button(width / 2, 130, '⏺ GRAVAR NOVO', 0xff453a, () => this.startRecording());
    newBtn.setColor('#ffffff');
    this.actionsContainer.add(newBtn);

    if (this.list.length === 0) {
      const empty = this.add.text(width / 2, height / 2, 'Nenhum exercício gravado ainda.\nClique em "GRAVAR NOVO" pra começar!', {
        fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#bcbcbc',
        align: 'center',
      }).setOrigin(0.5);
      this.listContainer.add(empty);
      return;
    }

    // Lista de gravados
    const startY = 200;
    this.list.forEach((ex, i) => {
      const y = startY + i * 56;
      const row = this.add.container(0, 0);
      const bg = this.add.graphics();
      bg.fillStyle(0x1a1a2a, 0.85);
      bg.fillRoundedRect(width / 2 - 380, y - 22, 760, 44, 8);
      bg.lineStyle(2, 0x4cd964, 0.6);
      bg.strokeRoundedRect(width / 2 - 380, y - 22, 760, 44, 8);
      const name = this.add.text(width / 2 - 360, y, ex.name, {
        fontFamily: 'VT323, ui-monospace', fontSize: '20px', color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      const date = this.add.text(width / 2 - 60, y, new Date(ex.createdAt).toLocaleDateString(), {
        fontFamily: 'VT323, ui-monospace', fontSize: '14px', color: '#8a8d92',
      }).setOrigin(0, 0.5);
      const playBtn = this.button(width / 2 + 140, y, '▶', 0x4cd964, () => this.startReplay(ex));
      const renameBtn = this.button(width / 2 + 200, y, '✏', 0xffd60a, () => this.promptRename(ex));
      const delBtn = this.button(width / 2 + 260, y, '🗑', 0xff453a, () => this.confirmDelete(ex));
      row.add([bg, name, date, playBtn, renameBtn, delBtn]);
      this.listContainer.add(row);
    });

    // Export
    if (this.list.length > 0) {
      const exportBtn = this.button(width / 2, height - 110, '📤 EXPORTAR JSON', 0x0a84ff, () => this.exportAll());
      exportBtn.setColor('#ffffff');
      this.actionsContainer.add(exportBtn);
    }
  }

  private startRecording(): void {
    this.view = 'record-prep';
    this.clearActions();
    this.clearList();
    this.recCountdownStartedAt = performance.now();
    this.bigEl.setText('PREPARA…');
    this.subEl.setText('Posicione-se na câmera. Conta com a gente!');
    this.repCounterEl.setText('');
    this.rawFrames = [];
    this.currentSegmentTick = 0;
  }

  private playTick(strong: boolean): void {
    try {
      if (!this.audioCtx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new Ctor();
      }
      const ctx = this.audioCtx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = strong ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(strong ? 0.3 : 0.18, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.start(t); osc.stop(t + 0.1);
    } catch { /* ignore */ }
  }

  private handleFrame(frame: PoseFrame): void {
    if (this.view === 'record-active') {
      const pts = KP_ORDER.map((idx) => {
        const k = frame.keypoints[idx];
        return k ? { x: k.x, y: k.y, v: k.visibility } : { x: 0, y: 0, v: 0 };
      });
      this.rawFrames.push({ t: performance.now() - this.recStartedAt, pts });
    }
  }

  update(): void {
    const now = performance.now();
    if (this.view === 'record-prep') {
      const elapsed = now - this.recCountdownStartedAt;
      const remaining = Math.max(0, COUNTDOWN_MS - elapsed);
      const sec = Math.ceil(remaining / 1000);
      if (sec > 0) {
        this.bigEl.setText(String(sec));
      } else {
        this.bigEl.setText('GRAVANDO');
      }
      if (elapsed >= COUNTDOWN_MS + 200) {
        this.view = 'record-active';
        this.recStartedAt = performance.now();
        this.rawFrames = [];
        this.currentSegmentTick = 0;
        this.subEl.setText(`Faça ${REPS_PER_RECORDING}× o movimento no ritmo dos beeps`);
        this.playTick(true); // tick inicial
      }
    } else if (this.view === 'record-active') {
      const elapsed = now - this.recStartedAt;
      const remaining = Math.max(0, REC_DURATION_MS - elapsed);
      this.bigEl.setText(`${Math.ceil(remaining / 1000)}s`);
      // Ticks a cada 3s pra marcar ritmo das 5 reps (5 × 3s = 15s)
      const segmentMs = REC_DURATION_MS / REPS_PER_RECORDING;
      const expectedTicks = Math.floor(elapsed / segmentMs);
      while (this.currentSegmentTick < expectedTicks) {
        this.currentSegmentTick += 1;
        this.playTick(this.currentSegmentTick === REPS_PER_RECORDING);
        this.repCounterEl.setText(`${this.currentSegmentTick} / ${REPS_PER_RECORDING}`);
      }
      if (elapsed >= REC_DURATION_MS) {
        this.view = 'record-process';
        this.processRecording();
      }
    } else if (this.view === 'replay' && this.averagedFrames.length > 0) {
      const total = this.averagedFrames[this.averagedFrames.length - 1].t;
      let elapsed = (now - this.replayStartedAt) % total;
      const frame = this.lerpFrame(elapsed);
      this.drawReplayFrame(frame);
    }
  }

  private processRecording(): void {
    this.bigEl.setText('PROCESSANDO…');
    this.subEl.setText('Calculando média das repetições');
    this.repCounterEl.setText('');
    // Promove pro próximo tick pra UI atualizar
    this.time.delayedCall(50, () => {
      const segments = this.splitIntoSegments(this.rawFrames, REPS_PER_RECORDING);
      const resampled = segments.map((seg) => this.resample(seg, RESAMPLE_FRAMES));
      this.averagedFrames = this.medianAcross(resampled);
      this.startReplayPreview();
    });
  }

  private splitIntoSegments(
    frames: Array<{ t: number; pts: { x: number; y: number; v?: number }[] }>,
    nSegments: number,
  ): Array<typeof frames> {
    if (frames.length === 0) return [];
    const totalDuration = frames[frames.length - 1].t;
    const segMs = totalDuration / nSegments;
    const segments: Array<typeof frames> = Array.from({ length: nSegments }, () => []);
    for (const f of frames) {
      const idx = Math.min(nSegments - 1, Math.floor(f.t / segMs));
      const localT = f.t - idx * segMs;
      segments[idx].push({ t: localT, pts: f.pts });
    }
    return segments;
  }

  private resample(
    segment: Array<{ t: number; pts: { x: number; y: number; v?: number }[] }>,
    n: number,
  ): Array<{ t: number; pts: { x: number; y: number }[] }> {
    if (segment.length === 0) return [];
    const totalT = segment[segment.length - 1].t;
    const out: Array<{ t: number; pts: { x: number; y: number }[] }> = [];
    for (let i = 0; i < n; i++) {
      const targetT = (totalT * i) / (n - 1);
      // encontra pares de frames adjacentes
      let lo = 0;
      while (lo < segment.length - 1 && segment[lo + 1].t < targetT) lo += 1;
      const hi = Math.min(segment.length - 1, lo + 1);
      const f0 = segment[lo];
      const f1 = segment[hi];
      const span = f1.t - f0.t;
      const a = span > 0 ? (targetT - f0.t) / span : 0;
      const pts = f0.pts.map((p, k) => ({
        x: p.x + (f1.pts[k].x - p.x) * a,
        y: p.y + (f1.pts[k].y - p.y) * a,
      }));
      out.push({ t: targetT, pts });
    }
    return out;
  }

  private medianAcross(
    segments: Array<Array<{ t: number; pts: { x: number; y: number }[] }>>,
  ): RecFrame[] {
    if (segments.length === 0 || segments[0].length === 0) return [];
    const n = segments[0].length;
    const out: RecFrame[] = [];
    for (let i = 0; i < n; i++) {
      const ptsArrs: Array<{ x: number; y: number }[]> = segments.map((s) => s[i].pts);
      const numKp = ptsArrs[0].length;
      const merged: { x: number; y: number }[] = [];
      for (let k = 0; k < numKp; k++) {
        const xs = ptsArrs.map((p) => p[k].x).sort((a, b) => a - b);
        const ys = ptsArrs.map((p) => p[k].y).sort((a, b) => a - b);
        const mid = Math.floor(xs.length / 2);
        merged.push({ x: xs[mid], y: ys[mid] });
      }
      out.push({ t: segments[0][i].t, pts: merged });
    }
    return out;
  }

  private startReplayPreview(): void {
    this.view = 'replay';
    this.replayStartedAt = performance.now();
    this.bigEl.setText('');
    this.subEl.setText('Veja como ficou. Confirma se ficou bom?');
    this.repCounterEl.setText('');
    this.clearActions();
    if (this.replayGraphics) this.replayGraphics.destroy();
    this.replayGraphics = this.add.graphics().setDepth(40);

    const { width, height } = GAME_CONFIG;
    const okBtn = this.button(width / 2 - 120, height - 80, '✓ TÁ BOM', 0x4cd964, () => this.openSaveForm());
    const redoBtn = this.button(width / 2 + 120, height - 80, '↻ REGRAVAR', 0xff9f0a, () => this.startRecording());
    okBtn.setColor('#ffffff');
    redoBtn.setColor('#ffffff');
    this.actionsContainer.add([okBtn, redoBtn]);
  }

  private lerpFrame(t: number): RecFrame {
    const frames = this.averagedFrames;
    let lo = 0;
    while (lo < frames.length - 1 && frames[lo + 1].t < t) lo += 1;
    const hi = Math.min(frames.length - 1, lo + 1);
    const f0 = frames[lo];
    const f1 = frames[hi];
    const span = f1.t - f0.t;
    const a = span > 0 ? (t - f0.t) / span : 0;
    const pts = f0.pts.map((p, k) => ({
      x: p.x + (f1.pts[k].x - p.x) * a,
      y: p.y + (f1.pts[k].y - p.y) * a,
    }));
    return { t, pts };
  }

  private drawReplayFrame(frame: RecFrame): void {
    if (!this.replayGraphics) return;
    const g = this.replayGraphics;
    const { width, height } = GAME_CONFIG;
    g.clear();
    // Painel à direita (deixa câmera no fundo todo)
    const cx = width * 0.78;
    const cy = height * 0.5;
    const scale = 280;
    // Box
    g.fillStyle(0x000000, 0.6);
    g.fillRoundedRect(cx - 160, cy - 220, 320, 440, 14);
    g.lineStyle(4, 0x4cd964, 0.9);
    g.strokeRoundedRect(cx - 160, cy - 220, 320, 440, 14);
    // Header
    // Stick figure
    const xy = (i: number): { x: number; y: number } => ({
      x: cx + (frame.pts[i].x - 0.5) * scale,
      y: cy + (frame.pts[i].y - 0.5) * scale * 1.3,
    });
    g.lineStyle(6, 0x4cd964, 1);
    for (const [a, b] of SKELETON_LINKS) {
      const pa = xy(a);
      const pb = xy(b);
      g.beginPath();
      g.moveTo(pa.x, pa.y);
      g.lineTo(pb.x, pb.y);
      g.strokePath();
    }
    // Cabeça
    const head = xy(0);
    g.fillStyle(0x4cd964, 1);
    g.fillCircle(head.x, head.y, 14);
    // Junções
    g.fillStyle(0xffd60a, 1);
    for (let i = 1; i < frame.pts.length; i++) {
      const p = xy(i);
      g.fillCircle(p.x, p.y, 5);
    }
  }

  private openSaveForm(): void {
    this.view = 'form';
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:ui-monospace,monospace;';
    const card = document.createElement('div');
    card.style.cssText = 'background:#1a1a2a;color:#fff;padding:24px;border-radius:14px;max-width:92vw;width:520px;display:flex;flex-direction:column;gap:12px;';
    card.innerHTML = `<h2 style="margin:0;color:#ffd60a;font-size:22px;">Salvar exercício</h2>`;
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Nome do exercício';
    nameLabel.style.fontSize = '13px';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Ex: Polichinelo agachado';
    nameInput.style.cssText = 'background:#0a0a14;color:#fff;padding:10px;border:1px solid #333;border-radius:6px;font-size:16px;font-family:inherit;';
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Descrição (opcional)';
    descLabel.style.fontSize = '13px';
    const descInput = document.createElement('textarea');
    descInput.rows = 3;
    descInput.placeholder = 'Como executar o movimento';
    descInput.style.cssText = 'background:#0a0a14;color:#fff;padding:10px;border:1px solid #333;border-radius:6px;font-size:14px;font-family:inherit;resize:vertical;';
    card.append(nameLabel, nameInput, descLabel, descInput);
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = 'padding:10px 18px;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Salvar';
    saveBtn.style.cssText = 'padding:10px 18px;background:#4cd964;color:#0b0d10;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;';
    saveBtn.onclick = async (): Promise<void> => {
      const name = nameInput.value.trim() || `Exercício ${this.list.length + 1}`;
      const desc = descInput.value.trim();
      const ex: RecordedExercise = {
        id: `rec-${Date.now()}`,
        name, desc,
        frames: this.averagedFrames,
        durationMs: this.averagedFrames[this.averagedFrames.length - 1]?.t ?? 0,
        createdAt: Date.now(),
      };
      this.list = await addRecordedExercise(ex);
      overlay.remove();
      if (this.replayGraphics) { this.replayGraphics.clear(); }
      this.showList();
    };
    cancelBtn.onclick = (): void => {
      overlay.remove();
      if (this.replayGraphics) { this.replayGraphics.clear(); }
      this.showList();
    };
    btnRow.append(cancelBtn, saveBtn);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    nameInput.focus();
  }

  private startReplay(ex: RecordedExercise): void {
    this.view = 'replay';
    this.averagedFrames = ex.frames;
    this.replayStartedAt = performance.now();
    this.bigEl.setText(ex.name);
    this.subEl.setText(ex.desc || '');
    this.repCounterEl.setText('');
    this.clearActions();
    this.clearList();
    if (this.replayGraphics) this.replayGraphics.destroy();
    this.replayGraphics = this.add.graphics().setDepth(40);
    const { width, height } = GAME_CONFIG;
    const back = this.button(width / 2, height - 80, '← VOLTAR', 0x4cd964, () => {
      if (this.replayGraphics) { this.replayGraphics.clear(); }
      this.showList();
    });
    back.setColor('#ffffff');
    this.actionsContainer.add(back);
  }

  private promptRename(ex: RecordedExercise): void {
    const next = window.prompt('Novo nome:', ex.name);
    if (next === null) return;
    void updateRecordedExercise(ex.id, { name: next.trim() || ex.name }).then((list) => {
      this.list = list;
      this.showList();
    });
  }

  private confirmDelete(ex: RecordedExercise): void {
    if (!window.confirm(`Apagar "${ex.name}"?`)) return;
    void deleteRecordedExercise(ex.id).then((list) => {
      this.list = list;
      this.showList();
    });
  }

  private exportAll(): void {
    const json = exportToJson(this.list);
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:ui-monospace,monospace;';
    const card = document.createElement('div');
    card.style.cssText = 'background:#1a1a2a;color:#fff;padding:20px;border-radius:14px;max-width:92vw;display:flex;flex-direction:column;gap:12px;';
    const ta = document.createElement('textarea');
    ta.value = json;
    ta.readOnly = true;
    ta.style.cssText = 'width:680px;max-width:84vw;height:340px;background:#0a0a14;color:#e0e0e0;padding:12px;font-size:11px;border:1px solid #333;border-radius:6px;';
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copiar';
    copyBtn.style.cssText = 'padding:10px 18px;background:#4cd964;color:#0b0d10;border:none;border-radius:6px;cursor:pointer;font-weight:bold;';
    copyBtn.onclick = (): void => {
      ta.select(); navigator.clipboard.writeText(json).catch(() => {/*ignore*/});
      copyBtn.textContent = 'Copiado!';
      setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
    };
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    closeBtn.style.cssText = 'padding:10px 18px;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;';
    closeBtn.onclick = (): void => overlay.remove();
    btnRow.append(copyBtn, closeBtn);
    card.append(ta, btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  shutdown(): void {
    if (this.unsubFrame) { this.unsubFrame(); this.unsubFrame = null; }
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    if (this.audioCtx) { void this.audioCtx.close(); this.audioCtx = null; }
    if (this.replayGraphics) { this.replayGraphics.destroy(); this.replayGraphics = null; }
  }
}
