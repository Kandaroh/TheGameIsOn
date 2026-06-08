# Development Guide

## Project intent

This project is designed to be easy to extend with new game features, new node events, and new player actions.

The frontend and backend are deliberately separated:
- `frontend/` handles screen composition, user interaction, and state presentation.
- `backend/` handles validation, persistence, and game rules.

## Key extension points

### Adding a new node event

1. Add the event type to `backend/src/models/node-event.ts`.
2. Add the same event type to `frontend/src/app/shared/models/node.model.ts`.
3. Implement backend handling in `backend/src/services/game-logic.service.ts` or a dedicated event service.
4. Display the new event in frontend components such as `MapComponent` or `BattleComponent`.

### Adding a new card property

1. Extend `backend/src/models/card.ts` with the new property.
2. Extend `frontend/src/app/shared/models/card.model.ts` with the same shape.
3. Update card rendering in the `CardFrameComponent` / `BattleComponent` as needed.

### Adding a new card effect

1. Add a record (or records) to `backend/backend-data/card-effects.json` with a unique `id`, `action`, `value`, and `target`.
2. Set `effectId` / `enhancedEffectId` on the relevant `Card` in `GameLogicService.createInitialState()` (or `DeckService.buildStartingDeck()` for companion cards).
3. If the `action` is new, add it to `CardEffectAction` in `backend/src/models/card-effect.ts` and add a `case` in `BattleService.applyEffect()`.

### Adding a new player action

1. Add an API endpoint in `backend/src/routes/game.routes.ts`.
2. Add the controller method in `backend/src/controllers/game.controller.ts`.
3. Add the business logic in a service (`GameLogicService` for map actions, `BattleService` for battle actions).
4. Add a corresponding method in `frontend/src/app/shared/services/api.service.ts`.
5. Expose the action in the UI via `GameStateService`; pipe the returned `GameState` into `state$`.

## State persistence

Persistent game state is stored in JSON at `backend-data/game-state.json`.

The backend will generate an initial seeded game state if the file does not exist.

## Frontend screen flow

| Screen | Component | Trigger |
|--------|-----------|---------|
| `menu` | `MenuComponent` | Default on load |
| `companion-select` | `CompanionSelectionComponent` | "Start" button → `beginCompanionSelection()` |
| `map` | `MapComponent` | Companion selection complete or `startNewRun()` |
| `battle` | `BattleComponent` | `moveToNode()` lands on a `battle` event node |
| `event` | Event placeholder components | `moveToNode()` lands on any non-battle event |

The current screen is managed by `GameStateService.screen$`.

### Battle screen data flow

1. `moveToNode()` detects `event.type === 'battle'` and calls `dealOpeningHand(state)`.
2. `dealOpeningHand` draws 5 cards and seeds `GameState.battle` with two default enemies (Wolf + Golem) if none exists yet, then saves to backend.
3. `BattleComponent` reads enemies from `state.battle.enemies` via `getEnemies(state)`; falls back to hardcoded list if `battle` is absent.
4. Card plays call `GameStateService.playCardWithCompanion()` → `ApiService.battlePlayCard()` → `POST /action/battle/play-card`.
5. End turn calls `GameStateService.endTurn()` → `ApiService.battleEndTurn()` → `POST /action/battle/end-turn`.
6. Both endpoints return the full updated `GameState`; the response is piped into `state$` so all bindings update in one tick.

## Running automated checks

- Backend spawn-rule unit tests (validate min/max per event):
```powershell
cd backend
npm run test:spawn
```
- Frontend crossing check (requires backend running and a generated run):
```bash
cd frontend
npm run test:cross
```

## Debugging tips

### Start button does nothing
Verify the backend is reachable: `POST /api/game/action/new-run`. If the API responds with JSON, open DevTools → Network while clicking Start. The frontend method called is `GameStateService.beginCompanionSelection()` → `ApiService.newRun()` followed by `ApiService.getCompanions()`.

### Card play has no effect
Check `GameState.history` and `GameState.battle.log` in the response from `POST /action/battle/play-card`. If `battle` is absent or `active` is `false` the service will log a rejection to history with a plain-text reason. Ensure `dealOpeningHand()` was called when entering the battle (it seeds `battle` before the first play).

### Enemy HP not changing
Confirm the card has a non-null `effectId` pointing to a record with `action: "damage"` in `card-effects.json`. Inspect the response JSON: `battle.enemies[*].life` should decrease. If `targetIds` is empty, `BattleService` auto-targets the first living enemy.
