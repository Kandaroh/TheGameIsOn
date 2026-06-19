import { GameState } from '../models/game-state';
import { StatusEffect, StatusTriggerMoment, EnemyTurnAction } from '../models/battle-state';
import { CardEffectService, EffectTarget } from './card-effect.service';
import { CardEffectRepository } from '../repo/card-effect-repo';
import { StatusRepository, StatusEffectDefinition } from '../repo/status-repo';
import { Companion } from '../models/companion';
import { BattleEnemy } from '../models/battle-state';

/**
 * Manages the lifecycle of status effects on companions and enemies:
 *   - applyStatus  : add or stack a status on a target
 *   - tickStatuses : fire all statuses matching a trigger moment and return
 *                    synthetic EnemyTurnAction entries for the popup
 *   - removeStatus : explicit removal
 */
export class StatusEffectService {
  private effectService = new CardEffectService();
  private effectRepo    = new CardEffectRepository();
  private statusRepo    = new StatusRepository();

  // ---------------------------------------------------------------------------
  // Apply
  // ---------------------------------------------------------------------------

  /**
   * Apply `stacks` of a status identified by `statusId` to every target.
   * If the target already carries the same status, stacks are added.
   */
  async applyStatus(
    targets: EffectTarget[],
    statusId: string,
    stacks: number,
    state: GameState
  ): Promise<GameState> {
    const def = await this.statusRepo.getById(statusId);
    if (!def) return state;

    const targetIds = new Set(targets.map(t => t.id));

    // Update companions
    const updatedCompanions = state.companions.map(c => {
      if (!targetIds.has(c.id)) return c;
      return this.upsertStatus(c, def, stacks) as Companion;
    });

    // Update enemies
    const updatedEnemies = (state.battle?.enemies ?? []).map(e => {
      if (!targetIds.has(e.id)) return e;
      return this.upsertStatus(e, def, stacks) as BattleEnemy;
    });

    return {
      ...state,
      companions: updatedCompanions,
      battle: state.battle
        ? { ...state.battle, enemies: updatedEnemies }
        : state.battle,
    };
  }

  // ---------------------------------------------------------------------------
  // Tick
  // ---------------------------------------------------------------------------

  /**
   * Fire every status whose `triggerMoment` matches `moment` on all
   * companions and enemies. Returns the updated state plus synthetic
   * EnemyTurnAction entries describing status tick damage (for the popup).
   */
  async tickStatuses(
    moment: StatusTriggerMoment,
    state: GameState
  ): Promise<{ state: GameState; actions: EnemyTurnAction[] }> {
    const actions: EnemyTurnAction[] = [];
    let workingState = state;

    // --- Tick companions ---
    for (const companion of workingState.companions) {
      if (companion.life <= 0) continue;
      const statuses = companion.statusEffects ?? [];
      const matching = statuses.filter(s => s.triggerMoment === moment);
      if (matching.length === 0) continue;

      for (const status of matching) {
        const def = await this.statusRepo.getById(status.id);
        if (!def) continue;

        const tickEffect = await this.effectRepo.getById(def.tickEffectId);
        if (!tickEffect) continue;

        // Override value with current stacks (e.g. poison damage = stacks).
        const resolvedEffect = { ...tickEffect, value: status.stacks };

        // Capture HP before
        const hpBefore = this.findCompanion(workingState, companion.id)?.life ?? 0;

        workingState = this.effectService.apply(
          resolvedEffect,
          companion,   // source (the status "acts" on the target)
          [this.findCompanion(workingState, companion.id)!],
          workingState
        );

        const hpAfter    = this.findCompanion(workingState, companion.id)?.life ?? 0;
        const dmg        = hpBefore - hpAfter;
        const killed     = hpAfter <= 0;

        if (dmg > 0 || killed) {
          actions.push({
            enemyId:     `status-${status.id}`,
            enemyName:   status.name,
            attackName:  `${status.name} (${status.stacks} stacks)`,
            targetId:    companion.id,
            targetName:  companion.name,
            damageDealt: dmg,
            killedTarget: killed,
          });
        }

        // Decay stacks
        workingState = this.decayStatus(workingState, companion.id, status.id, def.decayPerTick, 'companion');
      }
    }

    // --- Tick enemies ---
    for (const enemy of (workingState.battle?.enemies ?? [])) {
      if (enemy.life <= 0) continue;
      const statuses = enemy.statusEffects ?? [];
      const matching = statuses.filter(s => s.triggerMoment === moment);
      if (matching.length === 0) continue;

      for (const status of matching) {
        const def = await this.statusRepo.getById(status.id);
        if (!def) continue;

        const tickEffect = await this.effectRepo.getById(def.tickEffectId);
        if (!tickEffect) continue;

        // For enemy ticks, override target to 'wildMonster' so damage hits
        // the enemy instead of a companion.
        const resolvedEffect = { ...tickEffect, value: status.stacks, target: 'wildMonster' as const };

        const hpBefore = this.findEnemy(workingState, enemy.id)?.life ?? 0;

        workingState = this.effectService.apply(
          resolvedEffect,
          enemy,
          [this.findEnemy(workingState, enemy.id)!],
          workingState
        );

        const hpAfter = this.findEnemy(workingState, enemy.id)?.life ?? 0;
        const dmg     = hpBefore - hpAfter;

        // Log enemy status ticks in the battle log.
        if (dmg > 0) {
          workingState = {
            ...workingState,
            battle: {
              ...workingState.battle!,
              log: [
                ...workingState.battle!.log,
                `${status.name} deals ${dmg} damage to ${enemy.name} (${status.stacks} stacks).`,
              ],
            },
          };
        }

        // Decay stacks
        workingState = this.decayStatus(workingState, enemy.id, status.id, def.decayPerTick, 'enemy');
      }
    }

    return { state: workingState, actions };
  }

  // ---------------------------------------------------------------------------
  // Remove
  // ---------------------------------------------------------------------------

  removeStatus(targetId: string, statusId: string, kind: 'companion' | 'enemy', state: GameState): GameState {
    if (kind === 'companion') {
      return {
        ...state,
        companions: state.companions.map(c =>
          c.id !== targetId
            ? c
            : { ...c, statusEffects: (c.statusEffects ?? []).filter(s => s.id !== statusId) }
        ),
      };
    }
    return {
      ...state,
      battle: state.battle
        ? {
            ...state.battle,
            enemies: state.battle.enemies.map(e =>
              e.id !== targetId
                ? e
                : { ...e, statusEffects: (e.statusEffects ?? []).filter(s => s.id !== statusId) }
            ),
          }
        : state.battle,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private upsertStatus(
    target: Companion | BattleEnemy,
    def: StatusEffectDefinition,
    stacks: number
  ): Companion | BattleEnemy {
    const existing = (target.statusEffects ?? []).slice();
    const idx = existing.findIndex(s => s.id === def.id);

    if (idx >= 0) {
      // Stack onto existing
      existing[idx] = { ...existing[idx], stacks: existing[idx].stacks + stacks };
    } else {
      // New status instance
      const status: StatusEffect = {
        id:             def.id,
        name:           def.name,
        icon:           def.icon,
        stacks,
        turnsRemaining: null,
        triggerMoment:  def.triggerMoment,
        effectId:       def.tickEffectId,
      };
      existing.push(status);
    }

    return { ...target, statusEffects: existing };
  }

  private decayStatus(
    state: GameState,
    targetId: string,
    statusId: string,
    decay: number,
    kind: 'companion' | 'enemy'
  ): GameState {
    const updater = (statuses: StatusEffect[]): StatusEffect[] => {
      return statuses
        .map(s => {
          if (s.id !== statusId) return s;
          const newStacks = s.stacks - decay;
          const newTurns  = s.turnsRemaining != null ? s.turnsRemaining - 1 : null;
          return { ...s, stacks: newStacks, turnsRemaining: newTurns };
        })
        .filter(s => s.stacks > 0 && (s.turnsRemaining === null || s.turnsRemaining > 0));
    };

    if (kind === 'companion') {
      return {
        ...state,
        companions: state.companions.map(c =>
          c.id !== targetId
            ? c
            : { ...c, statusEffects: updater(c.statusEffects ?? []) }
        ),
      };
    }

    return {
      ...state,
      battle: state.battle
        ? {
            ...state.battle,
            enemies: state.battle.enemies.map(e =>
              e.id !== targetId
                ? e
                : { ...e, statusEffects: updater(e.statusEffects ?? []) }
            ),
          }
        : state.battle,
    };
  }

  private findCompanion(state: GameState, id: string): Companion | undefined {
    return state.companions.find(c => c.id === id);
  }

  private findEnemy(state: GameState, id: string): BattleEnemy | undefined {
    return state.battle?.enemies.find(e => e.id === id);
  }
}
