# Plan 08c — Ability Display on Cards & Panels

## Scope
Render the companion's **chosen abilities** on companion cards and in the player info panel. Show a **next unlock level** label so the player knows when the next ability slot opens. Hide abilities that are not yet chosen.

---

## Current state

After Plan 08a:
- `Companion.specialAbilities` contains 0–3 chosen abilities (populated via the choice popup).
- `Companion.abilityUnlockLevels` tells which levels unlock each slot (e.g. `[1, 13, 36]`).
- `PlayerInfoPanelComponent` already renders abilities but uses the old `unlocksAtLevel` check (which no longer exists after 08a).

---

## Implementation steps

### Step 1 — Extend CardFrameData

**Edit:** `frontend/src/app/shared/components/card-frame/card-frame.component.ts`

Add optional fields to `CardFrameData`:

```typescript
export interface CardAbilityData {
  name: string;
  description: string;
  trigger: 'passive' | 'activable';
}

export interface CardFrameData {
  // ... existing fields ...
  abilities?: CardAbilityData[];
  nextUnlockLevel?: number | null;   // null = all 3 slots filled
  energyRefill?: number;
}
```

### Step 2 — Add abilities section to CardFrameComponent template

Add a new section **below** the HP/energy bars, inside a `*ngIf="variant === 'companion' || variant === 'selection'"` guard:

```html
<!-- Companion abilities -->
<ng-container *ngIf="(variant === 'companion' || variant === 'selection') && card.abilities?.length">
  <div class="card-abilities-section">
    <div class="card-ability" *ngFor="let ab of card.abilities">
      <span class="card-ab-name">{{ ab.name }}</span>
      <span class="card-ab-desc">{{ ab.description }}</span>
    </div>
  </div>
</ng-container>

<!-- Next unlock label -->
<div class="next-unlock" *ngIf="card.nextUnlockLevel">
  Next ability at Lv. {{ card.nextUnlockLevel }}
</div>

<!-- Energy refill -->
<div class="energy-refill-row" *ngIf="card.energyRefill !== undefined">
  <span class="refill-icon">🔄</span>
  <span class="refill-text">+{{ card.energyRefill }} energy / turn</span>
</div>
```

### Step 3 — Add CSS for abilities

```css
/* Abilities section */
.card-abilities-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px solid #e2e8f0;
}
.card-ability {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 0;
}
.card-ab-name {
  font-size: 0.78rem;
  font-weight: 800;
  color: #1e3a8a;
}
.card-ab-desc {
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.3;
}

/* Next unlock label */
.next-unlock {
  font-size: 0.68rem;
  font-weight: 700;
  color: #94a3b8;
  font-style: italic;
  text-align: center;
  padding: 2px 0;
}

/* Energy refill row */
.energy-refill-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #64748b;
}
.refill-icon { font-size: 0.8rem; }
.refill-text { font-weight: 600; }
```

### Step 4 — Update BattleComponent data mappers

**Edit:** `frontend/src/app/features/battle/battle.component.ts`

In `companionCardData()`:

```typescript
companionCardData(companion: CompanionModel): CardFrameData {
  const maxLife   = companion.maxLife   ?? companion.life;
  const maxEnergy = companion.maxEnergy ?? companion.energy;

  // Compute next unlock level
  const unlockLevels = companion.abilityUnlockLevels ?? [];
  const filledSlots  = companion.specialAbilities?.length ?? 0;
  const nextUnlock   = filledSlots < unlockLevels.length
    ? unlockLevels[filledSlots]
    : null;

  return {
    name:     companion.name,
    band:     companion.type,
    type:     companion.type,
    element:  companion.element,
    hp:       companion.life,
    maxHp:    maxLife,
    energy:   companion.energy,
    maxEnergy: maxEnergy,
    sprite:   companion.sprite,
    energyRefill: companion.energyRefill,
    abilities: (companion.specialAbilities ?? []).map(a => ({
      name: a.name,
      description: a.description,
      trigger: a.trigger,
    })),
    nextUnlockLevel: nextUnlock,
  };
}
```

### Step 5 — Update CompanionSelectionComponent

**Edit:** `frontend/src/app/features/menu/companion-selection.component.ts`

Same pattern as battle component — pass abilities and next unlock level. During selection the companion is at level 1 with no abilities chosen yet, so:
- `abilities` will be `[]` (empty).
- `nextUnlockLevel` will be `abilityUnlockLevels[0]` (e.g. 1 — immediate first choice).

Also show the full `abilityUnlockLevels` as a label in the selection card, e.g. "Abilities at Lv. 1, 13, 36":

```html
<div class="unlock-schedule" *ngIf="companion.abilityUnlockLevels?.length">
  Abilities at Lv. {{ companion.abilityUnlockLevels.join(', ') }}
</div>
```

### Step 6 — Update PlayerInfoPanelComponent

**Edit:** `frontend/src/app/shared/components/player-info-panel/player-info-panel.component.ts`

Replace the current abilities rendering (which uses the old `unlocksAtLevel` check) with:
- Show `specialAbilities` (the **chosen** ones) normally — name + description.
- Show a "Next ability at Lv. X" line if fewer than 3 abilities are chosen.
- Remove the old `*ngIf="ab.unlocksAtLevel > c.level"` lock tag logic since `unlocksAtLevel` no longer exists on `SpecialAbility`.

```html
<!-- Special Abilities -->
<div class="comp-abilities" *ngIf="c.specialAbilities?.length">
  <div class="comp-ability-title">Abilities</div>
  <div class="comp-ability" *ngFor="let ab of c.specialAbilities">
    <span class="ab-name">{{ ab.name }}</span>
    <span class="ab-desc">{{ ab.description }}</span>
  </div>
</div>
<div class="comp-next-unlock" *ngIf="nextUnlockLevel(c) as lvl">
  Next ability at Lv. {{ lvl }}
</div>
```

Helper method:
```typescript
nextUnlockLevel(c: CompanionModel): number | null {
  const levels = c.abilityUnlockLevels ?? [];
  const filled = c.specialAbilities?.length ?? 0;
  return filled < levels.length ? levels[filled] : null;
}
```

---

## Files to modify

| File | Changes |
|---|---|
| `frontend/src/app/shared/components/card-frame/card-frame.component.ts` | Add `CardAbilityData`, add `abilities?`, `nextUnlockLevel?`, `energyRefill?` to `CardFrameData`. Add abilities template section + CSS. |
| `frontend/src/app/features/battle/battle.component.ts` | Update `companionCardData()` to pass abilities, next unlock level, energy refill. |
| `frontend/src/app/features/menu/companion-selection.component.ts` | Update `companionCardData()` similarly. Add unlock schedule label. |
| `frontend/src/app/shared/components/player-info-panel/player-info-panel.component.ts` | Replace old ability rendering with new chosen-abilities view + next unlock label. |

---

## Depends on
- Plan 08a (data model must be in place — `abilityUnlockLevels`, `abilityPool`, `specialAbilities` populated via choice).

## Blocks
- Nothing directly — this is a leaf plan.

---

## Notes
- Only **chosen** abilities are displayed on the card. The `abilityPool` (unchosen options) is never shown outside the choice popup.
- The `nextUnlockLevel` label gives the player a progression goal without revealing which abilities are available.
- The energy refill row is added here since it was missing from the card display and fits naturally with the companion stat block.
