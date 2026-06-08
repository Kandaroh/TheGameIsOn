export interface Enemy {
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

export interface BattleState {
  /** True while a battle encounter is in progress. */
  active: boolean;
  enemies: Enemy[];
  turn: number;
  /** Per-battle event log, newest entries last. */
  log: string[];
}
