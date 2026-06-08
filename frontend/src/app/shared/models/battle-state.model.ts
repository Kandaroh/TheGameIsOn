export interface EnemyModel {
  id: string;
  name: string;
  life: number;
  maxLife: number;
  shield: number;
  energy: number;
  maxEnergy: number;
  element?: string;
  type?: string;
}

export interface BattleStateModel {
  active: boolean;
  enemies: EnemyModel[];
  turn: number;
  log: string[];
}
