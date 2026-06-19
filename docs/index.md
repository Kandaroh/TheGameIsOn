# Project Index — TheGameIsOn

## What this project is

Roguelike deck-building card game. Angular 17 frontend + Express/Node.js backend. All state is JSON-serializable and persisted to `backend/data/saves/game-state.json`. Static data (enemies, events, card effects, companions) lives in `backend/data/static/`.

**Tech stack:** Angular 17 · Express 4 · TypeScript · JSON file persistence (no DB).

---

## Read this first for...

| Goal | File |
|------|------|
| Understand layer structure + extension patterns | [docs/architecture.md](architecture.md) |
| Find an API endpoint | [docs/api-reference.md](api-reference.md) |
| Look up any TypeScript interface | [docs/data-model.md](data-model.md) |
| Understand battle / card / enemy-turn logic | [docs/battle-system.md](battle-system.md) |
| Understand the map generator | [docs/map-generator.md](map-generator.md) |
| Work on frontend screens or components | [docs/frontend-guide.md](frontend-guide.md) |
| Understand event types and spawn rules | [docs/game-events-spec.md](game-events-spec.md) |
| Add new content (enemies, events, cards) | [docs/guides/](guides/) |

---

## File tree (key files only)

```
backend/
  data/
    static/
      card-effects.json         # Effect catalogue (action, value, target)
      companions.json           # Companion definitions + priceDeck cards
      enemies.json              # Enemy definitions + attacks + rewards
      events.json               # Event types, spawn rules, monster spawn configs
    saves/
      game-state.json           # Persisted runtime game state
  src/
    models/
      battle-state.ts           # BattleState, BattleEnemy, EnemyTurnAction, StatusEffect
      card.ts                   # Card, CardElement, CardTarget
      card-effect.ts            # CardEffect, CardEffectAction
      companion.ts              # Companion, SpecialAbility, CompanionPriceDecks
      enemy.ts                  # EnemyDefinition, EnemyAttack, EnemyReward
      event-definition.ts       # EventDefinition, MonsterSpawnConfig, EventSpawnRules
      game-state.ts             # GameState (top-level aggregate)
      player.ts                 # Player
      node-event.ts             # NodeEventType, MapArea, NodeEvent
      node.ts / graph.ts / deck.ts
    services/
      battle.service.ts         # Card play, enemy AI, turn flow, rewards
      card-effect.service.ts    # Pure effect application (damage/shield/heal)
      enemy-spawner.service.ts  # Spawns BattleEnemy[] from definitions
      leveling.service.ts       # EXP thresholds, level-up stat boosts
      deck.service.ts           # Draw, shuffle, build starting deck
      map-generator.service.ts  # Layered graph generation
      event-spawner.service.ts  # Enforce event spawn caps on map nodes
      game-logic.service.ts     # Initial state, move/play-card (legacy)
      companion.service.ts      # Companion catalogue loader
      persistence.service.ts    # JSON file read/write
    repo/
      card-effect-repo.ts       # Reads card-effects.json
      enemy-repo.ts             # Reads enemies.json (validates 3 attacks)
      event-repo.ts             # Reads events.json
      state-repo.ts             # Reads/writes game-state.json
    controllers/game.controller.ts
    routes/game.routes.ts
    server.ts

frontend/
  src/app/
    shared/
      models/                   # Mirrors of backend models (*.model.ts)
      services/
        api.service.ts          # HTTP calls (base URL: localhost:4000)
        game-state.service.ts   # state$, screen$, endTurnResult$, all game actions
        card-effect.service.ts  # Logger only — real resolution is backend
      components/
        card-frame/             # Reusable card renderer (hand, enemy, companion variants)
        card-preview/           # Floating hover preview (CardPreviewService)
        player-info-panel/      # Slide-out panel (deck + companions tabs)
        event-map/              # Shared map component for event screens
    features/
      menu/                     # MenuComponent + CompanionSelectionComponent
      map/                      # MapComponent (graph rendering + navigation)
      battle/                   # BattleComponent + AttackResultPopupComponent
      combat-results/           # Post-battle results screen
      card-reward/              # Reward card selection screen
      events/                   # rest, hard-battle, new-object, power-up, end
    app.component.ts            # Root shell — screen switching via *ngIf
    app.module.ts               # Imports all feature + shared modules
```

---

## Invariants — never violate these

1. **Mirror every model change** to both `backend/src/models/` AND `frontend/src/app/shared/models/`.
2. **`node.layout.x` / `.y` are percentages 0–100.** Do not change units — SVG positioning depends on this.
3. **Card effect resolution** lives only in `BattleService` + `CardEffectService` + `card-effects.json`. The frontend `CardEffectService` is a logger; it must never apply game-rule changes.
4. **State is always JSON-serializable.** No class instances, no functions, no circular refs in `GameState`.
5. **Follow layering:** `routes` → `controllers` → `services` → `repo` → `models`.
6. **All backend service methods return a new `GameState`** — no in-place mutations.
7. **`enemies.json` — each enemy must have exactly 3 attacks.** `EnemyRepository` warns on cache build if violated.
8. **Static data** lives in `backend/data/static/`; **saves** live in `backend/data/saves/`.

---

## Current known gaps / TODOs

<!-- TODO --> Status effects: `statusEffects` field exists on `BattleEnemy` and `Companion` models but **no game logic reads or writes them yet**. Placeholder only.

<!-- TODO --> `evade` and `evade_draw` effect actions are no-op stubs in `CardEffectService`.

<!-- TODO --> Non-battle event payloads (`rest`, `power up`, `new object`, `treasure`) have placeholder UI only — no backend logic processes them.

<!-- TODO --> EXP levelling threshold formula (`level * 100`) is functional but not balanced / finalised.

<!-- TODO --> Companion `shield` field is cast via `(companion as any).shield` — not yet a declared field on the model.

---

## Run & build

```powershell
# Backend
cd backend; npm install; npm run build; npm run start

# Frontend (separate terminal)
cd frontend; npm install; npm run start
```

Backend: `http://localhost:4000` · Frontend: `http://localhost:4200`
