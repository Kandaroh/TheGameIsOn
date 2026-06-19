# Plan 08 — Companion Ability System

This feature has been split into three sub-plans:

| Plan | Title | Focus |
|---|---|---|
| [plan-08a-ability-data-model.md](plan-08a-ability-data-model.md) | Ability Data Model & Unlock Choice Flow | Model changes, `abilityPool` / `abilityUnlockLevels` on companions, `LevelingService` pending-choice detection, frontend popup, `POST /action/choose-ability` endpoint |
| [plan-08b-ability-resolution-service.md](plan-08b-ability-resolution-service.md) | Companion Ability Resolution Service | New `CompanionAbilityService`, passive modifiers applied during card play, hooks in `BattleService.playCard()` |
| [plan-08c-ability-frontend-display.md](plan-08c-ability-frontend-display.md) | Ability Display on Cards & Panels | Render chosen abilities on companion cards (hidden when locked), update `PlayerInfoPanelComponent`, next-unlock-level label |

## Implementation order

```
Plan 08a  →  Plan 08c  →  Plan 08b
```

- **08a** must be first — it establishes the data model and unlock/choice flow.
- **08c** can follow immediately — it renders the data that 08a produces.
- **08b** comes last — it requires abilities to already exist on companions before it can modify card resolution.
