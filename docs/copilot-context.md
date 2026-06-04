# Copilot Context: TheGameIsOn

Purpose
- A small card game scaffold: Angular frontend (`menu` → `map` → `battle`) and a Node.js backend exposing a JSON-serializable game state and a small set of actions.

Where to look (quick links)
- Backend map generator: `backend/src/services/map-generator.service.ts`
- Backend game logic: `backend/src/services/game-logic.service.ts`
- Backend persistence: `backend/src/services/persistence.service.ts`
- Backend controllers & routes: `backend/src/controllers/game.controller.ts`, `backend/src/routes/game.routes.ts`
- Frontend map view: `frontend/src/app/features/map/map.component.ts`
- Frontend global styles that control map size and visuals: `frontend/src/styles.css`
- Frontend state service: `frontend/src/app/shared/services/game-state.service.ts`

Additional backend endpoints:
- `GET /api/game/events` — list event specs (spawn caps)
- `POST /api/game/events/validate` — body `{ eventType, count }` returns validation result

Frontend event components (placeholders):
- `frontend/src/app/features/events/rest/rest.component.ts`
- `frontend/src/app/features/events/hard-battle/hard-battle.component.ts`
- `frontend/src/app/features/events/new-object/new-object.component.ts`
- `frontend/src/app/features/events/power-up/power-up.component.ts`
- `frontend/src/app/features/events/end/end.component.ts`

Icons mapping (as used by generator):
- `battle`: ⚔️, `rest`: 🛌, `hard battle`: 💀, `new object`: 🪄, `power up`: ⚡, `treasure`: 🎁, `start/end`: 🏁

Key concepts Copilot should assume
- Game state is fully JSON-serializable and persisted to `backend-data/game-state.json` via the persistence service.
- The map is represented as a graph: `nodes` (with `id`, `title`, `icon`, `layout: {x,y}`, `event`) and `edges` as `{from,to}`. Layout `x`/`y` are percentages (0-100) used by the frontend for SVG positioning.
- The backend `MapGeneratorService.generate(options)` produces layered vertical graphs with a single `start` and `end` node, 20–24 nodes by default, forward-only directed edges, and adjacency/skip-layer connections biased to nearby x positions.
- Frontend map rendering expects `node.layout.x` and `node.layout.y` to compute absolute coordinates inside the scrollable `.graph-canvas` area.

Common tasks & shortcuts
- To regenerate a run from the backend API (useful for testing maps): POST `/api/game/action/new-run`.
- To inspect the generated graph quickly: call the new-run endpoint and view the returned state JSON (it includes `graph.nodes` and `graph.edges`).
- To change map sizing or edge thickness: edit `frontend/src/styles.css` (`.graph-canvas`, `.graph-lines svg path` / `line`).
- To tune generation parameters: edit `MapGeneratorService.generate()` options `minNodes`, `maxNodes`, `minLayers`, `maxLayers` or change random biases inside `MapGeneratorService`.

Developer notes for Copilot
- Keep changes minimal and consistent with existing layering: `routes` → `controllers` → `services` → `repo` → `models`.
- When modifying state shapes, mirror changes between `frontend/src/app/shared/models` and `backend/src/models`.
- The frontend map component reads `layout` values directly; avoid changing layout units (must remain percentage-like numbers).

Run & build commands
- Backend (dev):
```
cd backend
npm install
npm run build
npm run start
```
- Frontend (dev):
```
cd frontend
npm install
npm run start
```

This document is intended to provide compact, navigable context so Copilot can make useful suggestions and code completions aligned with the project conventions.