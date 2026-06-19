# Plan 09 — Status Effect System (Poison + Framework)

## Scope
Implement a **status effect framework** with **trigger-moment** timing, and add **Poison** as the first status. Statuses can affect both companions and enemies. The backend handles all resolution logic; the frontend renders status icons on card corners.

---

## Current state

### What already exists
- `StatusEffect` interface on both sides:
  ```typescript
  // backend/src/models/battle-state.ts  +  frontend/src/app/shared/models/battle-state.model.ts
  export interface StatusEffect {
    id: string;
    name: string;
    turnsRemaining: number | null;   // null = permanent
  }
  ```
- `statusEffects?: StatusEffect[]` field on `BattleEnemy` and `Companion` (both backend + frontend models).
- **No game logic reads or writes `statusEffects` yet** — the field is a placeholder.
- `CardEffectService` has `apply()` with a `switch` on `action` — currently handles `damage`, `shield`, `heal`.

### What is missing
1. **Extended `StatusEffect` model** — needs `stacks`, `triggerMoment`, and `effectId` fields.
2. **`StatusEffectService`** — new backend service that applies, ticks, and resolves status effects.
3. **Poison status definition** — static data or hardcoded definition.
4. **`apply_status` card effect action** — new action type in `CardEffectService` that applies a status to targets.
5. **Trigger-moment hooks** in `BattleService.endTurn()` and `BattleService.playCard()` (start-of-turn, end-of-turn, on-apply).
6. **Frontend status icons** on companion and enemy cards.

---

## Design

### Trigger moments

The to-do specifies three trigger moments, extensible for the future:

| Moment | When it fires | Example |
|---|---|---|
| `onApply` | Immediately when the status is first applied | Instant damage, debuff |
| `turnStart` | At the beginning of each turn (before player acts) | Regeneration, energy drain |
| `turnEnd` | At the end of each turn (after enemy attacks) | Poison tick, burn tick |

Implementation: use a string union type so adding new moments (e.g. `onDamageDealt`, `onDeath`) is a single type + switch-case addition.

### Poison mechanics

- **Stacking:** each application adds N stacks (defined by the effect's `value`).
- **Damage:** at `turnEnd`, deal damage = current stack count.
- **Decay:** after dealing damage, reduce stacks by 1 per turn. When stacks reach 0, remove the status.
- **Example:** Enemy applies Poison (3 stacks). Turn 1 end: 3 damage, reduce to 2. Turn 2 end: 2 damage, reduce to 1. Turn 3 end: 1 damage, reduce to 0, remove.

---

## Implementation steps

### Step 1 — Extend `StatusEffect` model

**Backend:** `backend/src/models/battle-state.ts`

```typescript
export type StatusTriggerMoment = 'onApply' | 'turnStart' | 'turnEnd';

export interface StatusEffect {
  id: string;                         // e.g. 'poison'
  name: string;                       // e.g. 'Poison'
  icon: string;                       // e.g. '☠️'
  stacks: number;                     // current stack count
  turnsRemaining: number | null;      // null = permanent (until stacks deplete)
  triggerMoment: StatusTriggerMoment;  // when the effect fires
  effectId: string;                   // CardEffect to resolve each tick
}
```

**Frontend:** mirror in `frontend/src/app/shared/models/battle-state.model.ts`.

### Step 2 — Create `StatusEffectService`

**New file:** `backend/src/services/status-effect.service.ts`

Responsibilities:
- `applyStatus(target, statusDef, stacks, state)` — add or increment stacks on a target's `statusEffects[]`. If same `id` already exists, add stacks instead of duplicating.
- `tickStatuses(targets, moment, state)` — for each target, for each status matching `triggerMoment === moment`: resolve the associated `CardEffect`, decrement stacks (for poison-style decay), remove status when stacks reach 0 or `turnsRemaining` expires.
- `removeStatus(target, statusId, state)` — explicit removal.

```typescript
export class StatusEffectService {
  private effectService = new CardEffectService();
  private effectRepo    = new CardEffectRepository();

  applyStatus(
    target: EffectTarget,
    statusDef: StatusEffectDefinition,
    stacks: number,
    state: GameState
  ): GameState { ... }

  async tickStatuses(
    moment: StatusTriggerMoment,
    state: GameState
  ): Promise<GameState> {
    // For each companion and each enemy:
    //   for each status where triggerMoment === moment:
    //     resolve effectId (e.g. damage = stacks for poison)
    //     decrement stacks by 1 (poison decay)
    //     remove if stacks <= 0 or turnsRemaining <= 0
    ...
  }
}
```

### Step 3 — Add `apply_status` card effect action

**Edit:** `backend/src/models/card-effect.ts`

```typescript
export type CardEffectAction =
  | 'damage' | 'shield' | 'heal' | 'evade' | 'evade_draw' | 'draw'
  | 'apply_status';     // ← new
```

**Edit:** `backend/src/services/card-effect.service.ts`

Add a case in `apply()`:
```typescript
case 'apply_status':
  return this.statusService.applyStatus(targets, effect, state);
```

The `CardEffect` for a poison attack would look like:
```json
{
  "id": "fx-poison-apply-2",
  "description": "Apply 2 stacks of Poison.",
  "action": "apply_status",
  "value": 2,
  "target": "companion",
  "statusId": "poison"
}
```

> **Note:** `CardEffect` needs a new optional `statusId` field to specify which status to apply. Add `statusId?: string` to the `CardEffect` interface.

### Step 4 — Define Poison as static data

**New file:** `backend/data/static/status-definitions.json`

```json
[
  {
    "id": "poison",
    "name": "Poison",
    "icon": "☠️",
    "triggerMoment": "turnEnd",
    "tickEffectId": "fx-poison-tick",
    "decayPerTick": 1,
    "description": "At end of turn, take damage equal to stack count. Stacks decrease by 1 each turn."
  }
]
```

**New file:** `backend/src/repo/status-repo.ts` — reads and caches `status-definitions.json`.

**Add tick effect to `card-effects.json`:**
```json
{
  "id": "fx-poison-tick",
  "description": "Poison deals damage equal to current stacks.",
  "action": "damage",
  "value": 0,
  "target": "companion"
}
```

> The `value` is overridden at runtime to equal current stack count. `StatusEffectService.tickStatuses()` creates a modified effect with `value = stacks` before resolving.

### Step 5 — Hook into BattleService turn flow

**Edit:** `backend/src/services/battle.service.ts`

In `endTurn()`, add status tick calls:

```
endTurn(state):
  1. Refill companion energy           (existing)
  2. Tick statuses: turnStart          ← NEW
  3. Enemy attacks                     (existing)
  4. Tick statuses: turnEnd            ← NEW (poison resolves here)
  5. Advance turn counter              (existing)
  6. Check for victory                 (existing)
```

In `playCard()`, after applying the card effect:
```
  → If effect.action === 'apply_status':
      status is applied via StatusEffectService.applyStatus()
      onApply tick fires immediately
```

### Step 6 — Add Poison enemy attack

Add a poison attack to at least one enemy in `backend/data/static/enemies.json`:

```json
{
  "id": "forest-spider-venom",
  "name": "Venom Spit",
  "type": "attack",
  "element": "earth",
  "targeting": "companion",
  "targetNumber": 1,
  "effectId": "fx-poison-apply-2",
  "selectionChance": 0.3
}
```

Replace one of Forest Spider's existing attacks with this, maintaining exactly 3 attacks.

### Step 7 — Frontend: status icon rendering

**Handled by Plan 07** if executed first. Otherwise, add a status badge strip to `CardFrameComponent`:

```html
<div class="status-strip" *ngIf="card.statusEffects?.length">
  <div class="status-badge"
       *ngFor="let s of card.statusEffects"
       [title]="s.name + (s.stacks > 1 ? ' x' + s.stacks : '')">
    <span class="status-icon">{{ s.icon }}</span>
    <span class="status-stacks" *ngIf="s.stacks > 1">{{ s.stacks }}</span>
  </div>
</div>
```

CSS: absolute-positioned badges in the top-right corner of the card frame, stacking vertically.

**Update battle component data mappers** to pass `statusEffects` through `CardFrameData` (also covered by Plan 07).

### Step 8 — Add status icons to `AttackResultPopupComponent`

If a turn-end tick deals poison damage, include it in the `lastTurnActions` or add a separate `statusTickResults` array to the `endTurn` response. Simplest approach: append a synthetic `EnemyTurnAction` entry for each poison tick:

```typescript
turnActions.push({
  enemyId: 'status-poison',
  enemyName: 'Poison',
  attackName: `Poison (${stacks} stacks)`,
  targetId: companion.id,
  targetName: companion.name,
  damageDealt: stacks,
  killedTarget: companion.life <= 0,
});
```

This reuses the existing popup without any structural changes.

---

## Files to create

| File | Purpose |
|---|---|
| `backend/src/services/status-effect.service.ts` | Status application, ticking, removal logic |
| `backend/src/repo/status-repo.ts` | Reads `status-definitions.json` |
| `backend/data/static/status-definitions.json` | Poison (and future status) definitions |

## Files to modify

| File | Changes |
|---|---|
| `backend/src/models/battle-state.ts` | Extend `StatusEffect` with `stacks`, `triggerMoment`, `icon`, `effectId`. Add `StatusTriggerMoment` type. |
| `frontend/src/app/shared/models/battle-state.model.ts` | Mirror `StatusEffect` changes |
| `backend/src/models/card-effect.ts` | Add `'apply_status'` to `CardEffectAction`. Add optional `statusId` field to `CardEffect`. |
| `backend/src/services/card-effect.service.ts` | Add `apply_status` case in `apply()` |
| `backend/src/services/battle.service.ts` | Hook `StatusEffectService.tickStatuses()` into `endTurn()` at turnStart and turnEnd moments |
| `backend/data/static/card-effects.json` | Add `fx-poison-apply-2`, `fx-poison-tick` entries |
| `backend/data/static/enemies.json` | Give Forest Spider (or another enemy) a poison attack |
| `frontend/src/app/shared/components/card-frame/card-frame.component.ts` | Add status badge rendering (if Plan 07 not done first) |
| `frontend/src/app/features/battle/battle.component.ts` | Pass `statusEffects` in card data mappers |

---

## Depends on
- Plan 07 (recommended for status icon rendering, but can add minimal template independently).

## Blocks
- Future status types (burn, freeze, weaken, etc.) — follow the same pattern: add a definition to `status-definitions.json`, add effects to `card-effects.json`, and optionally assign to enemy attacks.

---

## Extensibility notes

The framework is designed so adding a new status requires **zero code changes**:

1. Add a definition to `status-definitions.json` (id, name, icon, triggerMoment, tickEffectId, decayPerTick).
2. Add the tick effect to `card-effects.json`.
3. Add an `apply_status` effect referencing the new `statusId`.
4. Assign the apply effect to a card or enemy attack.

New trigger moments (e.g. `onDamageDealt`, `onHeal`) require adding the string to `StatusTriggerMoment` and adding a call site in the relevant service method.
