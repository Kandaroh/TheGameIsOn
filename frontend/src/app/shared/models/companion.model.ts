import { CardModel } from './card.model';
import { CardElement } from './card.model';

export interface CompanionPriceDecks {
  common: CardModel[];
  uncommon: CardModel[];
  rare: CardModel[];
}

export interface CompanionModel {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'utility';
  element?: CardElement;
  life: number;
  maxLife?: number;
  energy: number;
  maxEnergy?: number;
  energyRefill: number;
  sprite?: string;
  priceDecks: CompanionPriceDecks;
}
