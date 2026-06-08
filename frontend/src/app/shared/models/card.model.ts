export type CardTarget = 'companion' | 'wildMonster' | 'deck' | 'discard';
export type CardTargetNumber = 1 | 2 | 'ALL';
export type CardElement = 'fire' | 'water' | 'earth' | 'air' | 'arcane' | 'shadow' | 'light' | 'neutral';

/**
 * Describes one outcome of playing a card.
 * `description` is shown on the card face.
 * Additional fields (action, value, conditions, …) can be added here
 * without touching the rest of the codebase — CardEffectService is the
 * single place that reads them.
 */
export interface CardEffect {
  description: string;
}

export interface CardModel {
  id: string;
  name: string;
  cost: number;
  description?: string;
  type: 'attack' | 'defense' | 'utility';
  element?: CardElement;
  sprite?: string;
  target?: CardTarget;
  targetNumber?: CardTargetNumber;
    properties?: Record<string, unknown>;
  /** Points to a CardEffect record in card-effects.json. */
  effectId?: string;
  /** Points to the enhanced variant in card-effects.json. */
  enhancedEffectId?: string;
  /** Effect applied when the card is played normally. */
  effect?: CardEffect;
  /** Effect applied when the playing companion's type matches the card's type. */
  enhancedEffect?: CardEffect;
}
