# Frontend Guide

Angular 17 single-page application. All game logic is resolved by the backend; the frontend is a thin rendering + interaction layer.

---

## Screen routing

Screens are switched via `GameStateService.screen$` (a `BehaviorSubject<GameScreen>`). The root `AppComponent` uses `*ngIf` on the screen value — **there is no Angular Router**.

```typescript
// frontend/src/app/shared/services/game-state.service.ts
export type GameScreen =
  | 'menu'
  | 'companion-select'
  | 'map'
  | 'battle'
  | 'event'
  | 'combat-results'
  | 'card-reward';
```

### Screen map

| Screen value | Component(s) | Trigger |
|---|---|---|
| `menu` | `MenuComponent` | Default on load |
| `companion-select` | `CompanionSelectionComponent` | "Start" button → `beginCompanionSelection()` |
| `map` | `MapComponent` | Companion selection complete / `startNewRun()` / post-battle |
| `battle` | `BattleComponent` + `AttackResultPopupComponent` | `moveToNode()` lands on `battle` event |
| `event` | Event-specific component (keyed by `currentEvent$`) | `moveToNode()` lands on non-battle event |
| `combat-results` | `CombatResultsComponent` | Battle ends (`battle.active === false`) |
| `card-reward` | `CardRewardComponent` | `proceedFromResults()` when `pendingCardRewards.length > 0` |

### Event sub-routing

When `screen$ === 'event'`, `currentEvent$` determines which component renders:

| `currentEvent$` value | Component | Path |
|---|---|---|
| `rest` | `RestComponent` | `features/events/rest/` |
| `hard battle` | `HardBattleComponent` | `features/events/hard-battle/` |
| `new object` or `treasure` | `NewObjectComponent` | `features/events/new-object/` |
| `power up` | `PowerUpComponent` | `features/events/power-up/` |
| `end` | `EndComponent` | `features/events/end/` |

### Adding a new screen

1. Create a new component under `frontend/src/app/features/<name>/`.
2. Create a module that declares the component and imports `CommonModule`.
3. Import the module in `AppModule`.
4. Add the screen name to the `GameScreen` type union.
5. Add `*ngIf="screen === '<name>'"` in `app.component.ts` template.
6. Add a navigation method in `GameStateService` (e.g. `goToMyScreen()`).

---

## Component tree

```
AppComponent
├── MenuComponent
├── CompanionSelectionComponent
├── MapComponent
├── BattleComponent
│   └── AttackResultPopupComponent        (*ngIf showAttackPopup)
│   └── CardFrameComponent                (per card / enemy / companion)
├── CombatResultsComponent
├── CardRewardComponent
├── RestComponent / HardBattleComponent / NewObjectComponent / PowerUpComponent / EndComponent
├── PlayerInfoPanelComponent              (fixed overlay, toggled via playerInfoOpen$)
│   └── CardFrameComponent                (hover preview)
└── CardPreviewComponent                  (floating hover preview, global)
```

---

## Key shared services

### `GameStateService`

> `frontend/src/app/shared/services/game-state.service.ts`

Single source of truth. All backend responses are piped into `state$`.

| Observable | Type | Purpose |
|---|---|---|
| `state$` | `BehaviorSubject<GameStateModel \| null>` | Current game state |
| `screen$` | `BehaviorSubject<GameScreen>` | Active screen |
| `currentEvent$` | `BehaviorSubject<string \| null>` | Event type for `event` screen |
| `optionsOpen$` | `BehaviorSubject<boolean>` | Options panel visibility |
| `playerInfoOpen$` | `BehaviorSubject<boolean>` | Player-info panel visibility |
| `endTurnResult$` | `Subject<EnemyTurnAction[]>` | Emitted after each end-turn with enemy actions |

Key methods:

| Method | What it does |
|---|---|
| `beginCompanionSelection()` | New run → companion-select screen |
| `moveToNode(nodeId)` | Move player; auto-navigate to battle or event screen |
| `playCardWithCompanion(cardId, companionId, opts?)` | Play card; navigate to combat-results if battle ends |
| `endTurn()` | End turn; emit `endTurnResult$`; navigate to combat-results if battle ends |
| `proceedFromResults()` | Navigate to card-reward or map |
| `claimReward(companionId, cardId)` | Claim one pending reward; navigate to next reward or map |
| `drawCard()` | Draw one card from deck |

### `ApiService`

> `frontend/src/app/shared/services/api.service.ts`

Thin HTTP wrapper. Base URL: `http://localhost:4000/api/game`. All methods return `Observable<GameStateModel>` (or `Observable<CompanionModel[]>` for companions).

### `CardPreviewService`

> `frontend/src/app/shared/components/card-preview/card-preview.service.ts`

Singleton injectable. Call `show(card, x, y)` on `mouseenter`, `hide()` on `mouseleave`. The `CardPreviewComponent` subscribes to `preview$` and renders a floating card frame at the cursor position.

Usage pattern:
```typescript
showPreview(event: MouseEvent, data: CardFrameData): void {
  this.cardPreview.show(data, event.clientX, event.clientY);
}
hidePreview(): void {
  this.cardPreview.hide();
}
```

---

## Shared components

### `CardFrameComponent`

> `frontend/src/app/shared/components/card-frame/`

Reusable card renderer. Accepts a `variant` input (`'hand' | 'enemy' | 'companion'`) and a `card: CardFrameData` input.

- **Hand variant:** Shows name, cost gem, element badge, art area, type pill, description, normal/enhanced effect text.
- **Enemy / Companion variant:** Shows name, element, HP bar, energy bar.
- Element tinting: frame border/background changes based on `card.element` via `elem-frame-{element}` CSS classes.

### `PlayerInfoPanelComponent`

> `frontend/src/app/shared/components/player-info-panel/`

Fixed overlay panel toggled via `GameStateService.playerInfoOpen$`. Tabs:

| Tab | Content |
|---|---|
| **Deck** | All cards grouped by location (in deck / in discard / in hand). Hover shows `CardPreviewComponent`. |
| **Companions** | Each companion's stats: level, EXP bar, HP bar, energy tokens, special abilities. |

### `EventMapComponent`

> `frontend/src/app/shared/components/event-map/`

Shared map rendering used inside event placeholder screens.

---

## Module structure

```
AppModule
├── MenuModule          (MenuComponent, CompanionSelectionComponent)
├── MapModule           (MapComponent)
├── BattleModule        (BattleComponent, AttackResultPopupComponent)
├── CombatResultsModule (CombatResultsComponent)
├── CardRewardModule    (CardRewardComponent)
├── CardFrameModule     (CardFrameComponent)
├── CardPreviewModule   (CardPreviewComponent)
├── PlayerInfoPanelModule (PlayerInfoPanelComponent)
└── (event components declared directly in AppModule)
```

---

## Debugging tips

- **State inspection:** `GameStateService.state$.value` in console → full state snapshot.
- **Battle log:** `state.battle.log` — plain-text trace of every action.
- **History:** `state.history` — run-level audit log.
- **Debug mode:** `GameStateService.toggleDebugMode()` — shows companion energy details in battle header.
- **Card play failures:** Check `state.history` for rejection messages (e.g. "needs X energy, has Y").
