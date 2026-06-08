# API Routes

Base path: `/api/game`

All routes are defined in `backend/src/routes/game.routes.ts` and handled by `GameController`.

## State

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/game/state` | Load current `GameState` from disk |
| POST | `/api/game/state` | Overwrite persisted state with body `GameState` |

## Actions

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/game/action/move` | `{ nextNodeId: string }` | Move player to adjacent node; validates edge exists |
| POST | `/api/game/action/play-card` | `{ cardId: string }` | Play a card from hand; validates hand membership and mana |
| POST | `/api/game/action/new-run` | — | Generate a fresh `GameState` and persist it |

## Reference data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/game/action/companions` | Return full companion catalogue |
| GET | `/api/game/events` | Return all `EventSpec` entries |
| POST | `/api/game/events/validate` | Body `{ eventType: string, count: number }` → `{ valid, reason? }` |

## Response shapes

- **State endpoints** return the full `GameState` JSON object.
- **`/action/new-run`** returns `201` + new `GameState`.
- **`/state` POST** returns `201 { saved: true }`.
- **`/events/validate`** returns `{ valid: boolean, reason?: string }`.
- Errors are not explicitly mapped; invalid moves/cards return the unchanged state with a history entry.
