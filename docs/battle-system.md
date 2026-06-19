# Battle System

Complete reference for battle flow, card play resolution, enemy AI, effect application, and reward collection.

Source files:
- `backend/src/services/battle.service.ts` — orchestrator
- `backend/src/services/card-effect.service.ts` — pure effect application
- `backend/src/services/enemy-spawner.service.ts` — enemy instantiation
- `backend/src/services/leveling.service.ts` — EXP thresholds + level-up boosts
- `backend/data/static/card-effects.json` — effect catalogue
- `backend/data/static/enemies.json` — enemy definitions + attacks

---

## Turn flow overview

```
┌─────────────────────────────────────────────────────────────┐
│  BATTLE START  (POST /action/battle/start)                  │
│  1. Clear hand                                              │
│  2. Draw 5 cards (reshuffle discard if needed)              │
│  3. Spawn enemies via EnemySpawnerService                   │
│  4. Increment player.encounterCount                         │
│  5. Seed BattleState { active: true, turn: 1 }              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PLAYER TURN                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ drawCard  (POST /action/battle/draw-card)             │  │
│  │  → DeckService.drawCards(state, 1)                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ playCard  (POST /action/battle/play-card)             │  │
│  │  → Validate: battle active, card in hand, energy ≥    │  │
│  │  → Deduct energy, move card hand → discard            │  │
│  │  → Resolve effect (enhanced if card.element matches) │  │
│  │  → CardEffectService.apply(effect, source, targets)   │  │
│  │  → If all enemies dead → collectRewards()             │  │
│  └───────────────────────────────────────────────────────┘  │
│  (repeat draw/play until player clicks End Turn)            │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  END TURN  (POST /action/battle/end-turn)                   │
│  1. Refill companion energy (min(energy + refill, max))     │
│  2. For each living enemy:                                  │
│     a. Load EnemyDefinition via EnemyRepository             │
│     b. selectAttack() — weighted random from 3 attacks      │
│     c. Pick random living companion as target               │
│     d. Load CardEffect via effectId                         │
│     e. Capture target HP before                             │
│     f. CardEffectService.apply(effect, enemy, [target])     │
│     g. Compute damageDealt = hpBefore − hpAfter             │
│     h. Record EnemyTurnAction                               │
│  3. Attach turnActions → battle.lastTurnActions              │
│  4. Increment battle.turn                                   │
│  5. If all enemies dead → collectRewards()                  │
│  6. Return updated GameState                                │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND AFTER END TURN                                    │
│  1. state$.next(updatedState)                               │
│  2. Emit endTurnResult$ with lastTurnActions                │
│  3. BattleComponent shows AttackResultPopupComponent        │
│  4. User clicks "Continue" → popup dismissed                │
│  5. If battle.active === false → navigate to combat-results │
└─────────────────────────────────────────────────────────────┘
```

---

## Card play resolution detail

```
playCard(state, cardId, companionId, targetIds?)
  │
  ├─ Validate battle.active
  ├─ Find card in state.cards where id in player.hand
  ├─ Find companion by companionId
  ├─ Check card.cost ≤ companion.energy
  │
  ├─ Deduct energy: companion.energy -= card.cost
  ├─ Move card: hand → discard
  │
  ├─ Determine enhancement:
  │    enhanced = (card.element !== 'neutral' && card.element === companion.element)
  │    effectId = enhanced ? card.enhancedEffectId : card.effectId
  │
  ├─ Load CardEffect from CardEffectRepository
  ├─ Resolve targets via resolveTargets(effect.target, targetIds)
  │    'wildMonster' → filter enemies by targetIds (or first living)
  │    'companion'   → filter companions by targetIds (or all living)
  │
  ├─ CardEffectService.apply(effect, companion, targets, state)
  │
  ├─ Mark enemies with life ≤ 0 → killedByCompanionId = companionId
  │
  └─ If all enemies dead → collectRewards(state)
```

---

## Effect application (`CardEffectService`)

| Action | Behaviour |
|--------|-----------|
| `damage` | For each target: absorb through shield first (`dmg = max(0, value - shield)`), reduce life. If enemy reaches 0 HP and source is a Companion → set `killedByCompanionId`. |
| `shield` | Add `value` to source companion's shield. |
| `heal` | Restore source companion's life up to `maxLife`. |
| `evade` | No-op stub. |
| `evade_draw` | No-op stub. |
| `draw` | No-op stub. |

All methods return a **new** `GameState` — no in-place mutations.

---

## Enemy attack selection

`BattleService.selectAttack(attacks: EnemyAttack[])`

1. Sum all `selectionChance` weights.
2. Roll `Math.random() * total`.
3. Iterate attacks; subtract each weight from roll. Return first attack where `roll ≤ 0`.
4. Fallback: return last attack.

Weights are **relative** — they do not need to sum to 1. Example: `[0.5, 0.3, 0.2]` and `[5, 3, 2]` produce identical distributions.

---

## Enemy spawning

`EnemySpawnerService.spawnEnemies(context: SpawnContext)`

1. If `context.eventId` is set → load `MonsterSpawnConfig` from `events.json`.
2. Filter enemy pool by area + level range.
3. Roll each candidate against `spawnChance * difficultyMultiplier`.
4. Enforce `countMin` ≤ count ≤ `countMax`.
5. Compute runtime level: `def.level + floor(encounterCount * 0.5) + (hard ? 1 : 0)`.
6. Scale HP: `round(baseLife * (1 + levelDelta * 0.15) * difficultyModifier)`.
7. Scale gold/exp rewards: `round(value * (1 + levelDelta * 0.2))`.

---

## Reward collection

`BattleService.collectRewards(state)` — called when all enemies reach 0 HP.

For each dead enemy, for each reward in `enemy.rewards`:

| Reward type | Logic |
|-------------|-------|
| `gold` | Add `value` to `player.gold` |
| `exp` | Split equally among all companions (remainder to first) |
| `card-draw` | Companion that dealt killing blow draws from their `priceDecks[tier]`. Fisher-Yates shuffle pool, pick up to 3 options, stamp unique IDs. Added to `pendingCardRewards`. |

After rewards: `LevelingService.processAll(companions)` handles any level-ups.

Battle is marked `active: false` with `pendingCardRewards` populated.

---

## Leveling

`LevelingService` — source: `backend/src/services/leveling.service.ts`

| Parameter | Value |
|-----------|-------|
| EXP threshold | `level * 100` |
| HP per level-up | +3 `maxLife` (current HP also +3, capped at new max) |
| Energy per level-up | +1 `maxEnergy` every 3 levels |

`nextLevelExp` is stamped on the companion so the frontend never computes thresholds.

---

## Frontend components involved

| Component | File | Role |
|-----------|------|------|
| `BattleComponent` | `features/battle/battle.component.ts` | Main battle UI — hand, arena, side panel |
| `AttackResultPopupComponent` | `features/battle/attack-result-popup.component.ts` | Modal showing `lastTurnActions` after end-turn |
| `CombatResultsComponent` | `features/combat-results/combat-results.component.ts` | Post-battle summary (EXP, gold, rewards) |
| `CardRewardComponent` | `features/card-reward/card-reward.component.ts` | Pick one card from `pendingCardRewards` options |

### Frontend end-turn flow

1. `BattleComponent.endTurn()` → `GameStateService.endTurn()`
2. `GameStateService` calls `ApiService.battleEndTurn()`, receives updated state.
3. `state$.next(updated)` — all template bindings refresh.
4. If `lastTurnActions.length > 0` → emit on `endTurnResult$` Subject.
5. `BattleComponent` subscription sets `showAttackPopup = true` + `attackActions = actions`.
6. `AttackResultPopupComponent` renders with `*ngIf="showAttackPopup"`.
7. User clicks "Continue" → `dismissAttackPopup()` sets `showAttackPopup = false`.
8. If `battle.active === false` → `GameStateService.goToCombatResults()`.
