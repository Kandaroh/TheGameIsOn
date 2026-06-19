import { promises as fs } from 'fs';
import path from 'path';
import { Companion } from '../models/companion';

/**
 * Loads the companion catalogue from companions.json.
 * The file is read once and cached for the process lifetime.
 */
export class CompanionService {
  private readonly filePath = path.resolve(__dirname, '../../data/static/companions.json');
  private cache: Companion[] | null = null;

  async getAll(): Promise<Companion[]> {
    if (this.cache) {
      return this.cache;
    }

    const raw = await fs.readFile(this.filePath, 'utf8');
    const parsed = JSON.parse(raw) as Companion[];
    this.cache = parsed;
    return parsed;
  }
}
