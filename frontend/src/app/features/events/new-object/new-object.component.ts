import { Component } from '@angular/core';
import { GameStateService } from '../../../shared/services/game-state.service';

@Component({
  selector: 'app-new-object',
  templateUrl: './new-object.component.html',
  styleUrls: ['./new-object.component.css']
})
export class NewObjectComponent {
  eventTitle = 'New Object';
  eventIcon = '🎁';
  eventDescription = 'Discover a new object or tool to help you.';

  constructor(private gameState: GameStateService) {}
  goBack() { this.gameState.goBack(); }
}
