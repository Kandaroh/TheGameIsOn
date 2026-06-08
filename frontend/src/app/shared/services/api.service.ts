import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameStateModel } from '../models/game-state.model';
import { CompanionModel } from '../models/companion.model';

const API_BASE = 'http://localhost:4000/api/game';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  fetchState(): Observable<GameStateModel> {
    return this.http.get<GameStateModel>(`${API_BASE}/state`);
  }

  saveState(state: GameStateModel): Observable<void> {
    return this.http.post<void>(`${API_BASE}/state`, state);
  }

  movePlayer(nextNodeId: string) {
    return this.http.post<GameStateModel>(`${API_BASE}/action/move`, { nextNodeId });
  }

  playCard(cardId: string) {
    return this.http.post<GameStateModel>(`${API_BASE}/action/play-card`, { cardId });
  }

  newRun() {
    return this.http.post<GameStateModel>(`${API_BASE}/action/new-run`, {});
  }

    getCompanions() {
    return this.http.get<CompanionModel[]>(`${API_BASE}/action/companions`);
  }

  battlePlayCard(cardId: string, companionId: string, targetIds?: string[]) {
    return this.http.post<GameStateModel>(
      `${API_BASE}/action/battle/play-card`,
      { cardId, companionId, targetIds }
    );
  }

  battleEndTurn() {
    return this.http.post<GameStateModel>(`${API_BASE}/action/battle/end-turn`, {});
  }
}
