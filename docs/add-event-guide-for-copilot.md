# Guide: Adding Node Events (for GitHub Copilot)

Purpose
- A concise, machine-friendly guide explaining where and how to add new node event types so Copilot can make targeted edits reliably.

Key files
- `backend/src/models/node-event.ts` — canonical event type definitions.
- `backend/src/services/map-generator.service.ts` — decides event assignment (`randomEventType()` and `nodeIcons`).
- `backend/src/models/node.ts` — node shape persisted on disk.
- `backend/src/services/game-logic.service.ts` — runtime behavior when a player enters a node (implement event effects here).
- `backend/src/controllers/game.controller.ts` — expose any new API endpoints if needed.
- `frontend/src/app/shared/models/node.model.ts` — frontend node type, must match persisted shape.
- `frontend/src/app/features/map/map.component.ts` — how the node is displayed on the map (icons, title).

Quick checklist (high-level)
1. Define the new event type in backend models.
2. Add an icon and probability in the map generator.
3. Ensure the persisted `Node` includes any new properties.
4. Implement server-side behavior in `game-logic.service.ts` (what happens when entered).
5. Mirror types and display in the frontend models and components.
6. Test by generating a new run and exercising the node via API or UI.

Step-by-step example: add an `ambush` event

1) Add the event type

Edit `backend/src/models/node-event.ts` and include `ambush` in the union/enum.

2) Add icon and generator bias

In `backend/src/services/map-generator.service.ts`:
- add `ambush` to the `nodeIcons` map at the top (choose an emoji or short string).
- update `randomEventType()` to return `'ambush'` with desired probability (e.g., 0.05).

Example change (pseudo-TS):

```ts
// nodeIcons
const nodeIcons = { start: '🏁', end: '🎯', battle: '⚔️', treasure: '🎁', rest: '🛌', ambush: '💣' };

// randomEventType()
if (choice < 0.6) return 'battle';
if (choice < 0.85) return 'treasure';
if (choice < 0.95) return 'rest';
return 'ambush';
```

3) Extend the persisted node shape (if needed)

If the `ambush` event needs extra data (e.g., `damage`), add the property to `backend/src/models/node.ts` and mirror it in `frontend/src/app/shared/models/node.model.ts`.

4) Implement runtime behavior

In `backend/src/services/game-logic.service.ts`, when the player moves to a node, inspect `node.event.type` and implement the new logic branch:

```ts
if (node.event.type === 'ambush') {
  // e.g., reduce player HP, add a status, persist state
  state.player.hp -= 6;
}
```

5) Frontend display

- Update `frontend/src/app/shared/models/node.model.ts` if new properties were added.
- In `frontend/src/app/features/map/map.component.ts` show the `icon` and/or title. Optionally create an `AmbushComponent` to show modal details when entering the node.

6) Test

- Rebuild backend and start server:
```powershell
cd backend
npm run build
npm run start
```
- Trigger a new run and inspect nodes:
```bash
curl -X POST http://localhost:4000/api/game/action/new-run -H "Content-Type: application/json"
```
- Verify `graph.nodes` includes nodes with `event.type === 'ambush'` and that behavior triggers when moving to that node (via UI or `POST /api/game/action/move`).

Tips for Copilot
- Make small, single-file PRs where possible: add the new type, then update generator, then behavior, then frontend.
- Mirror types between `frontend` and `backend` strictly; Copilot should edit both files in the same change when adding properties.
- Prefer adding icons to `map-generator.service.ts` rather than changing rendering logic in the map component for a quicker visual result.
- If event requires complex UI, scaffold a new component under `frontend/src/app/features/events/` and wire it into `MapComponent` or `BattleComponent`.

Security & validation
- Validate any event-specific values on the backend before applying them to `state` (no client-trusted values).

This document is intended to be concise and directive so Copilot can follow the exact file edits and testing steps needed to add new node events.

## Event spawn rules and naming (project-specific)

The project defines the following event types and spawn caps per run. Use these exact names and component paths when adding or editing events so Copilot can update code consistently.

- `battle` — no cap. Component: `frontend/src/app/features/battle/battle.component.ts`.
- `rest` — 1–2 nodes. Placeholder component path: `frontend/src/app/features/events/rest/rest.component.ts`.
- `hard battle` — 2–5 nodes. Placeholder path: `frontend/src/app/features/events/hard-battle/hard-battle.component.ts`.
- `new object` — 2–4 nodes. Placeholder path: `frontend/src/app/features/events/new-object/new-object.component.ts`.
- `power up` — 3–6 nodes. Placeholder path: `frontend/src/app/features/events/power-up/power-up.component.ts`.

When instructing Copilot to add events, prefer editing `backend/src/services/map-generator.service.ts` for spawn probabilities and the `nodeIcons` table, and create placeholder frontend components under `frontend/src/app/features/events/` following the naming above.

## Icons and end node behavior

- Use the following icon mapping when adding or suggesting UI for events (update `backend/src/services/map-generator.service.ts` `nodeIcons` map):
  - `battle` — ⚔️
  - `rest` — 🛌
  - `hard battle` — 💀
  - `new object` — 🪄
  - `power up` — ⚡
  - `treasure` — 🎁
  - `start` / `end` — 🏁 (end emits an `end` event)

When generating nodes, ensure the `end` node's `event.type` is set to `end` so the frontend can react by showing the End page.
