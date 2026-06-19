# Game Events Specification

> Data source: `backend/data/static/events.json` (loaded by `EventRepository`).  
> Model: `EventDefinition` in `backend/src/models/event-definition.ts`.  
> Enforcement: `EventSpawnerService.assignEvents()` in `backend/src/services/event-spawner.service.ts`.

---

## Event types

| Event type | Icon | Spawn min | Spawn max | Combat? | Frontend component |
|---|:---:|---:|---:|:---:|---|
| `battle` | ⚔️ | 0 | unlimited | Yes | `features/battle/battle.component.ts` |
| `hard battle` | 💀 | 2 | 5 | Yes | `features/events/hard-battle/hard-battle.component.ts` |
| `rest` | 🛌 | 0 | 2 | No | `features/events/rest/rest.component.ts` |
| `new object` | 🪄 | 2 | 4 | No | `features/events/new-object/new-object.component.ts` |
| `power up` | ⚡ | 3 | 6 | No | `features/events/power-up/power-up.component.ts` |
| `treasure` | 🎁 | — | — | No | Shares `new-object` component |
| `start` | 🏁 | 1 | 1 | No | (map only — no event screen) |
| `end` | 🏆 | 1 | 1 | No | `features/events/end/end.component.ts` |

Spawn rules are defined per-event in `events.json` under `spawnRules: { min, max, allowedAreas }`. `max: null` means unlimited.

---

## Monster spawning config

Combat events (`battle`, `hard battle`) include a `monsterSpawning` block in their `EventDefinition`:

```json
{
  "poolFilter": { "areas": ["forest", "dungeon"], "minLevel": 1, "maxLevel": 5 },
  "countMin": 1,
  "countMax": 3,
  "difficultyModifier": 1.0
}
```

`EnemySpawnerService` uses this config to filter the enemy pool, roll spawn chances, and scale difficulty. Non-combat events have `monsterSpawning: null`.

---

## Map area zones

The map generator assigns zones based on layer depth (see `MapGeneratorService.areaForLayer()`):

| Layer progression | Zone |
|---|---|
| Early layers | `forest` |
| Mid layers | `dungeon` |
| Late layers | `ruins` |
| Final layers | `volcano` |

Zones are stored on `NodeEvent.area` and passed to `EnemySpawnerService` to filter the enemy pool. Enemies with `spawnArea` only appear in matching zones; enemies without `spawnArea` appear everywhere.

---

## Spawn enforcement

`EventSpawnerService.assignEvents(nodes)` runs after map generation:

1. **Max caps:** if any event type exceeds its max count, excess nodes are demoted to `battle`.
2. **Min caps:** if any event type is below its min count, `battle` nodes are promoted to that type.

Priority: upper limits are enforced before lower limits. The algorithm cannot violate path connectivity.

---

## Frontend event routing

When `GameStateService.moveToNode()` lands on a non-battle event:
1. `currentEvent$.next(event.type)`
2. `screen$.next('event')`
3. `AppComponent` renders the matching event component via `*ngIf` on `currentEvent$`.

---

## UI template for event pages

All event placeholder components follow this structure:
- Back button → `GameStateService.goBack()`
- Header with event name + icon
- Description body
- Optional action buttons
- Uses existing `.menu-screen` / `.map-screen` layout styles

Components live under `frontend/src/app/features/events/<event-name>/` and are declared directly in `AppModule`.
