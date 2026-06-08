import { Injectable } from '@angular/core';
import { CardModel } from '../models/card.model';
import { CompanionModel } from '../models/companion.model';

export interface CardPlayContext {
  targetType?: string;
  targetIds?: string[];
}

/**
 * Thin client-side logger for card plays.
 *
 * All real effect resolution (damage, shield, energy, …) now happens in
 * BattleService on the backend.  This service remains in the codebase so
 * existing call-sites continue to compile, but its only job is to emit a
 * diagnostic console message.  It can be removed entirely once no component
 * imports it.
 */
@Injectable({ providedIn: 'root' })
export class CardEffectService {

  /**
   * Logs the card play to the console.
   * Real effect resolution is handled by the backend BattleService.
   */
  applyEffect(
    card: CardModel,
    companion: CompanionModel,
    enhanced: boolean,
    context?: CardPlayContext
  ): void {
    const variant = enhanced ? 'ENHANCED' : 'NORMAL';
    const effectDesc = enhanced
      ? (card.enhancedEffect?.description ?? card.effect?.description ?? 'no effect')
      : (card.effect?.description ?? 'no effect');
    const targets = context?.targetIds?.join(', ') ?? context?.targetType ?? 'none';

    console.log(
      `[CardEffectService] ${variant} — ${companion.name} played ${card.name}` +
      ` | effect: "${effectDesc}" | targets: ${targets}` +
      ` | (resolved by backend)`
    );
  }
}
