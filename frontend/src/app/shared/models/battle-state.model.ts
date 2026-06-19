import { CardModel } from './card.model';

export type StatusTriggerMoment = 'onApply' | 'turnStart' | 'turnEnd';

export interface StatusEffect {
  id: string;
  name: string;
  icon: string;
  stacks: number;
  /** Number of turns remaining; null = permanent (until stacks deplete) */
  turnsRemaining: number | null;
  triggerMoment: StatusTriggerMoment;
  effectId: string;
}

export interface EnemyTurnAction {
  enemyId: string;
  enemyName: string;
  attackName: string;
  targetId: string;
  targetName: string;
  /** Damage dealt (after shields). Negative = healing. */
  damageDealt: number;
  /** True if this action killed the target. */
  killedTarget: boolean;
}

export interface EnemyReward {
  type: 'gold' | 'exp' | 'card-draw';
  value: number;
  tier?: 'common' | 'uncommon' | 'rare';
}

export interface PendingCardReward {
  companionId: string;
  cardOptions: CardModel[];
}

export interface EnemyModel {
  id: string;
  definitionId: string;
  name: string;
  life: number;
  maxLife: number;
  shield: number;
  energy: number;
  maxEnergy: number;
  element?: string;
  type?: string;
  level: number;
  expReward: number;
  rewards: EnemyReward[];
  /** Pre-computed attack name + description summaries for card display. */
  attackSummaries?: { name: string; description: string; element?: string }[];
  killedByCompanionId?: string;
  statusEffects?: StatusEffect[];
}

export interface BattleStateModel {
  active: boolean;
  enemies: EnemyModel[];
  turn: number;
  log: string[];
  pendingCardRewards: PendingCardReward[];
  lastTurnActions?: EnemyTurnAction[];
}
