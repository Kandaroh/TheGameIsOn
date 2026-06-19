# Guide: Add a Map Event

A **map event** is a type of encounter the player can land on while navigating the map (e.g. "battle", "rest", "treasure"). Events are defined in a JSON file and control spawning rules, icons, and optional monster configuration.

Adding a new event is the most involved content task because it touches both backend data and frontend code.

---

## Where events live

**File:** `backend/data/static/events.json`

---

## Steps

### 1. Add the event definition

Open `backend/data/static/events.json` and add a new entry:

```json
{
  "id": "ambush",
  "type": "ambush",
  "displayName": "Ambush",
  "description": "Enemies attack without warning!",
  "icon": "🗡️",
  "spawnRules": {
    "min": 1,
    "max": 3,
    "allowedAreas": ["forest", "dungeon"]
  },
  "monsterSpawning": {
    "poolFilter": { "areas": ["forest", "dungeon"], "minLevel": 2 },
    "countMin": 2,
    "countMax": 3,
    "difficultyModifier": 1.3
  },
  "extraRules": ["Companions start with -1 energy"],
  "notes": "Mid-game surprise encounter."
}
```

**Key fields explained:**

| Field | What it controls |
|---|---|
| `id` | Unique identifier |
| `type` | Must match the string used in `NodeEventType` (step 2) |
| `displayName` | Shown in UI |
| `icon` | Emoji displayed on map nodes |
| `spawnRules.min` | Minimum nodes of this type per generated map |
| `spawnRules.max` | Maximum nodes (use `null` for unlimited) |
| `spawnRules.allowedAreas` | Which map zones this event can appear in (`null` = all zones) |
| `monsterSpawning` | Set to `null` for non-combat events. Otherwise, configures enemy spawning. |
| `monsterSpawning.poolFilter` | Filter which enemies can appear (by area and/or level range) |
| `monsterSpawning.countMin` / `countMax` | How many enemies spawn |
| `monsterSpawning.difficultyModifier` | HP/stat multiplier (1.0 = normal, 1.5 = 50% harder) |
| `extraRules` | Human-readable rule descriptions (for display only — no game logic reads these yet) |
| `notes` | Internal design notes |

### 2. Add the type to the backend model

Open `backend/src/models/node-event.ts` and add your new type to the `NodeEventType` union:

```typescript
export type NodeEventType =
  | 'battle'
  | 'treasure'
  | 'rest'
  | 'hard battle'
  | 'new object'
  | 'power up'
  | 'start'
  | 'end'
  | 'ambush';        // ← add here
```

### 3. Mirror the type in the frontend model

Open `frontend/src/app/shared/models/node.model.ts` and add the same string to `NodeEventType`:

```typescript
export type NodeEventType =
  | 'battle'
  | 'treasure'
  | 'rest'
  | 'hard battle'
  | 'new object'
  | 'power up'
  | 'start'
  | 'end'
  | 'ambush';        // ← add here
```

### 4. Add map icon and CSS class

Open `frontend/src/app/features/map/map.component.ts` and add entries to three places:

**a) `EVENT_ICONS`** — the emoji shown on map nodes:
```typescript
const EVENT_ICONS: Record<string, string> = {
  // ... existing entries ...
  ambush: '🗡️',
};
```

**b) `EVENT_CSS`** — a CSS-safe class fragment:
```typescript
const EVENT_CSS: Record<string, string> = {
  // ... existing entries ...
  ambush: 'ambush',
};
```

**c) `LEGEND_EVENTS`** — the map legend entry:
```typescript
export const LEGEND_EVENTS = [
  // ... existing entries ...
  { type: 'ambush', icon: EVENT_ICONS['ambush'], label: 'Ambush' },
];
```

### 5. (Optional) Add map CSS styling

If you want the node to have a distinctive colour, add a CSS rule in `frontend/src/app/features/map/map.component.css`:

```css
.node-event-ambush { border-color: #dc2626; }
```

### 6. (Optional) Create a frontend screen

If the event needs its own UI (not just a generic battle), create a new component:

1. Create folder: `frontend/src/app/features/events/ambush/`
2. Create files: `ambush.component.ts`, `ambush.component.html`, `ambush.component.css`
3. Declare the component in `frontend/src/app/app.module.ts`
4. Add a rendering condition in `frontend/src/app/app.component.ts` template:
   ```html
   <app-ambush *ngIf="screen === 'event' && (currentEvent$ | async) === 'ambush'"></app-ambush>
   ```

If the event is a combat event that uses the existing battle screen, **no custom screen is needed** — the battle system handles it automatically based on `monsterSpawning` config.

### 7. Rebuild and restart

```powershell
cd backend
npm run build
npm run start
```

The frontend dev server auto-reloads when `.ts` files change.

---

## Non-combat vs. combat events

| If your event... | Set `monsterSpawning` to... | What happens |
|---|---|---|
| Has a battle | An object with `poolFilter`, `countMin`, `countMax`, `difficultyModifier` | Enemies spawn and the battle screen loads |
| Does NOT have a battle | `null` | The event screen loads (you may need a custom component) |

---

## Spawn rules enforcement

The map generator creates nodes and assigns event types randomly. Afterwards, `EventSpawnerService.assignEvents()` enforces your spawn rules:

1. If a type appears more than `max` times, excess nodes are demoted to `"battle"`.
2. If a type appears fewer than `min` times, `"battle"` nodes are promoted to your type.

This means even with random generation, your event will appear the correct number of times.

---

## Tips

- **Start with conservative limits** (e.g. `min: 1, max: 3`) until the event is tested.
- **Non-combat events** currently have placeholder UI only — they display a description but don't execute backend logic. Build the logic as needed.
- **Copy the `"battle"` event definition** as a starting template for combat events.
- **Copy the `"rest"` event definition** as a starting template for non-combat events.

---

## Restart required?

**Yes** — for the backend (JSON data + TypeScript model change).  
**No** — the frontend auto-reloads in dev mode when `.ts` files are saved.
