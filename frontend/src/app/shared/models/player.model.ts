import { DeckModel } from './deck.model';

export interface PlayerModel {
  id: string;
  life: number;
  mana: number;
  deck: DeckModel;
  hand: string[];
  discard: string[];
  position: string;
  gold: number;
  /** Total battle encounters started in this session. Drives enemy level scaling. */
  encounterCount: number;
}
