/**
 * Catálogo de exercícios do MoveMove 2.0. Dados puros — detector e animação
 * são referenciados por chave (resolvidos em `DETECTORS`/`GUIDE_ANIMATIONS`).
 */
export type MuscleGroup = 'corpo' | 'bracos' | 'pernas' | 'core';
export type Goal = 'aquecer' | 'forca' | 'cardio' | 'alongar';
export type Equipment = 'nenhum' | 'tapete' | 'cadeira';
export type ExerciseKind = 'reps' | 'tempo';
export type CameraSetup = 'frente' | 'lateral';

export interface Exercise {
  id: string;
  nome: string;
  grupo: MuscleGroup[];
  objetivo: Goal[];
  equipamento: Equipment;
  tipo: ExerciseKind;
  /** Chave em DETECTORS (reps) ou HOLD_DETECTORS (tempo). */
  detector: string;
  /** Chave em GUIDE_ANIMATIONS. */
  poseKeyframes: string;
  /** Duração esperada de uma rep (ms) — ritmo do boneco e meta de reps. */
  ritmoMs: number;
  /** 'lateral' = no chão, câmera baixa e de lado. */
  camera: CameraSetup;
  instrucao: string;
  dicas: { raso: string; bom: string };
}

export const CATALOG: Exercise[] = [
  // --- 9 exercícios da Sessão Guiada original ---
  {
    id: 'rotacao-tronco', nome: 'Rotação de tronco', grupo: ['core'], objetivo: ['aquecer', 'alongar'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'trunkRotation', poseKeyframes: 'trunkRotation', ritmoMs: 1500, camera: 'frente',
    instrucao: 'Pés firmes na largura do quadril, gira o tronco pra direita e pra esquerda.',
    dicas: { raso: 'Gira mais', bom: 'Boa rotação' },
  },
  {
    id: 'joelho-alto', nome: 'Joelho alto', grupo: ['pernas', 'core'], objetivo: ['aquecer', 'cardio'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'highKnee', poseKeyframes: 'highKneeHandsHead', ritmoMs: 750, camera: 'frente',
    instrucao: 'Mãos na nuca, sobe um joelho de cada vez até a altura da cintura.',
    dicas: { raso: 'Joelho mais alto', bom: 'Isso, lá em cima' },
  },
  {
    id: 'cotovelo-joelho', nome: 'Cotovelo no joelho', grupo: ['core'], objetivo: ['cardio', 'aquecer'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'elbowToKnee', poseKeyframes: 'elbowToKneeSide', ritmoMs: 1100, camera: 'frente',
    instrucao: 'Levanta o joelho de lado e encosta o cotovelo do mesmo lado. Alterna.',
    dicas: { raso: 'Joelho mais alto', bom: 'Encostou, boa' },
  },
  {
    id: 'alongamento-lateral', nome: 'Alongamento lateral', grupo: ['core'], objetivo: ['alongar', 'aquecer'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'lateralLean', poseKeyframes: 'lateralStretch', ritmoMs: 1200, camera: 'frente',
    instrucao: 'Um braço pra cima, inclina pro lado oposto, volta e troca de lado.',
    dicas: { raso: 'Inclina mais', bom: 'Boa inclinação' },
  },
  {
    id: 'passada-bracos', nome: 'Passada com braços', grupo: ['pernas', 'bracos'], objetivo: ['aquecer', 'forca'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'armsUp', poseKeyframes: 'lungeArmsUp', ritmoMs: 1600, camera: 'frente',
    instrucao: 'Passo à frente e sobe os dois braços. Volta e troca de perna.',
    dicas: { raso: 'Braços mais alto', bom: 'Braços lá em cima' },
  },
  {
    id: 'meio-agachamento', nome: 'Meio agachamento lateral', grupo: ['pernas'], objetivo: ['forca', 'aquecer'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'squatCycle', poseKeyframes: 'squatLateralShift', ritmoMs: 1600, camera: 'frente',
    instrucao: 'Agacha um pouco, segura e desloca pro lado. Direita e esquerda.',
    dicas: { raso: 'Desce um pouco mais', bom: 'Boa altura' },
  },
  {
    id: 'chute-cruzado', nome: 'Chute frontal cruzado', grupo: ['pernas', 'core'], objetivo: ['cardio'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'crossKick', poseKeyframes: 'crossKick', ritmoMs: 1100, camera: 'frente',
    instrucao: 'Chuta uma perna à frente e toca o pé com a mão oposta. Alterna.',
    dicas: { raso: 'Mão mais perto do pé', bom: 'Tocou, boa' },
  },
  {
    id: 'torcao-joelho', nome: 'Torção com joelho', grupo: ['core'], objetivo: ['cardio', 'forca'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'twistKneePull', poseKeyframes: 'twistKneePull', ritmoMs: 1200, camera: 'frente',
    instrucao: 'Sobe um joelho e gira o tronco levando o cotovelo oposto até ele.',
    dicas: { raso: 'Cotovelo até o joelho', bom: 'Boa torção' },
  },
  {
    id: 'saltito-lateral', nome: 'Saltito lateral', grupo: ['corpo', 'pernas'], objetivo: ['cardio'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'lateralHop', poseKeyframes: 'lateralHopTwist', ritmoMs: 900, camera: 'frente',
    instrucao: 'Saltinhos pros lados girando o tronco. Sem impacto: marcha no lugar.',
    dicas: { raso: 'Vai mais pro lado', bom: 'Bom ritmo' },
  },
  // --- MoveMove 2.0 ---
  {
    id: 'agachamento', nome: 'Agachamento', grupo: ['pernas'], objetivo: ['forca'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'squat', poseKeyframes: 'squat', ritmoMs: 2000, camera: 'frente',
    instrucao: 'Pés na largura do quadril, desce até o joelho passar de 90° e sobe com força.',
    dicas: { raso: 'Desce mais', bom: 'Boa profundidade' },
  },
  {
    id: 'afundo', nome: 'Afundo', grupo: ['pernas'], objetivo: ['forca'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'lunge', poseKeyframes: 'lunge', ritmoMs: 2400, camera: 'frente',
    instrucao: 'Passo grande à frente, joelho de trás quase no chão. Alterne as pernas.',
    dicas: { raso: 'Joelho mais perto do chão', bom: 'Boa descida' },
  },
  {
    id: 'polichinelo', nome: 'Polichinelo', grupo: ['corpo'], objetivo: ['cardio', 'aquecer'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'jumpingJack', poseKeyframes: 'jumpingJack', ritmoMs: 1000, camera: 'frente',
    instrucao: 'Abre as pernas e sobe os braços juntos. Fecha e repete no ritmo.',
    dicas: { raso: 'Braços até em cima', bom: 'Polichinelo completo' },
  },
  {
    id: 'burpee', nome: 'Burpee', grupo: ['corpo'], objetivo: ['cardio', 'forca'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'burpee', poseKeyframes: 'burpee', ritmoMs: 4000, camera: 'frente',
    instrucao: 'Agacha, mãos no chão, pés pra trás, volta e sobe com um salto.',
    dicas: { raso: 'Desce até o chão', bom: 'Burpee completo' },
  },
  {
    id: 'panturrilha', nome: 'Elevação de panturrilha', grupo: ['pernas'], objetivo: ['forca', 'aquecer'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'calfRaise', poseKeyframes: 'calfRaise', ritmoMs: 1500, camera: 'frente',
    instrucao: 'Em pé, sobe na ponta dos pés devagar e desce controlando.',
    dicas: { raso: 'Sobe mais na ponta', bom: 'Boa subida' },
  },
  {
    id: 'flexao', nome: 'Flexão', grupo: ['bracos', 'core'], objetivo: ['forca'],
    equipamento: 'tapete', tipo: 'reps', detector: 'pushup', poseKeyframes: 'pushup', ritmoMs: 2000, camera: 'lateral',
    instrucao: 'Mãos embaixo dos ombros, corpo reto. Desce o peito até o cotovelo fazer 90°.',
    dicas: { raso: 'Desce o peito', bom: 'Boa flexão' },
  },
  {
    id: 'prancha', nome: 'Prancha', grupo: ['core', 'bracos'], objetivo: ['forca'],
    equipamento: 'tapete', tipo: 'tempo', detector: 'plank', poseKeyframes: 'plank', ritmoMs: 2000, camera: 'lateral',
    instrucao: 'Antebraços no chão, corpo reto da cabeça ao pé. Segura firme.',
    dicas: { raso: 'Alinha o quadril', bom: 'Prancha firme' },
  },
  {
    id: 'abdominal', nome: 'Abdominal', grupo: ['core'], objetivo: ['forca'],
    equipamento: 'tapete', tipo: 'reps', detector: 'crunch', poseKeyframes: 'crunch', ritmoMs: 2000, camera: 'lateral',
    instrucao: 'Deitado, joelhos dobrados. Tira os ombros do chão e volta devagar.',
    dicas: { raso: 'Sobe mais o tronco', bom: 'Boa contração' },
  },
  {
    id: 'ponte', nome: 'Ponte de glúteo', grupo: ['pernas', 'core'], objetivo: ['forca', 'alongar'],
    equipamento: 'tapete', tipo: 'reps', detector: 'gluteBridge', poseKeyframes: 'gluteBridge', ritmoMs: 2400, camera: 'lateral',
    instrucao: 'Deitado, pés no chão. Sobe o quadril até alinhar ombro, quadril e joelho.',
    dicas: { raso: 'Sobe mais o quadril', bom: 'Quadril alinhado' },
  },
  // --- Catálogo 2.1 ---
  {
    id: 'agachamento-sumo', nome: 'Agachamento sumô', grupo: ['pernas'], objetivo: ['forca', 'alongar'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'sumoSquat', poseKeyframes: 'sumoSquat', ritmoMs: 2200, camera: 'frente',
    instrucao: 'Pés bem afastados e virados pra fora. Desce reto, joelhos abrindo na direção dos pés.',
    dicas: { raso: 'Desce mais', bom: 'Boa, joelhos abertos' },
  },
  {
    id: 'agachamento-salto', nome: 'Agachamento com salto', grupo: ['pernas', 'corpo'], objetivo: ['cardio', 'forca'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'jumpSquat', poseKeyframes: 'jumpSquat', ritmoMs: 2000, camera: 'frente',
    instrucao: 'Agacha e sobe com um salto. Aterrissa macio, já descendo pro próximo.',
    dicas: { raso: 'Agacha mais antes do salto', bom: 'Salto forte' },
  },
  {
    id: 'afundo-lateral', nome: 'Afundo lateral', grupo: ['pernas'], objetivo: ['forca', 'alongar'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'lateralLunge', poseKeyframes: 'lateralLunge', ritmoMs: 1800, camera: 'frente',
    instrucao: 'Passo largo pro lado, dobra essa perna e estica a outra. Volta e troca de lado.',
    dicas: { raso: 'Vai mais pro lado', bom: 'Boa abertura' },
  },
  {
    id: 'patinador', nome: 'Patinador', grupo: ['pernas', 'corpo'], objetivo: ['cardio'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'skater', poseKeyframes: 'skater', ritmoMs: 800, camera: 'frente',
    instrucao: 'Salta de um pé pro outro pros lados, cruzando a perna de trás. Braços acompanham.',
    dicas: { raso: 'Salto mais largo', bom: 'Bom balanço' },
  },
  {
    id: 'chute-gluteo', nome: 'Chute no glúteo', grupo: ['pernas'], objetivo: ['aquecer', 'cardio'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'buttKick', poseKeyframes: 'buttKick', ritmoMs: 650, camera: 'frente',
    instrucao: 'Corrida no lugar levando o calcanhar até o bumbum. Alterna rápido.',
    dicas: { raso: 'Calcanhar mais alto', bom: 'Isso, calcanhar lá atrás' },
  },
  {
    id: 'elevacao-lateral', nome: 'Elevação lateral de braços', grupo: ['bracos'], objetivo: ['aquecer', 'forca'],
    equipamento: 'nenhum', tipo: 'reps', detector: 'lateralRaise', poseKeyframes: 'lateralRaise', ritmoMs: 2200, camera: 'frente',
    instrucao: 'Braços esticados ao lado do corpo. Sobe até a altura dos ombros e desce devagar.',
    dicas: { raso: 'Sobe até o ombro', bom: 'Braços na linha do ombro' },
  },
  {
    id: 'cadeira-isometrica', nome: 'Cadeira isométrica', grupo: ['pernas'], objetivo: ['forca'],
    equipamento: 'nenhum', tipo: 'tempo', detector: 'wallSit', poseKeyframes: 'wallSit', ritmoMs: 2000, camera: 'frente',
    instrucao: 'Costas na parede, desce até a coxa ficar paralela ao chão. Segura firme.',
    dicas: { raso: 'Desce até a coxa ficar reta', bom: 'Boa, segura aí' },
  },
  {
    id: 'escalador', nome: 'Escalador', grupo: ['core', 'corpo'], objetivo: ['cardio'],
    equipamento: 'tapete', tipo: 'reps', detector: 'mountainClimber', poseKeyframes: 'mountainClimber', ritmoMs: 600, camera: 'lateral',
    instrucao: 'Em prancha alta, puxa um joelho de cada vez em direção ao peito, rápido.',
    dicas: { raso: 'Joelho mais perto do peito', bom: 'Ritmo bom' },
  },
  {
    id: 'elevacao-pernas', nome: 'Elevação de pernas', grupo: ['core'], objetivo: ['forca'],
    equipamento: 'tapete', tipo: 'reps', detector: 'legRaise', poseKeyframes: 'legRaise', ritmoMs: 2400, camera: 'lateral',
    instrucao: 'Deitado de costas, pernas esticadas. Sobe as pernas juntas e desce sem encostar no chão.',
    dicas: { raso: 'Sobe mais as pernas', bom: 'Boa amplitude' },
  },
  {
    id: 'super-homem', nome: 'Super-homem', grupo: ['core'], objetivo: ['forca', 'alongar'],
    equipamento: 'tapete', tipo: 'reps', detector: 'superman', poseKeyframes: 'superman', ritmoMs: 2400, camera: 'lateral',
    instrucao: 'De bruços, braços esticados à frente. Tira braços e pernas do chão juntos e desce devagar.',
    dicas: { raso: 'Tira mais do chão', bom: 'Boa extensão' },
  },
  {
    id: 'prancha-lateral', nome: 'Prancha lateral', grupo: ['core'], objetivo: ['forca'],
    equipamento: 'tapete', tipo: 'tempo', detector: 'sidePlank', poseKeyframes: 'sidePlank', ritmoMs: 2000, camera: 'lateral',
    instrucao: 'Deitado de lado, apoio no antebraço. Sobe o quadril até o corpo ficar reto e segura.',
    dicas: { raso: 'Sobe o quadril', bom: 'Corpo alinhado' },
  },
  {
    id: 'triceps-cadeira', nome: 'Tríceps na cadeira', grupo: ['bracos'], objetivo: ['forca'],
    equipamento: 'cadeira', tipo: 'reps', detector: 'dip', poseKeyframes: 'dip', ritmoMs: 2000, camera: 'lateral',
    instrucao: 'Mãos na borda de uma cadeira firme, pés à frente. Dobra os cotovelos até 90° e sobe.',
    dicas: { raso: 'Desce mais, até 90°', bom: 'Boa descida' },
  },
  {
    id: 'flexao-inclinada', nome: 'Flexão inclinada', grupo: ['bracos', 'core'], objetivo: ['forca', 'aquecer'],
    equipamento: 'cadeira', tipo: 'reps', detector: 'inclinePushup', poseKeyframes: 'inclinePushup', ritmoMs: 2000, camera: 'lateral',
    instrucao: 'Mãos no assento de uma cadeira firme, corpo reto. Leva o peito até a cadeira e empurra.',
    dicas: { raso: 'Peito mais perto da cadeira', bom: 'Boa flexão' },
  },
];

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

/** Exercícios que podem virar desafio individual (nome curto e detector confiável). */
export const CHALLENGE_EXERCISES = ['agachamento', 'flexao', 'prancha', 'polichinelo', 'abdominal', 'burpee', 'afundo', 'joelho-alto', 'escalador', 'cadeira-isometrica', 'agachamento-salto'];

export const GROUP_LABEL: Record<'corpo' | 'bracos' | 'pernas' | 'core', string> = {
  corpo: 'Corpo todo', bracos: 'Braços', pernas: 'Pernas', core: 'Core',
};
export const GOAL_LABEL: Record<Goal, string> = {
  aquecer: 'Aquecer', forca: 'Força', cardio: 'Cardio', alongar: 'Alongar',
};
export const EQUIP_LABEL: Record<Equipment, string> = {
  nenhum: 'Nenhum', tapete: 'Tapete', cadeira: 'Cadeira',
};
