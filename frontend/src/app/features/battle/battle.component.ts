import { Component } from '@angular/core';
import { GameStateService } from '../../shared/services/game-state.service';
import { CardModel } from '../../shared/models/card.model';

@Component({
  selector: 'app-battle',
  template: `
    <section class="battle-screen" *ngIf="state$ | async as state">
      <header class="battle-header">
        <div>
          <h2>Battle</h2>
          <p>Drag cards into the battle area or double-click a card to play it.</p>
        </div>
        <div class="battle-status">
          <span>Life: {{ state.player.life }}</span>
          <span>Mana: {{ state.player.mana }}</span>
        </div>
      </header>

      <div class="battle-layout">
        <div class="battle-board" (drop)="onDrop($event)" (dragover)="onDragOver($event)">
          <div class="battle-drop-area">
            <p>Drop a card here to play it.</p>
            <p *ngIf="currentEvent(state) as event">Current event: {{ event.type }}</p>
          </div>
        </div>

        <aside class="battle-deck">
          <h3>Deck</h3>
          <div class="deck-count">Cards in deck: {{ state.player.deck.cardIds.length }}</div>
          <div class="deck-list">
            <div *ngFor="let cardId of state.player.deck.cardIds">
              {{ getCard(state, cardId)?.name || cardId }}
            </div>
          </div>
        </aside>
      </div>

      <section class="battle-hand">
        <h3>Hand</h3>
        <div class="hand-cards">
          <div class="card-item" *ngFor="let card of handCards(state)" draggable="true"
            (dragstart)="onDragStart($event, card.id)"
            (dblclick)="playCard(card.id)">
            <strong>{{ card.name }}</strong>
            <span>Cost: {{ card.cost }}</span>
            <small>{{ card.type }}</small>
            <p>{{ card.description || 'Blank ability card' }}</p>
          </div>
        </div>
      </section>
    </section>
  `
})
export class BattleComponent {
  state$ = this.gameState.state$;

  constructor(private gameState: GameStateService) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDragStart(event: DragEvent, cardId: string) {
    event.dataTransfer?.setData('text/plain', cardId);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const cardId = event.dataTransfer?.getData('text/plain');
    if (cardId) {
      this.playCard(cardId);
    }
  }

  playCard(cardId: string) {
    this.gameState.playCard(cardId);
  }

  handCards(state: any): CardModel[] {
    return state.player.hand
      .map((cardId: string) => this.getCard(state, cardId))
      .filter((card: CardModel | undefined): card is CardModel => !!card);
  }

  getCard(state: any, cardId: string): CardModel | undefined {
    return state.cards.find((card: CardModel) => card.id === cardId);
  }

  currentEvent(state: any) {
    return this.gameState.getCurrentEvent(state);
  }
}
