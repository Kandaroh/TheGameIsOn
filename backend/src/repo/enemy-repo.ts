import { promises as fs } from 'fs';
import path from 'path';
import { EnemyDefinition } from '../models/enemy';

export class EnemyRepository {
  private readonly filePath = path.resolve(
    __dirname,
    '../../data/static/enemies.json'
  );
  private cache: Map<string, EnemyDefinition> | null = null;

  async getAll(): Promise<EnemyDefinition[]> {
    const map = await this.ensureCache();
    return Array.from(map.values());
  }

  async getById(id: string): Promise<EnemyDefinition | undefined> {
    const map = await this.ensureCache();
    return map.get(id);
  }

  /**
   * Returns all enemies eligible for spawning.
   * Filtering by area / difficulty is handled upstream by EnemySpawnerService.
   */
  async getForSpawn(): Promise<EnemyDefinition[]> {
    return this.getAll();
  }

  /** Clears the in-memory cache so the next read reloads from disk. */
  clearCache(): void {
    this.cache = null;
  }

  private async ensureCache(): Promise<Map<string, EnemyDefinition>> {
    if (this.cache) return this.cache;
    let defs: EnemyDefinition[] = [];
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      defs = JSON.parse(raw) as EnemyDefinition[];
    } catch {
      defs = [];
    }
    // Validate: each enemy should have exactly 3 attacks.
    for (const def of defs) {
      if (def.attacks.length !== 3) {
        console.warn(
          `[EnemyRepository] Enemy "${def.name}" (${def.id}) has ${def.attacks.length} attack(s) — expected 3.`
        );
      }
    }

    this.cache = new Map(defs.map(d => [d.id, d]));
    return this.cache;
  }
}
