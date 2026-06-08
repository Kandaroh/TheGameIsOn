# Copilot Context: TheGameIsOn

Quick-start reference for AI assistants. Angular frontend (`menu` → `map` → `battle`) + Node.js backend with JSON-persisted game state.

> For layer structure and extension patterns see `docs/architecture.md`.  
> For event types, icons, spawn caps, and component paths see `docs/game-events-spec.md`.  
> For map generation internals see `docs/map-generator.md`.

## Key files

**Backend**
- `backend/src/services/map-generator.service.ts` — graph generation, event assignment, `nodeIcons`
- `backend/src/services/game-logic.service.ts` — move/play-card domain logic
- `backend/src/services/persistence.service.ts` — JSON load/save
- `backend/src/controllers/game.controller.ts` — request orchestration
- `backend/src/routes/game.routes.ts` — API route definitions
- `backend/src/models/node-event.ts` — canonical event type union

**Frontend**
- `frontend/src/app/features/map/map.component.ts` — map rendering and node interaction
- `frontend/src/app/shared/services/game-state.service.ts` — screen routing and state exposure
- `frontend/src/app/shared/services/api.service.ts` — HTTP calls to backend
- `frontend/src/styles.css` — global styles; controls map canvas size and edge appearance

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/game/state` | Return current game state |
| `POST` | `/api/game/state` | Persist provided `GameState` body |
| `POST` | `/api/game/action/new-run` | Generate a new run (resets state) |
| `POST` | `/api/game/action/move` | Body `{ nextNodeId }` — move player |
| `POST` | `/api/game/action/play-card` | Body `{ cardId }` — play a card |
| `GET` | `/api/game/events` | List event specs and spawn caps |
| `POST` | `/api/game/events/validate` | Body `{ eventType, count }` — validate spawn count |

## Key constraints

- State is fully JSON-serializable; persisted to `backend-data/game-state.json`.
- `node.layout.x` / `node.layout.y` are percentages (0–100); keep units unchanged or frontend SVG positioning breaks.
- Always mirror model changes across `backend/src/models/` **and** `frontend/src/app/shared/models/`.
- Follow layering strictly: `routes` → `controllers` → `services` → `repo` → `models`.

## Common task shortcuts

- **Regenerate a run:** `POST /api/game/action/new-run` — response includes full `graph.nodes` and `graph.edges`.
- **Tune map size/density:** edit `MapGeneratorService.generate()` options `minNodes`, `maxNodes`, `minLayers`, `maxLayers`.
- **Tune edge probabilities:** edit random bias constants in `addExtraConnections()` inside `map-generator.service.ts`.
- **Change edge style:** edit `.graph-canvas`, `.graph-lines svg path` / `line` in `frontend/src/styles.css`.
- **Debug Start button:** call `POST /api/game/action/new-run`; if it returns JSON the backend is reachable. Then check DevTools → Network/Console for the `GameStateService.startNewRun()` call.

## Run & build commands

```powershell
# Backend
cd backend
npm install
npm run build
npm run start
```

```powershell
# Frontend
cd frontend
npm install
npm run start
```

```powershell
# Tests
cd backend && npm run test:spawn   # event spawn-rule unit tests
cd frontend && npm run test:cross  # edge-crossing check (needs backend running)
```