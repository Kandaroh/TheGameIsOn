export type NodeEventType =
  | 'battle'
  | 'treasure'
  | 'rest'
  | 'hard battle'
  | 'new object'
  | 'power up'
  | 'start'
  | 'end';

export type MapArea = 'forest' | 'dungeon' | 'ruins' | 'volcano';

export interface NodeLayout {
  x: number;
  y: number;
}

export interface NodeModel {
  id: string;
  title: string;
  icon?: string;
  layout?: NodeLayout;
  event: {
    type: NodeEventType | string;
    /** Zone this node belongs to — set by the map generator. */
    area?: MapArea;
    payload?: Record<string, unknown>;
  };
}
