import { GameState } from '../models/game-state';
import { Card } from '../models/card';
import { Companion } from '../models/companion';

/**
 * Pure deck-management service.
 *
 * All methods are stateless: they accept a GameState and return a new one
 * (or return plain data structures). No file I/O; no side effects.
 */
export class DeckService {

  // ---------------------------------------------------------------------------
  // Shuffle
  // ---------------------------------------------------------------------------

  /** Fisher-Yates shuffle. Returns a new array; never mutates the input. */
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  /**
   * Draw `count` cards from the deck into the hand.
   *
   * If the deck is exhausted mid-draw the discard pile is shuffled back in
   * automatically before continuing.  If both are empty the draw stops early.
   *
   * Returns a new GameState with updated hand / deck / discard.
   */
  drawCards(state: GameState, count: number): GameState {
    let deck    = state.player.deck.cardIds.slice();
    let hand    = state.player.hand.slice();
    let discard = (state.player.discard ?? []).slice();

    for (let i = 0; i < count; i++) {
      if (deck.length === 0) {
        if (discard.length === 0) {
          // Nothing left anywhere — stop drawing.
          break;
        }
        // Shuffle discard back into deck.
        deck    = this.shuffle(discard);
        discard = [];
      }
      hand.push(deck.shift()!);
    }

    return {
      ...state,
      player: {
        ...state.player,
        hand,
        deck:    { ...state.player.deck, cardIds: deck },
        discard,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Starting deck builder
  // ---------------------------------------------------------------------------

  /**
   * Build the master card catalogue and starting deck for a new run.
   *
   * Combines `baseCards` with two companion-specific starter cards per companion.
   * Returns both the full `cards` array (for `GameState.cards`) and a `deck`
   * whose `cardIds` list every card id in draw order (unshuffled — shuffle on
   * battle start if desired).
   */
  buildStartingDeck(
    baseCards: Card[],
    companions: Companion[]
  ): { deck: { cardIds: string[] }; cards: Card[] } {
    const cards: Card[] = baseCards.slice();

    companions.forEach((companion, idx) => {
      // Attack-type starter card
      cards.push({
        id:              `comp-${companion.id}-${idx}-a`,
        name:            `${companion.name} Strike`,
        cost:            1,
        type:            companion.type,
        description:     'Companion basic attack',
        effectId:        'fx-comp-strike-normal',
        enhancedEffectId:'fx-comp-strike-enhanced',
        effect:          { description: 'Deal 4 damage to one enemy.' },
        enhancedEffect:  { description: 'Deal 6 damage to one enemy.' },
      });

      // Defence starter card
      cards.push({
        id:              `comp-${companion.id}-${idx}-b`,
        name:            `${companion.name} Guard`,
        cost:            1,
        type:            'defense',
        description:     'Companion basic defence',
        effectId:        'fx-comp-guard-normal',
        enhancedEffectId:'fx-comp-guard-enhanced',
        effect:          { description: 'Gain 3 shield.' },
        enhancedEffect:  { description: 'Gain 5 shield.' },
      });
    });

    return {
      deck:  { cardIds: cards.map(c => c.id) },
      cards,
    };
  }
}
