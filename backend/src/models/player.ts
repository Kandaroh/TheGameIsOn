import { Deck } from './deck';

export interface Player {
  id: string;
  life: number;
  mana: number;
  deck: Deck;
  hand: string[];
  discard: string[];
  position: string;
}
