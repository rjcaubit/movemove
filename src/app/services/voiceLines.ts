import { CATALOG, type Exercise } from './catalog.ts';
import type { FramingIssue } from '../../pose/bodyFraming.ts';

/**
 * Todas as frases que o app fala. Fonte única: o gerador de voz
 * (`npm run voz`) pré-grava exatamente estas frases em MP3.
 */
export const LINES = {
  start: 'Vamos lá',
  aborted: 'Treino encerrado',
  challengeDone: 'Pronto!',
  workoutDone: 'Treino concluído. Mandou bem!',
  toFloor: 'Agora no chão. Coloque a câmera baixa, de lado.',
  toStanding: 'Agora em pé, de frente pra câmera.',
} as const;

export const ISSUE_TEXT: Record<NonNullable<FramingIssue>, string> = {
  noBody: 'Apareça inteiro na câmera',
  tooFar: 'Chegue um pouco mais perto',
  tooClose: 'Se afaste um pouquinho',
  offLeft: 'Vá um pouco pra esquerda',
  offRight: 'Vá um pouco pra direita',
  headCut: 'Cabeça cortada, se afaste',
  hipCut: 'Pés cortados, se afaste',
  feetCut: 'Pés fora da tela, afaste a câmera',
};

export const blockIntro = (ex: Exercise): string => `${ex.nome}. ${ex.instrucao}`;
export const restNext = (ex: Exercise): string => `Descanso. Próximo: ${ex.nome}`;

/** Frases ligadas a um exercício (pra pré-carregar só o que o treino usa). */
export function exerciseLines(ex: Exercise): string[] {
  return [blockIntro(ex), restNext(ex), ex.dicas.raso, ex.dicas.bom];
}

export function generalLines(): string[] {
  return [...Object.values(LINES), ...Object.values(ISSUE_TEXT)];
}

export function allLines(): string[] {
  return [...new Set([...generalLines(), ...CATALOG.flatMap(exerciseLines)])];
}
