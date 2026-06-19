import { Component } from '@angular/core';
import { GameStateService } from '../../shared/services/game-state.service';
import { CardPreviewService } from '../../shared/components/card-preview/card-preview.service';
import { CardFrameData } from '../../shared/components/card-frame/card-frame.component';
import { CardModel } from '../../shared/models/card.model';
import { PendingCardReward } from '../../shared/models/battle-state.model';

@Component({
  selector: 'app-card-reward',
  template: `
    <div class="reward-shell" *ngIf="state$ | async as state">

      <ng-container *ngIf="currentReward(state) as reward; else noReward">
        <h1 class="reward-title">Choose a Card</h1>
        <p class="reward-subtitle">
          Reward for
          <strong>{{ companionName(state, reward.companionId) }}</strong>
        </p>

        <div class="card-options">
          <div class="card-option"
               *ngFor="let card of reward.cardOptions"
               [class.selected]="selectedCardId === card.id"
               (click)="selectCard(card.id)"
               (mouseenter)="showPreview($event, cardData(card))"
               (mouseleave)="hidePreview()">
            <app-card-frame variant="selection" [card]="cardData(card)">
            </app-card-frame>
          </div>
        </div>

        <div class="reward-footer">
          <button class="confirm-btn"
                  [disabled]="!selectedCardId"
                  (click)="confirm(reward.companionId)">
            Add to Deck
          </button>
        </div>
      </ng-container>

      <ng-template #noReward>
        <p class="no-reward-msg">No pending rewards.</p>
        <button class="skip-btn" (click)="skip()">Continue</button>
      </ng-template>

    </div>
  `,
  styles: [`
    .reward-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, #0f172a 0%, #1e3a8a 100%);
      padding: 32px;
      gap: 24px;
      color: white;
    }
    .reward-title {
      font-size: 2rem;
      font-weight: 900;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0;
    }
    .reward-subtitle {
      font-size: 1rem;
      color: #cbd5e1;
      margin: 0;
    }
    .card-options {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 8px;
    }
    .card-option {
      width: 240px;
      cursor: pointer;
      border-radius: 22px;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .card-option:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.35);
    }
    .card-option.selected {
      outline: 3px solid #fbbf24;
      outline-offset: 3px;
      box-shadow: 0 0 0 6px rgba(251,191,36,0.2);
    }
    .reward-footer { margin-top: 8px; }
    .confirm-btn {
      padding: 14px 48px;
      border: none;
      border-radius: 14px;
      background: #2563eb;
      color: white;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.04em;
    }
    .confirm-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .confirm-btn:not(:disabled):hover { background: #1d4ed8; }
    .no-reward-msg { color: #94a3b8; font-size: 1rem; }
    .skip-btn {
      padding: 12px 32px;
      border: none;
      border-radius: 12px;
      background: #334155;
      color: white;
      cursor: pointer;
      font-size: 1rem;
    }
  `]
})
export class CardRewardComponent {
  state$ = this.gameState.state$;
  selectedCardId: string | null = null;

  constructor(private gameState: GameStateService, private cardPreview: CardPreviewService) {}

  /** Returns the first unresolved pending reward. */
  currentReward(state: any): PendingCardReward | undefined {
    return state.battle?.pendingCardRewards?.[0];
  }

  companionName(state: any, companionId: string): string {
    return (
      state.companions?.find((c: any) => c.id === companionId)?.name ?? companionId
    );
  }

  cardData(card: CardModel): CardFrameData {
    return {
      name:           card.name,
      cost:           card.cost,
      band:           card.type,
      type:           card.type,
      element:        card.element,
      description:    card.description,
      effect:         card.effect?.description,
      enhancedEffect: card.enhancedEffect?.description,
      sprite:         card.sprite,
    };
  }

  selectCard(cardId: string) {
    this.selectedCardId = cardId;
  }

  confirm(companionId: string) {
    if (!this.selectedCardId) return;
    this.gameState.claimReward(companionId, this.selectedCardId);
    this.selectedCardId = null;
  }

  /** Show the floating card preview on hover. */
  showPreview(event: MouseEvent, data: CardFrameData): void {
    this.cardPreview.show(data, event.clientX, event.clientY);
  }

  hidePreview(): void {
    this.cardPreview.hide();
  }

  /** Failsafe: skip with no selection (should not normally be reachable). */
  skip() {
    this.gameState.proceedFromResults();
  }
}
