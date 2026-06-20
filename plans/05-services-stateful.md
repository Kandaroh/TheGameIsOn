# Phase 5 — Services B (Stateful / Complex)

## Goal
Port the 3 heaviest services that depend on repositories and other services. These contain the core battle loop.

## Services in This Phase

| TS File (~lines) | C# File | Interface | Dependencies |
|---|---|---|---|
| `status-effect.service.ts` (200) | `StatusEffectService.cs` | `IStatusEffectService` | `ICardEffectService`, `ICardEffectRepository`, `IStatusRepository` |
| `enemy-spawner.service.ts` (175) | `EnemySpawnerService.cs` | `IEnemySpawnerService` | `IEnemyRepository`, `IEventRepository`, `ICardEffectRepository` |
| `battle.service.ts` (310) | `BattleService.cs` | `IBattleService` | `ICardEffectRepository`, `IDeckService`, `ICardEffectService`, `IEnemyRepository`, `IEventRepository`, `IEnemySpawnerService`, `ILevelingService`, `ICompanionAbilityService`, `IStatusEffectService` |

**Total TS to paste: ~685 lines.** This is the largest phase. If token-constrained, split into two prompts: (a) StatusEffect + EnemySpawner, (b) Battle.

## Prompt Template
> Paste the 3 TS files plus the C# interface signatures from Phases 3–4, then:

```
Convert these 3 TypeScript services to C# in namespace TheGameIsOn.API.Services.

Rules:
- Constructor-inject all dependencies via their interfaces.
- All async TS methods → async Task<T> in C#.
- Preserve every algorithm exactly: spawn filtering, weighted random
  attack selection, reward collection, level scaling, status ticking.
- Replace JS array spreading with List<T> cloning + LINQ.
- Date.now() → DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().
- Math.random().toString(36).slice(2,6) → Guid.NewGuid().ToString("N")[..4].
- Keep all constants (LEVEL_PER_ENCOUNTER, HARD_DIFFICULTY_MULTIPLIER, etc.)
  as private const / static readonly fields.
```

## Per-Service Notes

### `StatusEffectService`
- **`applyStatus`**: upserts a `StatusEffect` on companions and enemies. If already present, adds stacks.
- **`tickStatuses`**: iterates all companions/enemies, finds statuses matching the trigger moment, applies the tick effect (overriding value with current stacks), decays stacks, removes expired statuses. Returns `(GameState, List<EnemyTurnAction>)`.
- **`removeStatus`**: simple filter.
- **`decayStatus`**: decrements stacks by `decayPerTick`, removes if stacks <= 0.
- Private helpers `findCompanion` / `findEnemy` become trivial LINQ `.FirstOrDefault()`.

### `EnemySpawnerService`
- **`SpawnContext`**: create a small record or class for the parameter object `{ area, difficulty, encounterCount, eventId }`.
- **`spawnEnemies`**: resolves `MonsterSpawnConfig` from `EventRepository`, filters enemy pool, rolls spawn chance, enforces min/max, calls `buildEnemies`.
- **`buildEnemies`**: computes level, scales HP/rewards, builds `attackSummaries` by looking up `CardEffectRepository` for each attack's effectId.
- **`computeLevel`** / **`scaleRewards`**: pure arithmetic, straightforward port.

### `BattleService`
This is the largest single file. Key methods:

1. **`startBattle`**: clears hand, draws 5 cards, spawns enemies via `IEnemySpawnerService`, increments `encounterCount`.
2. **`playCard`**: validates card+companion, deducts energy (with cost reduction from `ICompanionAbilityService`), resolves effect (normal vs enhanced), applies passive modifiers, applies bonus post-play effects, handles `apply_status`, marks killed enemies, checks all-dead → `collectRewards`.
3. **`endTurn`**: refills companion energy, ticks `turnStart` statuses, each living enemy selects a weighted-random attack and applies it to a random living companion, applies retaliation damage, ticks `turnEnd` statuses, advances turn counter, checks all-dead.
4. **`collectRewards`** (private): distributes gold, splits EXP evenly across companions, generates `PendingCardReward` entries (Fisher-Yates shuffle of the killer companion's priceDeck tier), processes level-ups via `ILevelingService`, sets `battle.active = false`.
5. **`resolveTargets`** (private): maps `target` string + `targetIds` to a list of `BattleEnemy` or `Companion`.
6. **`selectAttack`** (private): weighted random pick from `EnemyAttack[]`.

#### Tricky Spots
- **`midState` pattern**: the TS code builds an intermediate `GameState` before calling `effectService.apply`, then extracts the updated battle/companions. Replicate the same flow.
- **Retaliation inside `endTurn`**: after each enemy attack, checks `getRetaliationDamage` on the target companion and applies a synthetic damage effect back to the enemy.
- **`killedByCompanionId` stamping**: enemies at 0 HP without a killer get stamped with the attacking companion's id (in `playCard`) or the first living companion (in `endTurn` for status-kill edge case).

## Validation
```powershell
dotnet build
```
All 3 services + interfaces compile. The DI wiring isn't done yet — that's Phase 8.
