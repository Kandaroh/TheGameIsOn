# Content Creator Guides

Step-by-step instructions for adding new game content. Written for designers and content creators — no deep code knowledge required.

---

## Guides

| Guide | File | What you'll create |
|---|---|---|
| Add a card effect | [add-card-effect.md](add-card-effect.md) | A new effect record (damage, shield, heal, etc.) in `card-effects.json` |
| Add a card | [add-card.md](add-card.md) | A new playable card in a companion's reward pool or the starter deck |
| Add an enemy | [add-enemy.md](add-enemy.md) | A new enemy definition with 3 attacks in `enemies.json` |
| Add a companion | [add-companion.md](add-companion.md) | A new selectable companion with price decks in `companions.json` |
| Add an event | [add-event.md](add-event.md) | A new map event type with spawn rules and optional frontend screen |

---

## Recommended reading order

1. **add-card-effect.md** — effects are the building block everything else references.
2. **add-card.md** — cards reference effects.
3. **add-enemy.md** — enemy attacks reference effects.
4. **add-companion.md** — companions contain reward card pools.
5. **add-event.md** — events tie everything together on the map.

---

## Restart requirements

| What changed | Restart needed? |
|---|---|
| Any file in `backend/data/static/` | **Yes** — restart the backend server (`npm run start`). Repository caches load once at first access. |
| Any `.ts` file in `backend/src/` | **Yes** — rebuild (`npm run build`) then restart. |
| Any `.ts` file in `frontend/src/` | **No** — Angular dev server (`ng serve`) auto-reloads. |

---

## Related docs

- [docs/data-model.md](../data-model.md) — full interface definitions for every type referenced in these guides.
- [docs/architecture.md](../architecture.md) — extension patterns and layer structure.
- [docs/battle-system.md](../battle-system.md) — how effects are resolved at runtime.
