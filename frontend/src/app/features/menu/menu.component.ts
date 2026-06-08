import { Component } from '@angular/core';
import { GameStateService } from '../../shared/services/game-state.service';

@Component({
  selector: 'app-menu',
  template: `
    <section class="menu-screen">
      <h1>The Game Is On</h1>
      <div class="menu-actions">
        <button (click)="startNewGame()">Start</button>
        <button (click)="gameState.toggleOptions()">Options</button>
      </div>

      <section class="menu-options" *ngIf="gameState.optionsOpen$ | async">
        <h2>Options</h2>
        <p>Volume, difficulty, and future feature toggles will appear here.</p>
        <div class="option-item">
          <label>
            <input type="checkbox" [checked]="gameState.debugMode" (change)="gameState.setDebugMode($event.target.checked)" />
            Enable debug mode
          </label>
        </div>
        <button (click)="gameState.closeOptions()">Close</button>
      </section>
    </section>
  `
})
export class MenuComponent {
  constructor(public gameState: GameStateService) {}

  startNewGame() {
    this.gameState.beginCompanionSelection();
  }
}
