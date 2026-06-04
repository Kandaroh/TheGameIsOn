import { NodeDefinition } from '../models/node';

export interface EventSpec {
  name: string;
  min: number;
  max: number | null; // null for unlimited
}

const EVENT_SPECS: Record<string, EventSpec> = {
  battle: { name: 'battle', min: 0, max: null },
  rest: { name: 'rest', min: 0, max: 2 },
  'hard battle': { name: 'hard battle', min: 2, max: 5 },
  'new object': { name: 'new object', min: 2, max: 4 },
  'power up': { name: 'power up', min: 3, max: 6 }
};

export class EventSpawnerService {
  getSpecs() {
    return Object.values(EVENT_SPECS);
  }

  validateCount(eventType: string, count: number) {
    const spec = (EVENT_SPECS as any)[eventType];
    if (!spec) return { valid: false, reason: 'unknown event type' };
    if (spec.max !== null && count > spec.max) return { valid: false, reason: `exceeds max ${spec.max}` };
    if (count < spec.min) return { valid: false, reason: `below min ${spec.min}` };
    return { valid: true };
  }

  // Assign events to nodes while enforcing spawn caps.
  assignEvents(nodes: NodeDefinition[]) {
    // Count existing events
    const counts: Record<string, number> = {};
    nodes.forEach(n => {
      const t = n.event?.type ?? 'battle';
      counts[t] = (counts[t] || 0) + 1;
    });

    // Ensure max caps: reduce any event exceeding its max by converting extras to 'battle'
    for (const key of Object.keys(EVENT_SPECS)) {
      const spec = (EVENT_SPECS as any)[key] as EventSpec;
      if (spec.max === null) continue;
      const current = counts[key] || 0;
      if (current > spec.max) {
        let toRemove = current - spec.max;
        for (const node of nodes) {
          if (toRemove <= 0) break;
          if (node.event?.type === key) {
            node.event.type = 'battle';
            counts[key] -= 1;
            counts['battle'] = (counts['battle'] || 0) + 1;
            toRemove -= 1;
          }
        }
      }
    }

    // Ensure min caps: promote 'battle' nodes into under-represented event types
    for (const key of Object.keys(EVENT_SPECS)) {
      const spec = (EVENT_SPECS as any)[key] as EventSpec;
      const current = counts[key] || 0;
      if (current < spec.min) {
        let need = spec.min - current;
        for (const node of nodes) {
          if (need <= 0) break;
          if ((node.event?.type ?? 'battle') === 'battle' && node.id !== 'start' && node.id !== 'end') {
            node.event = { type: key } as any;
            counts[key] = (counts[key] || 0) + 1;
            counts['battle'] = Math.max((counts['battle'] || 0) - 1, 0);
            need -= 1;
          }
        }
      }
    }

    return nodes;
  }
}
