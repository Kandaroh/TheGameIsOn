# TheGameIsOn Architecture

> Full interface definitions: [docs/data-model.md](data-model.md)  
> Full endpoint list: [docs/api-reference.md](api-reference.md)  
> Battle logic deep-dive: [docs/battle-system.md](battle-system.md)  
> Frontend screens & components: [docs/frontend-guide.md](frontend-guide.md)

---

## Overview

Two-layer architecture:
- **`frontend/`** — Angular 17 SPA. Screen switching via `GameStateService.screen$` (no Angular Router). Feature modules for menu, map, battle, combat-results, card-reward, and event placeholders.
- **`backend/`** — Express 4 API. Layered as `routes → controllers → services → repo → models`. All state is JSON-serializable.

**Persistence:**
- Runtime state: `backend/data/saves/game-state.json`
- Static data: `backend/data/static/` — `card-effects.json`, `companions.json`, `enemies.json`, `events.json`

---

## Backend layer map

```
Routes (game.routes.ts)
  └─ Controller (game.controller.ts)
       ├─ BattleService      — card play, enemy AI, rewards, turn flow
       ├─ CardEffectService   — pure effect application (damage/shield/heal)
       ├─ EnemySpawnerService — spawn + level-scale enemies
       ├─ LevelingService     — EXP thresholds, level-up stat boosts
       ├─ DeckService         — draw, shuffle, build starting deck
       ├─ GameLogicService    — initial state, legacy move/play
       ├─ MapGeneratorService — layered graph + area zones
       ├─ EventSpawnerService — enforce spawn caps from events.json
       └─ CompanionService    — companion catalogue loader
           │
           ├─ Repos:
           │   ├─ StateRepository      (data/saves/game-state.json)
           │   ├─ CardEffectRepository  (data/static/card-effects.json)
           │   ├─ EnemyRepository       (data/static/enemies.json)
           │   └─ EventRepository       (data/static/events.json)
           │
           └─ Models: GameState, Player, Card, Companion, BattleState,
                      BattleEnemy, EnemyDefinition, EventDefinition, etc.
```

### Key services

| Service | File | Responsibility |
|---|---|---|
| `BattleService` | `services/battle.service.ts` | `startBattle()`, `playCard()`, `endTurn()`, `collectRewards()` |
| `CardEffectService` | `services/card-effect.service.ts` | `apply(effect, source, targets, state)` — damage, shield, heal |
| `EnemySpawnerService` | `services/enemy-spawner.service.ts` | Filter pool → roll spawn chance → scale level/HP/rewards |
| `LevelingService` | `services/leveling.service.ts` | `processLevelUps()`, `withNextLevelExp()` |
| `DeckService` | `services/deck.service.ts` | `drawCards()`, `buildStartingDeck()` |
| `EventSpawnerService` | `services/event-spawner.service.ts` | `assignEvents(nodes)` — enforce min/max from `events.json` |
| `MapGeneratorService` | `services/map-generator.service.ts` | Layered graph with area zones (forest → dungeon → ruins → volcano) |

### Repositories

| Repo | Static file | Cache | Notes |
|---|---|---|---|
| `CardEffectRepository` | `data/static/card-effects.json` | `Map<string, CardEffect>` | |
| `EnemyRepository` | `data/static/enemies.json` | `Map<string, EnemyDefinition>` | Warns if any enemy has ≠ 3 attacks |
| `EventRepository` | `data/static/events.json` | `Map<string, EventDefinition>` | `getByType(type)` convenience method |
| `StateRepository` | `data/saves/game-state.json` | — | Migration guards for `encounterCount`, `nextLevelExp` |

---

## Frontend layer map

See [docs/frontend-guide.md](frontend-guide.md) for full detail.

| Layer | Key files |
|---|---|
| Root shell | `app.component.ts` — `*ngIf` screen switching |
| State management | `GameStateService` — `state$`, `screen$`, `endTurnResult$` |
| API layer | `ApiService` — HTTP calls to `localhost:4000` |
| Shared components | `CardFrameComponent`, `CardPreviewComponent`, `PlayerInfoPanelComponent` |
| Feature screens | `menu/`, `map/`, `battle/`, `combat-results/`, `card-reward/`, `events/` |

### Shared components added in Plans 01–04

| Component | Purpose | Trigger |
|---|---|---|
| `CardPreviewComponent` | Floating card preview on hover | `CardPreviewService.show(card, x, y)` |
| `PlayerInfoPanelComponent` | Slide-out panel with Deck + Companions tabs | `GameStateService.togglePlayerInfo()` |
| `AttackResultPopupComponent` | Modal showing enemy turn actions | `endTurnResult$` emission after `endTurn()` |

---

## Events system

Event definitions are data-driven via `backend/data/static/events.json`. Each `EventDefinition` specifies:
- `type` — matches `NodeEventType`
- `spawnRules` — `{ min, max, allowedAreas }` enforced by `EventSpawnerService`
- `monsterSpawning` — optional `MonsterSpawnConfig` for combat events

See [docs/game-events-spec.md](game-events-spec.md) for the full event table.

---

## Enemy turn action log

`BattleState.lastTurnActions` (`EnemyTurnAction[]`) is populated each time `endTurn()` runs and consumed by the frontend to show the `AttackResultPopupComponent`. Each entry records:

`{ enemyId, enemyName, attackName, targetId, targetName, damageDealt, killedTarget }`

`damageDealt` is computed as `targetHpBefore − targetHpAfter` (positive = damage, negative = healing).

---

## Extension patterns

### Add a new card effect action

1. Add the action string to `CardEffectAction` in `backend/src/models/card-effect.ts`.
2. Add a `case` in `CardEffectService.apply()` (`backend/src/services/card-effect.service.ts`).
3. Add effect record(s) to `backend/data/static/card-effects.json`.
4. Set `effectId` / `enhancedEffectId` on the relevant card(s).

### Add a new card property

1. Update `backend/src/models/card.ts`.
2. Mirror in `frontend/src/app/shared/models/card.model.ts`.
3. Update `CardFrameComponent` if the property needs display.

### Add a new node event type

1. Add to `NodeEventType` in `backend/src/models/node-event.ts`.
2. Mirror in `frontend/src/app/shared/models/node.model.ts`.
3. Add an `EventDefinition` entry in `backend/data/static/events.json`.
4. Create a frontend component under `features/events/<name>/`.
5. Wire into `app.component.ts` template with `*ngIf` on `currentEvent$`.

### Add a new API endpoint

1. Route: `backend/src/routes/game.routes.ts`.
2. Controller method: `backend/src/controllers/game.controller.ts`.
3. Service logic: appropriate service (`BattleService` for battle, `GameLogicService` for map, etc.).
4. Frontend: add method to `ApiService`, expose in `GameStateService`, pipe response into `state$`.

### Add a new enemy

Add a JSON object to `backend/data/static/enemies.json`. Must have exactly 3 attacks. Each attack needs an `effectId` pointing to `card-effects.json`.

### Add a new companion

Add a JSON object to `backend/data/static/companions.json` with `priceDecks` (common/uncommon/rare card arrays).

---

## Naming rationale

- `features/` — UI screens and user-facing workflows.
- `shared/models/` — serializable game domain types (mirrored from backend).
- `shared/services/` — reusable client services.
- `shared/components/` — reusable UI components (card frame, preview, player info).
- `routes/` → `controllers/` → `services/` → `repo/` → `models/` — clean backend layering.
