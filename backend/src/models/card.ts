export type CardTarget = 'companion' | 'wildMonster' | 'deck' | 'discard';
export type CardTargetNumber = 1 | 2 | 'ALL';
export type CardElement = 'fire' | 'water' | 'earth' | 'air' | 'arcane' | 'shadow' | 'light' | 'neutral';

/** Inline effect descriptor stored on the card (description only). */
export interface CardEffectRef {
  description: string;
}

export interface Card {
  id: string;
  name: string;
  cost: number;
  type: 'attack' | 'defense' | 'utility';
  element?: CardElement;
  description?: string;
  sprite?: string;
  target?: CardTarget;
  targetNumber?: CardTargetNumber;
  properties?: Record<string, unknown>;
  /** Points to a CardEffect record in card-effects.json. */
  effectId?: string;
  /** Points to the enhanced variant in card-effects.json. */
  enhancedEffectId?: string;
  /** Inline effect description (mirrors CardEffect.description for display). */
  effect?: CardEffectRef;
  /** Inline enhanced effect description. */
  enhancedEffect?: CardEffectRef;
}
