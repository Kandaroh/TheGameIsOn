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

## CardEffectRepository
`backend/src/repo/card-effect-repo.ts`

Reads and caches `backend-data/card-effects.json`. The cache is populated on first access and held for the process lifetime (file is treated as read-only at runtime).

```ts
class CardEffectRepository {
  getAll(): Promise<CardEffect[]>
  getById(id: string): Promise<CardEffect | undefined>
}
```

Used exclusively by `BattleService` to resolve `card.effectId` and `card.enhancedEffectId`.

---

## GameController
`backend/src/controllers/game.controller.ts`

Express request handler. Instantiates its own `StateRepository`, `GameLogicService`, `EventSpawnerService`, `CompanionService`, and `BattleService`.

### Handler summary
| Handler | Route | Logic |
|---------|-------|-------|
| `getState` | GET /state | `repo.load()` → `res.json(state)` |
| `saveState` | POST /state | `repo.save(req.body)` → `201 { saved: true }` |
| `movePlayer` | POST /action/move | `repo.load()` → `gameLogic.movePlayer(state, nextNodeId)` → `repo.save()` → `res.json(updated)` |
| `playCard` | POST /action/play-card | `repo.load()` → `gameLogic.playCard(state, cardId)` → `repo.save()` → `res.json(updated)` |
| `resetGame` | POST /action/new-run | `gameLogic.createInitialState()` → `repo.save()` → `201 res.json(state)` |
| `getCompanions` | GET /action/companions | `companionService.getAll()` → `res.json(companions)` |
| `getEvents` | GET /events | `eventSpawner.getSpecs()` → `res.json(specs)` |
| `validateEvent` | POST /events/validate | `eventSpawner.validateCount(body.eventType, body.count)` → `res.json(result)` |
| `battlePlayCard` | POST /action/battle/play-card | `repo.load()` → `battleService.playCard(state, cardId, companionId, targetIds?)` → `repo.save()` → `res.json(updated)` |
| `battleEndTurn` | POST /action/battle/end-turn | `repo.load()` → `battleService.endTurn(state)` → `repo.save()` → `res.json(updated)` |

### Notes
- Every mutating action follows the pattern: **load → transform → save → respond**.
- `nextNodeId`, `cardId`, and `companionId` are coerced to `string` via `String()` before use.
- No explicit HTTP error responses are thrown; invalid game actions return the unchanged `GameState` plus a history entry describing the failure.
- `battlePlayCard` is `async` because `BattleService.playCard()` awaits `CardEffectRepository.getById()`.
