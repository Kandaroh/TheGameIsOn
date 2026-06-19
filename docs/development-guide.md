# Development Guide

> For full architecture, extension patterns, and file tree see [docs/index.md](index.md) and [docs/architecture.md](architecture.md).  
> For all interfaces see [docs/data-model.md](data-model.md).  
> For battle logic see [docs/battle-system.md](battle-system.md).  
> For frontend screens see [docs/frontend-guide.md](frontend-guide.md).

---

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

Persistent game state is stored in JSON at `backend/data/saves/game-state.json`.  
Static data lives in `backend/data/static/` (`card-effects.json`, `companions.json`, `enemies.json`, `events.json`).

The backend will generate an initial seeded game state if the save file does not exist.

## Frontend screen flow

| Screen | Component | Trigger |
|--------|-----------|---------|
| `menu` | `MenuComponent` | Default on load |
| `companion-select` | `CompanionSelectionComponent` | "Start" → `beginCompanionSelection()` |
| `map` | `MapComponent` | Companion selection complete or `startNewRun()` |
| `battle` | `BattleComponent` | `moveToNode()` lands on a `battle` event node |
| `event` | Event-specific component | `moveToNode()` lands on non-battle event |
| `combat-results` | `CombatResultsComponent` | Battle ends (`battle.active === false`) |
| `card-reward` | `CardRewardComponent` | `proceedFromResults()` with pending rewards |

The current screen is managed by `GameStateService.screen$`.

### Battle screen data flow

1. `moveToNode()` detects `event.type === 'battle'` → calls `POST /action/battle/start`.
2. Backend draws 5 cards, spawns enemies via `EnemySpawnerService`, seeds `BattleState`.
3. Card plays: `playCardWithCompanion()` → `POST /action/battle/play-card` → full `GameState` response.
4. End turn: `endTurn()` → `POST /action/battle/end-turn` → response includes `battle.lastTurnActions`.
5. Frontend shows `AttackResultPopupComponent` with enemy action summary.
6. If all enemies dead → `collectRewards()` → `battle.active = false` → navigate to `combat-results`.
7. Player claims rewards via `card-reward` screen, then returns to `map`.

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

| Problem | Fix |
|---|---|
| Start button does nothing | Check backend reachable: `POST /api/game/action/new-run`. Check DevTools → Network for `beginCompanionSelection()` calls. |
| Card play has no effect | Check `state.history` + `state.battle.log` for rejection message. Verify card has `effectId` pointing to `card-effects.json`. |
| Enemy HP not changing | Confirm `effectId` points to `action: "damage"`. If `targetIds` is empty, auto-targets first living enemy. |
| Enemy actions not showing | Check `state.battle.lastTurnActions` in API response. Verify enemies have valid `definitionId` in `enemies.json` with 3 attacks. |
