# Implementation Plans — Index

This folder contains the breakdown of tasks from `to-do.md` into focused, actionable plans. Each plan is self-contained and can be implemented independently (dependencies are noted).

---

## Plans

| File | Title | To-do items covered | Dependencies |
|------|-------|---------------------|--------------|
| [plan-01-card-visuals.md](./plan-01-card-visuals.md) | Card Visual Improvements | Element symbol on cards; hover full-card preview in hand / discard / card-reward; discard pile visibility | — |
| [plan-02-player-info-panel.md](./plan-02-player-info-panel.md) | Player Info Panel (Deck + Companion views) | Deck view pop-up; companion info pop-up; tabbed panel with persistent trigger icon; truncation tooltips | Plan 01 (CardPreviewService) |
| [plan-03-static-event-data.md](./plan-03-static-event-data.md) | Static Persistent Event Data | Move event definitions to `events.json`; add monster-spawning config, extra rules, spawn rates | — |
| [plan-04-enemy-turn-system.md](./plan-04-enemy-turn-system.md) | Enemy Turn System & Attack Result UI | Weighted 3-attack selection per enemy; status-effect placeholder; attack result pop-up on end turn | — |
| [plan-05-documentation-update.md](./plan-05-documentation-update.md) | Documentation Update | Rewrite docs for LLM-agent efficiency; create `index.md`, `api-reference.md`, `data-model.md`, `battle-system.md`, `frontend-guide.md` | All other plans (implement last) |
| [plan-06-content-guides.md](./plan-06-content-guides.md) | Content Creator Guides | How-to guides for events, enemies, cards, companions, card-effects in `docs/guides/` | Plan 03 (events.json schema) |
| [plan-07-card-display-redesign.md](./plan-07-card-display-redesign.md) | Card Display Redesign | Companion cards show XP, energy refill, unlocked abilities, status icons. Enemy cards show XP reward, gold/card rewards, 3 attacks, status icons. | — |
| [plan-08-ability-unlock-system.md](./plan-08-ability-unlock-system.md) | Companion Ability System (index) | Hub page — splits into 08a, 08b, 08c | — |
| [plan-08a-ability-data-model.md](./plan-08a-ability-data-model.md) | Ability Data Model & Unlock Choice Flow | Companion `abilityPool` + `abilityUnlockLevels`, `LevelingService` generates `PendingAbilityChoice`, choice popup, `POST /action/choose-ability` endpoint | — |
| [plan-08b-ability-resolution-service.md](./plan-08b-ability-resolution-service.md) | Companion Ability Resolution Service | `CompanionAbilityService` with passive modifiers (`bonus_damage`, `bonus_shield`, `cost_reduction`, `retaliation`), hooks in `BattleService.playCard()` and `endTurn()` | Plan 08a |
| [plan-08c-ability-frontend-display.md](./plan-08c-ability-frontend-display.md) | Ability Display on Cards & Panels | Render chosen abilities on companion cards, next-unlock-level label, energy refill row, update `PlayerInfoPanelComponent` | Plan 08a |
| [plan-09-status-effect-system.md](./plan-09-status-effect-system.md) | Status Effect System (Poison + Framework) | Trigger-moment framework (onApply/turnStart/turnEnd), Poison with stacking, backend resolution, frontend status icons | Plan 07 (recommended) |

---

## Status

| Plan | Status |
|---|---|
| Plan 01 | ✅ Done |
| Plan 02 | ✅ Done |
| Plan 03 | ✅ Done |
| Plan 04 | ✅ Done |
| Plan 05 | ✅ Done |
| Plan 06 | ✅ Done |
| Plan 07 | ⏳ Pending |
| Plan 08a | ⏳ Pending |
| Plan 08b | ⏳ Pending |
| Plan 08c | ⏳ Pending |
| Plan 09 | ⏳ Pending |

---

## Recommended implementation order

```
Plans 01–06     (already implemented)
     ↓
Plan 07         (card display redesign — adds rendering for abilities, status, attacks, rewards)
     ↓
Plan 08a        (ability data model + unlock choice popup + API endpoint)
     ↓
  ┌────────────┼────────────┐
  │                         │
Plan 08c        Plan 08b
(ability        (ability resolution
 display)        service — passives)
  │                         │
  └────────────┼────────────┘
                │
Plan 09         (status effects — poison + framework)
```

- **Plan 07** should be done first — it adds the `CardFrameData` fields and rendering sections that 08c and 09 depend on.
- **Plan 08a** must precede 08b and 08c — it establishes the data model and choice flow.
- **Plans 08b and 08c** can be done in parallel after 08a.
- **Plan 09** can be done any time after 07 (independent of 08).

---

## Task grouping rationale

### Plans 01–06 (completed)
- **Card visuals** (element display + hover previews + discard pile) → Plan 01.
- **Player info panel** (deck view + companion view + persistent icon) → Plan 02.
- **Static event data** → Plan 03.
- **Enemy turn + attack result UI** → Plan 04.
- **Documentation** → Plan 05.
- **Content guides** → Plan 06.

### Plans 07–09 (new from to-do.md update)
- **Card display redesign** — companion cards, enemy cards, and hand cards need to show more information (abilities, attacks, rewards, XP, status icons). All rendering changes grouped into Plan 07.
- **Ability system** — split into 3 sub-plans:
  - **08a** Data model: `abilityPool` + `abilityUnlockLevels` on companions, `LevelingService` pending-choice detection, choice popup, `POST /action/choose-ability` endpoint.
  - **08b** Resolution service: `CompanionAbilityService` with passive modifiers (bonus damage, bonus shield, cost reduction, retaliation) hooked into `BattleService.playCard()` and `endTurn()`.
  - **08c** Frontend display: render chosen abilities on companion cards, next-unlock-level label, update `PlayerInfoPanelComponent`.
- **Status effect system** — new trigger-moment framework, Poison as first status, stacking mechanics, backend resolution hooks, frontend status badges. Full-stack feature grouped into Plan 09.
