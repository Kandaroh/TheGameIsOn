# Backend Overview

## Stack
- **Runtime**: Node.js
- **Language**: TypeScript 5.5
- **Framework**: Express 4.18
- **Entry point**: `backend/src/index.ts` → `createServer()` in `server.ts`
- **Port**: `4000` (localhost)
- **CORS**: allowed origin `http://localhost:4200`
- **Body parsing**: `body-parser` JSON
- **Dev runner**: `ts-node-dev --respawn`
- **Build**: `tsc` → `dist/`

## Folder structure
```
backend/src/
├── index.ts              # boots Express on port 4000
├── server.ts             # createServer() wires middleware + router
├── routes/
│   └── game.routes.ts    # all API routes under /api/game
├── controllers/
│   └── game.controller.ts
├── services/
│   ├── game-logic.service.ts
│   ├── map-generator.service.ts
│   ├── event-spawner.service.ts
│   ├── companion.service.ts
│   ├── battle.service.ts     # ← NEW: resolves card plays and enemy turns
│   └── persistence.service.ts
├── repo/
│   ├── state-repo.ts
│   └── card-effect-repo.ts   # ← NEW: reads/caches card-effects.json
└── models/
    ├── game-state.ts
    ├── player.ts
    ├── graph.ts
    ├── node.ts
    ├── node-event.ts
    ├── card.ts
    ├── companion.ts
    ├── deck.ts
    ├── battle-state.ts       # ← NEW: Enemy + BattleState interfaces
    └── card-effect.ts        # ← NEW: CardEffect interface
```

## Data persistence
- State is stored as JSON at `backend/backend-data/game-state.json`.
- Companion catalogue is stored at `backend/backend-data/companions.json`.
- Card effect catalogue is stored at `backend/backend-data/card-effects.json` (read-only at runtime; cached in `CardEffectRepository`).
- All files are created automatically on first write; if missing on read, defaults are generated in code.

## Scripts
| Script | Command |
|---|---|
| dev | `npm run dev` (ts-node-dev) |
| start | `npm run start` (same) |
| build | `npm run build` |
| test:spawn | `npm run test:spawn` (event-spawn unit test) |
