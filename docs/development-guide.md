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
3. Update card rendering in `frontend/src/app/features/battle/battle.component.ts`.

### Adding a new player action

1. Add an API endpoint in `backend/src/routes/game.routes.ts`.
2. Add the controller method in `backend/src/controllers/game.controller.ts`.
3. Add the business logic in `backend/src/services/game-logic.service.ts`.
4. Add a corresponding method in `frontend/src/app/shared/services/api.service.ts`.
5. Expose the action in the UI using `GameStateService`.

## State persistence

Persistent game state is stored in JSON at `backend-data/game-state.json`.

The backend will generate an initial seeded game state if the file does not exist.

## Frontend screen flow

- `MenuComponent` shows the start menu and options.
- `MapComponent` shows the graph, the current node, and selectable next nodes.
- `BattleComponent` shows the card hand, drag-and-drop play area, and player stats.

The current screen is managed by `GameStateService.screen$`.

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

## Debugging the Start button

- If the Start button does nothing, verify the backend is reachable by POSTing to `/api/game/action/new-run` (PowerShell example shown earlier). If the API responds with JSON, open browser DevTools → Network and Console while clicking Start to see whether the request is issued and whether any errors occur. The frontend method called is `GameStateService.startNewRun()` which calls `ApiService.newRun()`.
