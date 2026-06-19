import { Component } from '@angular/core';
import { GameStateService } from '../../shared/services/game-state.service';
import { GameStateModel } from '../../shared/models/game-state.model';
import { NodeModel } from '../../shared/models/node.model';

/** Maps each event type to a distinctive symbol (not just an emoji). */
const EVENT_ICONS: Record<string, string> = {
  battle:       '⚔️',
  'hard battle': '💀',
  rest:          '🛌',
  'new object':  '🪄',
  'power up':    '⚡',
  treasure:      '📜',
  start:         '🏁',
  end:           '🏆',
};

/** Event type → CSS class fragment (no spaces, for safe class names). */
const EVENT_CSS: Record<string, string> = {
  battle:       'battle',
  'hard battle': 'hard-battle',
  rest:          'rest',
  'new object':  'new-object',
  'power up':    'power-up',
  treasure:      'treasure',
  start:         'start',
  end:           'end',
};

/** Legend entries for the side panel. */
export const LEGEND_EVENTS = [
  { type: 'battle',       icon: EVENT_ICONS['battle'],       label: 'Battle' },
  { type: 'hard battle',  icon: EVENT_ICONS['hard battle'],  label: 'Hard Battle' },
  { type: 'rest',         icon: EVENT_ICONS['rest'],         label: 'Rest' },
  { type: 'new object',   icon: EVENT_ICONS['new object'],   label: 'New Object' },
  { type: 'power up',     icon: EVENT_ICONS['power up'],     label: 'Power Up' },
  { type: 'treasure',     icon: EVENT_ICONS['treasure'],     label: 'Treasure' },
  { type: 'start',        icon: EVENT_ICONS['start'],        label: 'Start' },
  { type: 'end',          icon: EVENT_ICONS['end'],          label: 'End' },
];

export const LEGEND_AREAS = [
  { area: 'forest',  label: 'Forest' },
  { area: 'dungeon', label: 'Dungeon' },
  { area: 'ruins',   label: 'Ruins' },
  { area: 'volcano', label: 'Volcano' },
];

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent {
  state$ = this.gameState.state$;
  legendEvents = LEGEND_EVENTS;
  legendAreas  = LEGEND_AREAS;

  constructor(private gameState: GameStateService) {}

  getNodeLayout(state: GameStateModel, nodeId: string) {
    return state.graph.nodes.find((node: NodeModel) => node.id === nodeId)?.layout;
  }

  isSelectable(state: GameStateModel, node: NodeModel): boolean {
    return node.id !== state.player.position &&
      state.graph.edges.some(
        (edge: { from: string; to: string }) =>
          edge.from === state.player.position && edge.to === node.id
      );
  }

  isOnActivePath(state: GameStateModel, edge: { from: string; to: string }): boolean {
    return edge.from === state.player.position;
  }

  selectNode(node: NodeModel, state: GameStateModel) {
    if (!this.isSelectable(state, node)) return;
    this.gameState.moveToNode(node.id);
  }

  nodeIcon(node: NodeModel): string {
    return EVENT_ICONS[node.event?.type ?? ''] ?? node.icon ?? '◆';
  }

  nodeEventClass(node: NodeModel): string {
    const key = EVENT_CSS[node.event?.type ?? ''] ?? '';
    return key ? `node-event-${key}` : '';
  }

  nodeAreaClass(node: NodeModel): string {
    const area = node.event?.area;
    return area ? `node-area-${area}` : '';
  }

  nodeTitle(node: NodeModel): string {
    return node.title ?? node.event?.type ?? '';
  }
}

