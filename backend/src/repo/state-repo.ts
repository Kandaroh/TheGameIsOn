import path from 'path';
import { PersistenceService } from '../services/persistence.service';
import { GameState } from '../models/game-state';
import { LevelingService } from '../services/leveling.service';

export class StateRepository {
  private persistence = new PersistenceService(
    path.resolve(__dirname, '../../data/saves/game-state.json')
  );

    private leveling = new LevelingService();

  async load(): Promise<GameState> {
    const state = await this.persistence.loadState();
    // Migration guard: older persisted states lack encounterCount.
    if (state.player.encounterCount === undefined) {
      (state.player as any).encounterCount = 0;
    }
    // Migration guard: stamp nextLevelExp on companions that predate the field.
    if (state.companions?.length) {
      state.companions = state.companions.map(c =>
        c.nextLevelExp === undefined ? this.leveling.withNextLevelExp(c) : c
      );
    }
    return state;
  }

  save(state: GameState): Promise<void> {
    return this.persistence.saveState(state);
  }
}
