import { Component } from '@angular/core';
import { GameStateService } from '../../../shared/services/game-state.service';

@Component({
  selector: 'app-end',
  template: `
    <div class="event-screen">
      <header>
        <h2>End</h2>
        <div class="event-icon">🏁</div>
      </header>
      <section class="event-description">
        <p>The run has completed. Congratulations — review your history and restart when ready.</p>
      </section>
    </div>
  `,
  styles: [`.event-description{ text-align:center; display:flex; align-items:center; justify-content:center; min-height:140px; } .back-button{margin-bottom:12px}`]
})
export class EndComponent {
  constructor(private gameState: GameStateService) {}
  goBack() { this.gameState.goBack(); }
}
