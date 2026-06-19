# Plan 08a — Ability Data Model & Unlock Choice Flow

## Scope
Redesign how abilities are stored, unlocked, and chosen. Each companion carries an **ability pool** (the full menu of possible abilities) and a set of **unlock levels** (e.g. `[1, 13, 36]`). When a companion reaches an unlock level the player is presented with a **choice popup** and picks one ability from the pool. The chosen ability is appended to the companion's `specialAbilities` array.

---

## Current state

- `SpecialAbility` interface exists with `id`, `name`, `description`, `trigger`, `unlocksAtLevel`, `usesPerCombat`, `effectId`.
- `Companion.specialAbilities: SpecialAbility[]` field exists on both backend and frontend models.
- All companions in `companions.json` have `specialAbilities: []` — no abilities defined.
- `LevelingService.processLevelUps()` handles stat boosts but does **not** check unlock levels or generate choices.
- No popup or API endpoint for ability selection exists.

---

## Design decisions

### Ability pool on the companion definition

Each companion in `companions.json` gains two new fields:

```jsonc
{
  "id": "wyvern",
  // ... existing fields ...
  "abilityUnlockLevels": [1, 13, 36],
  "abilityPool": [
    // 5–6 abilities the player can pick from across the 3 unlock slots
    { "id": "wyvern-fire-aura",   "name": "Fire Aura",   "description": "...", "trigger": "passive", "usesPerCombat": null, "effectId": "fx-fire-aura" },
    { "id": "wyvern-flame-burst", "name": "Flame Burst", "description": "...", "trigger": "passive", "usesPerCombat": null, "effectId": "fx-flame-burst" },
    { "id": "wyvern-inferno",     "name": "Inferno",     "description": "...", "trigger": "passive", "usesPerCombat": null, "effectId": "fx-inferno" },
    { "id": "wyvern-heat-shield", "name": "Heat Shield", "description": "...", "trigger": "passive", "usesPerCombat": null, "effectId": "fx-heat-shield" },
    { "id": "wyvern-scorch",      "name": "Scorch",      "description": "...", "trigger": "passive", "usesPerCombat": null, "effectId": "fx-scorch" }
  ],
  "specialAbilities": []   // <-- runtime: filled as the player picks
}
```

- `abilityUnlockLevels` — ordered array of **exactly 3** level thresholds.
- `abilityPool` — the menu of **all possible** abilities for this companion (5–6 entries). The player picks 3 over the course of a run, one per unlock level.
- `specialAbilities` — runtime array of the **chosen** abilities. Starts empty. Grows to length 3 max.
- All abilities are `"trigger": "passive"` per the revised to-do requirements.
- `unlocksAtLevel` is **removed** from `SpecialAbility` — the unlock level is now determined by position (which unlock slot the player is filling), not per-ability.

### Choice flow

```
LevelingService.processLevelUps(companion)
  │
  ├─ companion levels up
  ├─ check: does companion.level now match an abilityUnlockLevel
  │          that has not yet been filled?
  │    (i.e. specialAbilities.length < index+1 for each matching level)
  │
  └─ YES → add a PendingAbilityChoice to GameState
           { companionId, options: pick 3 random from remaining pool }
```

The **backend never auto-picks** — it flags the pending choice and the frontend shows the popup. The game cannot proceed (no card plays or moves) until all pending ability choices are resolved.

### Pending ability choice on GameState

```typescript
export interface PendingAbilityChoice {
  companionId: string;
  companionName: string;
  /** The unlock slot index (0, 1, or 2) being filled. */
  unlockIndex: number;
  /** 3 abilities randomly drawn from the companion's abilityPool (minus already chosen). */
  options: SpecialAbility[];
}
```

Add to `GameState`:
```typescript
export interface GameState {
  // ... existing fields ...
  pendingAbilityChoices?: PendingAbilityChoice[];
}
```

---

## Implementation steps

### Step 1 — Model changes

**Backend `backend/src/models/companion.ts`:**
- Remove `unlocksAtLevel` from `SpecialAbility`.
- Add `abilityUnlockLevels: number[]` to `Companion`.
- Add `abilityPool: SpecialAbility[]` to `Companion`.

```typescript
export interface SpecialAbility {
  id: string;
  name: string;
  description: string;
  trigger: SpecialAbilityTrigger;       // always 'passive' for now
  usesPerCombat: number | null;         // null for passives
  effectId: string;
}

export interface Companion {
  // ... existing fields ...
  abilityUnlockLevels: number[];        // e.g. [1, 13, 36]
  abilityPool: SpecialAbility[];        // 5–6 choices available
  specialAbilities: SpecialAbility[];   // runtime: chosen abilities (0–3)
}
```

**Backend `backend/src/models/game-state.ts`:**
- Add `pendingAbilityChoices?: PendingAbilityChoice[]`.
- Add the `PendingAbilityChoice` interface (can live here or in a new `ability.ts` file).

**Frontend mirrors:**
- `frontend/src/app/shared/models/companion.model.ts` — mirror all changes.
- `frontend/src/app/shared/models/game-state.model.ts` — add `pendingAbilityChoices?`.

### Step 2 — Populate companions.json

Add `abilityUnlockLevels` and `abilityPool` to each of the 6 companions. All abilities are `"trigger": "passive"`. Each companion gets 5 abilities in the pool.

Example for Wyvern (attack / fire):
```json
{
  "id": "wyvern",
  "abilityUnlockLevels": [1, 13, 36],
  "abilityPool": [
    { "id": "wyvern-fire-aura",     "name": "Fire Aura",     "description": "Attack cards deal +1 damage.",                       "trigger": "passive", "usesPerCombat": null, "effectId": "fx-fire-aura" },
    { "id": "wyvern-ember-shield",  "name": "Ember Shield",  "description": "Gain 1 shield when playing an attack card.",         "trigger": "passive", "usesPerCombat": null, "effectId": "fx-ember-shield" },
    { "id": "wyvern-heat-surge",    "name": "Heat Surge",    "description": "First attack card each turn costs 0 energy.",        "trigger": "passive", "usesPerCombat": null, "effectId": "fx-heat-surge" },
    { "id": "wyvern-inferno-heart", "name": "Inferno Heart", "description": "Fire cards deal +2 damage to enemies below 50% HP.", "trigger": "passive", "usesPerCombat": null, "effectId": "fx-inferno-heart" },
    { "id": "wyvern-scorch-aura",   "name": "Scorch Aura",   "description": "Enemies that attack this companion take 1 damage.",  "trigger": "passive", "usesPerCombat": null, "effectId": "fx-scorch-aura" }
  ],
  "specialAbilities": []
}
```

Design each companion's pool thematically:
- Attack companions → damage boosts, on-hit effects.
- Defense companions → shield boosts, damage reduction, retaliation.
- Utility companions → draw bonuses, energy efficiency, healing.

### Step 3 — Add stub card effects

Add placeholder entries to `backend/data/static/card-effects.json` for every `effectId` referenced in the ability pools. Use `"action": "damage", "value": 0` as no-op stubs. The actual resolution will be implemented in Plan 08b.

### Step 4 — Update LevelingService

**Edit:** `backend/src/services/leveling.service.ts`

Current `processLevelUps()` loops level-ups and applies stat boosts. After the loop, add unlock detection:

```typescript
processLevelUps(companion: Companion): { companion: Companion; newChoices: PendingAbilityChoice[] } {
  let c = { ...companion };
  const newChoices: PendingAbilityChoice[] = [];
  let threshold = this.expThreshold(c.level);

  while (c.exp >= threshold) {
    c.exp   -= threshold;
    c.level += 1;
    // ... existing stat boost logic ...
    threshold = this.expThreshold(c.level);
  }

  c.nextLevelExp = threshold;

  // Check each unlock level
  const unlockLevels = c.abilityUnlockLevels ?? [];
  for (let i = 0; i < unlockLevels.length; i++) {
    if (c.level >= unlockLevels[i] && (c.specialAbilities?.length ?? 0) <= i) {
      // This unlock slot is due — generate choice options
      const chosenIds = new Set((c.specialAbilities ?? []).map(a => a.id));
      const remaining = (c.abilityPool ?? []).filter(a => !chosenIds.has(a.id));
      const options   = this.pickRandom(remaining, 3);
      if (options.length > 0) {
        newChoices.push({
          companionId:   c.id,
          companionName: c.name,
          unlockIndex:   i,
          options,
        });
      }
    }
  }

  return { companion: c, newChoices };
}
```

**Important:** The return type changes from `Companion` to `{ companion, newChoices }`. All callers must be updated.

Update `processAll()`:
```typescript
processAll(companions: Companion[]): { companions: Companion[]; allChoices: PendingAbilityChoice[] } {
  const allChoices: PendingAbilityChoice[] = [];
  const result = companions.map(c => {
    const { companion, newChoices } = this.processLevelUps(c);
    allChoices.push(...newChoices);
    return companion;
  });
  return { companions: result, allChoices };
}
```

### Step 5 — Update BattleService.collectRewards()

Currently calls `this.leveling.processAll(companions)`. Update to handle the new return shape:

```typescript
const { companions: leveledCompanions, allChoices } = this.leveling.processAll(companions);

return {
  ...state,
  player:     { ...state.player, gold },
  companions: leveledCompanions,
  battle:     { ...battle, active: false, pendingCardRewards },
  pendingAbilityChoices: [
    ...(state.pendingAbilityChoices ?? []),
    ...allChoices,
  ],
};
```

### Step 6 — New API endpoint: POST /action/choose-ability

**Route:** `backend/src/routes/game.routes.ts`
```typescript
router.post('/action/choose-ability', controller.chooseAbility.bind(controller));
```

**Controller:** `backend/src/controllers/game.controller.ts`
```typescript
async chooseAbility(req: Request, res: Response) {
  const state = await this.repository.load();
  const { companionId, abilityId } = req.body as { companionId: string; abilityId: string };

  // Find the pending choice
  const pending = (state.pendingAbilityChoices ?? []);
  const choice  = pending.find(c => c.companionId === companionId);
  if (!choice) { res.status(400).json({ error: 'No pending ability choice for this companion.' }); return; }

  // Validate the chosen ability is in the options
  const ability = choice.options.find(a => a.id === abilityId);
  if (!ability) { res.status(400).json({ error: 'Invalid ability choice.' }); return; }

  // Append to companion's specialAbilities
  const updatedCompanions = state.companions.map(c =>
    c.id === companionId
      ? { ...c, specialAbilities: [...(c.specialAbilities ?? []), ability] }
      : c
  );

  // Remove this pending choice
  const remainingChoices = pending.filter(c => c.companionId !== companionId);

  const updated: GameState = {
    ...state,
    companions: updatedCompanions,
    pendingAbilityChoices: remainingChoices,
    history: [...state.history, `${choice.companionName} learned ${ability.name}`],
  };

  await this.repository.save(updated);
  res.json(updated);
}
```

### Step 7 — Frontend: API + GameStateService

**`frontend/src/app/shared/services/api.service.ts`:**
```typescript
chooseAbility(companionId: string, abilityId: string) {
  return this.http.post<GameStateModel>(`${API_BASE}/action/choose-ability`, { companionId, abilityId });
}
```

**`frontend/src/app/shared/services/game-state.service.ts`:**
```typescript
chooseAbility(companionId: string, abilityId: string) {
  this.api.chooseAbility(companionId, abilityId).subscribe(updated => {
    this.state$.next(updated);
  });
}
```

Add a convenience observable:
```typescript
pendingAbilityChoice$ = this.state$.pipe(
  map(s => (s?.pendingAbilityChoices ?? [])[0] ?? null)
);
```

### Step 8 — Frontend: Ability Choice Popup

**New file:** `frontend/src/app/features/battle/ability-choice-popup.component.ts`

A modal component (similar style to `AttackResultPopupComponent`) that:
- Shows the companion name and the unlock slot number (e.g. "Wyvern — Ability Slot 1").
- Displays 3 ability option cards, each showing name + description.
- Clicking one calls `GameStateService.chooseAbility(companionId, abilityId)`.
- Dismisses when the choice is made (the `pendingAbilityChoices` array shrinks).

**Display trigger:**
- In `CombatResultsComponent` (or a wrapper): after proceeding from results, check `state.pendingAbilityChoices`. If non-empty, show the popup before navigating to card-reward or map.
- Also check after `claimReward()` returns — level-ups happen at reward collection time.

**Template sketch:**
```html
<div class="ability-popup-backdrop" *ngIf="pendingChoice">
  <div class="ability-popup">
    <h2>{{ pendingChoice.companionName }} — New Ability!</h2>
    <p>Choose one ability to learn:</p>
    <div class="ability-options">
      <div class="ability-option" *ngFor="let ab of pendingChoice.options"
           (click)="pick(ab.id)">
        <span class="ab-name">{{ ab.name }}</span>
        <span class="ab-desc">{{ ab.description }}</span>
      </div>
    </div>
  </div>
</div>
```

### Step 9 — Block game actions while choice is pending

If `state.pendingAbilityChoices` is non-empty, the player must resolve all choices before continuing. Two approaches:

**Option A (recommended — frontend gate):** `GameStateService.moveToNode()`, `playCardWithCompanion()`, and `endTurn()` check `pendingAbilityChoices.length > 0` and return early / show a toast. The popup auto-displays.

**Option B (backend gate):** `BattleService.playCard()` and `endTurn()` reject with an error if `pendingAbilityChoices` is non-empty. Safer but requires more backend changes.

Go with **Option A** — simpler, and the backend is already the source of truth for the choice list.

---

## Files to create

| File | Purpose |
|---|---|
| `frontend/src/app/features/battle/ability-choice-popup.component.ts` | Ability choice modal |

## Files to modify

| File | Changes |
|---|---|
| `backend/src/models/companion.ts` | Remove `unlocksAtLevel` from `SpecialAbility`. Add `abilityUnlockLevels`, `abilityPool` to `Companion`. |
| `backend/src/models/game-state.ts` | Add `PendingAbilityChoice` interface. Add `pendingAbilityChoices?` to `GameState`. |
| `frontend/src/app/shared/models/companion.model.ts` | Mirror companion model changes. |
| `frontend/src/app/shared/models/game-state.model.ts` | Mirror `PendingAbilityChoice` + field. |
| `backend/src/services/leveling.service.ts` | Change return types of `processLevelUps()` and `processAll()` to include `newChoices`. Add unlock detection. |
| `backend/src/services/battle.service.ts` | Update `collectRewards()` to handle new `processAll()` return shape. Append choices to state. |
| `backend/src/controllers/game.controller.ts` | Add `chooseAbility()` method. Update `finalizeCompanions()` to stamp `abilityUnlockLevels` and `abilityPool`. |
| `backend/src/routes/game.routes.ts` | Add `POST /action/choose-ability` route. |
| `frontend/src/app/shared/services/api.service.ts` | Add `chooseAbility()` method. |
| `frontend/src/app/shared/services/game-state.service.ts` | Add `chooseAbility()` method and `pendingAbilityChoice$`. Gate actions when choices pending. |
| `backend/data/static/companions.json` | Add `abilityUnlockLevels` and `abilityPool` to each companion. |
| `backend/data/static/card-effects.json` | Add stub effects for all ability `effectId`s. |

---

## Depends on
- None.

## Blocks
- Plan 08b (ability resolution requires abilities to exist on companions).
- Plan 08c (display requires data model to be finalised).
