# Services

## GameLogicService
`backend/src/services/game-logic.service.ts`

Central game-rule engine. Stateless; operates on passed-in `GameState` and returns a new one.

### Methods
| Method | Signature | Notes |
|--------|-----------|-------|
| `createInitialState` | `() → GameState` | Builds 6-card catalogue, calls `MapGeneratorService.generate()`, then `EventSpawnerService.assignEvents()`, sets player at `'start'` with `life:20 mana:3 hand:[strike,shield,focus]` |
| `movePlayer` | `(state, nextNodeId) → GameState` | Validates that an edge `from:player.position to:nextNodeId` exists. On success updates `player.position`. On failure appends invalid-move log to `history`, state unchanged. |
| `playCard` | `(state, cardId) → GameState` | Guards: card in `cards`, card in `player.hand`, `card.cost <= player.mana`. On success deducts mana, removes card from hand, pushes to discard. On failure appends error log. |

---

## MapGeneratorService
`backend/src/services/map-generator.service.ts`

Generates a directed acyclic layered graph.

### `generate(options?)`
Options: `{ minNodes, maxNodes, minLayers, maxLayers }` (defaults 20-24 nodes, 5-7 layers).

Algorithm:
1. Pick `totalNodes` in range; pick `layerCount`.
2. Distribute `totalNodes - 2` intermediate nodes evenly across `layerCount - 2` layers.
3. Build `start` node (layer 0) and `end` node (last layer).
4. For each intermediate layer assign a random `NodeEventType` via weighted random (55% battle, 20% treasure, 10% rest, 8% hard battle, 4% new object, 3% power up).
5. Connect layers: each source node connects to 1-2 nearest targets by x-position; every target guaranteed ≥1 incoming edge.
6. Add skip-layer (cross-layer) edges with 18% probability per source node.
7. Layout: `x` 15-85 spread, `y` 0-100 percentage.

Node icons: `⚔️ battle`, `💀 hard battle`, `🪄 new object`, `⚡ power up`, `🎁 treasure`, `🛌 rest`, `🏁 start/end`.

---

## EventSpawnerService
`backend/src/services/event-spawner.service.ts`

Enforces spawn-count rules on generated node lists.

### Event specs (caps)
| Event type | min | max |
|---|---|---|
| battle | 0 | unlimited |
| rest | 0 | 2 |
| hard battle | 2 | 5 |
| new object | 2 | 4 |
| power up | 3 | 6 |

### Methods
| Method | Description |
|--------|-------------|
| `getSpecs()` | Returns all `EventSpec[]` |
| `validateCount(eventType, count)` | Returns `{ valid, reason? }` |
| `assignEvents(nodes)` | Mutates nodes: trims events exceeding max (→ 'battle'), then promotes 'battle' nodes to meet min caps. Skips `start`/`end` nodes. |

---

## CompanionService
`backend/src/services/companion.service.ts`

Loads companion catalogue from `backend-data/companions.json`; falls back to 6 hardcoded companions if file is missing. Result is in-memory cached after first load.

### Default companions
| id | type | life | energy | energyRefill |
|----|------|------|--------|--------------|
| wyvern | attack | 26 | 3 | 1 |
| golem | defense | 28 | 2 | 1 |
| sprite | utility | 20 | 4 | 2 |
| lich | attack | 22 | 3 | 1 |
| turtle | defense | 24 | 2 | 1 |
| griffin | utility | 23 | 3 | 2 |

Each companion has `priceDecks: { common[], uncommon[], rare[] }` with companion-specific `Card` entries.

---

## PersistenceService
`backend/src/services/persistence.service.ts`

File-based JSON persistence for `GameState`.

| Method | Description |
|--------|-------------|
| `loadState()` | Reads file at `this.path`; on any error returns `GameLogicService.createInitialState()` |
| `saveState(state)` | JSON-stringifies with 2-space indent; creates parent directory if needed |

Constructed with a file path string. Used by `StateRepository` with path `backend-data/game-state.json`.
