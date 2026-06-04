import { Player } from './player';
import { Graph } from './graph';
import { Card } from './card';

export interface GameState {
  player: Player;
  graph: Graph;
  cards: Card[];
  history: string[];
}
