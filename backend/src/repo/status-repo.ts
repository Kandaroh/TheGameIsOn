import { promises as fs } from 'fs';
import path from 'path';
import { StatusTriggerMoment } from '../models/battle-state';

/**
 * Static definition of a status effect (read from status-definitions.json).
 * This is the *template*; runtime instances live as StatusEffect on targets.
 */
export interface StatusEffectDefinition {
  id: string;
  name: string;
  icon: string;
  triggerMoment: StatusTriggerMoment;
  /** CardEffect id resolved each tick (e.g. damage effect for poison). */
  tickEffectId: string;
  /** How many stacks are removed after each tick. */
  decayPerTick: number;
  description: string;
}

/**
 * Reads and caches `status-definitions.json`.
 * The cache is populated on first access and held for the process lifetime.
 */
export class StatusRepository {
  private readonly filePath = path.resolve(
    __dirname,
    '../../data/static/status-definitions.json'
  );

  private cache: Map<string, StatusEffectDefinition> | null = null;

  async getAll(): Promise<StatusEffectDefinition[]> {
    const map = await this.ensureCache();
    return Array.from(map.values());
  }

  async getById(id: string): Promise<StatusEffectDefinition | undefined> {
    const map = await this.ensureCache();
    return map.get(id);
  }

  // ---------------------------------------------------------------------------

  private async ensureCache(): Promise<Map<string, StatusEffectDefinition>> {
    if (this.cache) {
      return this.cache;
    }

    let defs: StatusEffectDefinition[] = [];
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      defs = JSON.parse(raw) as StatusEffectDefinition[];
    } catch {
      defs = [];
    }

    this.cache = new Map(defs.map(d => [d.id, d]));
    return this.cache;
  }
}
