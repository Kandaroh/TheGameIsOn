# API Reference

Base URL: `http://localhost:4000/api/game`

All endpoints accept and return `application/json`. Every mutation endpoint returns the full updated `GameState`.

---

## Endpoints

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/state` | — | `GameState` | Return current persisted game state |
| `POST` | `/state` | `GameState` | `GameState` | Overwrite persisted state |
| `POST` | `/action/new-run` | `{}` | `GameState` | Generate fresh run (new graph, initial state) |
| `POST` | `/action/move` | `{ nextNodeId: string }` | `GameState` | Move player to a connected node |
| `POST` | `/action/play-card` | `{ cardId: string }` | `GameState` | Legacy mana-based card play (non-battle) |
| `GET` | `/action/companions` | — | `Companion[]` | Return full companion catalogue |
| `POST` | `/action/finalize-companions` | `{ companions: Companion[], baseCards: Card[] }` | `GameState` | Build starting deck from chosen companions + base cards |
| `GET` | `/events` | — | `EventSpec[]` | List event types with spawn min/max |
| `GET` | `/events/definitions` | — | `EventDefinition[]` | Full event definitions from `events.json` |
| `POST` | `/events/validate` | `{ eventType: string, count: number }` | `{ valid: boolean, reason?: string }` | Validate an event spawn count |
| `POST` | `/action/battle/start` | `{}` | `GameState` | Deal opening hand + seed `BattleState` (spawns enemies) |
| `POST` | `/action/battle/play-card` | `{ cardId: string, companionId: string, targetIds?: string[] }` | `GameState` | Play a card during battle |
| `POST` | `/action/battle/end-turn` | `{}` | `GameState` | End player turn: refill energy, run enemy AI, advance turn. Response includes `battle.lastTurnActions` |
| `POST` | `/action/battle/draw-card` | `{}` | `GameState` | Draw one card from deck (reshuffles discard if empty) |
| `POST` | `/action/battle/end` | `{}` | `GameState` | Confirm battle ended (no-op if already inactive) |
| `POST` | `/action/battle/claim-reward` | `{ companionId: string, cardId: string }` | `GameState` | Claim a pending card reward; adds card to deck |

---

## Route definitions

Source: `backend/src/routes/game.routes.ts`

---

## Notes

- **Battle play-card** validates: battle active, card in hand, companion exists, companion has enough energy. On failure the state is returned unchanged with a rejection message appended to `history`.
- **Battle end-turn** populates `battle.lastTurnActions` — an array of `EnemyTurnAction` objects describing each enemy attack, target, damage dealt, and whether the target was killed. The frontend uses this to show the attack-result popup.
- **Claim-reward** removes one `PendingCardReward` entry from `battle.pendingCardRewards` and appends the chosen card to `cards[]` and `player.deck.cardIds`.
- **Finalize-companions** stamps unique runtime IDs (`{id}-{idx}`), snapshots `maxEnergy`/`maxLife`, computes `nextLevelExp`, and builds the starting deck via `DeckService.buildStartingDeck()`.
