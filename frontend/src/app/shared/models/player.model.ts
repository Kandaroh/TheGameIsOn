import { DeckModel } from './deck.model';

export interface PlayerModel {
  id: string;
  life: number;
  mana: number;
  deck: DeckModel;
  hand: string[];
  position: string;
}
