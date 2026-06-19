import { Player } from './player';
import { Graph } from './graph';
import { Card } from './card';
import { Companion, SpecialAbility } from './companion';
import { BattleState } from './battle-state';

export interface PendingAbilityChoice {
  companionId: string;
  companionName: string;
  /** The unlock slot index (0, 1, or 2) being filled. */
  unlockIndex: number;
  /** 3 abilities randomly drawn from the companion's abilityPool (minus already chosen). */
  options: SpecialAbility[];
}

export interface GameState {
  player: Player;
  graph: Graph;
  cards: Card[];
  companions: Companion[];
  history: string[];
    /** Present and active while the player is inside a battle encounter. */
  battle?: BattleState;
  /** Pending ability choices the player must resolve before continuing. */
  pendingAbilityChoices?: PendingAbilityChoice[];
}
