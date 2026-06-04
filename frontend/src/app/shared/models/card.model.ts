export interface CardModel {
  id: string;
  name: string;
  cost: number;
  description?: string;
  type: 'attack' | 'defense' | 'utility';
  properties?: Record<string, unknown>;
}
