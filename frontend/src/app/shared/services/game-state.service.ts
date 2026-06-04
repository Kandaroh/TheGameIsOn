import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { GameStateModel } from '../models/game-state.model';
import { NodeModel } from '../models/node.model';

export type GameScreen = 'menu' | 'map' | 'battle' | 'event';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  state$ = new BehaviorSubject<GameStateModel | null>(null);
  screen$ = new BehaviorSubject<GameScreen>('menu');
  currentEvent$ = new BehaviorSubject<string | null>(null);
  optionsOpen$ = new BehaviorSubject(false);
  readonly debugMode = true;
  private screenHistory: GameScreen[] = [];

  constructor(private api: ApiService) {}

  private setScreen(nextScreen: GameScreen) {
    const current = this.screen$.value;
    if (current !== nextScreen) {
      this.screenHistory.push(current);
      this.screen$.next(nextScreen);
    }
  }

  startNewRun() {
    this.api.newRun().subscribe(state => {
      this.state$.next(state);
      this.setScreen('map');
    });
  }

  load() {
    this.api.fetchState().subscribe(state => this.state$.next(state));
  }

  moveToNode(nodeId: string) {
    this.api.movePlayer(nodeId).subscribe(state => {
      this.state$.next(state);
      const event = this.getCurrentEvent(state);
      if (event?.type === 'battle') {
        this.setScreen('battle');
      } else if (event) {
        this.currentEvent$.next(event.type);
        this.setScreen('event');
      }
    });
  }

  playCard(cardId: string) {
    this.api.playCard(cardId).subscribe(state => {
      this.state$.next(state);
      const event = this.getCurrentEvent(state);
      if (event?.type === 'battle' && state.player.hand.length === 0) {
        this.setScreen('map');
      }
    });
  }

  goBack() {
    const previous = this.screenHistory.pop();
    if (previous) {
      this.screen$.next(previous);
    }
  }

  openOptions() {
    this.optionsOpen$.next(true);
  }

  closeOptions() {
    this.optionsOpen$.next(false);
  }

  toggleOptions() {
    this.optionsOpen$.next(!this.optionsOpen$.value);
  }

  getCurrentNode(state: GameStateModel): NodeModel | undefined {
    return state.graph.nodes.find(node => node.id === state.player.position);
  }

  getCurrentEvent(state: GameStateModel) {
    return this.getCurrentNode(state)?.event;
  }

  getAvailableConnections(state: GameStateModel): NodeModel[] {
    return state.graph.edges
      .filter(edge => edge.from === state.player.position)
      .map(edge => state.graph.nodes.find(node => node.id === edge.to))
      .filter((node): node is NodeModel => !!node);
  }
}
