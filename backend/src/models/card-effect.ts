export type CardEffectAction =
  | 'damage'
  | 'shield'
  | 'evade'
  | 'evade_draw'
  | 'heal'
  | 'draw'
  | 'apply_status';

export type CardEffectTarget = 'wildMonster' | 'companion' | 'deck' | 'discard';

export interface CardEffect {
  id: string;
  description: string;
  action: CardEffectAction;
  value: number;
  target: CardEffectTarget;
  /** Status effect id to apply (only used when action === 'apply_status'). */
  statusId?: string;
}
