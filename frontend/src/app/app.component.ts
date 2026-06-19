import { Component } from '@angular/core';
import { GameStateService } from './shared/services/game-state.service';

@Component({
  selector: 'app-root',
  template: `
    <main class="app-shell">
      <div class="debug-toolbar" *ngIf="gameState.debugMode">
        <button type="button" (click)="gameState.goBack()">Back</button>
      </div>
      <ng-container *ngIf="screen$ | async as screen">
        <app-menu *ngIf="screen === 'menu'"></app-menu>
        <app-map *ngIf="screen === 'map'"></app-map>
        <app-companion-selection *ngIf="screen === 'companion-select'"></app-companion-selection>
        <app-battle *ngIf="screen === 'battle'"></app-battle>
        <app-combat-results *ngIf="screen === 'combat-results'"></app-combat-results>
        <app-card-reward    *ngIf="screen === 'card-reward'"></app-card-reward>
        <app-rest *ngIf="screen === 'event' && (currentEvent$ | async) === 'rest'"></app-rest>
        <app-hard-battle *ngIf="screen === 'event' && (currentEvent$ | async) === 'hard battle'"></app-hard-battle>
        <app-new-object *ngIf="screen === 'event' && ((currentEvent$ | async) === 'new object' || (currentEvent$ | async) === 'treasure')"></app-new-object>
        <app-power-up *ngIf="screen === 'event' && (currentEvent$ | async) === 'power up'"></app-power-up>
        <app-end *ngIf="screen === 'event' && (currentEvent$ | async) === 'end'"></app-end>
      </ng-container>
                <!-- Player Info trigger (visible when a game is loaded) -->
      <button class="player-info-trigger"
              *ngIf="gameState.state$ | async"
              (click)="gameState.togglePlayerInfo()"
              title="Player Info">
        &#x1F4CB;
      </button>

            <!-- Ability choice popup (global — shown on any screen when pending) -->
      <app-ability-choice-popup
        *ngIf="gameState.pendingAbilityChoice$ | async as pendingChoice"
        [choice]="pendingChoice"
        (chosen)="gameState.chooseAbility($event.companionId, $event.abilityId)"
      ></app-ability-choice-popup>

      <app-player-info-panel></app-player-info-panel>
      <app-card-preview></app-card-preview>
    </main>
  `,
  styles: [`
    .player-info-trigger {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 100;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 2px solid rgba(255,255,255,0.15);
      background: rgba(30, 41, 59, 0.85);
      color: #fff;
      font-size: 1.3rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      backdrop-filter: blur(6px);
      transition: background 0.15s, transform 0.15s;
    }
    .player-info-trigger:hover {
      background: rgba(37, 99, 235, 0.85);
      transform: scale(1.08);
    }
  `]
})
export class AppComponent {
  screen$ = this.gameStateService.screen$;
  currentEvent$ = this.gameStateService.currentEvent$;
  gameState = this.gameStateService;

  constructor(public gameStateService: GameStateService) {}
}
