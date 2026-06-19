import { PlayerModel } from './player.model';
import { GraphModel } from './graph.model';
import { CardModel } from './card.model';
import { CompanionModel, SpecialAbility } from './companion.model';
import { BattleStateModel } from './battle-state.model';

export interface PendingAbilityChoice {
  companionId: string;
  companionName: string;
  unlockIndex: number;
  options: SpecialAbility[];
}

export interface GameStateModel {
  player: PlayerModel;
  graph: GraphModel;
  cards: CardModel[];
  companions?: CompanionModel[];
  history: string[];
    /** Present and active while the player is inside a battle encounter. */
  battle?: BattleStateModel;
  /** Pending ability choices the player must resolve before continuing. */
  pendingAbilityChoices?: PendingAbilityChoice[];
}
