import { promises as fs } from 'fs';
import path from 'path';
import { EventDefinition } from '../models/event-definition';

export class EventRepository {
  private readonly filePath = path.resolve(
    __dirname,
    '../../data/static/events.json'
  );
  private cache: Map<string, EventDefinition> | null = null;

  async getAll(): Promise<EventDefinition[]> {
    const map = await this.ensureCache();
    return Array.from(map.values());
  }

  async getById(id: string): Promise<EventDefinition | undefined> {
    const map = await this.ensureCache();
    return map.get(id);
  }

  /** Look up by the `type` field (e.g. "hard battle"). */
  async getByType(type: string): Promise<EventDefinition | undefined> {
    const all = await this.getAll();
    return all.find(e => e.type === type);
  }

  /** Clears the in-memory cache so the next read reloads from disk. */
  clearCache(): void {
    this.cache = null;
  }

  private async ensureCache(): Promise<Map<string, EventDefinition>> {
    if (this.cache) return this.cache;
    let defs: EventDefinition[] = [];
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      defs = JSON.parse(raw) as EventDefinition[];
    } catch {
      defs = [];
    }
    this.cache = new Map(defs.map(d => [d.id, d]));
    return this.cache;
  }
}
