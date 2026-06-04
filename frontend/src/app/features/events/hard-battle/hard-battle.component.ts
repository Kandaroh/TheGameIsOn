import { Component } from '@angular/core';
import { GameStateService } from '../../../shared/services/game-state.service';

@Component({
  selector: 'app-hard-battle',
  templateUrl: './hard-battle.component.html',
  styleUrls: ['./hard-battle.component.css']
})
export class HardBattleComponent {
  eventTitle = 'Hard Battle';
  eventIcon = '💀';
  eventDescription = 'A difficult encounter; be prepared.';

  constructor(private gameState: GameStateService) {}
  goBack() { this.gameState.goBack(); }
}
