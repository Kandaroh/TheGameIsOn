import { GameState } from '../models/game-state';
import { BattleState, BattleEnemy, PendingCardReward, EnemyTurnAction } from '../models/battle-state';
import { CardEffectRepository } from '../repo/card-effect-repo';
import { DeckService } from './deck.service';
import { CardEffectService, EffectTarget } from './card-effect.service';
import { EnemyRepository } from '../repo/enemy-repo';
import { EventRepository } from '../repo/event-repo';
import { EnemySpawnerService } from './enemy-spawner.service';
import { LevelingService } from './leveling.service';
import { EnemyAttack } from '../models/enemy';
import { MapArea } from '../models/node-event';
import { CompanionAbilityService } from './companion-ability.service';
import { CardEffect } from '../models/card-effect';


/**
 * Resolves all battle-phase actions against the BattleState that lives inside
 * GameState.  All methods return a new GameState (no in-place mutations) so
 * the caller can persist immediately.
 */
export class BattleService {
  private effectRepo      = new CardEffectRepository();
  private deckService     = new DeckService();
  private effectService   = new CardEffectService();
  private enemyRepo       = new EnemyRepository();
  private eventRepo       = new EventRepository();
  private enemySpawner    = new EnemySpawnerService();
  private leveling        = new LevelingService();
  private abilityService  = new CompanionAbilityService();

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Deal the opening hand and seed BattleState at the start of a battle node.
   *
   * - Clears any leftover hand from a previous encounter.
   * - Draws HAND_SIZE cards; if the deck runs dry the discard pile is shuffled
   *   back in automatically by DeckService.drawCards().
   * - Seeds a fresh BattleState only when none is currently active, so
   *   re-entering the same node never resets an ongoing fight.
   * - Increments player.encounterCount so that enemy level scaling advances
   *   with each new battle.
   */
  async startBattle(state: GameState): Promise<GameState> {
    const HAND_SIZE = 5;
    const cleared   = { ...state, player: { ...state.player, hand: [] } };
    const withHand  = this.deckService.drawCards(cleared, HAND_SIZE);

    // Do not reset an already-active battle.
    if (withHand.battle?.active) return withHand;

    // Derive spawn context from the current node's event.
    const currentNode = state.graph.nodes.find(n => n.id === state.player.position);
    const nodeEvent   = currentNode?.event;
    const area        = (nodeEvent?.area ?? undefined) as MapArea | undefined;
    const difficulty  = nodeEvent?.type === 'hard battle' ? 'hard' : 'normal';
    const encounterCount = state.player.encounterCount ?? 0;

    // Resolve the EventDefinition id so EnemySpawnerService can use its
    // MonsterSpawnConfig (pool filter, count range, difficulty modifier).
    const eventType = nodeEvent?.type ?? 'battle';
    const eventDef  = await this.eventRepo.getByType(eventType);
    const eventId   = eventDef?.id;

    const enemies = await this.enemySpawner.spawnEnemies({ area, difficulty, encounterCount, eventId });

    // Increment encounterCount after spawning so the current battle uses the
    // count of *previous* encounters (0-based scaling).
    const updatedPlayer = {
      ...withHand.player,
      encounterCount: encounterCount + 1,
    };

    const battle: BattleState = {
      active:             true,
      turn:               1,
      log:                [
        `Battle started! (area: ${area ?? 'unknown'}, difficulty: ${difficulty}, encounter #${encounterCount + 1})`,
      ],
      enemies,
      pendingCardRewards: [],
    };

    return {
      ...withHand,
      player:  updatedPlayer,
      battle,
      history: [...withHand.history, `Battle started — encounter #${encounterCount + 1} (${area ?? 'unknown'}, ${difficulty})`],
    };
  }

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
   * to the BattleState (damage -> enemy life, shield -> companion shield, ...).
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

    // Check passive cost reduction before comparing cost to energy.
    const { discount: costDiscount, logs: costLogs } =
      this.abilityService.getCostReduction(card, companion, state);
    const effectiveCost = Math.max(0, card.cost - costDiscount);

    if (effectiveCost > companion.energy) {
      return this.appendHistory(
        state,
        `play-card failed — ${companion.name} needs ${effectiveCost} energy, has ${companion.energy}`
      );
    }

    // Deduct energy and move card hand -> discard.
    const updatedCompanion = { ...companion, energy: companion.energy - effectiveCost };
    const firstIdx = state.player.hand.indexOf(cardId);
    const updatedHand = [
      ...state.player.hand.slice(0, firstIdx),
      ...state.player.hand.slice(firstIdx + 1),
    ];
    const updatedDiscard = [...(state.player.discard ?? []), cardId];

    // Resolve the effect.
    const enhanced  = card.type === companion.type;
    const effectId  = enhanced ? (card.enhancedEffectId ?? card.effectId) : card.effectId;
    const effect    = effectId ? await this.effectRepo.getById(effectId) : undefined;

    let updatedBattle     = { ...battle, log: [...battle.log] };
    let updatedCompanions = state.companions.map(c =>
      c.id === companionId ? updatedCompanion : c
    );

    if (effect) {
      // Build an intermediate state with the already-updated companion, hand, and discard
      // so CardEffectService operates on the most current picture.
      const midState: GameState = {
        ...state,
        player:     { ...state.player, hand: updatedHand, discard: updatedDiscard },
        companions: updatedCompanions,
        battle:     updatedBattle,
      };
      const resolvedTargets = this.resolveTargets(
        effect.target,
        targetIds ?? [],
        updatedBattle,
        updatedCompanions
      );

      // Apply passive ability modifiers to the card effect (e.g. +damage).
      const { effect: modifiedEffect, logs: modLogs } =
        this.abilityService.applyPassiveModifiers(
          effect, card, updatedCompanion, resolvedTargets, midState
        );

      const afterEffect  = this.effectService.apply(modifiedEffect, updatedCompanion, resolvedTargets, midState);
      updatedBattle      = afterEffect.battle!;
      updatedCompanions  = afterEffect.companions;

      // Apply post-play bonus effects (e.g. bonus shield on attack play).
      const { effects: bonusEffects, logs: bonusLogs } =
        this.abilityService.getPostPlayEffects(card, updatedCompanion, afterEffect);
      let bonusState: GameState = {
        ...afterEffect,
        battle: updatedBattle,
        companions: updatedCompanions,
      };
      for (const bonus of bonusEffects) {
        bonusState = this.effectService.apply(bonus, updatedCompanion, [updatedCompanion], bonusState);
      }
      updatedBattle     = bonusState.battle!;
      updatedCompanions = bonusState.companions;

      // Log passive modifier messages.
      for (const l of [...costLogs, ...modLogs, ...bonusLogs]) {
        updatedBattle.log.push(l);
      }
    }

    const effectLabel  = effect ? effect.description : `${card.name} played (no effect resolved)`;
    const enhancedTag  = enhanced ? ' [enhanced]' : '';
    updatedBattle.log.push(`${companion.name} played ${card.name}${enhancedTag}: ${effectLabel}`);

    // Mark every enemy that just died with the companion that dealt the killing blow.
    updatedBattle.enemies = updatedBattle.enemies.map(e =>
      e.life <= 0 && !e.killedByCompanionId
        ? { ...e, killedByCompanionId: companionId }
        : e
    );

    const allEnemiesDead = updatedBattle.enemies.every(e => e.life <= 0);
    if (allEnemiesDead) {
      const finalState: GameState = {
        ...state,
        player:     { ...state.player, hand: updatedHand, discard: updatedDiscard },
        companions: updatedCompanions,
        battle:     updatedBattle,
        history:    [...state.history, `${companion.name} played ${card.name}${enhancedTag}`],
      };
      return this.collectRewards(finalState);
    }

    return {
      ...state,
      player:     { ...state.player, hand: updatedHand, discard: updatedDiscard },
      companions: updatedCompanions,
      battle:     updatedBattle,
      history:    [...state.history, `${companion.name} played ${card.name}${enhancedTag}`],
    };
  }

  /**
   * End the player's turn.
   *
   * 1. Refill every companion's energy up to their max.
   * 2. Each living enemy selects and executes an attack from its definition.
   * 3. Advance the turn counter.
   * 4. If all enemies are dead, collect rewards.
   */
  async endTurn(state: GameState): Promise<GameState> {
    const battle = state.battle;
    if (!battle?.active) {
      return this.appendHistory(state, 'end-turn ignored — no active battle');
    }

    // 1. Refill every companion's energy.
    const refilledCompanions = state.companions.map(companion => {
      const max      = companion.maxEnergy ?? companion.energy + companion.energyRefill;
      const refilled = Math.min(companion.energy + companion.energyRefill, max);
      return { ...companion, energy: refilled };
    });

    let workingState: GameState = {
      ...state,
      companions: refilledCompanions,
      battle: { ...battle, log: [...battle.log], lastTurnActions: [] },
    };

    // 2. Each living enemy takes its turn.
    const turnActions: EnemyTurnAction[] = [];

    for (const enemy of battle.enemies) {
      if (enemy.life <= 0) continue;

      const definition = await this.enemyRepo.getById(enemy.definitionId);
      if (!definition || definition.attacks.length === 0) continue;

      const attack = this.selectAttack(definition.attacks);
      if (!attack) continue;

      const livingCompanions = workingState.companions.filter(c => c.life > 0);
      if (livingCompanions.length === 0) break;
      const target = livingCompanions[Math.floor(Math.random() * livingCompanions.length)];

      const effect = await this.effectRepo.getById(attack.effectId);
      if (!effect) continue;

      // Capture HP before applying the effect so we can compute damage dealt.
      const targetHpBefore = target.life;

      workingState = this.effectService.apply(effect, enemy, [target], workingState);

      // Find the updated target to compute the damage delta.
      const updatedTarget = workingState.companions.find(c => c.id === target.id);
      const targetHpAfter = updatedTarget?.life ?? 0;
      const damageDealt   = targetHpBefore - targetHpAfter;
      const killedTarget  = targetHpAfter <= 0;

      turnActions.push({
        enemyId:     enemy.id,
        enemyName:   enemy.name,
        attackName:  attack.name,
        targetId:    target.id,
        targetName:  target.name,
        damageDealt,
        killedTarget,
      });

      // Retaliation: if the target companion has a retaliation passive,
      // deal damage back to the attacking enemy.
      const retaliationDmg = this.abilityService.getRetaliationDamage(target);
      if (retaliationDmg > 0 && !killedTarget) {
        // Refresh the enemy reference from workingState for correct HP.
        const liveEnemy = workingState.battle!.enemies.find(e => e.id === enemy.id);
        if (liveEnemy && liveEnemy.life > 0) {
          const retaliationEffect: CardEffect = {
            id: 'retaliation',
            description: 'Retaliation',
            action: 'damage',
            value: retaliationDmg,
            target: 'wildMonster',
          };
          workingState = this.effectService.apply(retaliationEffect, target, [liveEnemy], workingState);
          workingState = {
            ...workingState,
            battle: {
              ...workingState.battle!,
              log: [
                ...workingState.battle!.log,
                `  ⚡ ${target.name} retaliates for ${retaliationDmg} damage!`,
              ],
            },
          };
        }
      }

      // Mark companions killed by this enemy attack with the enemy id as killer.
      // (Enemies do not earn card-draw rewards, but we track this for log clarity.)
      workingState = {
        ...workingState,
        battle: {
          ...workingState.battle!,
          log: [
            ...workingState.battle!.log,
            `${enemy.name} used ${attack.name} on ${target.name}.`,
          ],
        },
      };
    }

    // 3. Advance turn counter and attach action log.
    const updatedBattle: BattleState = {
      ...workingState.battle!,
      turn: battle.turn + 1,
      lastTurnActions: turnActions,
    };
    workingState = { ...workingState, battle: updatedBattle };

    // 4. Check for total enemy defeat.
    //    Enemies that reach 0 life from end-of-turn effects have no single
    //    killer companion; attribute them to the first living companion as a
    //    fallback so card-draw rewards are still allocated.
    const firstLivingId = workingState.companions.find(c => c.life > 0)?.id;
    updatedBattle.enemies = updatedBattle.enemies.map(e =>
      e.life <= 0 && !e.killedByCompanionId && firstLivingId
        ? { ...e, killedByCompanionId: firstLivingId }
        : e
    );
    workingState = { ...workingState, battle: updatedBattle };

    const allDead = updatedBattle.enemies.every(e => e.life <= 0);
    if (allDead) {
      workingState = this.collectRewards(workingState);
    }

    return {
      ...workingState,
      history: [...workingState.history, `Turn ${battle.turn} ended — enemies attacked`],
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveTargets(
    target: string,
    targetIds: string[],
    battle: import('../models/battle-state').BattleState,
    companions: import('../models/companion').Companion[]
  ): EffectTarget[] {
    if (target === 'wildMonster') {
      if (targetIds.length > 0)
        return battle.enemies.filter(e => targetIds.includes(e.id) && e.life > 0);
      const first = battle.enemies.find(e => e.life > 0);
      return first ? [first] : [];
    }
    if (target === 'companion') {
      if (targetIds.length > 0)
        return companions.filter(c => targetIds.includes(c.id));
      return companions.filter(c => c.life > 0);
    }
    return [];
  }

  private selectAttack(attacks: EnemyAttack[]): EnemyAttack | undefined {
    const total = attacks.reduce((sum, a) => sum + a.selectionChance, 0);
    let roll = Math.random() * total;
    for (const attack of attacks) {
      roll -= attack.selectionChance;
      if (roll <= 0) return attack;
    }
    return attacks[attacks.length - 1];
  }

  private collectRewards(state: GameState): GameState {
    const battle     = state.battle!;
    let gold         = state.player.gold ?? 0;
    const companions = state.companions.map(c => ({ ...c }));
    const pendingCardRewards: PendingCardReward[] = [];

    for (const enemy of battle.enemies.filter(e => e.life <= 0)) {
      for (const reward of enemy.rewards) {

        if (reward.type === 'gold') {
          gold += reward.value;
        }

        if (reward.type === 'exp') {
          const share     = Math.floor(reward.value / companions.length);
          const remainder = reward.value - share * companions.length;
          companions.forEach((c, i) => {
            c.exp = (c.exp ?? 0) + share + (i === 0 ? remainder : 0);
          });
        }

        if (reward.type === 'card-draw' && enemy.killedByCompanionId) {
          const killer = companions.find(c => c.id === enemy.killedByCompanionId);
          const tier   = reward.tier ?? 'common';
          if (killer) {
            const pool   = (killer.priceDecks[tier] ?? []).slice();
            // Fisher-Yates shuffle — unbiased, unlike sort(() => Math.random() - 0.5).
            for (let i = pool.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            // Stamp each option with a unique runtime ID so the same priceDeck
            // card can be offered (and added to the catalogue) multiple times
            // across different battles without ID collisions.
            const rewardId = `${enemy.id}-${Date.now()}`;
            const sample = pool.slice(0, 3).map((card, idx) => ({
              ...card,
              id: `${card.id}-reward-${rewardId}-${idx}`,
            }));
            if (sample.length > 0) {
              pendingCardRewards.push({ companionId: killer.id, cardOptions: sample });
            }
          }
        }
      }
    }

    // Process level-ups for every companion that accumulated enough EXP.
    const { companions: leveledCompanions, allChoices } = this.leveling.processAll(companions);

    return {
      ...state,
      player:     { ...state.player, gold },
      companions: leveledCompanions,
      battle:     { ...battle, active: false, pendingCardRewards },
      pendingAbilityChoices: [
        ...(state.pendingAbilityChoices ?? []),
        ...allChoices,
      ],
    };
  }

  private appendHistory(state: GameState, message: string): GameState {
    return { ...state, history: [...state.history, message] };
  }
}
