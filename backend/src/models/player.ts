import { Deck } from './deck';

export interface Player {
  id: string;
  life: number;
  mana: number;
  deck: Deck;
  hand: string[];
  discard: string[];
  position: string;
  gold: number;
  /** Total number of battle encounters started in this session. Drives enemy level scaling. */
  encounterCount: number;
}
