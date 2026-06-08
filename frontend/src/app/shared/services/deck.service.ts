import { Injectable } from '@angular/core';
import { CardModel } from '../models/card.model';
import { DeckModel } from '../models/deck.model';
import { CompanionModel } from '../models/companion.model';

@Injectable({ providedIn: 'root' })
export class DeckService {
  // Fisher–Yates shuffle
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  mergeToDeckIds(cards: CardModel[], existing: DeckModel | undefined): DeckModel {
    const ids = (existing?.cardIds ?? []).slice();
    for (const c of cards) ids.push(c.id);
    return { cardIds: ids };
  }

    buildStartingDeck(baseCards: CardModel[], companions: CompanionModel[]): { deck: DeckModel; cards: CardModel[] } {
    // starting deck: baseCards + a few companion-themed starter cards (placeholder)
    const cards: CardModel[] = baseCards.slice();
    companions.forEach((c, idx) => {
      // create two simple companion cards as starter rewards
      cards.push({
        id: `comp-${c.id}-${idx}-a`,
        name: `${c.name} Strike`,
        cost: 1,
        type: c.type,
        description: 'Companion basic attack',
        effect:         { description: 'Deal 4 damage to one enemy.' },
        enhancedEffect: { description: 'Deal 6 damage to one enemy.' },
      });
      cards.push({
        id: `comp-${c.id}-${idx}-b`,
        name: `${c.name} Guard`,
        cost: 1,
        type: 'defense',
        description: 'Companion basic defence',
        effect:         { description: 'Gain 3 shield.' },
        enhancedEffect: { description: 'Gain 5 shield.' },
      });
    });

    const deck: DeckModel = { cardIds: cards.map(c => c.id) };
    return { deck, cards };
  }
}
