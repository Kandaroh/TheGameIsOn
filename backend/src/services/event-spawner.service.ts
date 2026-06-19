import { NodeDefinition } from '../models/node';
import { EventRepository } from '../repo/event-repo';
import { EventDefinition } from '../models/event-definition';

export interface EventSpec {
  name: string;
  min: number;
  max: number | null;
}

export class EventSpawnerService {
  private eventRepo = new EventRepository();

  /** Return legacy-shaped specs derived from the static JSON definitions. */
  async getSpecs(): Promise<EventSpec[]> {
    const defs = await this.eventRepo.getAll();
    return defs.map(d => ({
      name: d.type,
      min:  d.spawnRules.min,
      max:  d.spawnRules.max,
    }));
  }

  async validateCount(eventType: string, count: number): Promise<{ valid: boolean; reason?: string }> {
    const def = await this.eventRepo.getByType(eventType);
    if (!def) return { valid: false, reason: 'unknown event type' };
    const { min, max } = def.spawnRules;
    if (max !== null && count > max) return { valid: false, reason: `exceeds max ${max}` };
    if (count < min) return { valid: false, reason: `below min ${min}` };
    return { valid: true };
  }

  /**
   * Assign events to nodes while enforcing spawn caps read from events.json.
   * Nodes whose event count exceeds max are demoted to 'battle';
   * under-represented types are promoted from 'battle' nodes.
   */
  async assignEvents(nodes: NodeDefinition[]): Promise<NodeDefinition[]> {
    const defs = await this.eventRepo.getAll();
    // Build a lookup: event type -> spawn rules
    const rulesMap = new Map<string, { min: number; max: number | null }>();
    for (const d of defs) {
      rulesMap.set(d.type, { min: d.spawnRules.min, max: d.spawnRules.max });
    }

    // Count existing events
    const counts: Record<string, number> = {};
    nodes.forEach(n => {
      const t = n.event?.type ?? 'battle';
      counts[t] = (counts[t] || 0) + 1;
    });

    // Ensure max caps: demote excess to 'battle'
    for (const [type, rules] of rulesMap.entries()) {
      if (rules.max === null) continue;
      const current = counts[type] || 0;
      if (current > rules.max) {
        let toRemove = current - rules.max;
        for (const node of nodes) {
          if (toRemove <= 0) break;
          if (node.event?.type === type) {
            node.event.type = 'battle';
            counts[type] -= 1;
            counts['battle'] = (counts['battle'] || 0) + 1;
            toRemove -= 1;
          }
        }
      }
    }

    // Ensure min caps: promote 'battle' nodes into under-represented types
    for (const [type, rules] of rulesMap.entries()) {
      const current = counts[type] || 0;
      if (current < rules.min) {
        let need = rules.min - current;
        for (const node of nodes) {
          if (need <= 0) break;
          if ((node.event?.type ?? 'battle') === 'battle' && node.id !== 'start' && node.id !== 'end') {
            node.event = { type } as any;
            counts[type] = (counts[type] || 0) + 1;
            counts['battle'] = Math.max((counts['battle'] || 0) - 1, 0);
            need -= 1;
          }
        }
      }
    }

    return nodes;
  }
}
