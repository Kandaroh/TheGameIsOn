# TheGameIsOn Architecture

## Overview

This scaffold splits the project into two clearly separated layers:
- `frontend/` — Angular UI and feature modules for Menu, Map, and Battle.
- `backend/` — Node.js API with route definitions, controller actions, domain services, repository persistence, and JSON state storage.

All game state is JSON-serializable and persisted to `backend-data/game-state.json`.

## Frontend structure

- `frontend/src/app/app.module.ts`
  - Bootstraps the application, imports feature modules and `HttpClientModule`.
- `frontend/src/app/features/menu/` — menu screen module and component.
- `frontend/src/app/features/map/` — map screen module and component.
- `frontend/src/app/features/battle/` — battle screen module and component.
- `frontend/src/app/shared/models/` — shared domain models.
- `frontend/src/app/shared/services/` — API service and game state service.

### Frontend design goals

- Each feature is encapsulated in its own module.
- Components remain small and focused (<100 lines).
- Shared models use extension-friendly property bags for cards and node events.

## Backend structure

- `backend/src/server.ts` — Express application setup and API mount points.
- `backend/src/routes/game.routes.ts` — API route definitions.
- `backend/src/controllers/game.controller.ts` — request handling and orchestration.
- `backend/src/services/game-logic.service.ts` — domain logic for move and play actions.
- `backend/src/repo/state-repo.ts` — persistence repository layer.
- `backend/src/services/persistence.service.ts` — file-based JSON load/save.
- `backend/src/models/` — domain models: Player, Deck, Card, Graph, Node, NodeEvent, GameState.

### Events and icons

- Events are represented as typed `NodeEvent` in `backend/src/models/node-event.ts` and include: `battle`, `rest`, `hard battle`, `new object`, `power up`, `treasure`, `start`, and `end`.
- The map generator attaches short icons to nodes; icons are defined in `backend/src/services/map-generator.service.ts` (`⚔️`, `🛌`, `💀`, `🪄`, `⚡`, `🎁`, `🏁`).

The `end` node emits an `end` event and is intended to trigger an end-screen flow in the frontend.

### Backend design goals

- Routes remain thin and delegate to controllers.
- Controllers orchestrate repository and service logic.
- Business logic is isolated from persistence.
- JSON persistence is explicit and serializable.

## Extension patterns

### Add a new card property

1. Update `frontend/src/app/shared/models/card.model.ts` to add the new typed property.
2. Update `backend/src/models/card.ts` to include the same property shape.
3. If needed, update `backend/src/services/game-logic.service.ts` to interpret the property.

This uses ≤3 files and preserves the existing modular structure.

### Add a new node event type

1. Add a new event type in `backend/src/models/node-event.ts`.
2. Add a new event type in `frontend/src/app/shared/models/node.model.ts`.
3. Implement handling in a dedicated new module or service, e.g. `backend/src/services/node-events/treasure-event.service.ts`.

Because node events are typed as `NodeEvent`, new event behavior can be layered in a single new module.

### Add a new player action

1. Add a new API endpoint in `backend/src/routes/game.routes.ts`.
2. Add a new controller method in `backend/src/controllers/game.controller.ts`.
3. Add a new service method in `backend/src/services/game-logic.service.ts`.

This keeps route definitions, controller orchestration, and logic separate.

## API contract

### GET `/api/game/state`
- Returns the current serialized game state.

### POST `/api/game/state`
- Body: `GameState`
- Persists the provided state.

### POST `/api/game/action/move`
- Body: `{ nextNodeId: string }`
- Moves the player to a connected node and persists updated state.

### POST `/api/game/action/play-card`
- Body: `{ cardId: string }`
- Attempts to play the card, updates mana and hand, and persists state.

## Naming rationale

- `features/` indicates UI screens and user-focused workflows.
- `shared/models/` holds serializable game domain types.
- `shared/services/` holds reusable client services.
- `routes/`, `controllers/`, `services/`, `repo/`, and `models/` mirror clean backend layering.
- `docs/architecture.md` explains extension patterns and why files are structured this way.
