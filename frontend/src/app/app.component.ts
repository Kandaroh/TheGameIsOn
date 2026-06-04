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
        <app-battle *ngIf="screen === 'battle'"></app-battle>
        <app-rest *ngIf="screen === 'event' && (currentEvent$ | async) === 'rest'"></app-rest>
        <app-hard-battle *ngIf="screen === 'event' && (currentEvent$ | async) === 'hard battle'"></app-hard-battle>
        <app-new-object *ngIf="screen === 'event' && (currentEvent$ | async) === 'new object'"></app-new-object>
        <app-power-up *ngIf="screen === 'event' && (currentEvent$ | async) === 'power up'"></app-power-up>
        <app-end *ngIf="screen === 'event' && (currentEvent$ | async) === 'end'"></app-end>
      </ng-container>
    </main>
  `
})
export class AppComponent {
  screen$ = this.gameStateService.screen$;
  currentEvent$ = this.gameStateService.currentEvent$;
  gameState = this.gameStateService;

  constructor(public gameStateService: GameStateService) {}
}
