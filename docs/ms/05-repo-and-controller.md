# Repository & Controller

## StateRepository
`backend/src/repo/state-repo.ts`

Thin wrapper around `PersistenceService` to decouple the controller from file I/O details.

```ts
class StateRepository {
  // uses PersistenceService('backend-data/game-state.json')
  load(): Promise<GameState>
  save(state: GameState): Promise<void>
}
```

---

## GameController
`backend/src/controllers/game.controller.ts`

Express request handler. Instantiates its own `StateRepository`, `GameLogicService`, `EventSpawnerService`, and `CompanionService`.

### Handler summary
| Handler | Route | Logic |
|---------|-------|-------|
| `getState` | GET /state | `repo.load()` → `res.json(state)` |
| `saveState` | POST /state | `repo.save(req.body)` → `201 { saved: true }` |
| `movePlayer` | POST /action/move | `repo.load()` → `gameLogic.movePlayer(state, req.body.nextNodeId)` → `repo.save()` → `res.json(updated)` |
| `playCard` | POST /action/play-card | `repo.load()` → `gameLogic.playCard(state, req.body.cardId)` → `repo.save()` → `res.json(updated)` |
| `resetGame` | POST /action/new-run | `gameLogic.createInitialState()` → `repo.save()` → `201 res.json(state)` |
| `getCompanions` | GET /action/companions | `companionService.getAll()` → `res.json(companions)` |
| `getEvents` | GET /events | `eventSpawner.getSpecs()` → `res.json(specs)` |
| `validateEvent` | POST /events/validate | `eventSpawner.validateCount(body.eventType, body.count)` → `res.json(result)` |

### Notes
- Every mutating action follows the pattern: **load → transform → save → respond**.
- `nextNodeId` and `cardId` are coerced to `string` via `String()` before use.
- No explicit HTTP error responses are thrown; invalid game actions return the unchanged `GameState` plus a history entry describing the failure.
