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
1. Add an entry to `backend/backend-data/card-effects.json` for the normal effect and (if needed) the enhanced variant.
2. Push a `Card` object to the `cards` array in `GameLogicService.createInitialState()`, populating `effectId` / `enhancedEffectId` to match the JSON keys.
3. Add its `id` to `deck.cardIds` if it should start in the player's deck.
4. The `properties` bag can still carry legacy/display values, but all combat resolution now reads from `card-effects.json` via `CardEffectRepository`.

## Adding a new card effect action
1. Add the new action string to `CardEffectAction` in `backend/src/models/card-effect.ts`.
2. Add a matching `case` in `BattleService.applyEffect()` in `backend/src/services/battle.service.ts`.
3. Add effect records to `backend/backend-data/card-effects.json` using the new action.
4. No frontend changes are required — the backend returns the mutated `GameState`.

## Adding a new companion
- Add an entry to the array in `CompanionService.defaultCompanions()`.
- Or add to `backend-data/companions.json` (takes precedence; cached after first read).

## Persistence
- Only `GameState` is persisted server-side (one file: `backend-data/game-state.json`).
- `CompanionService` has its own path (`companions.json`); read-only from the backend's perspective.
- `CardEffectRepository` reads `card-effects.json`; also read-only and process-lifetime cached.
- Adding a new top-level field to `GameState` requires no migration; missing fields deserialize as `undefined` when loading old saves.

## State mutation pattern
```
load → pure transform function → save → respond with result
```
All service methods (`GameLogicService`, `BattleService`) are pure: they receive a state, return a new state, and never mutate the input. `BattleService.playCard()` is `async` only because it awaits the `CardEffectRepository` cache read.

## Adding a battle action endpoint
1. Add a handler method to `GameController` following the `load → battleService.xxx() → save → respond` pattern.
2. Register the route in `game.routes.ts` under `/api/game/action/battle/…`.
3. Add the corresponding method to `ApiService` in the frontend.
4. Call it from `GameStateService` and pipe the returned state into `state$`.
