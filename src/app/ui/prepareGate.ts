import { h, icon, COLORS } from './dom.ts';
import { CameraView } from './cameraView.ts';
import { getPoseRuntime } from '../../pose/runtime.ts';
import { detectIssueFor, FramingStabilizer, type FramingIssue } from '../../pose/bodyFraming.ts';
import { PoseDetector } from '../../pose/poseDetector.ts';
import type { PoseFrame } from '../../pose/types.ts';
import { Coach } from '../services/coach.ts';
import { ISSUE_TEXT, LINES, generalLines } from '../services/voiceLines.ts';
import { voicePack } from '../services/voicePack.ts';
import { loadPrefs, savePrefs } from '../services/prefs.ts';
import { cameraName } from '../screens/session.ts';

/**
 * Tela "Entre no contorno" fora do treino (entrada dos jogos): mesmo visual,
 * mesma checagem de enquadramento e mesma voz da preparação do treino.
 * Deixa a câmera ligada ao liberar; quem chamou decide quando desligar.
 */
export interface PrepareGateOpts {
  onReady: () => void;
  onClose: () => void;
}

const COUNTDOWN_MS = 3000;

export function mountPrepareGate(host: HTMLElement, opts: PrepareGateOpts): () => void {
  const runtime = getPoseRuntime();
  const prefs = loadPrefs();
  const coach = new Coach(prefs.voz);
  const cam = new CameraView();
  const stabilizer = new FramingStabilizer(1500);
  const debug = (() => { try { return new URLSearchParams(location.search).get('debug') === '1'; } catch { return false; } })();

  let stage: 'prepare' | 'countdown' | 'done' = 'prepare';
  let countdownStart = 0;
  let lastIssue: FramingIssue | 'init' = 'init';
  let lastIssueSpokenAt = 0;
  let stability = 0;
  let cameraFailed = false;
  let mirrored = true;
  let disposed = false;
  let overlay: HTMLElement | null = null;
  let rafId: number | null = null;

  const outline = h('div', { class: 'prep-outline' });
  const pill = h('div', { class: 'pill neutral' }, 'Ligando a câmera…');
  const dots = h('div', { class: 'dots' }, h('div'), h('div'), h('div'));
  const countdown = h('div', { class: 'countdown' });
  const fitLabel = (): string => (cam.effectiveFit() === 'contain' ? 'Preencher tela' : 'Ver mais');
  const fitBtn = h('button', {
    class: 'fit-btn', 'aria-label': 'Alternar enquadramento da câmera',
    on: { click: () => { cam.setFit(cam.effectiveFit() === 'contain' ? 'cover' : 'contain'); } },
  }, fitLabel());

  const shell = h('div', { class: 'sess', style: 'position:fixed;z-index:15' },
    cam.el,
    outline,
    h('div', { class: 'prep-head' },
      h('div', { class: 't' }, 'Entre no contorno'),
      h('div', { class: 'sub' }, 'Corpo inteiro visível, da cabeça aos pés.')),
    h('div', { class: 'prep-mid' }, pill, dots),
    h('div', { class: 'prep-foot' },
      h('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:flex-start' },
        h('div', { style: 'display:flex;gap:8px' },
          h('button', { class: 'fit-btn', on: { click: () => { void showCameraPicker(); } } }, 'Câmera'),
          fitBtn),
        h('span', null, 'Começa sozinho quando a posição estiver boa')),
      h('button', { class: 'icon-btn glass', 'aria-label': 'Fechar', on: { click: () => opts.onClose() } }, icon.close())),
    countdown,
  );
  host.append(shell);

  const camOpts = (deviceId: string): { wide: boolean; portrait: boolean; deviceId?: string } =>
    ({ wide: true, portrait: window.innerHeight > window.innerWidth, deviceId: deviceId || undefined });

  const onCameraReady = (): void => {
    if (disposed) return;
    cam.attach(runtime.video.srcObject as MediaStream | null);
    mirrored = runtime.detector.activeCamera()?.front ?? true;
    cam.setMirrored(mirrored);
  };

  const startCamera = (): void => {
    cameraFailed = false;
    runtime.ensureStarted(undefined, camOpts(prefs.cameraId))
      .then(onCameraReady)
      .catch((err) => {
        if (disposed) return;
        cameraFailed = true;
        showCameraError(err);
      });
  };

  const unsubFrame = runtime.onFrame((f: PoseFrame) => {
    cam.setFrame(f);
    if (stage !== 'prepare') return;
    let issue = detectIssueFor('standing', f, cam.visibleRect());
    if (!mirrored && (issue === 'offLeft' || issue === 'offRight')) issue = issue === 'offLeft' ? 'offRight' : 'offLeft';
    const now = performance.now();
    stability = stabilizer.update(issue, now);
    if (issue !== lastIssue) {
      lastIssue = issue;
      if (issue && now - lastIssueSpokenAt > 2500) {
        coach.hint(ISSUE_TEXT[issue]);
        lastIssueSpokenAt = now;
      }
    }
    if (stability >= 1) beginCountdown();
  });

  function beginCountdown(): void {
    if (stage !== 'prepare') return;
    stage = 'countdown';
    countdownStart = performance.now();
    coach.say(LINES.start);
  }

  function release(): void {
    if (stage !== 'countdown') return;
    stage = 'done';
    opts.onReady();
  }

  function closeOverlay(): void { overlay?.remove(); overlay = null; }

  function showCameraError(err: unknown): void {
    closeOverlay();
    let msg = 'Não deu pra ligar a câmera agora. Confira a conexão e tente de novo.';
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') msg = 'Você bloqueou a câmera. Libere o acesso nas configurações do navegador e tente de novo.';
      else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') msg = 'Não encontramos uma câmera neste aparelho.';
      else if (err.name === 'SecurityError') msg = 'A câmera só funciona em conexão segura (https).';
    }
    overlay = h('div', { class: 'overlay' },
      h('div', { class: 'sheet' },
        h('div', { class: 'h2' }, 'Câmera indisponível'),
        h('div', { class: 'body' }, msg),
        h('button', { class: 'btn btn-primary', on: { click: () => { closeOverlay(); startCamera(); } } }, 'Tentar de novo'),
        h('button', { class: 'btn btn-ghost', on: { click: () => opts.onClose() } }, 'Voltar')));
    shell.append(overlay);
  }

  async function showCameraPicker(): Promise<void> {
    if (overlay) return;
    const cams = await PoseDetector.listCameras();
    if (disposed || overlay) return;
    const activeId = runtime.detector.activeCamera()?.deviceId ?? '';
    const list = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const choose = (id: string): void => {
      closeOverlay();
      savePrefs({ cameraId: id });
      prefs.cameraId = id;
      stabilizer.reset();
      lastIssue = 'init';
      runtime.switchCamera(camOpts(id)).then(onCameraReady).catch((err) => { if (!disposed) showCameraError(err); });
    };
    cams.forEach((d, i) => {
      const { name, hint } = cameraName(d.label, i);
      list.append(h('button', { class: `option${d.deviceId === activeId ? ' is-on' : ''}`, on: { click: () => choose(d.deviceId) } },
        h('div', { style: 'display:flex;flex-direction:column;gap:2px;text-align:left' },
          h('div', { style: 'font-size:15px;font-weight:600' }, name),
          hint ? h('div', { class: 'small' }, hint) : null),
        h('div', { class: 'radio' })));
    });
    overlay = h('div', { class: 'overlay', on: { click: (e: Event) => { if (e.target === overlay) closeOverlay(); } } },
      h('div', { class: 'sheet', style: 'max-height:80vh;overflow-y:auto' },
        h('div', { class: 'h2' }, 'Escolher câmera'),
        h('div', { class: 'body' }, cams.length > 1
          ? 'Se a imagem estiver muito perto, tente a ultra-angular ou a traseira com o celular apoiado de frente pra você.'
          : 'Só encontramos uma câmera neste aparelho.'),
        list,
        h('button', { class: 'btn btn-ghost', on: { click: closeOverlay } }, 'Fechar')));
    shell.append(overlay);
  }

  function frame(now: number): void {
    if (disposed) return;
    const fl = fitLabel();
    if (fitBtn.textContent !== fl) fitBtn.textContent = fl;
    cam.setStyle({ color: lastIssue === null ? COLORS.good : COLORS.skeleton });
    if (stage !== 'prepare') {
      const left = COUNTDOWN_MS - (now - countdownStart);
      countdown.textContent = left > 0 ? String(Math.ceil(left / 1000)) : 'Vai!';
      pill.className = 'pill good';
      pill.textContent = 'Posição boa';
      outline.classList.add('ok');
      if (left <= -400) release();
    } else {
      countdown.textContent = '';
      if (cameraFailed) { pill.className = 'pill neutral'; pill.textContent = 'Câmera indisponível'; }
      else if (!runtime.isRunning) { pill.className = 'pill neutral'; pill.textContent = 'Ligando a câmera…'; }
      else if (lastIssue === 'init') { pill.className = 'pill neutral'; pill.textContent = 'Procurando você…'; }
      else if (lastIssue) { pill.className = 'pill'; pill.textContent = ISSUE_TEXT[lastIssue]; }
      else { pill.className = 'pill good'; pill.textContent = 'Boa, segura assim'; }
      outline.classList.toggle('ok', lastIssue === null);
      Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', stability > i / 3 + 0.01 || (lastIssue === null && i === 0)));
    }
    if (!disposed) rafId = requestAnimationFrame(frame);
  }

  const onKey = (e: KeyboardEvent): void => {
    if (debug && e.key === 'p') { closeOverlay(); beginCountdown(); }
  };
  window.addEventListener('keydown', onKey);
  // O rAF pode ser estrangulado em aba de fundo: garante a liberação pelo relógio.
  const clock = window.setInterval(() => {
    if (!disposed && stage === 'countdown' && performance.now() - countdownStart > COUNTDOWN_MS + 400) release();
  }, 200);

  startCamera();
  void voicePack.preload(generalLines());
  rafId = requestAnimationFrame(frame);

  return () => {
    if (disposed) return;
    disposed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    window.clearInterval(clock);
    unsubFrame();
    window.removeEventListener('keydown', onKey);
    cam.destroy();
    if (stage !== 'done') coach.stop();
    shell.remove();
  };
}
