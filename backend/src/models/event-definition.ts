import { MapArea } from './node-event';

export interface MonsterSpawnConfig {
  poolFilter: {
    areas?: MapArea[];
    minLevel?: number;
    maxLevel?: number;
  };
  countMin: number;
  countMax: number;
  /** Multiplier applied to enemy base stats when spawned from this event. */
  difficultyModifier: number;
}

export interface EventSpawnRules {
  /** Minimum number of times this event must appear on a generated map. */
  min: number;
  /** Maximum occurrences; null = unlimited. */
  max: number | null;
  /** null = allowed in all areas. */
  allowedAreas: MapArea[] | null;
}

export interface EventDefinition {
  id: string;
  /** Matches NodeEventType string values used in game state. */
  type: string;
  displayName: string;
  description: string;
  icon: string;
  spawnRules: EventSpawnRules;
  /** null for non-combat events. */
  monsterSpawning: MonsterSpawnConfig | null;
  /** Human-readable rule overrides shown to the player. */
  extraRules: string[];
  notes: string;
}
