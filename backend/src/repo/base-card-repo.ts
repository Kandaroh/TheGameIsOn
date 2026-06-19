import { promises as fs } from 'fs';
import path from 'path';
import { Card } from '../models/card';

/**
 * Reads and caches the base-cards.json data file.
 * Base cards are the element-neutral starter cards that every run begins with
 * (Strike, Shield, Dodge, …). The file is read once and held for the process
 * lifetime — it is treated as read-only at runtime.
 */
export class BaseCardRepository {
  private readonly filePath = path.resolve(
    __dirname,
    '../../data/static/base-cards.json'
  );

  private cache: Card[] | null = null;

  async getAll(): Promise<Card[]> {
    if (this.cache) {
      return this.cache;
    }

    let cards: Card[] = [];
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      cards = JSON.parse(raw) as Card[];
    } catch {
      // File missing or malformed — start with an empty set.
      cards = [];
    }

    this.cache = cards;
    return cards;
  }
}
