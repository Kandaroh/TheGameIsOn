# Guide: Add a Card

A **card** is what the player draws and plays during battle. Cards live in two places depending on their purpose: **starter cards** (always in the deck) and **reward cards** (earned when a companion kills an enemy).

---

## Where cards live

| Card type | Location |
|---|---|
| Starter / base cards | Hardcoded in `backend/src/services/game-logic.service.ts` (`createInitialState()`) and `GameStateService.finalizeCompanions()` on the frontend |
| Companion reward cards | `backend/data/static/companions.json` → inside each companion's `priceDecks` (`common`, `uncommon`, `rare` arrays) |

---

## Steps: Add a reward card to a companion's pool

### 1. Open companions.json

Open `backend/data/static/companions.json`.

### 2. Find the companion

Locate the companion you want to add a card to (e.g. `"id": "wyvern"`).

### 3. Add the card to a tier

Add your card object inside `priceDecks.common`, `priceDecks.uncommon`, or `priceDecks.rare`:

```json
{
  "id": "wyvern-fireball",
  "name": "Fireball",
  "cost": 2,
  "type": "attack",
  "element": "fire",
  "description": "Hurl a ball of fire at an enemy.",
  "effectId": "fx-fireball-normal",
  "enhancedEffectId": "fx-fireball-enhanced",
  "effect": { "description": "Deal 5 damage to one enemy." },
  "enhancedEffect": { "description": "Deal 8 damage to one enemy." }
}
```

### 4. Ensure the effects exist

The `effectId` and `enhancedEffectId` values must point to entries in `backend/data/static/card-effects.json`. If they don't exist yet, create them first — see [add-card-effect.md](add-card-effect.md).

### 5. Restart the backend

```powershell
cd backend
npm run build
npm run start
```

---

## Field reference

### Required fields

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (no spaces) |
| `name` | `string` | Display name shown on the card |
| `cost` | `number` | Energy cost to play (0 = free) |
| `type` | `"attack"` \| `"defense"` \| `"utility"` | Determines the card's colour band and enhancement eligibility |

### Optional fields

| Field | Type | Description |
|---|---|---|
| `element` | `string` | `fire`, `water`, `earth`, `air`, `arcane`, `shadow`, `light`, `neutral`. Tints the card frame in the UI. |
| `description` | `string` | Flavour text shown on the card body |
| `sprite` | `string` | Image URL for card art |
| `target` | `string` | `"wildMonster"`, `"companion"`, `"deck"`, `"discard"` — who the card targets |
| `targetNumber` | `1` \| `2` \| `"ALL"` | How many targets the player must select |
| `effectId` | `string` | Links to a `CardEffect` in `card-effects.json` for the normal version |
| `enhancedEffectId` | `string` | Links to a `CardEffect` for the enhanced version (when companion type matches card type) |
| `effect` | `{ "description": "..." }` | Text shown on the card for the normal effect |
| `enhancedEffect` | `{ "description": "..." }` | Text shown for the enhanced effect |
| `properties` | `object` | Legacy catch-all for extra data |

---

## How enhancement works

When a companion plays a card, the game checks:

> Does `card.type` equal `companion.type`?

- **Yes** → use `enhancedEffectId` (falls back to `effectId` if not set).
- **No** → use `effectId`.

Example: A `"type": "attack"` card played by an `"type": "attack"` companion gets the enhanced version.

---

## Tips

- **Cards without an `effectId`** can still be played but produce no game effect. Useful for placeholder cards during design.
- **`element` on a card** is purely visual — it tints the card frame border and background.
- **Reward tier matters:** `common` cards appear more often since the reward system draws 3 random cards from the tier pool.

---

## Complete example

A defensive water card for the Sprite companion's uncommon pool:

```json
{
  "id": "sprite-tidal-shield",
  "name": "Tidal Shield",
  "cost": 2,
  "type": "defense",
  "element": "water",
  "description": "Summon a protective water barrier.",
  "target": "companion",
  "targetNumber": 1,
  "effectId": "fx-shield-enhanced",
  "effect": { "description": "Gain 4 shield." }
}
```

---

## Restart required?

**Yes.** Restart the backend server after editing `companions.json` or any static data file.
