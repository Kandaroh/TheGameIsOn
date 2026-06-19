import { Companion, SpecialAbility } from '../models/companion';
import { PendingAbilityChoice } from '../models/game-state';

/**
 * Centralises all companion leveling logic.
 *
 * EXP threshold formula:  nextLevelExp = level * 100
 *
 * When a companion's accumulated exp meets or exceeds the threshold the
 * companion levels up: level increments, excess exp carries over, and
 * maxLife / maxEnergy receive a small permanent boost.
 *
 * This service is the **single source of truth** for leveling; the frontend
 * must never compute thresholds or trigger level-ups — it simply reads the
 * `nextLevelExp` field returned in the game state.
 */
export class LevelingService {

  // ---------------------------------------------------------------------------
  // Configuration — tweak these to tune progression speed
  // ---------------------------------------------------------------------------

  /** EXP required to reach the next level. */
  expThreshold(level: number): number {
    return level * 100;
  }

  /** Flat HP gain per level-up. */
  private readonly HP_PER_LEVEL = 3;
  /** Flat max-energy gain every N levels. */
  private readonly ENERGY_LEVEL_INTERVAL = 3;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Stamp `nextLevelExp` on a companion so the frontend can render the
   * progress bar without knowing the formula.
   */
  withNextLevelExp<T extends Companion>(companion: T): T {
    return { ...companion, nextLevelExp: this.expThreshold(companion.level) };
  }

  /**
   * Process any pending level-ups for a single companion.
   *
   * May loop more than once if enough EXP was awarded to skip multiple
   * levels in one go (unlikely but handled correctly).
   *
   * Returns a new companion object (no mutation) with updated level, exp,
   * nextLevelExp, and stat boosts applied.
   */
  processLevelUps(companion: Companion): { companion: Companion; newChoices: PendingAbilityChoice[] } {
    let c = { ...companion };
    const newChoices: PendingAbilityChoice[] = [];
    let threshold = this.expThreshold(c.level);

    while (c.exp >= threshold) {
      c.exp   -= threshold;
      c.level += 1;

      // Stat boosts
      const newMaxLife = (c.maxLife ?? c.life) + this.HP_PER_LEVEL;
      c.maxLife = newMaxLife;
      // Heal the HP gained so the bar doesn't look worse after leveling.
      c.life = Math.min(c.life + this.HP_PER_LEVEL, newMaxLife);

      if (c.level % this.ENERGY_LEVEL_INTERVAL === 0) {
        const newMaxEnergy = (c.maxEnergy ?? c.energy) + 1;
        c.maxEnergy = newMaxEnergy;
      }

      threshold = this.expThreshold(c.level);
    }

    // Always stamp the current threshold so it's present in the persisted state.
    c.nextLevelExp = threshold;

    // Check each unlock level for pending ability choices.
    const unlockLevels = c.abilityUnlockLevels ?? [];
    for (let i = 0; i < unlockLevels.length; i++) {
      if (c.level >= unlockLevels[i] && (c.specialAbilities?.length ?? 0) <= i) {
        // This unlock slot is due — generate choice options.
        const chosenIds = new Set((c.specialAbilities ?? []).map(a => a.id));
        const remaining = (c.abilityPool ?? []).filter(a => !chosenIds.has(a.id));
        const options   = this.pickRandom(remaining, 3);
        if (options.length > 0) {
          newChoices.push({
            companionId:   c.id,
            companionName: c.name,
            unlockIndex:   i,
            options,
          });
        }
      }
    }

    return { companion: c, newChoices };
  }

  /**
   * Convenience: process level-ups for every companion in the array.
   */
  processAll(companions: Companion[]): { companions: Companion[]; allChoices: PendingAbilityChoice[] } {
    const allChoices: PendingAbilityChoice[] = [];
    const result = companions.map(c => {
      const { companion, newChoices } = this.processLevelUps(c);
      allChoices.push(...newChoices);
      return companion;
    });
    return { companions: result, allChoices };
  }

  /**
   * Pick up to `count` random elements from the array (Fisher-Yates sample).
   */
  private pickRandom<T>(arr: T[], count: number): T[] {
    const pool = [...arr];
    const result: T[] = [];
    while (result.length < count && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(i, 1)[0]);
    }
    return result;
  }
}
