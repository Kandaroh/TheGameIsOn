# Phase 6 — Services C (Map, Events, Companion Catalogue, Persistence, Game Logic)

## Goal
Port the remaining 5 services. These are simpler than Phase 5 and mostly self-contained.

## Services in This Phase

| TS File (~lines) | C# File | Interface | Dependencies |
|---|---|---|---|
| `map-generator.service.ts` (160) | `MapGeneratorService.cs` | `IMapGeneratorService` | None |
| `event-spawner.service.ts` (95) | `EventSpawnerService.cs` | `IEventSpawnerService` | `IEventRepository` |
| `companion.service.ts` (20) | `CompanionService.cs` | `ICompanionService` | `IConfiguration` (file path) |
| `persistence.service.ts` (35) | `PersistenceService.cs` | `IPersistenceService` | `IConfiguration`, `IGameLogicService` (for default state) |
| `game-logic.service.ts` (100) | `GameLogicService.cs` | `IGameLogicService` | `IMapGeneratorService`, `IEventSpawnerService` |

**Total TS to paste: ~410 lines.**

## Prompt Template
> Paste the 5 TS files plus the C# interface signatures from Phases 3–5, then:

```
Convert these 5 TypeScript services to C# in namespace TheGameIsOn.API.Services.

Rules:
- Constructor-inject all dependencies via their interfaces.
- MapGeneratorService has zero dependencies — pure algorithmic code.
- CompanionService is just a thin JSON-file reader (like a repo) —
  register as singleton and cache.
- PersistenceService takes a file path and provides load/save.
  It calls GameLogicService.CreateInitialState() when no save exists.
  Watch for circular dependency: inject IGameLogicService lazily or
  use Lazy<IGameLogicService>.
- GameLogicService.CreateInitialState() builds hardcoded starter cards,
  generates a map, assigns events, builds a default GameState.
- EventSpawnerService.AssignEvents mutates nodes in-place in the TS
  version — in C# return a new List<NodeDefinition> (or mutate, since
  this is a build-time step, not a game-state mutation).
```

## Per-Service Notes

### `MapGeneratorService`
- `AREA_PROGRESSION`: `forest → dungeon → ruins → volcano`.
- `generate(options)`: builds layered graph with random event types, positional layout, edges preferring nearby nodes, skip-layer connections at 18% chance.
- Helper methods: `distributeNodes`, `randomEventType`, `positionForLayer`, `pickNearestTargets`, `addExtraConnections`, `randomInt`, `randomPick`, `randomSubset`.
- `nodeIcons` dictionary — static readonly.
- All randomness via `Random.Shared`.

### `EventSpawnerService`
- `getSpecs()` → `GetSpecsAsync()`: returns `List<EventSpec>` derived from `EventRepository`.
- `validateCount(eventType, count)` → `ValidateCountAsync(string, int)`: returns `(bool Valid, string? Reason)`.
- `assignEvents(nodes)` → `AssignEventsAsync(List<NodeDefinition>)`: enforces min/max caps by demoting excess to `"battle"` and promoting `"battle"` nodes to under-represented types. **Skip `start` and `end` nodes.**

### `CompanionService`
Essentially identical to `BaseCardRepository` but reads `companions.json`. Could even be a repo — but keep the TS naming for parity.

### `PersistenceService`
- Constructor takes a file path string (resolved by `StateRepository` or injected via config).
- `loadState` → `LoadStateAsync()`: read file → deserialise → return `GameState`. On failure → call `defaultState()`.
- `saveState` → `SaveStateAsync(GameState)`: serialise → ensure directory → write file.
- `defaultState` → calls `IGameLogicService.CreateInitialStateAsync()`.

#### Circular Dependency Warning
`PersistenceService` → `GameLogicService` and `GameLogicService` doesn't depend on `PersistenceService`, so there's no cycle. But `StateRepository` uses both `PersistenceService` and `LevelingService` — that's fine, no cycle either.

### `GameLogicService`
- `createInitialState()` → `CreateInitialStateAsync()`:
  - Builds 6 hardcoded starter `Card` objects (strike, shield, focus, bash, heal, charge) — replicate exactly.
  - Calls `MapGeneratorService.Generate()`.
  - Calls `EventSpawnerService.AssignEventsAsync()`.
  - Returns a fresh `GameState` with default `Player`.
- `movePlayer(state, nextNodeId)` → `MovePlayer(GameState, string)`: validates edge exists, returns new state.
- `playCard(state, cardId)` → `PlayCard(GameState, string)`: validates card in hand + mana cost, moves to discard.

## Validation
```powershell
dotnet build
```
All 5 services compile. Full set of services is now complete.
