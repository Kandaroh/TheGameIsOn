import { NodeModel } from './node.model';

export interface GraphModel {
  nodes: NodeModel[];
  edges: Array<{ from: string; to: string }>;
}
