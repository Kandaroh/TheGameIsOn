# Map Generator

**Source:** `backend/src/services/map-generator.service.ts`

---

## Overview

Produces a layered, vertical directed graph used as the game's map.

- Default: 20–24 total nodes, 5–7 layers, 1 `start` node (y=0) + 1 `end` node (y=100).
- `layout: { x, y }` — percentages 0–100. Frontend SVG positioning depends on this.
- After generation, `EventSpawnerService.assignEvents(nodes)` enforces spawn caps from `backend/data/static/events.json`.

---

## Graph guarantees

- Exactly 1 `start` node and 1 `end` node.
- No dead-ends: every non-start node has at least one incoming edge.
- Forward-only edges: edges always connect from lower-layer to higher-layer nodes.

---

## Area zone progression

Each intermediate layer is assigned a zone based on depth via `areaForLayer()`. Zones are stored on `NodeEvent.area` and drive enemy pool filtering.

| Layer range | Zone | CSS variable |
|---|---|---|
| Early | `forest` | `--color-forest` |
| Mid | `dungeon` | `--color-dungeon` |
| Late | `ruins` | `--color-ruins` |
| Final | `volcano` | `--color-volcano` |

Progression array: `['forest', 'dungeon', 'ruins', 'volcano']` — layers are divided into equal buckets.

---

## Connectivity rules

- **Adjacent-layer:** each node connects to 1–2 nodes in the next layer, biased to nearest `x` positions via `pickNearestTargets()`.
- **Skip-layer (extra):** occasional connections two layers ahead, same nearest-target bias. Probability tunable in `addExtraConnections()`.

---

## Tuning parameters

| Parameter | Location | Default |
|---|---|---|
| `minNodes` / `maxNodes` | `generate(options)` | 20–24 |
| `minLayers` / `maxLayers` | `generate(options)` | 5–7 |
| Event type probabilities | `randomEventType()` | battle-heavy |
| Extra connection probability | `addExtraConnections()` | ~0.18 |
| `pickNearestTargets(source, targets, min, max)` | Internal | Sorts by Δx, returns nearest k |

---

## Verification

1. `POST /api/game/action/new-run` — inspect `graph.nodes` and `graph.edges`.
2. All edge `from`/`to` IDs must exist in `graph.nodes`.
3. For each edge, `to.layout.y > from.layout.y` (forward movement).
4. Each node should have `event.area` set (except start/end).
5. Visual check: open frontend map, confirm short edges and area-coloured nodes.

---

## Editing tips

- Keep `x` as a percentage — changing units breaks SVG placement.
- Long visual links? Reduce skip-layer probability or narrow `pickNearestTargets()` candidates.
- For deterministic tests, replace `Math.random()` with a seeded PRNG.