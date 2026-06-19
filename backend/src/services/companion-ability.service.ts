import { CardEffect } from '../models/card-effect';
import { Card } from '../models/card';
import { Companion, PassiveModifier, SpecialAbility } from '../models/companion';
import { GameState } from '../models/game-state';
import { BattleEnemy } from '../models/battle-state';

export type EffectTarget = Companion | BattleEnemy;

/**
 * Evaluates a companion's passive abilities and modifies card effects, costs,
 * or produces bonus effects accordingly.
 *
 * Modifier types handled:
 *  - bonus_damage       → add value to damage effects
 *  - conditional_bonus  → add value to damage effects when condition met
 *  - bonus_shield       → generate a post-play shield effect
 *  - cost_reduction     → reduce card energy cost
 *  - retaliation        → deal damage back to attackers (enemy turn)
 */
export class CompanionAbilityService {

  /**
   * Pre-process a card effect based on the playing companion's passive
   * abilities.  Returns a modified CardEffect (or the original if no
   * modifiers apply).  Also returns log entries for any modifiers that fired.
   */
  applyPassiveModifiers(
    effect: CardEffect,
    card: Card,
    companion: Companion,
    targets: EffectTarget[],
    state: GameState
  ): { effect: CardEffect; logs: string[] } {
    let modified = { ...effect };
    const logs: string[] = [];

    for (const ability of companion.specialAbilities ?? []) {
      if (ability.trigger !== 'passive' || !ability.modifier) continue;

      const mod = ability.modifier;

      // bonus_damage and conditional_bonus both boost damage
      if (
        (mod.type === 'bonus_damage' || mod.type === 'conditional_bonus') &&
        modified.action === 'damage'
      ) {
        if (!this.checkCondition(mod, card, companion, targets, state)) continue;
        modified = { ...modified, value: modified.value + mod.value };
        logs.push(
          `  ⚡ ${companion.name} passive "${ability.name}": +${mod.value} damage (total ${modified.value})`
        );
      }
      // bonus_shield and cost_reduction are handled elsewhere
    }

    return { effect: modified, logs };
  }

  /**
   * Collect any post-card-play bonus effects (e.g. bonus shield on attack or
   * defense play).  Returns CardEffect objects to apply after the main effect.
   * Also returns log entries.
   */
  getPostPlayEffects(
    card: Card,
    companion: Companion,
    state: GameState
  ): { effects: CardEffect[]; logs: string[] } {
    const extras: CardEffect[] = [];
    const logs: string[] = [];

    for (const ability of companion.specialAbilities ?? []) {
      if (ability.trigger !== 'passive' || !ability.modifier) continue;
      if (ability.modifier.type !== 'bonus_shield') continue;
      if (!this.checkCondition(ability.modifier, card, companion, [], state)) continue;

      extras.push({
        id: `${ability.id}-bonus`,
        description: ability.description,
        action: 'shield',
        value: ability.modifier.value,
        target: 'companion',
      });
      logs.push(
        `  ⚡ ${companion.name} passive "${ability.name}": +${ability.modifier.value} shield`
      );
    }

    return { effects: extras, logs };
  }

  /**
   * Check cost reduction modifiers.  Returns total energy discount for the
   * given card + companion combination.
   */
  getCostReduction(
    card: Card,
    companion: Companion,
    state: GameState
  ): { discount: number; logs: string[] } {
    let discount = 0;
    const logs: string[] = [];

    for (const ability of companion.specialAbilities ?? []) {
      if (ability.trigger !== 'passive' || !ability.modifier) continue;
      if (ability.modifier.type !== 'cost_reduction') continue;
      if (!this.checkCondition(ability.modifier, card, companion, [], state)) continue;
      discount += ability.modifier.value;
      logs.push(
        `  ⚡ ${companion.name} passive "${ability.name}": -${ability.modifier.value} energy cost`
      );
    }

    return { discount, logs };
  }

  /**
   * Get retaliation damage for enemy-turn processing.
   * Returns total retaliation damage the companion deals back to its attacker.
   */
  getRetaliationDamage(companion: Companion): number {
    let total = 0;
    for (const ability of companion.specialAbilities ?? []) {
      if (ability.trigger !== 'passive' || !ability.modifier) continue;
      if (ability.modifier.type !== 'retaliation') continue;
      total += ability.modifier.value;
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private checkCondition(
    modifier: PassiveModifier,
    card: Card,
    companion: Companion,
    targets: EffectTarget[],
    state: GameState
  ): boolean {
    if (!modifier.condition) return true; // no condition = always applies

    const { field, op, value } = modifier.condition;
    let actual: any;

    switch (field) {
      case 'card.type':    actual = card.type; break;
      case 'card.element': actual = card.element; break;
      default: return true; // unknown field = treat as unconditional
    }

    switch (op) {
      case 'eq':  return actual === value;
      case 'neq': return actual !== value;
      case 'lt':  return actual < value;
      case 'gt':  return actual > value;
      case 'lte': return actual <= value;
      case 'gte': return actual >= value;
      default:    return true;
    }
  }
}
