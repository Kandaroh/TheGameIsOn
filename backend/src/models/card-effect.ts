export type CardEffectAction =
  | 'damage'
  | 'shield'
  | 'evade'
  | 'evade_draw'
  | 'heal'
  | 'draw';

export type CardEffectTarget = 'wildMonster' | 'companion' | 'deck' | 'discard';

export interface CardEffect {
  id: string;
  description: string;
  action: CardEffectAction;
  value: number;
  target: CardEffectTarget;
}
