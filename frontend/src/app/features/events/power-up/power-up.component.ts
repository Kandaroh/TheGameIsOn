import { Component } from '@angular/core';
import { GameStateService } from '../../../shared/services/game-state.service';

@Component({
  selector: 'app-power-up',
  templateUrl: './power-up.component.html',
  styleUrls: ['./power-up.component.css']
})
export class PowerUpComponent {
  eventTitle = 'Power Up';
  eventIcon = '⚡';
  eventDescription = 'Gain a temporary boost to your abilities.';

  constructor(private gameState: GameStateService) {}
  goBack() { this.gameState.goBack(); }
}
