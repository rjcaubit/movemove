import { i18n } from '@lingui/core';

const t = (s: string): string => i18n._(s);

const pick = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];

export const narratorLines = {
  firstJack: (): string => pick([t('Boa! Manda ver!'), t('Isso aí!'), t('Continua assim!')]),
  comboJack: (n: number): string => `${n} ${t('polichinelos! Tá voando!')}`,
  energyLow: (): string => pick([t('Vamos lá! Acelera!'), t('Não para agora!'), t('Tá quase!')]),
  missionComplete: (): string => pick([t('Missão concluída!'), t('Mandou bem!'), t('Mais uma na conta!')]),
  gameOver: (): string => pick([t('Foi nada! Tenta de novo.'), t('Quase! Bora de novo?'), t('Você consegue!')]),
  bichoCaught: (): string => pick([t('Pegou!'), t('Boa!'), t('Mais um!')]),
  trunkHit: (side: 'L' | 'R'): string => side === 'L' ? t('Esquerda!') : t('Direita!'),
  bellOnBeat: (): string => pick([t('No tempo!'), t('Boa!'), t('Manda ver!')]),
  guidedNext: (game: string): string => `${t('Próximo:')} ${game}`,
};
