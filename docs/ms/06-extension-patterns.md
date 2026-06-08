# Extension Patterns

Conventions observed in the existing code that should be followed when adding features.

## Adding a new API endpoint
1. Add handler method to `GameController`.
2. Register route in `game.routes.ts` under `/api/game/…`.
3. No need to touch `server.ts` or `index.ts`.

## Adding a new service
- Create `backend/src/services/<name>.service.ts` exporting a class.
- Instantiate directly in the controller or in the service that needs it (no DI container is used).
- Keep services stateless where possible; pass state in, return new state out.

## Adding a new node event type
1. Add the string literal to `NodeEventType` in `models/node-event.ts`.
2. Add an icon entry in `MapGeneratorService.nodeIcons`.
3. Add a `nodeTitle` case in `MapGeneratorService`.
4. Optionally add an `EventSpec` entry in `EventSpawnerService.EVENT_SPECS` with min/max caps.
5. Update `randomEventType()` weights in `MapGeneratorService` if it should appear during map generation.

## Adding a new card
- Push a `Card` object to the `cards` array in `GameLogicService.createInitialState()`.
- Add its `id` to `deck.cardIds` if it should start in the player's deck.
- Card effects are resolved client-side (frontend); `properties` is a free-form map.

## Adding a new companion
- Add an entry to the array in `CompanionService.defaultCompanions()`.
- Or add to `backend-data/companions.json` (takes precedence; cached after first read).

## Persistence
- Only `GameState` is persisted server-side (one file).
- `CompanionService` has its own path; its file is read-only from the backend's perspective.
- Adding a new top-level field to `GameState` requires no migration; missing fields are `undefined` when loading old saves.

## State mutation pattern
```
load → pure transform function → save → respond with result
```
All `GameLogicService` methods are pure: they receive a state, return a new state, and never mutate the input.
