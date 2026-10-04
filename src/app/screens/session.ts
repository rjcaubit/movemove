import { h, clear, icon, ring, COLORS } from '../ui/dom.ts';
import { navigate } from '../router.ts';
import { appState, type ChallengeSpec } from '../state.ts';
import { CameraView } from '../ui/cameraView.ts';
import { createFigure, type GuideFigure } from '../ui/figure.ts';
import { getPoseRuntime } from '../../pose/runtime.ts';
import { detectIssueFor, FramingStabilizer, type FramingIssue, type FramingMode } from '../../pose/bodyFraming.ts';
import type { PoseFrame } from '../../pose/types.ts';
import { DETECTORS, HOLD_DETECTORS, type HoldDetector, type RepDetector } from '../../game/systems/exerciseRepDetectors.ts';
import { getExercise, type Exercise } from '../services/catalog.ts';
import { CHALLENGE_MIN_AMPLITUDE, SessionRunner, summarize, type SessionConfig } from '../services/sessionRunner.ts';
import { Coach } from '../services/coach.ts';
import { ISSUE_TEXT, LINES, blockIntro, restNext, exerciseLines, generalLines } from '../services/voiceLines.ts';
import { voicePack } from '../services/voicePack.ts';
import { fmtClock, fmtClock2 } from '../services/format.ts';
import { loadPrefs, saveLastWorkout, savePrefs } from '../services/prefs.ts';
import { PoseDetector } from '../../pose/poseDetector.ts';
import { addHistory } from '../services/history.ts';
import { workoutTitle } from '../services/generateWorkout.ts';
import {
  challengeId, challengeShortLabel, compareMarks, formatMark, markFromRunner, optionsToTarget,
  recordMark, sessionForChallenge, upsertChallenge,
} from '../services/challenges.ts';

type Stage = 'prepare' | 'countdown' | 'run';
type ViewKey = 'prepare' | 'rest' | 'run' | 'run-land';


const COUNTDOWN_MS = 3000;
const LANDSCAPE_MQ = '(min-width: 1024px), (orientation: landscape) and (min-width: 700px)';

/** Nome amigável pra câmera a partir do label do sistema. */
export function cameraName(label: string, i: number): { name: string; hint: string } {
  const l = label.toLowerCase();
  const back = /back|rear|traseira|environment|facing back/.test(l);
  const front = /front|frontal|user|facing front|facetime/.test(l);
  const ultra = /ultra|0[.,]5|grande[- ]angular/.test(l);
  const tele = /tele/.test(l);
  let name = back ? 'Traseira' : front ? 'Frontal' : `Câmera ${i + 1}`;
  if (ultra) name += ' ultra-angular';
  else if (tele) name += ' zoom';
  const hint = ultra ? 'Mais aberta: cabe o corpo inteiro mais perto' : back ? 'Você não se vê na tela; siga a voz' : '';
  return { name, hint };
}

function isDebug(): boolean {
  try { return new URLSearchParams(location.search).get('debug') === '1'; } catch { return false; }
}

function cameraErrorText(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Você bloqueou a câmera. Libere o acesso nas configurações do navegador e tente de novo.';
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'Não encontramos uma câmera neste aparelho.';
    if (err.name === 'SecurityError') return 'A câmera só funciona em conexão segura (https).';
  }
  return 'Não deu pra ligar a câmera agora. Confira a conexão e tente de novo.';
}

export function sessionScreen(root: HTMLElement): () => void {
  const req = appState.session;
  if (!req) { queueMicrotask(() => navigate('/', true)); return () => {}; }

  const isChallenge = req.kind === 'challenge';
  const spec: ChallengeSpec | null = req.kind === 'challenge' ? req.spec : null;
  const config: SessionConfig = req.kind === 'workout'
    ? { blocks: req.workout.blocks, restMs: req.workout.restMs }
    : sessionForChallenge(req.spec);
  const runner = new SessionRunner(config);
  const runtime = getPoseRuntime();
  const prefs = loadPrefs();
  const coach = new Coach(prefs.voz);
  const debug = isDebug();
  const cam = new CameraView();
  const stabilizer = new FramingStabilizer(1500);
  const mq = window.matchMedia(LANDSCAPE_MQ);

  let stage: Stage = 'prepare';
  let framingMode: FramingMode = modeFor(0);
  let countdownStart = 0;
  let lastIssue: FramingIssue | 'init' = 'init';
  let lastIssueSpokenAt = 0;
  let stability = 0;
  let cameraFailed = false;
  let disposed = false;
  let overlay: HTMLElement | null = null;
  let repDet: RepDetector | null = null;
  let holdDet: HoldDetector | null = null;
  let lastRepAmp: number | null = null;
  let lastRepCounted = true;
  let lastRepAt = 0;
  let everHeld = false;
  let wasHolding = false;
  let viewKey: ViewKey | null = null;
  let figures: GuideFigure[] = [];
  let refs: Record<string, HTMLElement | SVGElement> = {};
  let ringCtl: ReturnType<typeof ring> | null = null;
  let rafId: number | null = null;
  let debugHold = false;

  const shell = h('div', { class: 'sess' });
  root.append(shell);

  function exAt(i: number): Exercise | undefined {
    const b = config.blocks[i];
    return b ? getExercise(b.exerciseId) : undefined;
  }
  function modeFor(i: number): FramingMode {
    return exAt(i)?.camera === 'lateral' ? 'floor' : 'standing';
  }

  // ---------------------------------------------------------------- câmera
  const camOpts = (deviceId: string): { wide: boolean; portrait: boolean; deviceId?: string } =>
    ({ wide: true, portrait: window.innerHeight > window.innerWidth, deviceId: deviceId || undefined });
  let mirrored = true;
  const onCameraReady = (): void => {
    if (disposed) return;
    cam.attach(runtime.video.srcObject as MediaStream | null);
    const active = runtime.detector.activeCamera();
    mirrored = active?.front ?? true;
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

  const unsubFrame = runtime.onFrame((f) => onFrame(f));

  function onFrame(f: PoseFrame): void {
    cam.setFrame(f);
    if (stage === 'prepare') { handlePrepare(f); return; }
    if (stage !== 'run' || runner.phase !== 'exercise' || runner.paused) return;
    if (holdDet) {
      const holding = holdDet.process(f);
      applyHold(holding, holdDet.liveAmplitude);
    } else if (repDet && repDet.process(f)) {
      onRep(repDet.lastAmplitude);
    }
  }

  function handlePrepare(f: PoseFrame): void {
    let issue = detectIssueFor(framingMode, f, cam.visibleRect());
    // Sem espelho (câmera traseira), esquerda/direita da tela invertem pra pessoa.
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
  }

  function beginCountdown(): void {
    if (stage !== 'prepare') return;
    stage = 'countdown';
    countdownStart = performance.now();
    coach.say(LINES.start);
  }

  // ---------------------------------------------------------------- blocos
  function setupBlock(): void {
    const ex = exAt(runner.index);
    repDet = null;
    holdDet = null;
    lastRepAmp = null;
    lastRepCounted = true;
    everHeld = false;
    wasHolding = false;
    if (!ex) return;
    if (ex.tipo === 'tempo') holdDet = (HOLD_DETECTORS[ex.detector] ?? HOLD_DETECTORS.plank)();
    else repDet = (DETECTORS[ex.detector] ?? DETECTORS.squat)();
  }

  function announceBlock(): void {
    const ex = exAt(runner.index);
    if (!ex) return;
    coach.say(blockIntro(ex));
  }

  function onRep(amplitude: number): void {
    const rec = runner.rep(amplitude);
    if (!rec) return;
    lastRepAmp = amplitude;
    lastRepCounted = rec.counted;
    lastRepAt = performance.now();
    const ex = exAt(runner.index);
    if (!ex) return;
    const good = amplitude >= CHALLENGE_MIN_AMPLITUDE;
    coach.onRep(good ? 'good' : 'shallow', good ? ex.dicas.bom : ex.dicas.raso, lastRepAt);
    const big = refs.count as HTMLElement | undefined;
    if (big) { big.classList.remove('pop'); void big.getBoundingClientRect(); big.classList.add('pop'); }
  }

  function applyHold(holding: boolean, quality: number): void {
    runner.hold(holding, quality);
    if (holding) everHeld = true;
    if (wasHolding && !holding) {
      const ex = exAt(runner.index);
      if (ex) coach.onRep('shallow', ex.dicas.raso, performance.now());
    }
    wasHolding = holding;
  }

  runner.on((e) => {
    if (e.type === 'phase' && e.phase === 'rest') {
      const next = exAt(runner.index + 1);
      if (next) coach.say(restNext(next));
      repDet = null; holdDet = null;
    } else if (e.type === 'phase' && e.phase === 'exercise') {
      setupBlock();
      const mode = modeFor(runner.index);
      if (mode !== framingMode) {
        // Muda o posicionamento da câmera (ex: exercícios no chão): nova preparação.
        framingMode = mode;
        stage = 'prepare';
        stabilizer.reset();
        lastIssue = 'init';
        runner.pause();
        coach.say(mode === 'floor' ? LINES.toFloor : LINES.toStanding);
      } else {
        announceBlock();
      }
    } else if (e.type === 'done') {
      finish(false);
    }
  });

  // ---------------------------------------------------------------- fim
  function finish(aborted: boolean): void {
    if (disposed) return;
    const summary = summarize(runner);
    const hadActivity = summary.totalReps > 0 || runner.results.some((r) => r.holdMs > 0);
    coach.say(aborted ? LINES.aborted : isChallenge ? LINES.challengeDone : LINES.workoutDone);
    if (req!.kind === 'workout') {
      if (aborted && !hadActivity) { navigate('/', true); return; }
      const w = req!.workout;
      const at = Date.now();
      saveLastWorkout(w);
      addHistory({
        id: `h${at.toString(36)}`, kind: 'treino', at, title: workoutTitle(w.options),
        durationMs: summary.durationMs, reps: summary.totalReps, amplitude: summary.amplitude, options: w.options,
        blocks: summary.blocks.map((b) => ({ exerciseId: b.exerciseId, reps: b.reps, holdMs: b.holdMs, amplitude: b.amplitude, skipped: b.skipped })),
      });
      // Marca do desafio "treino inteiro" (só reps com boa amplitude).
      if (!aborted) recordMark({ exercicio: 'treino', modo: 'treino_total', alvo: optionsToTarget(w.options, w.seed) }, summary.validReps);
      appState.lastWorkoutOutcome = { workout: w, summary, at };
      navigate('/resumo', true);
      return;
    }
    // Desafio
    const r = req as Extract<typeof req, { kind: 'challenge' }>;
    const marca = aborted && r.spec.modo !== 'max_reps' && r.spec.modo !== 'segurar' ? null : markFromRunner(r.spec.modo, runner);
    const isRecord = marca !== null && recordMark(r.spec, marca);
    const at = Date.now();
    if (marca !== null) {
      let resultLabel = isRecord ? 'recorde pessoal' : 'sua marca';
      if (r.incoming) {
        const cmp = compareMarks(r.spec.modo, marca, r.incoming.marca);
        resultLabel = cmp > 0 ? `venceu ${r.incoming.nome}` : cmp < 0 ? `perdeu pra ${r.incoming.nome}` : `empatou com ${r.incoming.nome}`;
      }
      addHistory({
        id: `h${at.toString(36)}`, kind: 'desafio', at, title: `Desafio · ${challengeShortLabel(r.spec)}`,
        durationMs: summary.durationMs, reps: summary.totalReps, amplitude: summary.amplitude,
        resultLabel, markLabel: formatMark(r.spec.modo, marca), record: isRecord,
      });
    }
    if (r.incoming) {
      upsertChallenge({ id: challengeId(r.incoming, 'recebido'), dir: 'recebido', at, payload: r.incoming, minhaMarca: marca ?? undefined });
    }
    appState.challengeOutcome = { spec: r.spec, incoming: r.incoming, marca, record: isRecord, summary };
    if (r.purpose === 'mark') { appState.challengeDraft = r.spec; navigate('/desafios/novo', true); }
    else navigate('/desafio-resultado', true);
  }

  // ---------------------------------------------------------------- overlays
  function closeOverlay(): void { overlay?.remove(); overlay = null; }

  function showPause(): void {
    if (overlay) return;
    runner.pause();
    const endLabel = isChallenge ? 'Encerrar desafio' : 'Encerrar treino';
    overlay = h('div', { class: 'overlay' },
      h('div', { class: 'sheet' },
        h('div', { class: 'h2' }, 'Pausado'),
        h('div', { class: 'body' }, isChallenge ? 'O tempo do desafio está parado.' : 'Respira. O treino continua de onde parou.'),
        h('button', { class: 'btn btn-primary', on: { click: () => { closeOverlay(); runner.resume(); } } }, 'Continuar'),
        h('button', { class: 'btn btn-secondary', style: 'border:1px solid var(--mm-line)', on: { click: () => { closeOverlay(); runner.finish(); finish(true); } } }, endLabel),
      ));
    shell.append(overlay);
  }

  function showCameraError(err: unknown): void {
    closeOverlay();
    overlay = h('div', { class: 'overlay' },
      h('div', { class: 'sheet' },
        h('div', { class: 'h2' }, 'Câmera indisponível'),
        h('div', { class: 'body' }, cameraErrorText(err)),
        h('button', { class: 'btn btn-primary', on: { click: () => { closeOverlay(); startCamera(); } } }, 'Tentar de novo'),
        debug ? h('button', { class: 'btn btn-secondary', style: 'border:1px solid var(--mm-line)', on: { click: () => { closeOverlay(); beginCountdown(); } } }, 'Continuar sem câmera (debug)') : null,
        h('button', { class: 'btn btn-ghost', on: { click: () => navigate(isChallenge ? '/desafios' : '/', true) } }, 'Voltar'),
      ));
    shell.append(overlay);
  }

  // ---------------------------------------------------------------- views
  function currentViewKey(): ViewKey {
    if (stage !== 'run') return 'prepare';
    if (runner.phase === 'rest') return 'rest';
    return mq.matches ? 'run-land' : 'run';
  }

  function mountView(key: ViewKey): void {
    for (const f of figures) f.destroy();
    figures = [];
    refs = {};
    ringCtl = null;
    const keepOverlay = overlay;
    clear(shell);
    shell.className = `sess${key === 'run-land' ? ' land' : ''}`;
    if (key === 'prepare') buildPrepare();
    else if (key === 'rest') buildRest();
    else if (key === 'run') buildRun();
    else buildRunLand();
    if (keepOverlay) shell.append(keepOverlay);
    viewKey = key;
  }

  function buildPrepare(): void {
    const floor = framingMode === 'floor';
    cam.el.className = 'cam';
    refs.outline = h('div', { class: `prep-outline${floor ? ' floor' : ''}` });
    refs.pill = h('div', { class: 'pill neutral' }, 'Ligando a câmera…');
    refs.dots = h('div', { class: 'dots' }, h('div'), h('div'), h('div'));
    refs.countdown = h('div', { class: 'countdown' });
    shell.append(
      cam.el,
      refs.outline,
      h('div', { class: 'prep-head' },
        h('div', { class: 't' }, floor ? 'Câmera baixa, de lado' : 'Entre no contorno'),
        h('div', { class: 'sub' }, floor
          ? 'Apoie o celular no chão, a uns 2 metros, de lado pra você. Corpo inteiro na tela.'
          : 'Corpo inteiro visível, da cabeça aos pés.'),
      ),
      h('div', { class: 'prep-mid' }, refs.pill, refs.dots),
      h('div', { class: 'prep-foot' },
        h('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:flex-start' },
          h('div', { style: 'display:flex;gap:8px' },
            h('button', { class: 'fit-btn', on: { click: () => { void showCameraPicker(); } } }, 'Câmera'),
            fitToggle('fit-btn')),
          h('span', null, 'Começa sozinho quando a posição estiver boa')),
        h('button', { class: 'icon-btn glass', 'aria-label': 'Fechar', on: { click: () => (runner.index > 0 || runner.totalActiveMs > 0 ? showPause() : navigate(isChallenge ? '/desafios' : '/')) } }, icon.close()),
      ),
      refs.countdown,
    );
  }

  function buildRest(): void {
    const next = exAt(runner.index + 1);
    const cur = exAt(runner.index);
    const fig = createFigure(next?.poseKeyframes ?? 'squat', { size: 150 });
    figures.push(fig);
    refs.big = h('div', { class: 'big' });
    const changesCamera = !!next && !!cur && next.camera !== cur.camera;
    shell.append(h('div', { class: 'rest' },
      h('div', { class: 'eyebrow', style: 'font-size:13px' }, 'descanso'),
      refs.big,
      h('div', { class: 'next card card-lg' },
        h('div', { class: 'hd' },
          h('div', { class: 'small' }, `Próximo · ${runner.index + 2} de ${config.blocks.length}`),
          h('div', { class: 'h2' }, next?.nome ?? ''),
        ),
        fig.el,
        h('div', { class: 'body', style: 'text-align:center' }, next?.instrucao ?? ''),
      ),
      h('div', { class: 'foot' },
        changesCamera ? h('div', { class: 'note' }, next!.camera === 'lateral'
          ? 'O próximo é no chão: apoie o celular baixo, de lado pra você.'
          : 'O próximo é em pé: volte a câmera pra frente, corpo inteiro na tela.') : null,
        h('button', { class: 'btn btn-secondary', on: { click: () => runner.skip() } }, 'Pular descanso'),
      ),
    ));
  }

  function runTexts(): { name: string; meta: string } {
    const ex = exAt(runner.index);
    const n = config.blocks.length;
    let meta: string;
    if (spec?.modo === 'reps_tempo' || spec?.modo === 'segurar') meta = `Desafio · ${fmtClock(runner.phaseElapsed)}`;
    else if (spec?.modo === 'max_reps') meta = `Desafio · ${fmtClock2(runner.phaseRemainingMs)} restantes`;
    else meta = `${runner.index + 1} de ${n} · ${fmtClock2(runner.totalRemainingMs)} restantes`;
    return { name: ex?.nome ?? '', meta };
  }

  function buildRun(): void {
    const ex = exAt(runner.index);
    cam.el.className = 'cam';
    const fig = createFigure(ex?.poseKeyframes ?? 'squat', { size: 120 });
    figures.push(fig);
    ringCtl = ring(44, 5, 'rgba(255,255,255,.14)');
    refs.meta = h('div', { class: 's-meta' });
    refs.name = h('div', { class: 's-name' });
    refs.segs = h('div', { class: 'segs' }, ...config.blocks.map(() => h('div')));
    refs.count = h('div', { class: 'big' });
    refs.of = h('div', { class: 'of' });
    refs.cue = h('div', { class: 't' });
    refs.cueSub = h('div', { class: 'sub' });
    shell.append(
      cam.el,
      h('div', { class: 'shade-top' }),
      h('div', { class: 'shade-bot' }),
      h('div', { class: 's-top' },
        h('div', { class: 'bar-row' },
          h('button', { class: 'icon-btn sm glass', 'aria-label': 'Encerrar', on: { click: showPause } }, icon.close()),
          refs.meta,
          h('button', { class: 'icon-btn sm glass', 'aria-label': 'Pausar', on: { click: showPause } }, icon.pause()),
        ),
        refs.segs,
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:12px' }, refs.name, fitToggle('fit-btn')),
      ),
      h('div', { class: 's-count' }, refs.count, refs.of),
      h('div', { class: 's-guide' }, fig.el, h('div', { class: 'eyebrow' }, 'guia')),
      h('div', { class: 's-cue' }, ringCtl.el, h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, refs.cue, refs.cueSub)),
      h('div', { class: 's-skip' }, h('button', { class: 'btn btn-glass', on: { click: () => skipOrEnd() } }, isChallenge ? 'Encerrar desafio' : 'Pular exercício')),
    );
  }

  function buildRunLand(): void {
    const ex = exAt(runner.index);
    cam.el.className = 'cam';
    const fig = createFigure(ex?.poseKeyframes ?? 'squat', { size: 240, stroke: 3.5 });
    figures.push(fig);
    ringCtl = ring(72, 7, COLORS.track);
    refs.meta = h('div', { class: 'small', style: 'font-size:13px' });
    refs.name = h('div', { class: 'land-name' });
    refs.instr = h('div', { class: 'body' });
    refs.count = h('span', { class: 'big' });
    refs.of = h('span', { class: 'small', style: 'font-size:16px' });
    refs.countLabel = h('div', { class: 'small' });
    refs.ampPct = h('div', { style: 'font-size:28px;font-weight:500' });
    refs.ampGoal = h('div', { class: 'small' });
    refs.time = h('div', { class: 'mid' });
    refs.after = h('div', { class: 'small' });
    refs.cue = h('div', { class: 'land-cue' });
    shell.append(
      h('div', { class: 'land-col' },
        h('div', { class: 'title-row', style: 'gap:12px' },
          h('button', { class: 'icon-btn sm', 'aria-label': 'Encerrar', on: { click: showPause } }, icon.close()),
          refs.meta),
        h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, h('div', { class: 'eyebrow' }, 'agora'), refs.name),
        h('div', { class: 'land-guide' }, fig.el, h('div', { class: 'eyebrow' }, 'faça assim')),
        refs.instr,
      ),
      h('div', { class: 'land-cam' }, cam.el, refs.cue,
        h('div', { style: 'position:absolute;right:16px;top:16px' }, fitToggle('fit-btn')),
        h('div', { class: 'land-skip' }, h('button', { class: 'btn btn-glass', on: { click: () => skipOrEnd() } }, isChallenge ? 'Encerrar' : 'Pular exercício'))),
      h('div', { class: 'land-col' },
        h('div', { style: 'display:flex;justify-content:flex-end' },
          h('button', { class: 'icon-btn sm', 'aria-label': 'Pausar', on: { click: showPause } }, icon.pause())),
        h('div', { class: 'land-card' }, refs.countLabel, h('div', { style: 'display:flex;align-items:baseline;gap:8px' }, refs.count, refs.of)),
        h('div', { class: 'land-card', style: 'gap:16px' },
          h('div', { class: 'small' }, 'Amplitude desta rep'),
          h('div', { style: 'display:flex;align-items:center;gap:16px' }, ringCtl.el,
            h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, refs.ampPct, refs.ampGoal))),
        h('div', { class: 'land-card', style: 'flex:1' }, h('div', { class: 'small' }, 'Tempo'), refs.time, refs.after),
      ),
    );
  }

  /** Lista as câmeras do aparelho e troca na hora. */
  async function showCameraPicker(): Promise<void> {
    if (overlay) return;
    const cams = await PoseDetector.listCameras();
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
      const on = d.deviceId === activeId;
      list.append(h('button', { class: `option${on ? ' is-on' : ''}`, on: { click: () => choose(d.deviceId) } },
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

  /** Alterna entre ver o quadro inteiro e preencher a tela. */
  function fitToggle(cls: string): HTMLElement {
    const label = (): string => (cam.effectiveFit() === 'contain' ? 'Preencher tela' : 'Ver mais');
    const btn = h('button', {
      class: cls, 'aria-label': 'Alternar enquadramento da câmera',
      on: {
        click: () => {
          cam.setFit(cam.effectiveFit() === 'contain' ? 'cover' : 'contain');
          btn.textContent = label();
        },
      },
    }, label());
    refs.fitBtn = btn;
    return btn;
  }

  function skipOrEnd(): void {
    if (isChallenge) { runner.finish(); finish(true); return; }
    runner.skip();
  }

  // ---------------------------------------------------------------- update
  const setText = (key: string, text: string): void => {
    const el = refs[key];
    if (el && el.textContent !== text) el.textContent = text;
  };

  function updatePrepare(now: number): void {
    const pill = refs.pill as HTMLElement | undefined;
    const outline = refs.outline as HTMLElement | undefined;
    if (stage === 'countdown') {
      const left = COUNTDOWN_MS - (now - countdownStart);
      setText('countdown', left > 0 ? String(Math.ceil(left / 1000)) : 'Vai!');
      if (pill) { pill.className = 'pill good'; pill.textContent = 'Posição boa'; }
      outline?.classList.add('ok');
      if (left <= -400) startRun();
      return;
    }
    setText('countdown', '');
    if (pill) {
      if (cameraFailed) { pill.className = 'pill neutral'; pill.textContent = 'Câmera indisponível'; }
      else if (!runtime.isRunning) { pill.className = 'pill neutral'; pill.textContent = 'Ligando a câmera…'; }
      else if (lastIssue === 'init') { pill.className = 'pill neutral'; pill.textContent = 'Procurando você…'; }
      else if (lastIssue) { pill.className = 'pill'; pill.textContent = ISSUE_TEXT[lastIssue]; }
      else { pill.className = 'pill good'; pill.textContent = 'Boa, segura assim'; }
    }
    outline?.classList.toggle('ok', lastIssue === null);
    const dots = refs.dots as HTMLElement | undefined;
    if (dots) Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', stability > i / 3 + 0.01 || (lastIssue === null && i === 0)));
  }

  function startRun(): void {
    if (stage !== 'countdown') return;
    const first = runner.totalActiveMs === 0 && runner.index === 0;
    stage = 'run';
    if (first) setupBlock();
    runner.resume();
    announceBlock();
  }

  function updateRun(): void {
    const ex = exAt(runner.index);
    const block = runner.block;
    const res = runner.result;
    if (!ex || !block || !res) return;
    const { name, meta } = runTexts();
    setText('meta', meta);
    setText('name', name);
    setText('instr', ex.instrucao);
    const segs = refs.segs as HTMLElement | undefined;
    if (segs) Array.from(segs.children).forEach((d, i) => { d.className = i < runner.index ? 'done' : i === runner.index ? 'now' : ''; });

    const isHold = ex.tipo === 'tempo';
    const now = performance.now();
    if (isHold) {
      setText('count', fmtClock(res.holdMs));
      setText('of', runner.holding ? 'segurando' : spec?.modo === 'segurar' ? 'segure a posição' : `de ${fmtClock(block.durationMs)}`);
      setText('countLabel', 'Segurando');
    } else {
      setText('count', String(res.reps));
      const target = block.targetReps;
      setText('of', target ? `${viewKey === 'run-land' ? '/ ' + target : `de ${target} repetições`}` : 'repetições');
      setText('countLabel', 'Repetições');
    }

    // Amplitude + dica
    let ampValue: number;
    let color: string;
    let cue: string;
    let sub: string;
    if (isHold) {
      const q = runner.holdQuality;
      ampValue = q;
      const ok = runner.holding;
      color = ok ? COLORS.good : everHeld ? COLORS.warn : COLORS.skeleton;
      cue = ok ? ex.dicas.bom : everHeld ? ex.dicas.raso : 'Entre na posição';
      sub = `alinhamento ${Math.round(q * 100)}%`;
    } else if (lastRepAmp === null) {
      ampValue = repDet?.liveAmplitude ?? 0;
      color = COLORS.skeleton;
      cue = 'Acompanhe o guia';
      sub = `amplitude ${Math.round(ampValue * 100)}%`;
    } else {
      ampValue = lastRepAmp;
      const good = lastRepAmp >= CHALLENGE_MIN_AMPLITUDE;
      color = good ? COLORS.good : COLORS.warn;
      cue = good ? ex.dicas.bom : ex.dicas.raso;
      sub = `amplitude ${Math.round(lastRepAmp * 100)}%${lastRepCounted ? '' : ' · não contou'}`;
    }
    ringCtl?.set(ampValue, color);
    setText('cue', cue);
    setText('cueSub', sub);
    setText('ampPct', `${Math.round(ampValue * 100)}%`);
    setText('ampGoal', `meta ${Math.round(CHALLENGE_MIN_AMPLITUDE * 100)}%`);
    const cueEl = refs.cue as HTMLElement | undefined;
    if (cueEl) cueEl.style.color = color === COLORS.skeleton ? '#fff' : color;

    // Tempo
    if (spec?.modo === 'reps_tempo' || spec?.modo === 'segurar') setText('time', fmtClock(runner.phaseElapsed));
    else setText('time', fmtClock(runner.phaseRemainingMs));
    const after = exAt(runner.index + 1);
    setText('after', after ? `Depois: ${after.nome}` : isChallenge ? 'Desafio' : 'Último exercício');

    // Esqueleto: articulações-chave em laranja quando a última rep foi rasa.
    const det = holdDet ?? repDet;
    const shallow = isHold ? everHeld && !runner.holding : lastRepAmp !== null && lastRepAmp < CHALLENGE_MIN_AMPLITUDE && now - lastRepAt < 3000;
    cam.setStyle({ color: COLORS.skeleton, highlight: shallow && det ? { joints: det.focusJoints, color: COLORS.warn } : null });
  }

  function updateRest(): void {
    setText('big', String(Math.ceil(runner.phaseRemainingMs / 1000)));
  }

  let lastExerciseKey = '';
  function frame(now: number): void {
    if (disposed) return;
    if (stage === 'run') runner.tick(now);
    if (disposed) return;
    const fb = refs.fitBtn as HTMLElement | undefined;
    if (fb) { const t = cam.effectiveFit() === 'contain' ? 'Preencher tela' : 'Ver mais'; if (fb.textContent !== t) fb.textContent = t; }
    const key = currentViewKey();
    const exKey = `${runner.index}:${runner.phase}`;
    if (key !== viewKey || exKey !== lastExerciseKey) {
      mountView(key);
      lastExerciseKey = exKey;
    }
    if (stage !== 'run') {
      cam.setStyle({ color: lastIssue === null ? COLORS.good : COLORS.skeleton });
      updatePrepare(now);
    } else if (runner.phase === 'rest') updateRest();
    else if (runner.phase === 'exercise') updateRun();
    rafId = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- debug
  const onKey = (e: KeyboardEvent): void => {
    if (!debug) return;
    if (e.key === 'r') onRep(0.9);
    else if (e.key === 's') onRep(0.55);
    else if (e.key === 'h') { debugHold = !debugHold; applyHold(debugHold, debugHold ? 0.9 : 0.3); }
    else if (e.key === 'p' && stage === 'prepare') { closeOverlay(); beginCountdown(); }
    else if (e.key === 'n') runner.skip();
  };
  window.addEventListener('keydown', onKey);
  const onMq = (): void => { if (stage === 'run' && runner.phase === 'exercise') mountView(currentViewKey()); };
  mq.addEventListener('change', onMq);

  // Pausa se o app for pro fundo.
  const onVis = (): void => { if (document.hidden && stage === 'run' && runner.phase !== 'done') showPause(); };
  document.addEventListener('visibilitychange', onVis);

  mountView('prepare');
  startCamera();
  // Baixa já os áudios deste treino (durante a Preparação) pra não ter atraso na fala.
  void voicePack.preload([
    ...generalLines(),
    ...config.blocks.flatMap((b) => { const ex = getExercise(b.exerciseId); return ex ? exerciseLines(ex) : []; }),
  ]);
  rafId = requestAnimationFrame(frame);
  // Relógio independente do rAF (que pode ser estrangulado): o tempo do treino
  // continua certo mesmo se a pintura atrasar.
  const clock = window.setInterval(() => {
    if (disposed) return;
    const now = performance.now();
    if (stage === 'run') runner.tick(now);
    else if (stage === 'countdown' && now - countdownStart > COUNTDOWN_MS + 400) startRun();
  }, 200);

  return () => {
    disposed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    window.clearInterval(clock);
    unsubFrame();
    window.removeEventListener('keydown', onKey);
    mq.removeEventListener('change', onMq);
    document.removeEventListener('visibilitychange', onVis);
    for (const f of figures) f.destroy();
    cam.destroy();
    coach.stop();
    runtime.stop();
    appState.session = null;
  };
}

