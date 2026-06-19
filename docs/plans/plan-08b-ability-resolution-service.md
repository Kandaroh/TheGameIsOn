# Plan 08b — Companion Ability Resolution Service

## Scope
Create a new `CompanionAbilityService` on the backend that evaluates a companion's **passive abilities** every time a card is played. The service modifies the resolved `CardEffect` before it is applied (e.g. "+1 damage", "+1 shield"), giving abilities real game impact.

---

## Current state

After Plan 08a:
- Companions have `specialAbilities: SpecialAbility[]` populated with the player's chosen passives.
- Each ability has an `effectId` pointing to a stub entry in `card-effects.json`.
- No code reads `specialAbilities` during card play — they are display-only.

---

## Design

### Passive ability modifier pattern

Each passive ability describes a **card-play modifier** — a rule that alters the effect value, adds a bonus effect, or changes targeting whenever a card is played by the owning companion.

Instead of resolving abilities via `CardEffectService.apply()` (which targets entities), abilities modify the **card effect itself** before it is applied. This is a pre-processing step.

### Modifier types

| Modifier | Example ability | What it does |
|---|---|---|
| `bonus_damage` | "Attack cards deal +1 damage" | If the card effect's action is `damage`, add N to its value |
| `bonus_shield` | "Gain +1 shield when playing a defense card" | If the card type is `defense`, apply an extra `shield` effect after the main effect |
| `cost_reduction` | "First attack card each turn costs 0 energy" | Conditionally reduce card cost (checked before energy deduction) |
| `conditional_bonus` | "Fire cards deal +2 damage to enemies below 50% HP" | Bonus damage applied only when a condition is met |
| `retaliation` | "Enemies that attack this companion take 1 damage" | Triggered during enemy turn, not card play (hooks into `endTurn()`) |

To keep this extensible, define a `PassiveModifier` type on the ability definition:

```typescript
export type PassiveModifierType =
  | 'bonus_damage'
  | 'bonus_shield'
  | 'cost_reduction'
  | 'conditional_bonus'
  | 'retaliation';

export interface PassiveModifier {
  type: PassiveModifierType;
  value: number;
  /** Optional condition — e.g. "card.type === 'attack'" */
  condition?: PassiveCondition;
}

export interface PassiveCondition {
  /** Which field to check: 'card.type', 'card.element', 'target.hpPercent' */
  field: string;
  /** Comparison operator */
  op: 'eq' | 'neq' | 'lt' | 'gt' | 'lte' | 'gte';
  /** Value to compare against */
  value: string | number;
}
```

### Where modifiers live

Add an optional `modifier` field to `SpecialAbility`:

```typescript
export interface SpecialAbility {
  id: string;
  name: string;
  description: string;
  trigger: SpecialAbilityTrigger;
  usesPerCombat: number | null;
  effectId: string;
  modifier?: PassiveModifier;    // ← new
}
```

This keeps the modifier co-located with the ability in `companions.json`, making it fully data-driven.

---

## Implementation steps

### Step 1 — Create `CompanionAbilityService`

**New file:** `backend/src/services/companion-ability.service.ts`

```typescript
export class CompanionAbilityService {

  /**
   * Pre-process a card effect based on the playing companion's passive abilities.
   * Returns a modified CardEffect (or the original if no modifiers apply).
   */
  applyPassiveModifiers(
    effect: CardEffect,
    card: Card,
    companion: Companion,
    targets: EffectTarget[],
    state: GameState
  ): CardEffect {
    let modified = { ...effect };

    for (const ability of companion.specialAbilities ?? []) {
      if (ability.trigger !== 'passive' || !ability.modifier) continue;
      if (!this.checkCondition(ability.modifier, card, companion, targets, state)) continue;

      switch (ability.modifier.type) {
        case 'bonus_damage':
          if (modified.action === 'damage') {
            modified = { ...modified, value: modified.value + ability.modifier.value };
          }
          break;
        case 'bonus_shield':
          // Handled as a post-effect — returns extra effects to apply
          break;
        case 'cost_reduction':
          // Handled before energy deduction, not here
          break;
      }
    }

    return modified;
  }

  /**
   * Collect any post-card-play bonus effects (e.g. bonus shield on defense play).
   */
  getPostPlayEffects(
    card: Card,
    companion: Companion,
    state: GameState
  ): CardEffect[] {
    const extras: CardEffect[] = [];

    for (const ability of companion.specialAbilities ?? []) {
      if (ability.trigger !== 'passive' || !ability.modifier) continue;
      if (ability.modifier.type !== 'bonus_shield') continue;
      if (!this.checkCondition(ability.modifier, card, companion, [], state)) continue;

      extras.push({
        id: `${ability.id}-bonus`,
        description: ability.description,
        action: 'shield',
        value: ability.modifier.value,
        target: 'companion',
      });
    }

    return extras;
  }

  /**
   * Check cost reduction modifiers. Returns total energy discount.
   */
  getCostReduction(
    card: Card,
    companion: Companion,
    state: GameState
  ): number {
    let discount = 0;

    for (const ability of companion.specialAbilities ?? []) {
      if (ability.trigger !== 'passive' || !ability.modifier) continue;
      if (ability.modifier.type !== 'cost_reduction') continue;
      if (!this.checkCondition(ability.modifier, card, companion, [], state)) continue;
      discount += ability.modifier.value;
    }

    return discount;
  }

  /**
   * Get retaliation damage for enemy-turn processing.
   * Returns total retaliation damage for the given companion.
   */
  getRetaliationDamage(companion: Companion): number {
    let total = 0;
    for (const ability of companion.specialAbilities ?? []) {
      if (ability.trigger !== 'passive' || !ability.modifier) continue;
      if (ability.modifier.type !== 'retaliation') continue;
      total += ability.modifier.value;
    }
    return total;
  }

  private checkCondition(
    modifier: PassiveModifier,
    card: Card,
    companion: Companion,
    targets: EffectTarget[],
    state: GameState
  ): boolean {
    if (!modifier.condition) return true;  // no condition = always applies

    const { field, op, value } = modifier.condition;
    let actual: any;

    switch (field) {
      case 'card.type':    actual = card.type; break;
      case 'card.element': actual = card.element; break;
      default: return true;
    }

    switch (op) {
      case 'eq':  return actual === value;
      case 'neq': return actual !== value;
      case 'lt':  return actual < value;
      case 'gt':  return actual > value;
      case 'lte': return actual <= value;
      case 'gte': return actual >= value;
      default:    return true;
    }
  }
}
```

### Step 2 — Hook into BattleService.playCard()

**Edit:** `backend/src/services/battle.service.ts`

Add `private abilityService = new CompanionAbilityService();`

In `playCard()`, after resolving the base effect and before applying it:

```typescript
// --- BEFORE (current) ---
const afterEffect = this.effectService.apply(effect, updatedCompanion, resolvedTargets, midState);

// --- AFTER (with ability modifiers) ---
// 1. Apply cost reduction (before energy check, earlier in the method)
const discount = this.abilityService.getCostReduction(card, companion, state);
const effectiveCost = Math.max(0, card.cost - discount);
// Use effectiveCost instead of card.cost for energy deduction

// 2. Modify the effect based on passives
const modifiedEffect = this.abilityService.applyPassiveModifiers(
  effect, card, updatedCompanion, resolvedTargets, midState
);

// 3. Apply the modified effect
const afterEffect = this.effectService.apply(modifiedEffect, updatedCompanion, resolvedTargets, midState);

// 4. Apply any post-play bonus effects (e.g. bonus shield)
let afterBonuses = afterEffect;
const bonusEffects = this.abilityService.getPostPlayEffects(card, updatedCompanion, afterEffect);
for (const bonus of bonusEffects) {
  afterBonuses = this.effectService.apply(bonus, updatedCompanion, [updatedCompanion], afterBonuses);
}
```

### Step 3 — Hook into BattleService.endTurn() for retaliation

In `endTurn()`, after each enemy attack resolves, check if the target companion has retaliation:

```typescript
// After applying enemy attack effect...
const retaliationDmg = this.abilityService.getRetaliationDamage(target);
if (retaliationDmg > 0) {
  const retaliationEffect: CardEffect = {
    id: 'retaliation', description: 'Retaliation', action: 'damage',
    value: retaliationDmg, target: 'wildMonster',
  };
  workingState = this.effectService.apply(retaliationEffect, target, [enemy], workingState);
  workingState.battle!.log.push(
    `${target.name} retaliates for ${retaliationDmg} damage!`
  );
}
```

### Step 4 — Update companions.json with modifiers

Add `modifier` objects to each ability in every companion's `abilityPool`:

```json
{
  "id": "wyvern-fire-aura",
  "name": "Fire Aura",
  "description": "Attack cards deal +1 damage.",
  "trigger": "passive",
  "usesPerCombat": null,
  "effectId": "fx-fire-aura",
  "modifier": {
    "type": "bonus_damage",
    "value": 1,
    "condition": { "field": "card.type", "op": "eq", "value": "attack" }
  }
}
```

### Step 5 — Log ability modifiers

In `BattleService.playCard()`, when a modifier fires, append to the battle log:

```typescript
if (modifiedEffect.value !== effect.value) {
  updatedBattle.log.push(
    `  [${companion.name}] passive: ${ability.name} — effect boosted to ${modifiedEffect.value}`
  );
}
```

---

## Files to create

| File | Purpose |
|---|---|
| `backend/src/services/companion-ability.service.ts` | Passive ability modifier resolution |

## Files to modify

| File | Changes |
|---|---|
| `backend/src/models/companion.ts` | Add `PassiveModifier`, `PassiveCondition`, `PassiveModifierType`. Add optional `modifier?` to `SpecialAbility`. |
| `frontend/src/app/shared/models/companion.model.ts` | Mirror `modifier?` and types. |
| `backend/src/services/battle.service.ts` | Import and use `CompanionAbilityService` in `playCard()` (modifier pre-processing, post-play bonuses, cost reduction) and `endTurn()` (retaliation). |
| `backend/data/static/companions.json` | Add `modifier` objects to all abilities in every companion's `abilityPool`. |

---

## Depends on
- Plan 08a (abilities must exist on companions before resolution can fire).

## Blocks
- Plan 09 (status effects like burn could be triggered via an ability modifier in the future).

---

## Extensibility notes

Adding a new modifier type:
1. Add the string to `PassiveModifierType`.
2. Add a `case` in `CompanionAbilityService.applyPassiveModifiers()` (or the relevant method).
3. Add `modifier` data to the ability in `companions.json`.

No other code changes needed — the condition system and data-driven design handle the rest.
