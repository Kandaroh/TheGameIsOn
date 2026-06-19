# Guide: Add a Companion

A **companion** is one of the creatures the player selects at the start of a run. Each companion has a type, element, stats, and a pool of reward cards (called "price decks") that the player can earn by defeating enemies.

---

## Where companions live

**File:** `backend/data/static/companions.json`

---

## Steps

### 1. Open the companions file

Open `backend/data/static/companions.json`.

### 2. Add a new entry

Copy-paste this template at the end of the array and customise it:

```json
{
  "id": "phoenix",
  "name": "Phoenix",
  "type": "attack",
  "element": "fire",
  "life": 22,
  "energy": 3,
  "energyRefill": 1,
  "priceDecks": {
    "common": [
      {
        "id": "phoenix-flare",
        "name": "Flare",
        "cost": 1,
        "type": "attack",
        "element": "fire",
        "description": "A quick burst of flame.",
        "effectId": "fx-comp-strike-normal",
        "enhancedEffectId": "fx-comp-strike-enhanced",
        "effect": { "description": "Deal 4 damage to one enemy." },
        "enhancedEffect": { "description": "Deal 6 damage to one enemy." }
      },
      {
        "id": "phoenix-ash",
        "name": "Ash Veil",
        "cost": 1,
        "type": "defense",
        "element": "fire",
        "description": "Shroud yourself in protective ash.",
        "effectId": "fx-comp-guard-normal",
        "enhancedEffectId": "fx-comp-guard-enhanced",
        "effect": { "description": "Gain 3 shield." },
        "enhancedEffect": { "description": "Gain 5 shield." }
      }
    ],
    "uncommon": [
      {
        "id": "phoenix-blaze",
        "name": "Blazing Wings",
        "cost": 2,
        "type": "attack",
        "element": "fire",
        "description": "Engulf an enemy in flame.",
        "effectId": "fx-strike-enhanced",
        "effect": { "description": "Deal 5 damage to one enemy." }
      }
    ],
    "rare": [
      {
        "id": "phoenix-rebirth",
        "name": "Rebirth",
        "cost": 3,
        "type": "utility",
        "element": "fire",
        "description": "Rise from the ashes with renewed strength."
      }
    ]
  }
}
```

### 3. Ensure all effectIds exist

Every `effectId` and `enhancedEffectId` in your price deck cards must point to an entry in `backend/data/static/card-effects.json`. If they don't exist, create them first — see [add-card-effect.md](add-card-effect.md).

### 4. Restart the backend

```powershell
cd backend
npm run build
npm run start
```

---

## Field reference

### Top-level fields

| Field | Type | Required | Description |
|---|---|:---:|---|
| `id` | `string` | Yes | Unique identifier (lowercase, no spaces). At runtime the game stamps it as `{id}-{index}` to avoid collisions. |
| `name` | `string` | Yes | Display name shown in selection and battle |
| `type` | `"attack"` \| `"defense"` \| `"utility"` | Yes | Determines which cards get enhanced when played by this companion |
| `element` | `string` | No | `fire`, `water`, `earth`, `air`, `arcane`, `shadow`, `light`, `neutral`. Shown as a badge on the companion card. |
| `life` | `number` | Yes | Starting HP |
| `energy` | `number` | Yes | Starting energy |
| `energyRefill` | `number` | Yes | How much energy is restored at the start of each turn |
| `priceDecks` | `object` | Yes | Reward card pools — see below |
| `sprite` | `string` | No | Path to an image (relative to `frontend/src/assets/`) |

> **Note:** `maxLife` and `maxEnergy` are computed automatically at companion selection time. You do not need to set them in the JSON.

### Price decks

The `priceDecks` object has three tiers:

| Tier | When drawn |
|---|---|
| `common` | Enemy `rewards` has `"tier": "common"` |
| `uncommon` | Enemy `rewards` has `"tier": "uncommon"` |
| `rare` | Enemy `rewards` has `"tier": "rare"` |

Each tier is an array of `Card` objects (see [add-card.md](add-card.md) for the full card field reference).

When a companion kills an enemy that drops a card-draw reward, the game:
1. Takes the matching tier pool from that companion's `priceDecks`.
2. Shuffles it randomly.
3. Offers the player 3 cards to pick from (or fewer if the pool is small).

### Companion type and card enhancement

A companion's `type` determines which cards it enhances:

| Companion type | Enhances cards of type |
|---|---|
| `attack` | `attack` |
| `defense` | `defense` |
| `utility` | `utility` |

When a companion plays a card of matching type, the game uses `enhancedEffectId` instead of `effectId` — usually a stronger version of the same effect.

---

## Adding special abilities

Special abilities are not yet active in game logic (placeholder), but you can define them now for future use:

```json
"specialAbilities": [
  {
    "id": "phoenix-rebirth-passive",
    "name": "Rebirth",
    "description": "Revive once per battle with 25% HP.",
    "trigger": "passive",
    "unlocksAtLevel": 3,
    "usesPerCombat": 1,
    "effectId": "fx-rebirth"
  }
]
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique ability identifier |
| `name` | `string` | Display name |
| `description` | `string` | What the ability does (shown in the player info panel) |
| `trigger` | `"passive"` \| `"activable"` | Passive = always on. Activable = player chooses to use it. |
| `unlocksAtLevel` | `number` | Companion level required. Set to `1` if available immediately. |
| `usesPerCombat` | `number` \| `null` | Max uses per battle. `null` = unlimited (for passives). |
| `effectId` | `string` | Points to a `CardEffect` in `card-effects.json` |

If the companion has no abilities, use an empty array: `"specialAbilities": []`

---

## Leveling system

Companions level up automatically when they earn enough EXP from battle rewards.

| Parameter | Value |
|---|---|
| EXP to next level | `level × 100` (e.g. level 1 → 100 EXP, level 2 → 200 EXP) |
| HP per level-up | +3 max life |
| Energy per level-up | +1 max energy every 3 levels |

You do not need to configure this per-companion — it's handled globally by `LevelingService`.

---

## Tips

- **Aim for 2 common, 1 uncommon, 1 rare** cards in each price deck as a starting point.
- **Match card elements to companion element** for thematic consistency (but this is purely cosmetic).
- **Test by starting a new run** — the companion should appear in the selection pool.
- **Copy an existing companion** (e.g. Wyvern or Sprite) as a starting template to ensure valid structure.

---

## Restart required?

**Yes.** Restart the backend server after editing `companions.json`.
