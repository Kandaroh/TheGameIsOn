export type NodeEventType =
  | 'battle'
  | 'treasure'
  | 'rest'
  | 'hard battle'
  | 'new object'
  | 'power up'
  | 'start'
  | 'end';

/** Named map zones. Drives enemy pool filtering and difficulty modifiers. */
export type MapArea = 'forest' | 'dungeon' | 'ruins' | 'volcano';

export interface NodeEvent {
  type: NodeEventType | string;
  /** Zone this node belongs to — set by the map generator based on layer depth. */
  area?: MapArea;
  payload?: Record<string, unknown>;
}
