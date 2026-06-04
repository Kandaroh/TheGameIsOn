import { Component } from '@angular/core';
import { GameStateService } from '../../../shared/services/game-state.service';

@Component({
  selector: 'app-rest',
  templateUrl: './rest.component.html',
  styleUrls: ['./rest.component.css']
})
export class RestComponent {
  eventTitle = 'Rest';
  eventIcon = '🛌';
  eventDescription = 'Recover a small amount of life or skip your next combat turn. Rest nodes are rare.';

  constructor(private gameState: GameStateService) {}

  goBack() {
    this.gameState.goBack();
  }
}
