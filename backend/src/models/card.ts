export interface Card {
  id: string;
  name: string;
  cost: number;
  type: 'attack' | 'defense' | 'utility';
  properties?: Record<string, unknown>;
}
