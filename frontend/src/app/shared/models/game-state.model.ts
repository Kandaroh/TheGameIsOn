import { PlayerModel } from './player.model';
import { GraphModel } from './graph.model';
import { CardModel } from './card.model';

export interface GameStateModel {
  player: PlayerModel;
  graph: GraphModel;
  cards: CardModel[];
  history: string[];
}
