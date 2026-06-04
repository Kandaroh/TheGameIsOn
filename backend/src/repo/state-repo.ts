import { PersistenceService } from '../services/persistence.service';
import { GameState } from '../models/game-state';

export class StateRepository {
  private persistence = new PersistenceService('backend-data/game-state.json');

  load(): Promise<GameState> {
    return this.persistence.loadState();
  }

  save(state: GameState): Promise<void> {
    return this.persistence.saveState(state);
  }
}
