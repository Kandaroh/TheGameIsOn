import { Player } from './player';
import { Graph } from './graph';
import { Card } from './card';
import { Companion } from './companion';
import { BattleState } from './battle-state';

export interface GameState {
  player: Player;
  graph: Graph;
  cards: Card[];
  companions: Companion[];
  history: string[];
  /** Present and active while the player is inside a battle encounter. */
  battle?: BattleState;
}
