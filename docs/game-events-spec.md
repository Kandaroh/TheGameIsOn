# Game Events Specification

This document defines the game's node events, spawn rules, destination pages, UI templates, and visual rendering constraints.

## 1. Event specification

| Event name   | Icon | Spawn rules (per run) | Destination page (component/file) |
|--------------|:----:|-----------------------:|-----------------------------------|
| battle       | ⚔️   | no limits              | Battle screen — frontend/src/app/features/battle/battle.component.ts |
| rest         | 🛌   | 1–2 nodes max          | Rest placeholder — frontend/src/app/features/events/rest/rest.component.ts |
| hard battle  | 💀   | 2–5 nodes max          | Hard Battle placeholder — frontend/src/app/features/events/hard-battle/hard-battle.component.ts |
| new object   | 🪄   | 2–4 nodes max          | New Object placeholder — frontend/src/app/features/events/new-object/new-object.component.ts |
| power up     | ⚡   | 3–6 nodes max          | Power Up placeholder — frontend/src/app/features/events/power-up/power-up.component.ts |
| end (terminal)| 🏁  | single node (end)     | End screen — frontend/src/app/features/events/end/end.component.ts (triggered on reaching end node)

> Notes: `battle.component.ts` already exists and should remain the canonical handler for the `battle` event. All other event pages are placeholders and must be created with the component filenames listed above.

## 2. Spawn rules (detailed)
- `battle`: unlimited occurrences — generator does not cap battle nodes.
- `rest`: between 1 and 2 nodes per generated run.
- `hard battle`: between 2 and 5 nodes per generated run.
- `new object`: between 2 and 4 nodes per generated run.
- `power up`: between 3 and 6 nodes per generated run.

Note: the `end` node is a special terminal node that emits an `end` event when the player arrives; the frontend shows the End page (see destination above).

The map generator must enforce these caps when assigning event types to nodes (see `MapGeneratorService.randomEventType()` and the `nodeIcons` table in `backend/src/services/map-generator.service.ts`). If a run's layer distribution makes strict compliance impossible, the generator should prioritize respecting the upper limits for events with caps while keeping at least one path from `start` to `end`.

## 3. UI template for event pages

All event pages must follow this minimal template and behavior to ensure a consistent UX and to be machine-editable by assistants like Copilot.

- Top-left: Back button returning to the Map screen (call `GameStateService.goBack()` or navigate to the map route).
- Header: Event name and icon.
- Body: Short description (1–3 sentences) explaining the event purpose.
- Action area (optional): buttons to accept/skip/inspect (depending on event semantics).
- Accessibility: `aria-label` on the back button and role attributes for action buttons.
- Responsiveness: content should wrap cleanly for narrow viewports; use the existing `.menu-screen` / `.map-screen` layout styles.

Example Angular template skeleton (HTML):

```html
<div class="event-screen">
  <button class="back-button" (click)="goBack()" aria-label="Back to map">← Back</button>
  <header>
    <h2>{{ eventTitle }}</h2>
    <div class="event-icon">{{ eventIcon }}</div>
  </header>
  <section class="event-description">
    <p>{{ eventDescription }}</p>
  </section>
  <section class="event-actions">
    <!-- optional action buttons -->
  </section>
</div>
```

Implementation notes
- Add a small component under `frontend/src/app/features/events/<event-name>/` for each placeholder.
- Each component should import and call `GameStateService` to persist any state changes and to navigate back to the Map.

## 4. Visual rendering constraints

To improve readability and reduce visual clutter, the map rendering should follow these constraints:

- Edges must prefer non-crossing paths where possible. The generator already favors connecting nodes to nearby `x` positions; maintain or strengthen that heuristic when adding links.
- Edge stroke: use thin dotted lines to avoid visual weight. Example CSS for SVG edges:

```css
.graph-lines svg line,
.graph-lines svg path {
  stroke: rgba(180, 200, 255, 0.18);
  stroke-width: 1.2px;
  stroke-dasharray: 4 4; /* dotted/segmented appearance */
  stroke-linecap: round;
}
```

- Edges should not capture pointer events (pointer-events: none) so node interactions are not blocked.
- If overlapping edges are unavoidable, reduce opacity and increase blur/glow slightly on hovered node paths only.

## 5. Validation checklist

- [x] All 5 events are listed with spawn rules.
- [x] `battle.component` reference: `frontend/src/app/features/battle/battle.component.ts`.
- [x] Placeholder page naming: `frontend/src/app/features/events/rest/rest.component.ts`, `hard-battle`, `new-object`, `power-up` (all under `frontend/src/app/features/events/`).

If you want, I can scaffold the placeholder components now (HTML/TS/CSS) and wire their routing — would you like me to create them? 

Scaffold status: placeholder components created under `frontend/src/app/features/events/` for `rest`, `hard-battle`, `new-object`, and `power-up`. Each contains a back button and description and uses `app-event-map` for node visualization. The `battle` event still uses the existing `frontend/src/app/features/battle/battle.component.ts`.
