import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { GameStateModel } from '../models/game-state.model';
import { NodeModel } from '../models/node.model';
import { CompanionModel } from '../models/companion.model';
import { DeckService } from './deck.service';
import { CardModel } from '../models/card.model';
import { BattleStateModel } from '../models/battle-state.model';


export type GameScreen = 'menu' | 'companion-select' | 'map' | 'battle' | 'event';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  state$ = new BehaviorSubject<GameStateModel | null>(null);
  screen$ = new BehaviorSubject<GameScreen>('menu');
  currentEvent$ = new BehaviorSubject<string | null>(null);
  optionsOpen$ = new BehaviorSubject(false);
  debugMode = false;

  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  toggleDebugMode() {
    this.setDebugMode(!this.debugMode);
  }

  private screenHistory: GameScreen[] = [];
  drawUsed = false;

  // companion selection state
  availableCompanions: CompanionModel[] = [];
  currentCompanionOptions: CompanionModel[] = [];
  selectedCompanions: CompanionModel[] = [];

    constructor(
    private api: ApiService,
    private deckService: DeckService
  ) {}

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

  beginCompanionSelection() {
    this.api.newRun().subscribe(state => {
      this.state$.next(state);
      this.selectedCompanions = [];
      this.currentCompanionOptions = [];
      this.setScreen('companion-select');
      this.api.getCompanions().subscribe(companions => {
        this.availableCompanions = companions;
        this.currentCompanionOptions = this.pickRandomOptions();
      });
    });
  }

  cancelCompanionSelection() {
    this.selectedCompanions = [];
    this.currentCompanionOptions = [];
    this.setScreen('menu');
  }

  private pickRandomOptions(): CompanionModel[] {
    const options: CompanionModel[] = [];
    const pool = this.availableCompanions.slice();
    while (options.length < 3 && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      options.push(pool.splice(i, 1)[0]);
    }
    return options;
  }

  pickCompanion(c: CompanionModel) {
    this.selectedCompanions.push(c);
    if (this.selectedCompanions.length >= 3) {
      this.finalizeCompanions();
      return;
    }
    // present next options (allow repeats)
    this.currentCompanionOptions = this.pickRandomOptions();
  }

    private finalizeCompanions() {
    const state = this.state$.value;
    if (!state) return;

    // Give every companion a unique runtime ID by appending its slot index.
    // This is critical: if the player picks the same companion type more than
    // once (e.g. three Sprites), all three would share id 'sprite', making
    // it impossible to address them individually for energy deduction, HP
    // tracking, or targeting. We stamp them here, once, before anything else
    // reads the id, so the uniqueness guarantee holds for the entire run.
        const uniqueCompanions: CompanionModel[] = this.selectedCompanions.map(
      (c, idx) => ({
        ...c,
        id: `${c.id}-${idx}`,
        // Snapshot the starting energy as the permanent max so end-of-turn
        // refills can never overflow beyond the original value.
        maxEnergy: c.maxEnergy ?? c.energy,
        maxLife:   c.maxLife   ?? c.life,
      })
    );

    // build starting deck (base + companion starter cards)
        const baseCards: CardModel[] = [
      {
        id: 'strike', name: 'Strike', cost: 1, type: 'attack', description: 'Basic attack',
        effect:         { description: 'Deal 3 damage to one enemy.' },
        enhancedEffect: { description: 'Deal 5 damage to one enemy.' },
      },
      {
        id: 'shield', name: 'Shield', cost: 1, type: 'defense', description: 'Basic shield',
        effect:         { description: 'Gain 2 shield.' },
        enhancedEffect: { description: 'Gain 4 shield.' },
      },
      {
        id: 'dodge', name: 'Dodge', cost: 0, type: 'utility', description: 'Avoid',
        effect:         { description: 'Evade the next attack.' },
        enhancedEffect: { description: 'Evade the next attack and draw 1 card.' },
      },
    ];
    const { deck, cards } = this.deckService.buildStartingDeck(baseCards, uniqueCompanions);

    // attach to state — replace the full cards list so there are no leftover
    // duplicates from a previous run saved in the backend JSON
    this.state$.next({
      ...state,
      player:     { ...state.player, deck, hand: [], discard: [] },
      cards,
      companions: uniqueCompanions,
    });

    this.api.saveState(this.state$.value!).subscribe(() => {
      this.currentCompanionOptions = [];
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
        this.dealOpeningHand(state);
        this.setScreen('battle');
      } else if (event) {
        this.currentEvent$.next(event.type);
        this.setScreen('event');
      }
    });
  }

    /** Draw up to 5 cards from the deck into the hand at the start of a battle. */
  private dealOpeningHand(state: GameStateModel) {
    const HAND_SIZE = 5;
    const deck = state.player.deck.cardIds.slice();
    const hand = state.player.hand.slice();
    const discard = (state.player.discard ?? []).slice();

    // If deck doesn't have enough cards, shuffle discard back in first.
    if (deck.length < HAND_SIZE) {
      const reshuffled = this.shuffleArray([...deck, ...discard]);
      deck.length = 0;
      deck.push(...reshuffled);
      discard.length = 0;
    }

    const toDraw = Math.min(HAND_SIZE, deck.length);
    const drawn = deck.splice(0, toDraw);
    hand.push(...drawn);

    const updated: GameStateModel = {
      ...state,
      player: {
        ...state.player,
        hand,
        deck:    { ...state.player.deck, cardIds: deck },
        discard: discard,
      },
      // Initialise a fresh BattleState so the backend has enemies to act on.
      battle: state.battle ?? {
        active: true,
        turn: 1,
        log: ['Battle started!'],
        enemies: [
          { id: 'wild-1', name: 'Wild Wolf',   life: 18, maxLife: 18, shield: 0, energy: 2, maxEnergy: 2, element: 'earth', type: 'Beast'     },
          { id: 'wild-2', name: 'Stone Golem', life: 22, maxLife: 22, shield: 0, energy: 1, maxEnergy: 1, element: 'earth', type: 'Construct' },
        ],
      },
    };

    this.state$.next(updated);
    this.saveCurrentState();
  }

  private shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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

  saveCurrentState() {
    const state = this.state$.value;
    if (!state) {
      return;
    }
    this.api.saveState(state).subscribe();
  }

  drawCard() {
    const state = this.state$.value;
    if (!state || this.drawUsed || !state.player.deck.cardIds.length) {
      return;
    }

    const cardId = state.player.deck.cardIds.shift();
    if (!cardId) {
      return;
    }

    state.player.hand.push(cardId);
    this.drawUsed = true;
    this.state$.next(state);
    this.saveCurrentState();
  }

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
    const card = state.cards.find(c => c.id === cardId);
    if (!companion || !card || card.cost > companion.energy) {
      return false;
    }

    // Delegate all resolution (energy deduction, hand update, effect) to the
    // backend.  The returned GameState is the single source of truth.
    this.api
      .battlePlayCard(cardId, companionId, options?.targetIds)
      .subscribe(updated => this.state$.next(updated));

    return true;
  }

    endTurn() {
    if (!this.state$.value) {
      return;
    }
    this.drawUsed = false;
    // Delegate energy refill + enemy AI turn to the backend.
    this.api.battleEndTurn().subscribe(updated => this.state$.next(updated));
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
