import { PlayerModel } from './player.model';
import { GraphModel } from './graph.model';
import { CardModel } from './card.model';
import { CompanionModel } from './companion.model';
import { BattleStateModel } from './battle-state.model';

export interface GameStateModel {
  player: PlayerModel;
  graph: GraphModel;
  cards: CardModel[];
  companions?: CompanionModel[];
  history: string[];
  /** Present and active while the player is inside a battle encounter. */
  battle?: BattleStateModel;
}
