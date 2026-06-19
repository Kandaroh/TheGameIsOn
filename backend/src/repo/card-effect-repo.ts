import { promises as fs } from 'fs';
import path from 'path';
import { CardEffect } from '../models/card-effect';

/**
 * Reads and caches the card-effects.json data file.
 * The cache is populated on first access and held for the process lifetime —
 * the file is treated as read-only at runtime.
 */
export class CardEffectRepository {
  private readonly filePath = path.resolve(
    __dirname,
    '../../data/static/card-effects.json'
  );

  private cache: Map<string, CardEffect> | null = null;

  async getAll(): Promise<CardEffect[]> {
    const map = await this.ensureCache();
    return Array.from(map.values());
  }

  async getById(id: string): Promise<CardEffect | undefined> {
    const map = await this.ensureCache();
    return map.get(id);
  }

  // ---------------------------------------------------------------------------

  private async ensureCache(): Promise<Map<string, CardEffect>> {
    if (this.cache) {
      return this.cache;
    }

    let effects: CardEffect[] = [];
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      effects = JSON.parse(raw) as CardEffect[];
    } catch {
      // File missing or malformed — start with an empty set.
      effects = [];
    }

    this.cache = new Map(effects.map(e => [e.id, e]));
    return this.cache;
  }
}
