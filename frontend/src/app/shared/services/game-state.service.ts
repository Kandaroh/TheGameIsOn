import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { GameStateModel } from '../models/game-state.model';
import { NodeModel } from '../models/node.model';
import { CompanionModel } from '../models/companion.model';
import { CardModel } from '../models/card.model';

export type GameScreen = 'menu' | 'companion-select' | 'map' | 'battle' | 'event';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  state$ = new BehaviorSubject<GameStateModel | null>(null);
  screen$ = new BehaviorSubject<GameScreen>('menu');
  currentEvent$ = new BehaviorSubject<string | null>(null);
  optionsOpen$ = new BehaviorSubject(false);
  debugMode = false;

  setDebugMode(enabled: boolean) { this.debugMode = enabled; }
  toggleDebugMode() { this.setDebugMode(!this.debugMode); }

  private screenHistory: GameScreen[] = [];

  // Companion-selection transient state (UI only — never persisted directly)
  availableCompanions: CompanionModel[] = [];
  currentCompanionOptions: CompanionModel[] = [];
  selectedCompanions: CompanionModel[] = [];

  constructor(private api: ApiService) {}

  // ---------------------------------------------------------------------------
  // Screen routing
  // ---------------------------------------------------------------------------

  private setScreen(nextScreen: GameScreen) {
    const current = this.screen$.value;
    if (current !== nextScreen) {
      this.screenHistory.push(current);
      this.screen$.next(nextScreen);
    }
  }

  goBack() {
    const previous = this.screenHistory.pop();
    if (previous) this.screen$.next(previous);
  }

  openOptions()  { this.optionsOpen$.next(true); }
  closeOptions() { this.optionsOpen$.next(false); }
  toggleOptions() { this.optionsOpen$.next(!this.optionsOpen$.value); }

  // ---------------------------------------------------------------------------
  // Run lifecycle
  // ---------------------------------------------------------------------------

  startNewRun() {
    this.api.newRun().subscribe(state => {
      this.state$.next(state);
      this.setScreen('map');
    });
  }

  beginCompanionSelection() {
    this.api.newRun().subscribe(state => {
      this.state$.next(state);
      this.selectedCompanions  = [];
      this.currentCompanionOptions = [];
      this.setScreen('companion-select');
      this.api.getCompanions().subscribe(companions => {
        this.availableCompanions     = companions;
        this.currentCompanionOptions = this.pickRandomOptions();
      });
    });
  }

  cancelCompanionSelection() {
    this.selectedCompanions      = [];
    this.currentCompanionOptions = [];
    this.setScreen('menu');
  }

  private pickRandomOptions(): CompanionModel[] {
    const selectedIds = new Set(this.selectedCompanions.map(c => c.id));
    const pool = this.availableCompanions.filter(c => !selectedIds.has(c.id));
    const options: CompanionModel[] = [];
    while (options.length < 3 && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      options.push(pool.splice(i, 1)[0]);
    }
    return options;
  }

  pickCompanion(c: CompanionModel) {
    if (this.selectedCompanions.length >= 3) { return; }
    this.selectedCompanions.push(c);
    if (this.selectedCompanions.length >= 3) {
      this.currentCompanionOptions = [];
      this.finalizeCompanions();
      return;
    }
    this.currentCompanionOptions = this.pickRandomOptions();
  }

  /**
   * Send the chosen companions + base cards to the backend.
   * The backend builds the starting deck, stamps unique companion IDs,
   * and returns the ready-to-play GameState.
   */
  private finalizeCompanions() {
    // Stamp unique runtime IDs and snapshot energy/life maxima before sending.
    const uniqueCompanions: CompanionModel[] = this.selectedCompanions.map((c, idx) => ({
      ...c,
      id:        `${c.id}-${idx}`,
      maxEnergy: c.maxEnergy ?? c.energy,
      maxLife:   c.maxLife   ?? c.life,
    }));

    // The base cards carry display text + effectIds; the backend assembles the
    // full deck from these plus companion-specific starter cards.
    const baseCards: CardModel[] = [
      {
        id: 'strike', name: 'Strike', cost: 1, type: 'attack', description: 'Basic attack',
        effectId: 'fx-strike-normal', enhancedEffectId: 'fx-strike-enhanced',
        effect:         { description: 'Deal 3 damage to one enemy.' },
        enhancedEffect: { description: 'Deal 5 damage to one enemy.' },
      },
      {
        id: 'shield', name: 'Shield', cost: 1, type: 'defense', description: 'Basic shield',
        effectId: 'fx-shield-normal', enhancedEffectId: 'fx-shield-enhanced',
        effect:         { description: 'Gain 2 shield.' },
        enhancedEffect: { description: 'Gain 4 shield.' },
      },
      {
        id: 'dodge', name: 'Dodge', cost: 0, type: 'utility', description: 'Avoid',
        effectId: 'fx-dodge-normal', enhancedEffectId: 'fx-dodge-enhanced',
        effect:         { description: 'Evade the next attack.' },
        enhancedEffect: { description: 'Evade the next attack and draw 1 card.' },
      },
    ];

    this.api.finalizeCompanions(uniqueCompanions, baseCards).subscribe(state => {
      this.state$.next(state);
      this.currentCompanionOptions = [];
      this.setScreen('map');
    });
  }

  load() {
    this.api.fetchState().subscribe(state => this.state$.next(state));
  }

  // ---------------------------------------------------------------------------
  // Map navigation
  // ---------------------------------------------------------------------------

  moveToNode(nodeId: string) {
    this.api.movePlayer(nodeId).subscribe(state => {
      this.state$.next(state);
      const event = this.getCurrentEvent(state);
      if (event?.type === 'battle') {
        // Backend deals opening hand, seeds BattleState, and persists.
        this.api.battleStart().subscribe(battleState => {
          this.state$.next(battleState);
          this.setScreen('battle');
        });
      } else if (event) {
        this.currentEvent$.next(event.type);
        this.setScreen('event');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Battle actions — all resolved by the backend
  // ---------------------------------------------------------------------------

  /** Draw one card from the deck. The backend handles reshuffle if needed. */
  drawCard() {
    this.api.battleDrawCard().subscribe(updated => this.state$.next(updated));
  }

  /** Play a card with a companion; backend validates, resolves effect, persists. */
  playCardWithCompanion(
    cardId: string,
    companionId: string,
    options?: { targetType?: string; targetIds?: string[] }
  ): boolean {
    const state = this.state$.value;
    if (!state || !state.player.hand.includes(cardId) || !state.companions?.length) {
      return false;
    }
    const companion = state.companions.find(c => c.id === companionId);
    const card      = state.cards.find(c => c.id === cardId);
    if (!companion || !card || card.cost > companion.energy) {
      return false;
    }
    this.api
      .battlePlayCard(cardId, companionId, options?.targetIds)
      .subscribe(updated => this.state$.next(updated));
    return true;
  }

  /** End the player's turn; backend refills energy and runs enemy AI. */
  endTurn() {
    if (!this.state$.value) return;
    this.api.battleEndTurn().subscribe(updated => this.state$.next(updated));
  }

  // ---------------------------------------------------------------------------
  // Persistence helper (used only where state is mutated client-side, e.g.
  // companion selection intermediate steps that have no dedicated endpoint yet)
  // ---------------------------------------------------------------------------

  saveCurrentState() {
    const state = this.state$.value;
    if (state) this.api.saveState(state).subscribe();
  }

  // ---------------------------------------------------------------------------
  // Legacy mana-based play (non-battle path, kept for backwards compatibility)
  // ---------------------------------------------------------------------------

  playCard(cardId: string) {
    this.api.playCard(cardId).subscribe(state => {
      this.state$.next(state);
      const event = this.getCurrentEvent(state);
      if (event?.type === 'battle' && state.player.hand.length === 0) {
        this.setScreen('map');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Graph helpers
  // ---------------------------------------------------------------------------

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
