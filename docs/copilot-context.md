# Copilot Context — Cheat Sheet

Quick-reference for AI assistants. For full detail see the linked docs.

| Topic | Doc |
|---|---|
| Project overview + file tree + invariants | [docs/index.md](index.md) |
| Architecture + extension patterns | [docs/architecture.md](architecture.md) |
| All API endpoints | [docs/api-reference.md](api-reference.md) |
| All TypeScript interfaces | [docs/data-model.md](data-model.md) |
| Battle / card / enemy-turn logic | [docs/battle-system.md](battle-system.md) |
| Frontend screens + components | [docs/frontend-guide.md](frontend-guide.md) |
| Event types + spawn rules | [docs/game-events-spec.md](game-events-spec.md) |
| Map generator | [docs/map-generator.md](map-generator.md) |
| Add content (step-by-step) | [docs/guides/](guides/) |

---

## Critical constraints

1. Mirror every model change: `backend/src/models/` ↔ `frontend/src/app/shared/models/`.
2. `node.layout.x/.y` = percentages 0–100. Never change units.
3. Card effect resolution: backend only (`BattleService` + `CardEffectService` + `card-effects.json`).
4. State is always JSON-serializable — no class instances.
5. Layering: `routes → controllers → services → repo → models`.
6. Each enemy must have exactly 3 attacks (`enemies.json`).
7. Static data: `backend/data/static/` — Saves: `backend/data/saves/`.

---

## Quickest paths

| Task | Do this |
|---|---|
| New card effect | Add to `data/static/card-effects.json`, set `effectId` on card. New action? Extend `CardEffectAction` + add case in `CardEffectService.apply()`. |
| New enemy | Add to `data/static/enemies.json` (3 attacks, each with `effectId`). |
| New event type | `events.json` entry + `NodeEventType` union (both sides) + frontend component. |
| New API endpoint | `game.routes.ts` → `game.controller.ts` → service → `ApiService` → `GameStateService`. |
| New screen | Component + module → import in `AppModule` → add to `GameScreen` union → `*ngIf` in `app.component.ts`. |
| Debug battle | Check `state.history` + `state.battle.log` in API response. |

---

## Run commands

```powershell
# Backend: http://localhost:4000
cd backend; npm install; npm run build; npm run start

# Frontend: http://localhost:4200
cd frontend; npm install; npm run start
```