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
  helicopterStart: (): string => pick([t('Pula pra subir! Não deixa cair!'), t('Mantém o helicóptero no ar!'), t('Vai, piloto!')]),
  helicopterHitGround: (lives: number): string =>
    lives === 2 ? pick([t('Ai! Ainda tem 2 vidas!'), t('Cuidado! 2 restantes.')]) :
    lives === 1 ? t('Última vida! Capricha nos pulos!') : t('Voa!'),
  helicopterSurvived: (): string => pick([t('60 segundos! Voo perfeito!'), t('Piloto campeão!'), t('Mandou muito bem!')]),
  ninjaStart: (): string => pick([t('Corta as frutas! Cuidado com bombas!'), t('Vai, ninja!'), t('Mostra a katana!')]),
  ninjaSlice: (): string => pick([t('Zás!'), t('Cortou!'), t('Tá ON!')]),
  ninjaCombo: (n: number): string => `${n} ${t('combo!')}`,
  ninjaBomb: (): string => pick([t('Era bomba! Cuidado!'), t('Boom! Tomou!'), t('Não corta as bombas!')]),
  ninjaLastLife: (): string => pick([t('Última vida! Capricha!'), t('Só mais uma chance!')]),
  canoeStart: (): string => pick([t('Bora! Soquinhos rápidos pra remar!'), t('Vai, atleta! Mão E joga pra direita, mão D pra esquerda!'), t('Pedala com os braços! Junto vai pro centro!')]),
  canoeRockHit: (): string => pick([t('Cuidado!'), t('Pedra! Desvia!'), t('Ai, ai!'), t('Olho na frente!')]),
  dancePerfect: (): string => pick([t('Perfeito!'), t('No tempo!'), t('Mandou bem!')]),
  danceCombo: (n: number): string => `${n} ${t('combo!')}`,
  guidedNext: (game: string): string => `${t('Próximo:')} ${game}`,
};
