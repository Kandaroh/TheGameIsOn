# Phase 7 — Controller & Routing

## Goal
Port `game.controller.ts` + `game.routes.ts` into a single ASP.NET Core `GameController.cs` with attribute routing that produces **identical URL paths** to the Express router.

## Route Map (must match exactly)

| HTTP | Express Path | C# Attribute | Method |
|---|---|---|---|
| GET | `/api/game/state` | `[HttpGet("state")]` | `GetState` |
| POST | `/api/game/state` | `[HttpPost("state")]` | `SaveState` |
| POST | `/api/game/action/move` | `[HttpPost("action/move")]` | `MovePlayer` |
| POST | `/api/game/action/play-card` | `[HttpPost("action/play-card")]` | `PlayCard` |
| POST | `/api/game/action/new-run` | `[HttpPost("action/new-run")]` | `ResetGame` |
| GET | `/api/game/action/companions` | `[HttpGet("action/companions")]` | `GetCompanions` |
| GET | `/api/game/events` | `[HttpGet("events")]` | `GetEvents` |
| GET | `/api/game/events/definitions` | `[HttpGet("events/definitions")]` | `GetEventDefinitions` |
| POST | `/api/game/events/validate` | `[HttpPost("events/validate")]` | `ValidateEvent` |
| POST | `/api/game/action/battle/play-card` | `[HttpPost("action/battle/play-card")]` | `BattlePlayCard` |
| POST | `/api/game/action/battle/end-turn` | `[HttpPost("action/battle/end-turn")]` | `BattleEndTurn` |
| POST | `/api/game/action/battle/start` | `[HttpPost("action/battle/start")]` | `BattleStart` |
| POST | `/api/game/action/battle/draw-card` | `[HttpPost("action/battle/draw-card")]` | `BattleDrawCard` |
| POST | `/api/game/action/finalize-companions` | `[HttpPost("action/finalize-companions")]` | `FinalizeCompanions` |
| POST | `/api/game/action/battle/end` | `[HttpPost("action/battle/end")]` | `BattleEnd` |
| POST | `/api/game/action/battle/claim-reward` | `[HttpPost("action/battle/claim-reward")]` | `BattleClaimReward` |
| POST | `/api/game/action/choose-ability` | `[HttpPost("action/choose-ability")]` | `ChooseAbility` |

## Prompt Template
> Paste `game.controller.ts` (~185 lines) + the route table above + the C# interface signatures, then:

```
Convert this Express controller into an ASP.NET Core controller.

Rules:
- [ApiController] + [Route("api/game")] on the class.
- Constructor-inject all service interfaces.
- Each method is async Task<IActionResult>.
- Return Ok(state) for success, BadRequest(new { error = "..." }) for errors.
- Request body types: use small record DTOs for each distinct body shape
  (e.g. MoveRequest, PlayCardRequest, etc.) — define them at the bottom
  of the controller file or in a separate Requests/ folder.
- Match the TS response shapes exactly (the frontend parses them).
```

## Request Body DTOs

| Endpoint | DTO | Properties |
|---|---|---|
| `action/move` | `MoveRequest` | `string NextNodeId` |
| `action/play-card` | `PlayCardRequest` | `string CardId` |
| `events/validate` | `ValidateEventRequest` | `string EventType`, `int Count` |
| `action/battle/play-card` | `BattlePlayCardRequest` | `string CardId`, `string CompanionId`, `List<string>? TargetIds` |
| `action/finalize-companions` | `FinalizeCompanionsRequest` | `List<Companion> Companions` |
| `action/battle/claim-reward` | `ClaimRewardRequest` | `string CompanionId`, `string CardId` |
| `action/choose-ability` | `ChooseAbilityRequest` | `string CompanionId`, `string AbilityId` |
| `state` (POST) | `GameState` (model directly) | — |

## Special Attention

### `battleDrawCard`
This endpoint does inline state manipulation (draws 1 card, appends to battle log and history). Replicate the same logic inline or delegate to `IDeckService.DrawCards`.

### `finalizeCompanions`
Calls `IBaseCardRepository.GetAllAsync()` to get base cards, then `IDeckService.BuildStartingDeck()`, then `ILevelingService.WithNextLevelExp()` on each companion. All inline in the controller — keep it that way for parity.

### `battleEnd` and `chooseAbility` and `battleClaimReward`
These have validation logic (null checks, active-battle checks) that returns 400. Map to `BadRequest(...)`.

## Validation
```powershell
dotnet build
```
Controller compiles. Routes won't work until DI is wired (Phase 8).
