import { NodeDefinition } from '../models/node';
import { NodeEventType, MapArea } from '../models/node-event';

interface MapGenerationOptions {
  minNodes?: number;
  maxNodes?: number;
  minLayers?: number;
  maxLayers?: number;
}

const nodeIcons: Record<string, string> = {
  start: '🏁',
  end: '🏁',
  battle: '⚔️',
  'hard battle': '💀',
  'new object': '🪄',
  'power up': '⚡',
  treasure: '🎁',
  rest: '🛌'
};

export class MapGeneratorService {
    /**
   * Map areas assigned in order of progression.
   * Layer depth is divided into equal buckets; each bucket maps to one zone.
   */
  private static readonly AREA_PROGRESSION: MapArea[] = [
    'forest',
    'dungeon',
    'ruins',
    'volcano',
  ];

  /** Returns the zone for an intermediate layer index (0-based, excludes start/end). */
  private areaForLayer(layerIndex: number, totalIntermediateLayers: number): MapArea {
    const areas  = MapGeneratorService.AREA_PROGRESSION;
    const bucket = Math.min(
      Math.floor((layerIndex / totalIntermediateLayers) * areas.length),
      areas.length - 1
    );
    return areas[bucket];
  }

  generate(options: MapGenerationOptions = {}): { nodes: NodeDefinition[]; edges: Array<{ from: string; to: string }> } {
    const totalNodes = this.randomInt(options.minNodes ?? 20, options.maxNodes ?? 24);
    const layerCount = this.randomInt(options.minLayers ?? 5, options.maxLayers ?? 7);
    const intermediateNodes = totalNodes - 2;
    const layerSizes = this.distributeNodes(intermediateNodes, layerCount - 2);
    const intermediateLayers = layerCount - 2; // excludes start + end
    const layers: NodeDefinition[][] = [];

    layers.push([this.buildNode('start', 'Start', 'start', { x: 50, y: 0 })]);

    let nodeIndex = 1;
    for (let layer = 1; layer < layerCount - 1; layer++) {
      const count        = layerSizes[layer - 1];
      const y            = Math.round((layer * 100) / (layerCount - 1));
      const area         = this.areaForLayer(layer - 1, intermediateLayers);
      const layerNodes   = Array.from({ length: count }, (_, index) => {
        const eventType = this.randomEventType();
        return this.buildNode(
          `node-${nodeIndex++}`,
          `${this.nodeTitle(eventType)} ${nodeIndex}`,
          eventType,
          this.positionForLayer(index, count, y),
          area
        );
      });
      layers.push(layerNodes);
    }

    layers.push([this.buildNode('end', 'End', 'end', { x: 50, y: 100 })]);

    const edges: Array<{ from: string; to: string }> = [];
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const sourceLayer = layers[layer];
      const targetLayer = layers[layer + 1];

      // prefer connecting to nearby nodes (by x position)
      sourceLayer.forEach(source => {
        const targets = this.pickNearestTargets(source, targetLayer, 1, Math.min(2, targetLayer.length));
        targets.forEach(target => edges.push({ from: source.id, to: target.id }));
      });

      // ensure every target has at least one incoming edge
      targetLayer.forEach(target => {
        const incoming = edges.some(edge => edge.to === target.id);
        if (!incoming) {
          const source = this.randomPick(sourceLayer);
          edges.push({ from: source.id, to: target.id });
        }
      });
    }

    this.addExtraConnections(layers, edges);

    const nodes = layers.flat();
    return { nodes, edges };
  }

    private buildNode(
    id: string,
    title: string,
    eventType: string,
    layout: { x: number; y: number },
    area?: MapArea
  ): NodeDefinition {
    return {
      id,
      title,
      icon: nodeIcons[eventType] || '◯',
      layout,
      event: {
        type: eventType === 'start' ? 'start' : eventType === 'end' ? 'end' : eventType,
        ...(area ? { area } : {}),
      }
    };
  }

  private nodeTitle(eventType: NodeEventType): string {
    switch (eventType) {
      case 'battle':
        return 'Battle';
      case 'hard battle':
        return 'Hard Battle';
      case 'new object':
        return 'New Object';
      case 'power up':
        return 'Power Up';
      case 'treasure':
        return 'Treasure';
      case 'rest':
        return 'Rest';
      default:
        return 'Node';
    }
  }

  private randomEventType(): NodeEventType {
    const choice = Math.random();
    if (choice < 0.55) return 'battle';
    if (choice < 0.75) return 'treasure';
    if (choice < 0.85) return 'rest';
    if (choice < 0.93) return 'hard battle';
    if (choice < 0.97) return 'new object';
    return 'power up';
  }

  private positionForLayer(index: number, count: number, y: number) {
    const x = count === 1 ? 50 : 15 + (70 * index) / (count - 1);
    return { x, y };
  }

  private distributeNodes(total: number, layers: number) {
    const base = Math.floor(total / layers);
    const remainder = total % layers;
    return Array.from({ length: layers }, (_, index) => base + (index < remainder ? 1 : 0));
  }

  private randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomSubset<T>(items: T[], minItems: number, maxItems: number): T[] {
    const count = this.randomInt(minItems, maxItems);
    const copy = [...items];
    const results: T[] = [];
    while (results.length < count && copy.length) {
      const index = this.randomInt(0, copy.length - 1);
      results.push(copy.splice(index, 1)[0]);
    }
    return results;
  }

  private randomPick<T>(items: T[]): T {
    const index = this.randomInt(0, items.length - 1);
    return items[index];
  }

  private addExtraConnections(layers: NodeDefinition[][], edges: Array<{ from: string; to: string }>) {
    for (let layerIndex = 0; layerIndex < layers.length - 2; layerIndex++) {
      const sourceLayer = layers[layerIndex];
      const targetLayer = layers[layerIndex + 2];
      sourceLayer.forEach(source => {
        if (Math.random() < 0.18) {
          // prefer nearby targets for skip-layer connections to avoid long cross-links
          const candidates = this.pickNearestTargets(source, targetLayer, 1, Math.min(2, targetLayer.length));
          if (candidates.length > 0) {
            const target = candidates[0];
            edges.push({ from: source.id, to: target.id });
          }
        }
      });
    }
  }

  private pickNearestTargets(source: NodeDefinition, targets: NodeDefinition[], min: number, max: number) {
    const sorted = targets.slice().sort((a, b) => {
      const ax = a.layout?.x ?? 0;
      const bx = b.layout?.x ?? 0;
      const sx = source.layout?.x ?? 0;
      return Math.abs(ax - sx) - Math.abs(bx - sx);
    });
    const k = Math.max(min, Math.min(max, sorted.length));
    return sorted.slice(0, k);
  }
}
