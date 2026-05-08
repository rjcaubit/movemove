import { i18n } from '@lingui/core';

const t = (s: string): string => i18n._(s);

const pick = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];

export const narratorLines = {
  firstJack: (): string => pick([t('Boa! Manda ver!'), t('Isso aí!'), t('Continua assim!')]),
  comboJack: (n: number): string => `${n} ${t('polichinelos! Tá voando!')}`,
  energyLow: (): string => pick([t('Vamos lá! Acelera!'), t('Não para agora!'), t('Tá quase!')]),
  missionComplete: (): string => pick([t('Missão concluída!'), t('Mandou bem!'), t('Mais uma na conta!')]),
  gameOver: (): string => pick([t('Foi nada! Tenta de novo.'), t('Quase! Bora de novo?'), t('Você consegue!')]),
  bichoCaught: (): string => pick([t('Plaft!'), t('Matou!'), t('Esmagou!'), t('Boa palmada!')]),
  lostLife: (remaining: number): string =>
    remaining === 2 ? pick([t('Ai! Cuidado!'), t('Tomou! Ainda tem 2 vidas.')]) :
    remaining === 1 ? pick([t('Última vida! Capricha!'), t('Só mais uma chance!')]) :
    t('Vai!'),
  heartCollected: (): string => pick([t('Vida extra!'), t('❤️ Coração!'), t('Recuperou uma vida!')]),
  trunkHit: (side: 'L' | 'R'): string => side === 'L' ? t('Esquerda!') : t('Direita!'),
  bellOnBeat: (): string => pick([t('No tempo!'), t('Boa!'), t('Manda ver!')]),
  chickenHit: (action: 'flap' | 'scratch'): string =>
    action === 'flap'
      ? pick([t('Asas! Boa!'), t('Voa, galinha!'), t('Cluck cluck!')])
      : pick([t('Cisca! Cisca!'), t('Boa, galinhona!'), t('Acha o milho!')]),
  chickenMiss: (): string => pick([t('Concentra!'), t('Olha o ritmo!'), t('Vai!')]),
  castorHit: (): string => pick([t('Acertou!'), t('Pow!'), t('Bum!'), t('Tá ON!')]),
  castorBadHit: (): string => pick([t('Esse não!'), t('Cuidado, não é castor!'), t('Ops! Errou o bicho!'), t('Só castor vale!')]),
  birdStart: (): string => pick([t('Pula pra voar! Não deixa cair!'), t('Mantém o passarinho no ar!')]),
  birdHitGround: (lives: number): string =>
    lives === 2 ? pick([t('Ai! Ainda tem 2 vidas!'), t('Cuidado! 2 restantes.')]) :
    lives === 1 ? t('Última vida! Capricha nos pulos!') : t('Voa!'),
  birdSurvived: (): string => pick([t('60 segundos! Incrível!'), t('Passarinho campeão!'), t('Mandou muito bem!')]),
  dancePerfect: (): string => pick([t('Perfeito!'), t('No tempo!'), t('Mandou bem!')]),
  danceCombo: (n: number): string => `${n} ${t('combo!')}`,
  guidedNext: (game: string): string => `${t('Próximo:')} ${game}`,
};
