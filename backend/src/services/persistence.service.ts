import { promises as fs } from 'fs';
import path from 'path';
import { GameState } from '../models/game-state';
import { GameLogicService } from './game-logic.service';

export class PersistenceService {
  constructor(private readonly filePath: string) {}

      async loadState(): Promise<GameState> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(raw) as GameState;
    } catch {
      return this.defaultState();
    }
  }

  async saveState(state: GameState): Promise<void> {
    const payload = JSON.stringify(state, null, 2);
    const dir = path.dirname(this.filePath);
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(this.filePath, payload, 'utf8');
  }

    private async defaultState(): Promise<GameState> {
    const gameLogic = new GameLogicService();
    return gameLogic.createInitialState();
  }
}
