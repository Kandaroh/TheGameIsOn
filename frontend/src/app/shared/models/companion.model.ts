import { CardModel } from './card.model';
import { CardElement } from './card.model';
import { StatusEffect } from './battle-state.model';

export type SpecialAbilityTrigger = 'passive' | 'activable';

export type PassiveModifierType =
  | 'bonus_damage'
  | 'bonus_shield'
  | 'cost_reduction'
  | 'conditional_bonus'
  | 'retaliation';

export interface PassiveCondition {
  field: string;
  op: 'eq' | 'neq' | 'lt' | 'gt' | 'lte' | 'gte';
  value: string | number;
}

export interface PassiveModifier {
  type: PassiveModifierType;
  value: number;
  condition?: PassiveCondition;
}

export interface SpecialAbility {
  id: string;
  name: string;
  description: string;
  trigger: SpecialAbilityTrigger;
  usesPerCombat: number | null;
  effectId: string;
  modifier?: PassiveModifier;
}

export interface CompanionPriceDecks {
  common: CardModel[];
  uncommon: CardModel[];
  rare: CardModel[];
}

export interface CompanionModel {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'utility';
  element?: CardElement;
  life: number;
  maxLife?: number;
  energy: number;
  maxEnergy?: number;
  energyRefill: number;
    sprite?: string;
  priceDecks: CompanionPriceDecks;
    level: number;
  exp: number;
  /** EXP needed to reach next level — computed by the backend. */
  nextLevelExp?: number;
    /** Ordered level thresholds at which the player picks a new ability (e.g. [1, 13, 36]). */
  abilityUnlockLevels: number[];
  /** Full menu of possible abilities the player can choose from. */
  abilityPool: SpecialAbility[];
  /** Runtime: chosen abilities (0–3). */
  specialAbilities: SpecialAbility[];
  statusEffects?: StatusEffect[];
}
