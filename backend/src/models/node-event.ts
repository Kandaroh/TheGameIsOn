export type NodeEventType =
  | 'battle'
  | 'treasure'
  | 'rest'
  | 'hard battle'
  | 'new object'
  | 'power up'
  | 'start'
  | 'end';

export interface NodeEvent {
  type: NodeEventType | string;
  payload?: Record<string, unknown>;
}
