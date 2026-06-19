# Plan 07 — Card Display Redesign

## Scope
Redesign the `CardFrameComponent` to show richer information per the wireframes in `to-do.md`. Three distinct layouts for **Companion**, **Enemy**, and **Hand card** variants — each with all relevant game data visible on the card face.

This plan is **frontend-only** — no backend model changes required. All data fields already exist on the models (`specialAbilities`, `statusEffects`, `rewards`, `expReward`, `energyRefill`, `level`, `exp`, `nextLevelExp`). The work is wiring that data through `CardFrameData` and rendering it.

---

## Current state

`CardFrameComponent` (`frontend/src/app/shared/components/card-frame/card-frame.component.ts`) supports 4 variants (`hand`, `companion`, `enemy`, `selection`) but renders a **shared** template. Companion and enemy cards show only:
- Name, element badge, type band
- Art area
- HP bar, energy dots

**Missing from companion cards:** XP bar, energy refill indicator, special abilities (with locked/unlocked state), status effect icons.

**Missing from enemy cards:** XP reward, gold/card-draw rewards, attack list (name + description), status effect icons.

**Missing from hand cards:** the card template in to-do.md shows attacks — however hand cards don't have attacks. The to-do wireframe appears to duplicate the enemy/companion attack section into the hand card by mistake. Hand cards already show normal/enhanced effects. No structural change needed for hand cards beyond minor polish.

---

## Target wireframes (from to-do.md)

### Companion card layout
```
|-------------------------------------------------------|----------|
| Name                                          Type    | status 1 |
|-------------------------------------------------------|----------|
|                   COMPANION_TYPE                       |
|-------------------------------------------------------|
|                                                       |
|       Sprite                                          |
|                                                       |
|-------------------------------------------------------|
| ❤️ HP_BAR                               HP / maxHP   |
| ⚡ energy dots                          E / maxE     |
| ✨ XP_BAR                               XP / next    |
|                                                       |
| 🔄 Energy refill: +N per turn                        |
|                                                       |
| Ability_1_name               (if unlocked)            |
|   Ability_1_description                               |
| Ability_2_name               (if unlocked)            |
|   Ability_2_description                               |
| Ability_3_name               (if unlocked)            |
|   Ability_3_description                               |
|-------------------------------------------------------|
```

### Enemy card layout
```
|-------------------------------------------------------|----------|
| Name                                          Type    | status 1 |
|-------------------------------------------------------|----------|
|                                                       | status 2 |
|       Sprite                                          |----------|
|                                                       |
|-------------------------------------------------------|
| ❤️ HP_BAR                               HP / maxHP   |
|                                                       |
| ✨ XP reward: N                                       |
| 💰 Gold: N   🃏 Card draw (tier)                     |
|                                                       |
| Attack 1 name                                         |
|   Attack 1 effect description                         |
| Attack 2 name                                         |
|   Attack 2 effect description                         |
| Attack 3 name                                         |
|   Attack 3 effect description                         |
|-------------------------------------------------------|
```

### Hand card layout
No structural change needed — current layout already matches the wireframe (name, type, cost, sprite, normal effect, enhanced effect). Minor polish only.

---

## Files to modify

| File | Changes |
|---|---|
| `frontend/src/app/shared/components/card-frame/card-frame.component.ts` | Extend `CardFrameData` interface with new optional fields. Add variant-specific template sections using `*ngIf` on `variant`. Add CSS for abilities, rewards, XP bar, status badges, energy refill row. |
| `frontend/src/app/features/battle/battle.component.ts` | Update `companionCardData()` to pass `abilities`, `exp`, `nextLevelExp`, `energyRefill`, `statusEffects`, `level`. Update `enemyCardData()` to pass `expReward`, `rewards`, `attacks`, `statusEffects`. |
| `frontend/src/app/features/menu/companion-selection.component.ts` | Update `companionCardData()` similarly (selection variant should show abilities too). |
| `frontend/src/app/shared/components/player-info-panel/player-info-panel.component.ts` | No change needed — it already renders abilities in its own panel, not through `CardFrameComponent`. |

---

## Implementation steps

### Step 1 — Extend `CardFrameData`

Add optional fields:

```typescript
export interface CardFrameData {
  // ... existing fields ...

  // Companion-specific
  level?: number;
  exp?: number;
  nextLevelExp?: number;
  energyRefill?: number;
  abilities?: CardAbilityData[];
  statusEffects?: CardStatusData[];

  // Enemy-specific
  expReward?: number;
  rewards?: CardRewardData[];
  attacks?: CardAttackData[];
}

export interface CardAbilityData {
  name: string;
  description: string;
  trigger: 'passive' | 'activable';
  unlocked: boolean;          // pre-computed by caller: ability.unlocksAtLevel <= companion.level
}

export interface CardStatusData {
  id: string;
  name: string;
  icon: string;               // emoji or short label
  stacks?: number;
  turnsRemaining?: number | null;
}

export interface CardRewardData {
  type: 'gold' | 'exp' | 'card-draw';
  value: number;
  tier?: string;
}

export interface CardAttackData {
  name: string;
  description: string;        // loaded from card-effects.json via effectId at the API level, or passed as-is
  element?: string;
}
```

### Step 2 — Add variant-specific template sections

Use `*ngIf="variant === 'companion'"` and `*ngIf="variant === 'enemy'"` to render the new blocks **below** the existing HP/energy bars:

**Companion section:**
- XP bar (same style as HP bar but purple gradient)
- Energy refill row: `🔄 +N per turn`
- Abilities list: each ability shows name + description. Only rendered when `ability.unlocked === true`. Locked abilities hidden entirely (per to-do: "When an ability is locked it won't show on the companion card").

**Enemy section:**
- XP reward row: `✨ N XP`
- Rewards row: `💰 N gold` + `🃏 card-draw (tier)` inline
- Attacks list: each attack shows name + brief description

### Step 3 — Status effect badges

Add a **status strip** to the top-right corner of the card frame, outside the main flow. Use absolute positioning relative to `.card-frame`:

```html
<div class="status-strip" *ngIf="card.statusEffects?.length">
  <div class="status-badge" *ngFor="let s of card.statusEffects"
       [title]="s.name + (s.stacks ? ' x' + s.stacks : '')">
    {{ s.icon }}
    <span class="status-stack" *ngIf="s.stacks && s.stacks > 1">{{ s.stacks }}</span>
  </div>
</div>
```

Position: top-right corner, stacking vertically downward.

### Step 4 — Update battle component data mappers

In `BattleComponent`:

```typescript
companionCardData(companion: CompanionModel): CardFrameData {
  return {
    // ... existing fields ...
    level: companion.level,
    exp: companion.exp,
    nextLevelExp: companion.nextLevelExp,
    energyRefill: companion.energyRefill,
    abilities: (companion.specialAbilities ?? []).map(a => ({
      name: a.name,
      description: a.description,
      trigger: a.trigger,
      unlocked: a.unlocksAtLevel <= companion.level,
    })),
    statusEffects: (companion.statusEffects ?? []).map(s => ({
      id: s.id, name: s.name, icon: statusIcon(s.id), turnsRemaining: s.turnsRemaining,
    })),
  };
}

enemyCardData(enemy: EnemyModel): CardFrameData {
  return {
    // ... existing fields ...
    expReward: enemy.expReward,
    rewards: enemy.rewards,
    attacks: ???,  // see Step 5
    statusEffects: (enemy.statusEffects ?? []).map(s => ({
      id: s.id, name: s.name, icon: statusIcon(s.id), turnsRemaining: s.turnsRemaining,
    })),
  };
}
```

### Step 5 — Enemy attack descriptions

**Problem:** `EnemyModel` (the runtime `BattleEnemy`) does not carry its attack list — attacks live on `EnemyDefinition` in `enemies.json`, looked up by `definitionId`. The frontend currently has no access to attack descriptions.

**Options (pick one):**

**Option A (recommended):** Add an `attacks` summary array to `BattleEnemy` at spawn time in `EnemySpawnerService.buildEnemies()`. Each entry stores `{ name, description }` — the description is loaded from `CardEffectRepository` at spawn time. This enriches the persisted state once and requires no extra API calls.

**Option B:** Create a new `GET /api/game/enemies/definitions` endpoint and load attack data lazily from the frontend. More complex and adds a loading state.

**Go with Option A** — extend `BattleEnemy` and `EnemyModel` with an optional `attackSummaries` field, populated at spawn time.

---

## New backend changes (Option A — attack summaries)

| File | Change |
|---|---|
| `backend/src/models/battle-state.ts` | Add `attackSummaries?: { name: string; description: string; element?: string }[]` to `BattleEnemy` |
| `frontend/src/app/shared/models/battle-state.model.ts` | Mirror the field on `EnemyModel` |
| `backend/src/services/enemy-spawner.service.ts` | In `buildEnemies()`, load each attack's `CardEffect` description via `CardEffectRepository` and attach as `attackSummaries` |

---

## Styling notes

- XP bar: purple gradient (`#6366f1` → `#818cf8`), same height/radius as HP bar.
- Abilities: compact list, slightly indented. Name in bold, description in muted text below. Use a small icon for trigger type (`🔵` passive, `🟡` activable).
- Rewards: single row with inline badges.
- Status strip: small rounded squares stacked vertically, `position: absolute; top: 0; right: -36px` (or overlapping the frame edge).
- Keep all new sections behind `*ngIf` so hand-variant cards are unaffected.

---

## Depends on
- None (all model fields already exist).

## Blocks
- Plan 09 (Status Effects) — the status badge rendering is defined here; Plan 09 adds the logic that populates the data.
