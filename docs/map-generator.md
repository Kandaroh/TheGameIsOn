# Map Generator

Location
- `backend/src/services/map-generator.service.ts`

Overview
- Produces a layered, vertical directed graph used as the game's map.
- Default behavior: 20–24 total nodes, 5–7 layers, 1 `start` and 1 `end` node.
- Nodes have `layout: { x, y }` where `x` and `y` are percentages (0..100). Frontend uses these to position SVG elements.

Graph guarantees
- Exactly 1 `start` node at y=0 and 1 `end` node at y=100.
- No dead-ends: generator ensures each target node has at least one incoming edge.
- Forward-only edges: edges connect from lower-layer nodes to higher-layer nodes (increasing `y`).

Connectivity rules
- Adjacent-layer connections: each source node connects to 1–2 nodes in the next layer. Selection is biased to the nearest `x` positions using `pickNearestTargets()`.
- Skip-layer (extra) connections: occasionally a node will connect to a node two layers ahead; these use the same nearest-target bias to avoid long cross-layer links.

Tuning parameters
- `generate(options: MapGenerationOptions)` supports:
  - `minNodes`, `maxNodes` — total node count range (default 20–24).
  - `minLayers`, `maxLayers` — layer count range (default 5–7).
- Internals to adjust:
  - `randomEventType()` controls frequency of `battle`, `treasure`, and `rest` nodes.
  - `pickNearestTargets(source, targets, min, max)` picks targets sorted by absolute `x` distance and returns the nearest `k`.
  - Probability constants (e.g., 0.18 for extra connections) are in the `addExtraConnections()` function and can be tuned.

How to verify
- Start the backend server and POST `/api/game/action/new-run`.
- Inspect returned `graph.nodes` and `graph.edges`:
  - All `edges` must have `from`/`to` IDs present in `graph.nodes`.
  - For each edge, `node(layout).y` of `to` should be greater than `from` to ensure forward movement.
  - Visual check: open frontend map and confirm lines are short and mostly connect near-x neighbors.

Editing tips
- When changing layout generation, keep `x` as a percentage so frontend placement remains unchanged.
- If long links reappear in the visualization, reduce the skip-layer probability or narrow how many candidates `pickNearestTargets()` returns.
- To add more deterministic structure, replace random picks with seeded PRNG (outside scope but suggested for deterministic map unit tests).

This document explains generator behavior and where to tune parameters for visual or gameplay adjustments.