import { EnemyRepository } from '../repo/enemy-repo';
import { EventRepository } from '../repo/event-repo';
import { CardEffectRepository } from '../repo/card-effect-repo';
import { EnemyDefinition, EnemyReward } from '../models/enemy';
import { BattleEnemy } from '../models/battle-state';
import { MonsterSpawnConfig } from '../models/event-definition';
import { MapArea } from '../models/node-event';

export interface SpawnContext {
  /** Zone the current node belongs to. Filters eligible enemy pool. */
  area: MapArea | undefined;
  /** 'normal' | 'hard' — hard nodes apply an extra difficulty multiplier. */
  difficulty: 'normal' | 'hard';
  /** Total battles the player has completed so far in this session. */
  encounterCount: number;
  /** Optional event id — when provided, MonsterSpawnConfig from events.json overrides defaults. */
  eventId?: string;
}

/**
 * Governs which enemies appear at the start of a battle node.
 *
 * Spawning algorithm
 * ──────────────────
 * 1. Filter the enemy pool to those whose `spawnArea` matches the current
 *    node area (or is null/undefined — those spawn everywhere).
 * 2. Roll each candidate against its `spawnChance`, scaled by difficulty.
 * 3. Guarantee at least MIN_ENEMIES and cap at MAX_ENEMIES.
 * 4. Scale enemy level: base level from JSON + bonus from encounterCount.
 * 5. Scale rewards (gold, exp) proportionally to computed level.
 */
export class EnemySpawnerService {
  private readonly DEFAULT_MIN_ENEMIES = 1;
  private readonly DEFAULT_MAX_ENEMIES = 3;
  /** Each completed encounter adds this fraction to the level bonus. */
  private readonly LEVEL_PER_ENCOUNTER = 0.5;
  /** Hard-battle nodes multiply spawnChance by this factor. */
  private readonly HARD_DIFFICULTY_MULTIPLIER = 1.4;
  /** Multiplier applied to gold/exp rewards for each level above 1. */
  private readonly REWARD_SCALE_PER_LEVEL = 0.2;

  private enemyRepo = new EnemyRepository();
  private eventRepo = new EventRepository();
  private cardEffectRepo = new CardEffectRepository();

  /**
   * Build the list of `BattleEnemy` instances to place in a new BattleState.
   *
   * When `context.eventId` is set the spawn config (pool filter, count range,
   * difficulty modifier) is read from the matching EventDefinition in
   * events.json, overriding the built-in defaults.
   */
  async spawnEnemies(context: SpawnContext): Promise<BattleEnemy[]> {
    // Resolve MonsterSpawnConfig from events.json when an eventId is provided.
    let spawnCfg: MonsterSpawnConfig | null = null;
    if (context.eventId) {
      const eventDef = await this.eventRepo.getById(context.eventId);
      if (eventDef?.monsterSpawning) {
        spawnCfg = eventDef.monsterSpawning;
      }
    }

    const minEnemies = spawnCfg?.countMin ?? this.DEFAULT_MIN_ENEMIES;
    const maxEnemies = spawnCfg?.countMax ?? this.DEFAULT_MAX_ENEMIES;
    const diffMod    = spawnCfg?.difficultyModifier ?? 1;

    const all = await this.enemyRepo.getAll();

    // 1. Filter by area — use poolFilter.areas from event config if available,
    //    otherwise fall back to the node area.
    const filterAreas = spawnCfg?.poolFilter?.areas;
    const filterMinLvl = spawnCfg?.poolFilter?.minLevel;
    const filterMaxLvl = spawnCfg?.poolFilter?.maxLevel;

    let pool = all.filter(def => {
      // Area filter
      if (filterAreas && filterAreas.length > 0) {
        if (def.spawnArea && !filterAreas.includes(def.spawnArea as any)) return false;
      } else if (context.area) {
        if (def.spawnArea && def.spawnArea !== context.area) return false;
      }
      // Level filter
      if (filterMinLvl !== undefined && def.level < filterMinLvl) return false;
      if (filterMaxLvl !== undefined && def.level > filterMaxLvl) return false;
      return true;
    });

    if (pool.length === 0) {
      // Fallback: use the entire roster so a battle is never empty.
      return this.buildEnemies(all.slice(0, minEnemies), context, diffMod);
    }

    // 2. Roll each candidate against its spawnChance.
    const diffMult =
      (context.difficulty === 'hard' ? this.HARD_DIFFICULTY_MULTIPLIER : 1) * diffMod;

    const rolled = pool.filter(def => Math.random() < def.spawnChance * diffMult);

    // 3. Enforce min / max counts.
    let selected: EnemyDefinition[];
    if (rolled.length === 0) {
      const sorted = [...pool].sort((a, b) => b.spawnChance - a.spawnChance);
      selected = sorted.slice(0, minEnemies);
    } else if (rolled.length > maxEnemies) {
      const sorted = [...rolled].sort((a, b) => b.spawnChance - a.spawnChance);
      selected = sorted.slice(0, maxEnemies);
    } else {
      selected = rolled;
    }

    return this.buildEnemies(selected, context, diffMod);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async buildEnemies(
    definitions: EnemyDefinition[],
    context: SpawnContext,
    difficultyModifier: number = 1,
  ): Promise<BattleEnemy[]> {
    return Promise.all(definitions.map(async def => {
      const level   = this.computeLevel(def, context);
      const rewards = this.scaleRewards(def.rewards, def.level, level);

      // Scale HP and energy linearly with level delta + difficulty modifier.
      const levelDelta  = level - def.level;
      const hpMult      = (1 + levelDelta * 0.15) * difficultyModifier;  // +15 % HP per extra level
      const life        = Math.round(def.baseLife   * hpMult);

      // Build attack summaries from definition + card-effects descriptions.
      const attackSummaries = await Promise.all(
        (def.attacks ?? []).map(async atk => {
          const effect = await this.cardEffectRepo.getById(atk.effectId);
          return {
            name: atk.name,
            description: effect?.description ?? '',
            element: atk.element,
          };
        })
      );

      return {
        id:           `${def.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        definitionId: def.id,
        name:         def.name,
        type:         def.type,
        element:      def.element,
        life,
        maxLife:      life,
        shield:       0,
        energy:       def.baseEnergy,
        maxEnergy:    def.baseEnergy,
        level,
        expReward:    Math.round(def.expReward * (1 + levelDelta * this.REWARD_SCALE_PER_LEVEL)),
        rewards,
        attackSummaries,
      };
    }));
  }

  /**
   * Compute the runtime level for one enemy.
   *
   * level = max(def.level,  def.level + floor(encounterCount * LEVEL_PER_ENCOUNTER))
   *
   * Example: a level-1 wolf after 4 encounters → level 1 + floor(4*0.5) = level 3.
   */
  private computeLevel(def: EnemyDefinition, context: SpawnContext): number {
    const bonus = Math.floor(context.encounterCount * this.LEVEL_PER_ENCOUNTER);
    // Hard battles add one extra level.
    const diffBonus = context.difficulty === 'hard' ? 1 : 0;
    return def.level + bonus + diffBonus;
  }

  /**
   * Scale gold and exp rewards based on the computed level vs. the base level.
   * card-draw rewards are kept as-is (tier is fixed by design).
   */
  private scaleRewards(
    rewards: EnemyReward[],
    baseLevel: number,
    computedLevel: number
  ): EnemyReward[] {
    const levelDelta = computedLevel - baseLevel;
    if (levelDelta === 0) return rewards;

    return rewards.map(r => {
      if (r.type === 'gold' || r.type === 'exp') {
        return {
          ...r,
          value: Math.round(r.value * (1 + levelDelta * this.REWARD_SCALE_PER_LEVEL)),
        };
      }
      return r;
    });
  }
}
