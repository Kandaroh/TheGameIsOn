import { Component } from '@angular/core';
import { GameStateService } from '../../shared/services/game-state.service';
import { GameStateModel } from '../../shared/models/game-state.model';
import { NodeModel } from '../../shared/models/node.model';

@Component({
  selector: 'app-map',
  template: `
    <section class="map-screen" *ngIf="state$ | async as state">
      <header class="map-header">
        <div>
          <h2>Map</h2>
          <p>Follow the vertical path and select the glowing node to advance.</p>
        </div>
        <div class="player-stats">
          <span>Life: {{ state.player.life }}</span>
          <span>Mana: {{ state.player.mana }}</span>
        </div>
      </header>

      <div class="graph-canvas">
        <svg class="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          <ng-container *ngFor="let edge of state.graph.edges">
            <line
              [attr.x1]="getNodeLayout(state, edge.from)?.x"
              [attr.y1]="getNodeLayout(state, edge.from)?.y"
              [attr.x2]="getNodeLayout(state, edge.to)?.x"
              [attr.y2]="getNodeLayout(state, edge.to)?.y"
              stroke="#6cabff"
              stroke-width="0.4"
              stroke-linecap="round"
            />
          </ng-container>
        </svg>

        <ng-container *ngFor="let node of state.graph.nodes">
          <button
            class="graph-node"
            [class.current]="node.id === state.player.position"
            [class.selectable]="isSelectable(state, node)"
            [disabled]="!isSelectable(state, node)"
            [style.left.%]="getNodeLayout(state, node.id)?.x || 0"
            [style.top.%]="getNodeLayout(state, node.id)?.y || 0"
            (click)="selectNode(node, state)">
            <span class="node-icon">{{ node.icon || '•' }}</span>
          </button>
        </ng-container>
      </div>
    </section>
  `
})
export class MapComponent {
  state$ = this.gameState.state$;

  constructor(private gameState: GameStateService) {}

  getNodeLayout(state: GameStateModel, nodeId: string) {
    return state.graph.nodes.find((node: NodeModel) => node.id === nodeId)?.layout;
  }

  isSelectable(state: GameStateModel, node: NodeModel) {
    return node.id !== state.player.position &&
      state.graph.edges.some((edge: { from: string; to: string }) => edge.from === state.player.position && edge.to === node.id);
  }

  selectNode(node: NodeModel, state: GameStateModel) {
    if (!this.isSelectable(state, node)) {
      return;
    }
    this.gameState.moveToNode(node.id);
  }
}
