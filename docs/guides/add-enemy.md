# Guide: Add an Enemy

An **enemy** (called "Wild Monster" in-game) is a creature the player fights during battle encounters. Enemies are defined in a single JSON file and spawned automatically by the battle system.

---

## Where enemies live

**File:** `backend/data/static/enemies.json`

---

## Steps

### 1. Open the enemies file

Open `backend/data/static/enemies.json`.

### 2. Add a new entry

Copy-paste this template at the end of the array and customise it:

```json
{
  "id": "shadow-bat",
  "name": "Shadow Bat",
  "type": "Beast",
  "element": "shadow",
  "baseLife": 16,
  "baseEnergy": 2,
  "spawnChance": 0.6,
  "spawnArea": "dungeon",
  "level": 2,
  "expReward": 35,
  "specialAbilities": [],
  "attacks": [
    {
      "id": "shadow-bat-bite",
      "name": "Fang Strike",
      "type": "attack",
      "element": "shadow",
      "targeting": "companion",
      "targetNumber": 1,
      "effectId": "fx-enemy-bite",
      "selectionChance": 0.5
    },
    {
      "id": "shadow-bat-screech",
      "name": "Sonic Screech",
      "type": "utility",
      "element": "shadow",
      "targeting": "companion",
      "targetNumber": 1,
      "effectId": "fx-enemy-howl",
      "selectionChance": 0.3
    },
    {
      "id": "shadow-bat-swoop",
      "name": "Shadow Swoop",
      "type": "attack",
      "element": "shadow",
      "targeting": "companion",
      "targetNumber": 1,
      "effectId": "fx-enemy-slam",
      "selectionChance": 0.2
    }
  ],
  "rewards": [
    { "type": "gold", "value": 12 },
    { "type": "exp",  "value": 35 },
    { "type": "card-draw", "value": 1, "tier": "common" }
  ]
}
```

### 3. Ensure you have exactly 3 attacks

Every enemy **must** have exactly 3 attacks. The game validates this on startup and prints a warning if violated.

### 4. Verify all effectIds exist

Each attack's `effectId` must point to an existing entry in `backend/data/static/card-effects.json`. If the effect you need doesn't exist, create it first — see [add-card-effect.md](add-card-effect.md).

### 5. Restart the backend

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
| `id` | `string` | Yes | Unique identifier (no spaces, lowercase with hyphens) |
| `name` | `string` | Yes | Display name shown in battle |
| `type` | `string` | Yes | Creature category (e.g. `"Beast"`, `"Construct"`, `"Undead"`, `"Elemental"`, `"Dragon"`) |
| `element` | `string` | No | `fire`, `water`, `earth`, `air`, `arcane`, `shadow`, `light`, `neutral` |
| `baseLife` | `number` | Yes | Starting HP before level scaling |
| `baseEnergy` | `number` | Yes | Energy (currently display-only for enemies) |
| `spawnChance` | `number` | Yes | 0–1 probability weight. Higher = more likely to appear. Values are relative. |
| `spawnArea` | `string` | No | Restrict to a map zone: `"forest"`, `"dungeon"`, `"ruins"`, `"volcano"`. If omitted, spawns everywhere. |
| `level` | `number` | Yes | Base level. Enemies scale up as the player progresses. |
| `expReward` | `number` | Yes | Base EXP reward (scaled by level difference at runtime). |
| `specialAbilities` | `array` | Yes | Array of `SpecialAbility` objects. Use `[]` if none. |
| `attacks` | `array` | Yes | **Exactly 3** `EnemyAttack` objects. |
| `rewards` | `array` | Yes | What the player earns when this enemy dies. |

### Attack fields

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique attack identifier |
| `name` | `string` | Display name (shown in the attack popup) |
| `type` | `"attack"` \| `"defense"` \| `"utility"` | Attack category |
| `element` | `string` | Optional element |
| `targeting` | `"companion"` | Who the attack targets (currently always `"companion"`) |
| `targetNumber` | `1` \| `2` \| `"ALL"` | How many targets |
| `effectId` | `string` | Points to a `CardEffect` in `card-effects.json` |
| `selectionChance` | `number` | Relative weight for random selection. Does NOT need to sum to 1.0. |

### Reward fields

| `type` | `value` meaning | `tier` |
|---|---|---|
| `"gold"` | Gold amount | — |
| `"exp"` | EXP split among all 3 companions | — |
| `"card-draw"` | Number of reward draws (usually 1) | `"common"` \| `"uncommon"` \| `"rare"` |

---

## How spawning works

When a battle starts, the game:

1. Filters enemies by `spawnArea` (must match the map node's zone, or enemy has no `spawnArea`).
2. Rolls each enemy against its `spawnChance` (multiplied by difficulty).
3. Picks 1–3 enemies (configurable per event in `events.json`).
4. Scales each enemy's level: `baseLevel + floor(encounterCount × 0.5)`.
5. Scales HP: `baseLife × (1 + levelDelta × 0.15) × difficultyModifier`.
6. Scales gold/exp rewards proportionally to the level increase.

---

## Tips

- **Start with low `spawnChance`** (0.3–0.5) for powerful enemies to keep them rare.
- **Use `spawnArea`** to create themed zones — forest wolves, dungeon rats, volcano drakes.
- **Copy an existing enemy** as a template to ensure the structure is correct.
- **The `selectionChance` values** on attacks are relative weights. `[0.5, 0.3, 0.2]` means the first attack is chosen ~50% of the time.

---

## Restart required?

**Yes.** Restart the backend server after editing `enemies.json`.
