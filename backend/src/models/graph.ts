import { NodeDefinition } from './node';

export interface Graph {
  nodes: NodeDefinition[];
  edges: Array<{ from: string; to: string }>;
}
