import { EnemyReward } from './enemy';
import { Card } from './card';

export interface StatusEffect {
  id: string;
  name: string;
  /** Number of turns remaining; null = permanent */
  turnsRemaining: number | null;
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

export interface PendingCardReward {
  companionId: string;
  /** 2–3 cards drawn from the companion's priceDeck tier; player picks one. */
  cardOptions: Card[];
}

export interface BattleEnemy {
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
  /** Set to the companion id that dealt the killing blow. */
  killedByCompanionId?: string;
  statusEffects?: StatusEffect[];
}

export interface BattleState {
  active: boolean;
  enemies: BattleEnemy[];
  turn: number;
  log: string[];
  pendingCardRewards: PendingCardReward[];
  lastTurnActions?: EnemyTurnAction[];
}
