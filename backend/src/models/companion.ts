import { Card } from './card';
import { CardElement } from './card';
import { StatusEffect } from './battle-state';

export type SpecialAbilityTrigger = 'passive' | 'activable';

export type PassiveModifierType =
  | 'bonus_damage'
  | 'bonus_shield'
  | 'cost_reduction'
  | 'conditional_bonus'
  | 'retaliation';

export interface PassiveCondition {
  /** Which field to check: 'card.type', 'card.element', 'target.hpPercent' */
  field: string;
  /** Comparison operator */
  op: 'eq' | 'neq' | 'lt' | 'gt' | 'lte' | 'gte';
  /** Value to compare against */
  value: string | number;
}

export interface PassiveModifier {
  type: PassiveModifierType;
  value: number;
  /** Optional condition — e.g. "card.type === 'attack'" */
  condition?: PassiveCondition;
}

export interface SpecialAbility {
  id: string;
  name: string;
  description: string;
  trigger: SpecialAbilityTrigger;
  /** Max uses per combat. null = unlimited (passive). */
  usesPerCombat: number | null;
  effectId: string;
  /** Data-driven modifier applied during card play or enemy turn. */
  modifier?: PassiveModifier;
}

export interface CompanionPriceDecks {
  common: Card[];
  uncommon: Card[];
  rare: Card[];
}

export interface Companion {
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
  /** EXP required to reach the next level. Computed by LevelingService. */
  nextLevelExp?: number;
    /** Ordered level thresholds at which the player picks a new ability (e.g. [1, 13, 36]). */
  abilityUnlockLevels: number[];
  /** Full menu of possible abilities the player can choose from. */
  abilityPool: SpecialAbility[];
  /** Runtime: chosen abilities (0–3). Starts empty, grows as the player picks. */
  specialAbilities: SpecialAbility[];
  statusEffects?: StatusEffect[];
}
