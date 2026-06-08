import { GameState } from '../models/game-state';
import { BattleState } from '../models/battle-state';
import { CardEffectRepository } from '../repo/card-effect-repo';

/** Flat damage each enemy deals to each companion per enemy turn. */
const ENEMY_ATTACK_DAMAGE = 2;

/**
 * Resolves card-play and end-turn actions against the BattleState
 * that lives inside GameState.  All mutations return a new GameState
 * object (no in-place edits) so the caller can persist immediately.
 */
export class BattleService {
  private effectRepo = new CardEffectRepository();

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Play a card during battle.
   *
   * Validation order:
   *   1. Battle must be active.
   *   2. Card must exist and be in the player's hand.
   *   3. The nominated companion must exist and have enough energy.
   *
   * On success the card is removed from hand, added to discard, the
   * companion's energy is decremented, and the resolved effect is applied
   * to the BattleState (damage → enemy life, shield → companion shield, …).
   */
  async playCard(
    state: GameState,
    cardId: string,
    companionId: string,
    targetIds?: string[]
  ): Promise<GameState> {
    const battle = state.battle;
    if (!battle?.active) {
      return this.appendHistory(state, `play-card ignored — no active battle`);
    }

    const card = state.cards.find(c => c.id === cardId);
    if (!card || !state.player.hand.includes(cardId)) {
      return this.appendHistory(state, `play-card failed — card ${cardId} not in hand`);
    }

    const companion = state.companions.find(c => c.id === companionId);
    if (!companion) {
      return this.appendHistory(state, `play-card failed — companion ${companionId} not found`);
    }

    if (card.cost > companion.energy) {
      return this.appendHistory(
        state,
        `play-card failed — ${companion.name} needs ${card.cost} energy, has ${companion.energy}`
      );
    }

    // Deduct energy and move card hand → discard.
    const updatedCompanion = { ...companion, energy: companion.energy - card.cost };
    const firstIdx = state.player.hand.indexOf(cardId);
    const updatedHand = [
      ...state.player.hand.slice(0, firstIdx),
      ...state.player.hand.slice(firstIdx + 1),
    ];
    const updatedDiscard = [...(state.player.discard ?? []), cardId];

    // Resolve the effect.
    const enhanced = card.type === companion.type;
    const effectId = enhanced ? (card.enhancedEffectId ?? card.effectId) : card.effectId;
    const effect = effectId ? await this.effectRepo.getById(effectId) : undefined;

    let updatedBattle = { ...battle, log: [...battle.log] };
    let updatedCompanions = state.companions.map(c =>
      c.id === companionId ? updatedCompanion : c
    );

    if (effect) {
      const result = this.applyEffect(
        effect,
        updatedBattle,
        updatedCompanions,
        companionId,
        targetIds ?? []
      );
      updatedBattle = result.battle;
      updatedCompanions = result.companions;
    }

    const effectLabel = effect
      ? effect.description
      : `${card.name} played (no effect resolved)`;
    const enhancedTag = enhanced ? ' [enhanced]' : '';
    updatedBattle.log.push(
      `${companion.name} played ${card.name}${enhancedTag}: ${effectLabel}`
    );

    return {
      ...state,
      player: { ...state.player, hand: updatedHand, discard: updatedDiscard },
      companions: updatedCompanions,
      battle: updatedBattle,
      history: [
        ...state.history,
        `${companion.name} played ${card.name}${enhancedTag}`,
      ],
    };
  }

  /**
   * End the player's turn.
   *
   * 1. Refill every companion's energy up to their max.
   * 2. Every living enemy attacks: each deals ENEMY_ATTACK_DAMAGE to every companion.
   * 3. Advance the turn counter.
   */
  endTurn(state: GameState): GameState {
    const battle = state.battle;
    if (!battle?.active) {
      return this.appendHistory(state, `end-turn ignored — no active battle`);
    }

    // Refill companion energy.
    const refilledCompanions = state.companions.map(companion => {
      const max = companion.maxEnergy ?? companion.energy + companion.energyRefill;
      const refilled = Math.min(companion.energy + companion.energyRefill, max);
      return { ...companion, energy: refilled };
    });

    // Enemy AI: each living enemy deals flat damage to every companion.
    let companions = refilledCompanions;
    const log = [...battle.log];

    for (const enemy of battle.enemies) {
      if (enemy.life <= 0) continue;
      companions = companions.map(companion => ({
        ...companion,
        life: Math.max(0, companion.life - ENEMY_ATTACK_DAMAGE),
      }));
      log.push(
        `${enemy.name} attacks! Each companion loses ${ENEMY_ATTACK_DAMAGE} life.`
      );
    }

    const updatedBattle: BattleState = {
      ...battle,
      turn: battle.turn + 1,
      log,
    };

    return {
      ...state,
      companions,
      battle: updatedBattle,
      history: [...state.history, `Turn ${battle.turn} ended — enemies attacked`],
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Apply a resolved CardEffect to the current BattleState + companions.
   * Returns new (immutable) copies of both.
   */
  private applyEffect(
    effect: { action: string; value: number; target: string },
    battle: BattleState,
    companions: GameState['companions'],
    actorId: string,
    targetIds: string[]
  ): { battle: BattleState; companions: GameState['companions'] } {
    switch (effect.action) {
      case 'damage': {
        // Damage every listed enemy, or the first living enemy if no targets given.
        const toHit: string[] =
          targetIds.length > 0
            ? targetIds
            : [battle.enemies.find(e => e.life > 0)?.id ?? ''];

        const updatedEnemies = battle.enemies.map(enemy => {
          if (!toHit.includes(enemy.id)) return enemy;
          const afterShield = Math.max(0, effect.value - enemy.shield);
          const newShield = Math.max(0, enemy.shield - effect.value);
          return {
            ...enemy,
            life: Math.max(0, enemy.life - afterShield),
            shield: newShield,
          };
        });

        return { battle: { ...battle, enemies: updatedEnemies }, companions };
      }

      case 'shield': {
        // Add shield to the acting companion.
        const updatedCompanions = companions.map(c => {
          if (c.id !== actorId) return c;
          return { ...c, shield: ((c as any).shield ?? 0) + effect.value };
        });
        return { battle, companions: updatedCompanions };
      }

      case 'heal': {
        const updatedCompanions = companions.map(c => {
          if (c.id !== actorId) return c;
          const max = c.maxLife ?? c.life;
          return { ...c, life: Math.min(max, c.life + effect.value) };
        });
        return { battle, companions: updatedCompanions };
      }

      case 'evade':
      case 'evade_draw':
        // Status effects — logged only for now; extend when status system lands.
        return { battle, companions };

      default:
        return { battle, companions };
    }
  }

  private appendHistory(state: GameState, message: string): GameState {
    return { ...state, history: [...state.history, message] };
  }
}
