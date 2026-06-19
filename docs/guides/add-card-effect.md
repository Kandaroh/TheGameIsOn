# Guide: Add a Card Effect

A **card effect** describes what happens when a card (or enemy attack) is resolved during battle. Effects are stored in a single JSON file and referenced by their `id` from cards and enemy attacks.

---

## Where effects live

**File:** `backend/data/static/card-effects.json`

Each entry looks like this:

```json
{
  "id": "fx-strike-normal",
  "description": "Deal 3 damage to one enemy.",
  "action": "damage",
  "value": 3,
  "target": "wildMonster"
}
```

---

## Steps

### 1. Open the effects file

Open `backend/data/static/card-effects.json` in any text editor.

### 2. Add a new entry

Copy-paste this template at the end of the array (before the closing `]`) and customise it:

```json
{
  "id": "fx-my-new-effect",
  "description": "Deal 7 damage to one enemy.",
  "action": "damage",
  "value": 7,
  "target": "wildMonster"
}
```

> Don't forget to add a comma after the previous entry.

### 3. Choose an action

The `action` field determines what the effect does. Currently supported actions:

| Action | What it does | Typical `target` |
|---|---|---|
| `damage` | Reduce target's HP (absorbs through shield first) | `wildMonster` or `companion` |
| `shield` | Add shield points to the source (the companion playing the card) | `companion` |
| `heal` | Restore HP to the source companion (capped at `maxLife`) | `companion` |
| `evade` | *No-op stub* — reserved for future dodge mechanic | `companion` |
| `evade_draw` | *No-op stub* — reserved for future dodge + draw mechanic | `companion` |
| `draw` | *No-op stub* — reserved for future card draw mechanic | `deck` |

### 4. Choose a target

The `target` field tells the system *who* the effect applies to:

| Target | Meaning |
|---|---|
| `wildMonster` | One or more enemies (the player picks which one) |
| `companion` | One or more companions |
| `deck` | The player's draw pile |
| `discard` | The player's discard pile |

### 5. Link it to a card or enemy attack

Set the `id` you chose as `effectId` (or `enhancedEffectId`) on a card, or as `effectId` on an enemy attack. See [add-card.md](add-card.md) and [add-enemy.md](add-enemy.md).

### 6. Restart the backend

```powershell
cd backend
npm run build
npm run start
```

---

## Adding a completely new action type

If none of the existing actions (`damage`, `shield`, `heal`, etc.) fit your design:

1. **Add the action string** to the `CardEffectAction` union type in `backend/src/models/card-effect.ts`:
   ```typescript
   export type CardEffectAction =
     | 'damage'
     | 'shield'
     | 'heal'
     // ... existing actions ...
     | 'my_new_action';   // ← add here
   ```

2. **Add a case** in `backend/src/services/card-effect.service.ts` inside the `apply()` method's `switch` block:
   ```typescript
   case 'my_new_action':
     return this.applyMyNewAction(effect.value, source, targets, state);
   ```

3. **Implement the method** (follow the pattern of `applyDamage` / `applyShield`).

4. Rebuild and restart the backend.

---

## Complete example

Adding a strong fire attack effect used by a rare enemy:

```json
{
  "id": "fx-enemy-fire-blast",
  "description": "Deal 8 fire damage to one companion.",
  "action": "damage",
  "value": 8,
  "target": "companion"
}
```

---

## Restart required?

**Yes.** The backend caches `card-effects.json` in memory on first read. You must restart the backend server for changes to take effect.
