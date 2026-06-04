import { NodeEvent } from './node-event';

export interface NodeLayout {
  x: number;
  y: number;
}

export interface NodeDefinition {
  id: string;
  title: string;
  icon?: string;
  layout?: NodeLayout;
  event: NodeEvent;
}
