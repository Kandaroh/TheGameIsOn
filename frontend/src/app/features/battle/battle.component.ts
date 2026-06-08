import { Component } from '@angular/core';
import { CardFrameData } from '../../shared/components/card-frame/card-frame.component';
import { GameStateService } from '../../shared/services/game-state.service';
import { CardModel } from '../../shared/models/card.model';
import { CompanionModel } from '../../shared/models/companion.model';
import { EnemyModel } from '../../shared/models/battle-state.model';

@Component({
  selector: 'app-battle',
  template: `
    <ng-container *ngIf="state$ | async as state">
      <div class="battle-shell" [class.blurred]="graveyardOpen">
        <header class="battle-header">
          <div>
            <h2>Battle</h2>
            <p>{{ getTargetHint(state) }}</p>
          </div>
                    <div class="battle-status">
            <span>Life: {{ state.player.life }}</span>
            <span *ngFor="let companion of state.companions || []"
                  class="companion-energy-badge">
              {{ companion.name }}: {{ companion.energy }}&nbsp;/&nbsp;{{ companion.maxEnergy ?? companion.energy }} ⚡
            </span>
          </div>
          <!-- Debug energy counter — only visible when debug mode is ON -->
          <div class="debug-energy" *ngIf="gameState.debugMode">
            <strong>[DEBUG] Companion Energy</strong>
            <div *ngFor="let companion of state.companions || []">
              {{ companion.id }}&nbsp;|&nbsp;energy:&nbsp;{{ companion.energy }}&nbsp;/&nbsp;{{ companion.maxEnergy ?? companion.energy }}&nbsp;(+{{ companion.energyRefill }}&nbsp;refill)
            </div>
          </div>
        </header>

        <div class="battle-main">
          <aside class="side-panel">
            <div class="discard-pile" (click)="openGraveyard()" [class.highlight]="targetSelectionType === 'discard'">
              <span>Discard</span>
              <strong>{{ state.player.discard?.length || 0 }}</strong>
            </div>
            <div class="deck-pile" (mouseenter)="deckHover = true" (mouseleave)="deckHover = false" (click)="targetSelectionType === 'deck' ? selectDeckTarget() : drawCard()" [class.highlight]="targetSelectionType === 'deck'">
              <span>Deck</span>
              <strong>{{ state.player.deck.cardIds.length }}</strong>
              <div class="deck-tooltip" *ngIf="deckHover">{{ state.player.deck.cardIds.length }} cards</div>
            </div>
            <button class="end-turn" (click)="endTurn()">End Turn</button>
          </aside>

                    <section class="arena">
                        <div class="enemies-row">
              <div class="enemy-card-wrap"
                   *ngFor="let enemy of getEnemies(state)"
                   [class.selected]="selectedTargetIds.includes(enemy.id)"
                   (click)="selectEnemyTarget(enemy.id)">
                <app-card-frame variant="enemy" [card]="enemyCardData(enemy)"></app-card-frame>
              </div>
            </div>

            <div class="companions-row">
              <div class="companion-card-wrap"
                   *ngFor="let companion of state.companions || []"
                   [class.active]="companion.id === selectedActorId"
                   [class.selected]="selectedTargetIds.includes(companion.id)"
                   (click)="selectCompanion(companion.id)">
                <app-card-frame variant="companion" [card]="companionCardData(companion)"></app-card-frame>
              </div>
            </div>
          </section>
        </div>

        <section class="battle-hand">
          <h3>Hand</h3>
          <div class="hand-cards">
            <div class="card-slot" *ngFor="let card of handSlots(state)">
                            <ng-container *ngIf="card; else emptySlot">
                <div class="hand-card-wrap"
                     [class.selected]="card.id === selectedCardId"
                     (click)="selectHandCard(card.id)">
                  <app-card-frame variant="hand" [card]="handCardData(card)"></app-card-frame>
                </div>
              </ng-container>
              <ng-template #emptySlot>
                <div class="card-empty">Empty</div>
              </ng-template>
            </div>
          </div>
        </section>
      </div>

      <div class="graveyard-overlay" *ngIf="graveyardOpen">
        <div class="graveyard-content">
          <h3>Graveyard</h3>
          <button class="close-graveyard" (click)="closeGraveyard()">Close</button>
          <div class="graveyard-list">
            <div *ngFor="let cardId of state.player.discard || []">
              {{ getCard(state, cardId)?.name || cardId }}
            </div>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [
    `
            .battle-shell { display: flex; flex-direction: column; gap: 20px; padding: 16px; }
      .blurred { filter: blur(3px); }
      .battle-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .battle-status { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
      .battle-status span { margin-left: 0; }
      .companion-energy-badge { background: #1e293b; color: #facc15; border-radius: 8px; padding: 3px 10px; font-size: 0.85rem; font-weight: 600; }
      .debug-energy { background: #1e1e2e; color: #a6e3a1; font-family: monospace; font-size: 0.78rem; padding: 6px 12px; border-radius: 8px; border: 1px solid #45475a; line-height: 1.8; margin-left: 8px; }
      .debug-energy strong { color: #cba6f7; display: block; margin-bottom: 2px; }
      .battle-main { display: grid; grid-template-columns: 240px 1fr; gap: 20px; }
      .side-panel { display: flex; flex-direction: column; gap: 16px; }
      .discard-pile, .deck-pile { background: #1e293b; color: white; border-radius: 14px; padding: 14px; cursor: pointer; position: relative; text-align: center; }
      .deck-tooltip { position: absolute; top: -28px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); color: white; border-radius: 8px; padding: 4px 8px; font-size: 0.85rem; }
      .end-turn { margin-top: auto; padding: 12px 16px; border: none; border-radius: 12px; background: #2563eb; color: white; cursor: pointer; }
      .arena { background: #f8fafc; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
      .enemies-row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; width: 100%; }
      .companions-row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
      .enemy-card-wrap { width: 200px; cursor: pointer; border-radius: 22px; }
      .companion-card-wrap { width: 210px; cursor: pointer; border-radius: 22px; }
      .hand-card-wrap { width: 100%; cursor: pointer; border-radius: 22px; }
      .enemy-card-wrap.selected app-card-frame, .companion-card-wrap.selected app-card-frame, .hand-card-wrap.selected app-card-frame { display: block; outline: 3px solid #2563eb; outline-offset: 2px; border-radius: 22px; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18); }
      .companion-card-wrap.active app-card-frame { display: block; outline: 3px solid #2563eb; outline-offset: 2px; border-radius: 22px; }
      .discard-pile.highlight, .deck-pile.highlight { box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.6); }
      .battle-hand { display: flex; flex-direction: column; gap: 12px; }
      .hand-cards { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
      .card-slot { width: 180px; min-height: 240px; }
      .card-empty { width: 100%; min-height: 220px; border: 2px dashed #cbd5e1; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #94a3b8; background: #f8fafc; }
      .graveyard-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
      .graveyard-content { width: min(560px, calc(100% - 32px)); padding: 24px; background: white; border-radius: 20px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2); }
      .graveyard-list { max-height: 320px; overflow-y: auto; margin-top: 16px; display: grid; gap: 10px; }
      .close-graveyard { margin-bottom: 12px; padding: 10px 14px; border: none; border-radius: 12px; background: #2563eb; color: white; cursor: pointer; }
    `
  ]
})
export class BattleComponent {
    state$ = this.gameState.state$;
  selectedCardId: string | null = null;
  selectedActorId: string | null = null;
  selectedTargetIds: string[] = [];
  targetSelectionType: 'companion' | 'wildMonster' | 'deck' | 'discard' | null = null;
  deckHover = false;
  graveyardOpen = false;

  /** Fallback enemies shown when no BattleState is present in the server state. */
  private readonly fallbackEnemies: EnemyModel[] = [
    { id: 'wild-1', name: 'Wild Wolf',   life: 18, maxLife: 18, shield: 0, energy: 2, maxEnergy: 2, element: 'earth', type: 'Beast'     },
    { id: 'wild-2', name: 'Stone Golem', life: 22, maxLife: 22, shield: 0, energy: 1, maxEnergy: 1, element: 'earth', type: 'Construct' },
  ];

  constructor(public gameState: GameStateService) {}

    selectHandCard(cardId: string) {
    if (this.selectedCardId === cardId) {
      this.clearSelection();
      return;
    }

    // Fully reset all selection state when switching to a new card so no
    // stale targetSelectionType / selectedTargetIds from a previous play leak
    // into the new card's targeting flow.
    this.clearSelection();
    this.selectedCardId = cardId;
  }

    selectCompanion(companionId: string) {
    const state = this.gameState.state$.value;
    const selectedCard = state ? this.getCard(state, this.selectedCardId) : undefined;

    // Phase 2: a card is waiting for a companion target — register this click as the target.
    if (this.targetSelectionType === 'companion' && this.selectedActorId) {
      this.toggleTarget(companionId);
      return;
    }

    // No card selected yet — just remember the actor for the next card pick.
    if (!this.selectedCardId || !selectedCard) {
      this.selectedActorId = companionId;
      return;
    }

    // A card is selected: this companion click is the "who plays it" decision.
    // Always update the actor (allows switching companion mid-selection).
    this.selectedActorId = companionId;
    this.selectedTargetIds = [];
    this.targetSelectionType = this.requiresTargetSelection(selectedCard)
      ? (selectedCard.target ?? null) as typeof this.targetSelectionType
      : null;

    if (!this.targetSelectionType) {
      // No target needed — play immediately.
      this.playSelectedCard(selectedCard);
    }
    // If targetSelectionType is set the UI now waits for the user to click a target.
  }

    selectEnemyTarget(enemyId: string) {
    if (this.targetSelectionType !== 'wildMonster' || !this.selectedActorId) {
      return;
    }
    this.toggleTarget(enemyId);
  }

  selectDeckTarget() {
    if (this.targetSelectionType !== 'deck') {
      return;
    }
    this.selectedTargetIds = ['deck'];
    this.commitSelectedCard();
  }

  selectDiscardTarget() {
    if (this.targetSelectionType !== 'discard') {
      return;
    }
    this.selectedTargetIds = ['discard'];
    this.commitSelectedCard();
  }

  handSlots(state: any): Array<CardModel | null> {
    const slots: Array<CardModel | null> = [];
    for (let i = 0; i < 5; i++) {
      const cardId = state.player.hand[i];
      slots.push(cardId ? this.getCard(state, cardId) ?? null : null);
    }
    return slots;
  }

  drawCard() {
    this.gameState.drawCard();
  }

    /** Returns the live enemy list from BattleState, or the fallback if not yet initialised. */
  getEnemies(state: any): EnemyModel[] {
    return (state?.battle?.enemies as EnemyModel[] | undefined) ?? this.fallbackEnemies;
  }

  endTurn() {
    this.clearSelection();
    // Backend handles energy refill + enemy AI; just delegate.
    this.gameState.endTurn();
  }

  openGraveyard() {
    this.graveyardOpen = true;
  }

  closeGraveyard() {
    this.graveyardOpen = false;
  }

  getCard(state: any, cardId: string | null): CardModel | undefined {
    return state.cards.find((card: CardModel) => card.id === cardId);
  }

  getSelectedCard(state: any): CardModel | undefined {
    return this.selectedCardId ? this.getCard(state, this.selectedCardId) : undefined;
  }

    getCardSprite(card: CardModel): string {
    return card.sprite ? `url('${card.sprite}')` : 'none';
  }

  getCompanionSprite(companion: CompanionModel): string {
    return companion.sprite ? `url('${companion.sprite}')` : 'none';
  }

    handCardData(card: CardModel): CardFrameData {
      return {
        name: card.name,
        cost: card.cost,
        band: card.type,
        type: card.type,
        element: card.element,
        description: card.description || 'No ability text',
        target: card.target,
        targetNumber: card.targetNumber,
        sprite: card.sprite,
        effect: card.effect?.description,
        enhancedEffect: card.enhancedEffect?.description,
      };
    }

  companionCardData(companion: CompanionModel): CardFrameData {
    const maxLife = companion.maxLife ?? companion.life;
    const maxEnergy = companion.maxEnergy ?? companion.energyRefill ?? companion.energy;
    return {
      name: companion.name,
      band: companion.type,
      type: 'Companion',
      element: companion.element,
      sprite: companion.sprite,
      hp: companion.life,
      maxHp: maxLife,
      energy: companion.energy,
      maxEnergy: maxEnergy
    };
  }

    enemyCardData(enemy: EnemyModel): CardFrameData {
    return {
      name:     enemy.name,
      band:     enemy.type ?? 'Beast',   // creature type in the band strip (e.g. "Beast", "Construct")
      type:     'Wild Monster',           // internal classification kept for any logic that reads it
      element:  (enemy.element as any),
      hp:       enemy.life,
      maxHp:    enemy.maxLife ?? enemy.life,
      energy:   enemy.energy,
      maxEnergy: enemy.maxEnergy
    };
  }

  getTargetHint(state: any): string {
    const card = this.getSelectedCard(state);
    if (!card) {
      return 'Select a card from your hand.';
    }
    if (!this.selectedActorId) {
      return `Select a companion to play ${card.name}.`;
    }
    if (this.targetSelectionType) {
      return `Select ${card.targetNumber === 'ALL' ? 'all targets' : `${card.targetNumber} target(s)`} for ${card.name}.`;
    }
    return `Ready to play ${card.name} with the selected companion.`;
  }

    private requiresTargetSelection(card: CardModel): boolean {
    // A card requires explicit target selection only when it has a target type
    // AND a finite targetNumber. 'ALL' targets fire immediately via commitSelectedCard.
    return !!card.target && !!card.targetNumber && card.targetNumber !== 'ALL';
  }

    private toggleTarget(targetId: string) {
    const state = this.gameState.state$.value;
    const card = state ? this.getSelectedCard(state) : undefined;
    if (!card) {
      return;
    }

    // Guard: targetNumber must be a valid finite number. If it is missing or
    // non-numeric the card should not have entered target-selection mode at all
    // (requiresTargetSelection already blocks that). Bail out to prevent
    // runaway accumulation of target IDs.
    const rawMax = card.targetNumber;
    if (rawMax === undefined || rawMax === null) {
      this.clearSelection();
      return;
    }
    const maxTargets = rawMax === 'ALL' ? Infinity : Number(rawMax);
    if (!isFinite(maxTargets) || maxTargets <= 0) {
      this.clearSelection();
      return;
    }

    const alreadySelected = this.selectedTargetIds.includes(targetId);
    if (alreadySelected) {
      this.selectedTargetIds = this.selectedTargetIds.filter(id => id !== targetId);
      return;
    }

    if (this.selectedTargetIds.length >= maxTargets) {
      return;
    }

    this.selectedTargetIds = [...this.selectedTargetIds, targetId];
    if (this.selectedTargetIds.length >= maxTargets) {
      this.commitSelectedCard();
    }
  }

    private commitSelectedCard() {
    const state = this.gameState.state$.value;
    const card = state ? this.getSelectedCard(state) : undefined;
    if (!card || !this.selectedActorId) {
      return;
    }

    this.gameState.playCardWithCompanion(this.selectedCardId!, this.selectedActorId, {
      targetType: this.targetSelectionType ?? undefined,
      targetIds: this.selectedTargetIds.length ? this.selectedTargetIds : undefined
    });

    // Always clear regardless of success so stale target IDs never carry over.
    this.clearSelection();
  }

    private playSelectedCard(card: CardModel) {
    const success = this.gameState.playCardWithCompanion(this.selectedCardId!, this.selectedActorId!, {
      targetType: this.targetSelectionType ?? undefined,
      targetIds: undefined
    });

    // Always clear regardless of success: a failed play (e.g. not enough energy)
    // must not leave stale actorId / targetSelectionType that corrupt the next action.
    this.clearSelection();
  }

  private clearSelection() {
    this.selectedCardId = null;
    this.selectedActorId = null;
    this.selectedTargetIds = [];
    this.targetSelectionType = null;
  }
}
