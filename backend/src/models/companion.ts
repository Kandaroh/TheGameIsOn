import { Card } from './card';
import { CardElement } from './card';

export interface CompanionPriceDecks {
  common: Card[];
  uncommon: Card[];
  rare: Card[];
}

export interface Companion {
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
