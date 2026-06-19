# Data Model Reference

Every interface listed here is defined in `backend/src/models/` and mirrored in `frontend/src/app/shared/models/` (with the suffix `.model.ts`). When changing any interface, **update both files**.

---

## GameState

> `backend/src/models/game-state.ts` · `frontend: game-state.model.ts`

| Field | Type | Notes |
|-------|------|-------|
| `player` | `Player` | |
| `graph` | `Graph` | Map nodes + edges |
| `cards` | `Card[]` | Master card catalogue for this run |
| `companions` | `Companion[]` | The 3 selected companions |
| `history` | `string[]` | Plain-text audit log |
| `battle?` | `BattleState` | Present only during a battle encounter |

---

## Player

> `backend/src/models/player.ts` · `frontend: player.model.ts`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `life` | `number` | |
| `mana` | `number` | Legacy — unused in battle flow |
| `deck` | `Deck` | `{ cardIds: string[] }` |
| `hand` | `string[]` | Card IDs currently in hand |
| `discard` | `string[]` | Card IDs in discard pile |
| `position` | `string` | Current node ID on the map |
| `gold` | `number` | Accumulated gold from rewards |
| `encounterCount` | `number` | Total battles started — drives enemy level scaling |

---

## Card

> `backend/src/models/card.ts` · `frontend: card.model.ts`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Unique within a run |
| `name` | `string` | |
| `cost` | `number` | Energy cost to play |
| `type` | `'attack' \| 'defense' \| 'utility'` | Matches companion type for enhancement |
| `element?` | `CardElement` | `fire \| water \| earth \| air \| arcane \| shadow \| light \| neutral` |
| `description?` | `string` | |
| `sprite?` | `string` | Image URL |
| `target?` | `CardTarget` | `'companion' \| 'wildMonster' \| 'deck' \| 'discard'` |
| `targetNumber?` | `CardTargetNumber` | `1 \| 2 \| 'ALL'` |
| `properties?` | `Record<string, unknown>` | Legacy catch-all |
| `effectId?` | `string` | Points to `CardEffect` in `card-effects.json` |
| `enhancedEffectId?` | `string` | Enhanced variant when `card.type === companion.type` |
| `effect?` | `CardEffectRef` | `{ description: string }` — display only |
| `enhancedEffect?` | `CardEffectRef` | Display only |

---

## CardEffect

> `backend/src/models/card-effect.ts` · Static data: `backend/data/static/card-effects.json`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | e.g. `fx-strike-normal` |
| `description` | `string` | |
| `action` | `CardEffectAction` | `damage \| shield \| heal \| evade \| evade_draw \| draw` |
| `value` | `number` | |
| `target` | `CardEffectTarget` | `wildMonster \| companion \| deck \| discard` |

---

## Companion

> `backend/src/models/companion.ts` · `frontend: companion.model.ts`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Stamped as `{defId}-{idx}` at selection |
| `name` | `string` | |
| `type` | `'attack' \| 'defense' \| 'utility'` | |
| `element?` | `CardElement` | |
| `life` | `number` | Current HP |
| `maxLife?` | `number` | |
| `energy` | `number` | Current energy |
| `maxEnergy?` | `number` | |
| `energyRefill` | `number` | Energy restored per turn |
| `sprite?` | `string` | |
| `priceDecks` | `CompanionPriceDecks` | `{ common, uncommon, rare }` — each `Card[]` |
| `level` | `number` | |
| `exp` | `number` | |
| `nextLevelExp?` | `number` | Computed by `LevelingService` |
| `specialAbilities` | `SpecialAbility[]` | |
| `statusEffects?` | `StatusEffect[]` | **Placeholder — not yet used** |

### SpecialAbility

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `name` | `string` | |
| `description` | `string` | |
| `trigger` | `'passive' \| 'activable'` | |
| `unlocksAtLevel` | `number` | |
| `usesPerCombat` | `number \| null` | `null` = unlimited (passive) |
| `effectId` | `string` | Points to `CardEffect` |

---

## BattleState

> `backend/src/models/battle-state.ts` · `frontend: battle-state.model.ts`

| Field | Type | Notes |
|-------|------|-------|
| `active` | `boolean` | `false` after all enemies die and rewards are collected |
| `enemies` | `BattleEnemy[]` | |
| `turn` | `number` | Incremented at end of each player turn |
| `log` | `string[]` | Battle event log |
| `pendingCardRewards` | `PendingCardReward[]` | Populated on victory |
| `lastTurnActions?` | `EnemyTurnAction[]` | Populated each `endTurn()` — cleared next turn |

### BattleEnemy

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Unique runtime ID (contains timestamp) |
| `definitionId` | `string` | Links back to `EnemyDefinition.id` |
| `name` | `string` | |
| `life` / `maxLife` | `number` | |
| `shield` | `number` | |
| `energy` / `maxEnergy` | `number` | |
| `element?` | `string` | |
| `type?` | `string` | Creature type (e.g. "Beast") |
| `level` | `number` | Computed at spawn time |
| `expReward` | `number` | Scaled by level delta |
| `rewards` | `EnemyReward[]` | |
| `killedByCompanionId?` | `string` | Set when enemy reaches 0 HP |
| `statusEffects?` | `StatusEffect[]` | **Placeholder — not yet used** |

### EnemyTurnAction

| Field | Type | Notes |
|-------|------|-------|
| `enemyId` | `string` | |
| `enemyName` | `string` | |
| `attackName` | `string` | |
| `targetId` | `string` | |
| `targetName` | `string` | |
| `damageDealt` | `number` | `targetHpBefore − targetHpAfter`. Negative = healing. |
| `killedTarget` | `boolean` | |

### StatusEffect (placeholder)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `name` | `string` | |
| `turnsRemaining` | `number \| null` | `null` = permanent |

### PendingCardReward

| Field | Type | Notes |
|-------|------|-------|
| `companionId` | `string` | Companion that earned this reward |
| `cardOptions` | `Card[]` | 1–3 cards to choose from |

---

## EnemyDefinition

> `backend/src/models/enemy.ts` · Static data: `backend/data/static/enemies.json`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `name` | `string` | |
| `type` | `string` | Creature category |
| `element?` | `CardElement` | |
| `baseLife` | `number` | Scaled at spawn |
| `baseEnergy` | `number` | |
| `attacks` | `EnemyAttack[]` | **Must be exactly 3** |
| `spawnChance` | `number` | 0–1 probability weight |
| `specialAbilities` | `SpecialAbility[]` | |
| `spawnArea?` | `string` | If set, enemy only spawns in that zone |
| `level` | `number` | Base level |
| `expReward` | `number` | Base EXP |
| `rewards` | `EnemyReward[]` | |

### EnemyAttack

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `name` | `string` | |
| `type` | `'attack' \| 'defense' \| 'utility'` | |
| `element?` | `CardElement` | |
| `targeting` | `CardTarget` | |
| `targetNumber` | `CardTargetNumber` | |
| `effectId` | `string` | Points to `CardEffect` |
| `selectionChance` | `number` | Relative weight — normalised at runtime |

### EnemyReward

| Field | Type | Notes |
|-------|------|-------|
| `type` | `'gold' \| 'exp' \| 'card-draw'` | |
| `value` | `number` | |
| `tier?` | `'common' \| 'uncommon' \| 'rare'` | Only for `card-draw` |

---

## EventDefinition

> `backend/src/models/event-definition.ts` · Static data: `backend/data/static/events.json`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `type` | `string` | Matches `NodeEventType` |
| `displayName` | `string` | |
| `description` | `string` | |
| `icon` | `string` | Emoji |
| `spawnRules` | `EventSpawnRules` | `{ min, max, allowedAreas }` |
| `monsterSpawning` | `MonsterSpawnConfig \| null` | `null` for non-combat events |
| `extraRules` | `string[]` | |
| `notes` | `string` | |

### MonsterSpawnConfig

| Field | Type | Notes |
|-------|------|-------|
| `poolFilter` | `{ areas?, minLevel?, maxLevel? }` | |
| `countMin` / `countMax` | `number` | Enemy count range |
| `difficultyModifier` | `number` | Multiplier on HP/stats |

---

## Graph / Node / NodeEvent

> `backend/src/models/graph.ts`, `node.ts`, `node-event.ts`

**Graph:** `{ nodes: NodeDefinition[], edges: { from: string, to: string }[] }`

**NodeDefinition:** `{ id, title, icon?, layout?: { x: number, y: number }, event: NodeEvent }`

**NodeEvent:** `{ type: NodeEventType | string, area?: MapArea, payload?: Record<string, unknown> }`

**NodeEventType:** `'battle' | 'treasure' | 'rest' | 'hard battle' | 'new object' | 'power up' | 'start' | 'end'`

**MapArea:** `'forest' | 'dungeon' | 'ruins' | 'volcano'`
