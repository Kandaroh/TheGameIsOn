export type NodeEventType = 'battle' | 'treasure' | 'rest';

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
    type: NodeEventType;
    payload?: Record<string, unknown>;
  };
}
