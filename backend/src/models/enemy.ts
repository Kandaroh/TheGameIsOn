import { CardElement, CardTarget, CardTargetNumber } from './card';
import { SpecialAbility } from './companion';

export interface EnemyAttack {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'utility';
  element?: CardElement;
  targeting: CardTarget;
  targetNumber: CardTargetNumber;
  effectId: string;
  /** Weight 0–1. Values are normalised at runtime; they do not need to sum to 1. */
  selectionChance: number;
}

export interface EnemyReward {
  type: 'gold' | 'exp' | 'card-draw';
  value: number;
  /** Only for card-draw: rarity tier of the killing companion's priceDeck. */
  tier?: 'common' | 'uncommon' | 'rare';
}

export interface EnemyDefinition {
  id: string;
  name: string;
  type: string;
  element?: CardElement;
  baseLife: number;
  baseEnergy: number;
  attacks: EnemyAttack[];
  spawnChance: number;
  specialAbilities: SpecialAbility[];
  spawnArea?: string;
  level: number;
  expReward: number;
  rewards: EnemyReward[];
}
