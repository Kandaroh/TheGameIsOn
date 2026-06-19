import { GameState } from '../models/game-state';
import { CardEffect } from '../models/card-effect';
import { BattleEnemy } from '../models/battle-state';
import { Companion } from '../models/companion';

export type EffectSource = Companion | BattleEnemy;
export type EffectTarget = Companion | BattleEnemy;

/**
 * Single-responsibility service for applying CardEffects to game state.
 *
 * Rules:
 * - 'damage'     : reduce each target's HP through its shield first.
 *                  If a BattleEnemy reaches 0 HP and the source is a
 *                  Companion, set killedByCompanionId = source.id.
 * - 'shield'     : add shield value to the source (companions only).
 * - 'heal'       : restore HP to source companion up to maxLife.
 * - 'evade'      : no-op stub (future use).
 * - 'evade_draw' : no-op stub (future use).
 *
 * All methods return a new GameState — no in-place mutations.
 */
export class CardEffectService {
  apply(
    effect: CardEffect,
    source: EffectSource,
    targets: EffectTarget[],
    state: GameState
  ): GameState {
    switch (effect.action) {
      case 'damage':    return this.applyDamage(effect.value, source, targets, state);
      case 'shield':    return this.applyShield(effect.value, source, state);
      case 'heal':      return this.applyHeal(effect.value, source, state);
      case 'evade':
      case 'evade_draw':
      default:
        return state;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private applyDamage(
    value: number,
    source: EffectSource,
    targets: EffectTarget[],
    state: GameState
  ): GameState {
    const targetIds          = new Set(targets.map(t => t.id));
    const isCompanionSource  = 'priceDecks' in source;

    const updatedEnemies = (state.battle?.enemies ?? []).map(enemy => {
      if (!targetIds.has(enemy.id)) return enemy;
      const dmgThrough = Math.max(0, value - enemy.shield);
      const newShield  = Math.max(0, enemy.shield - value);
      const newLife    = Math.max(0, enemy.life - dmgThrough);
      return {
        ...enemy,
        life:   newLife,
        shield: newShield,
        killedByCompanionId:
          newLife === 0 && !enemy.killedByCompanionId && isCompanionSource
            ? source.id
            : enemy.killedByCompanionId,
      };
    });

    const updatedCompanions = state.companions.map(companion => {
      if (!targetIds.has(companion.id)) return companion;
      const currentShield = (companion as any).shield ?? 0;
      const dmgThrough    = Math.max(0, value - currentShield);
      const newShield     = Math.max(0, currentShield - value);
      const newLife       = Math.max(0, companion.life - dmgThrough);
      return { ...companion, life: newLife, shield: newShield };
    });

    return {
      ...state,
      companions: updatedCompanions,
      battle: state.battle
        ? { ...state.battle, enemies: updatedEnemies }
        : state.battle,
    };
  }

  private applyShield(value: number, source: EffectSource, state: GameState): GameState {
    const updatedCompanions = state.companions.map(c =>
      c.id !== source.id
        ? c
        : { ...c, shield: ((c as any).shield ?? 0) + value }
    );
    return { ...state, companions: updatedCompanions };
  }

  private applyHeal(value: number, source: EffectSource, state: GameState): GameState {
    const updatedCompanions = state.companions.map(c => {
      if (c.id !== source.id) return c;
      const max = c.maxLife ?? c.life;
      return { ...c, life: Math.min(max, c.life + value) };
    });
    return { ...state, companions: updatedCompanions };
  }
}
