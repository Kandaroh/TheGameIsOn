import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CardFrameData } from '../../shared/components/card-frame/card-frame.component';
import { GameStateService } from '../../shared/services/game-state.service';
import { CardPreviewService } from '../../shared/components/card-preview/card-preview.service';
import { CardModel } from '../../shared/models/card.model';
import { CompanionModel } from '../../shared/models/companion.model';
import { EnemyModel, EnemyTurnAction } from '../../shared/models/battle-state.model';

@Component({
  selector: 'app-battle',
  template: `
    <ng-container *ngIf="state$ | async as state">
      <div class="battle-shell" [class.blurred]="graveyardOpen">
        <header class="battle-header">
          <div>
            <h2>Battle</h2>
            <p class="battle-context">{{ getBattleContext(state) }}</p>
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
                        <div class="discard-pile"
                 (click)="openGraveyard()"
                 [class.highlight]="targetSelectionType === 'discard'"
                 (mouseenter)="discardHover = true"
                 (mouseleave)="discardHover = false">
              <span class="discard-icon">&#x1FAA6;</span>
              <span class="discard-label">Discard</span>
              <span class="discard-count-badge">{{ state.player.discard?.length || 0 }}</span>
              <div class="discard-tooltip" *ngIf="discardHover">{{ state.player.discard?.length || 0 }} cards in discard</div>
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
                     (click)="selectHandCard(card.id)"
                     (mouseenter)="showPreview($event, handCardData(card))"
                     (mouseleave)="hidePreview()">
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
            <div class="graveyard-row"
                 *ngFor="let cardId of state.player.discard || []"
                 (mouseenter)="showGraveyardPreview($event, state, cardId)"
                 (mouseleave)="hidePreview()">
              <span class="gy-name">{{ getCard(state, cardId)?.name || cardId }}</span>
              <span *ngIf="getCard(state, cardId)?.element" class="gy-elem-badge"
                    [ngClass]="'gy-elem-' + getCard(state, cardId)!.element">
                {{ getCard(state, cardId)!.element }}
              </span>
              <span *ngIf="getCard(state, cardId)?.type" class="gy-type-badge"
                    [ngClass]="'gy-type-' + getCard(state, cardId)!.type">
                {{ getCard(state, cardId)!.type }}
              </span>
            </div>
          </div>
        </div>
            </div>

      <!-- Attack result pop-up -->
      <app-attack-result-popup
        *ngIf="showAttackPopup"
        [actions]="attackActions"
        [turn]="attackPopupTurn"
        (dismiss)="dismissAttackPopup()"
      ></app-attack-result-popup>
    </ng-container>
  `,
  styles: [
    `
            .battle-shell { display: flex; flex-direction: column; gap: 20px; padding: 16px; }
      .blurred { filter: blur(3px); }
      .battle-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .battle-status { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
      .battle-status span { margin-left: 0; }
      .battle-context { font-size: 0.78rem; color: #64748b; margin: 2px 0 4px; letter-spacing: 0.03em; }
      .companion-energy-badge { background: #1e293b; color: #facc15; border-radius: 8px; padding: 3px 10px; font-size: 0.85rem; font-weight: 600; }
      .debug-energy { background: #1e1e2e; color: #a6e3a1; font-family: monospace; font-size: 0.78rem; padding: 6px 12px; border-radius: 8px; border: 1px solid #45475a; line-height: 1.8; margin-left: 8px; }
      .debug-energy strong { color: #cba6f7; display: block; margin-bottom: 2px; }
      .battle-main { display: grid; grid-template-columns: 240px 1fr; gap: 20px; }
      .side-panel { display: flex; flex-direction: column; gap: 16px; }
      .discard-pile { background: linear-gradient(135deg, #312e81, #1e1b4b); color: white; border-radius: 14px; padding: 14px; cursor: pointer; position: relative; text-align: center; border: 1.5px solid #6366f1; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: box-shadow 0.2s ease; }
      .discard-pile:hover { box-shadow: 0 0 14px rgba(99, 102, 241, 0.35); }
      .discard-icon { font-size: 1.6rem; }
      .discard-label { font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #c4b5fd; }
      .discard-count-badge { background: #6366f1; color: white; font-weight: 800; font-size: 0.9rem; border-radius: 99px; padding: 2px 12px; }
      .discard-tooltip { position: absolute; top: -32px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); color: white; border-radius: 8px; padding: 4px 10px; font-size: 0.8rem; white-space: nowrap; z-index: 10; }
      .deck-pile { background: #1e293b; color: white; border-radius: 14px; padding: 14px; cursor: pointer; position: relative; text-align: center; }
      .deck-tooltip { position: absolute; top: -28px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); color: white; border-radius: 8px; padding: 4px 8px; font-size: 0.85rem; }
      .end-turn { margin-top: auto; padding: 12px 16px; border: none; border-radius: 12px; background: #2563eb; color: white; cursor: pointer; }
      .arena { background: #f8fafc; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
      .enemies-row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; width: 100%; }
      .companions-row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
      .enemy-card-wrap { width: 240px; cursor: pointer; border-radius: 22px; }
      .companion-card-wrap { width: 250px; cursor: pointer; border-radius: 22px; }
      .hand-card-wrap { width: 100%; cursor: pointer; border-radius: 22px; }
      .enemy-card-wrap.selected app-card-frame, .companion-card-wrap.selected app-card-frame, .hand-card-wrap.selected app-card-frame { display: block; outline: 3px solid #2563eb; outline-offset: 2px; border-radius: 22px; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18); }
      .companion-card-wrap.active app-card-frame { display: block; outline: 3px solid #2563eb; outline-offset: 2px; border-radius: 22px; }
      .discard-pile.highlight, .deck-pile.highlight { box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.6); }
      .battle-hand { display: flex; flex-direction: column; gap: 12px; }
      .hand-cards { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
      .card-slot { width: 220px; min-height: 300px; }
      .card-empty { width: 100%; min-height: 220px; border: 2px dashed #cbd5e1; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #94a3b8; background: #f8fafc; }
      .graveyard-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
      .graveyard-content { width: min(560px, calc(100% - 32px)); padding: 24px; background: white; border-radius: 20px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2); }
      .graveyard-list { max-height: 380px; overflow-y: auto; margin-top: 16px; display: flex; flex-direction: column; gap: 6px; }
      .graveyard-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; background: #f1f5f9; cursor: default; transition: background 0.15s ease; }
      .graveyard-row:hover { background: #e2e8f0; }
      .gy-name { flex: 1; font-weight: 600; font-size: 0.9rem; color: #1e293b; }
      .gy-elem-badge { font-size: 0.68rem; font-weight: 700; text-transform: capitalize; padding: 2px 8px; border-radius: 20px; background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; }
      .gy-elem-fire    { background: rgba(239,68,68,0.12); color: #b91c1c; border-color: #f87171; }
      .gy-elem-water   { background: rgba(59,130,246,0.12); color: #1d4ed8; border-color: #60a5fa; }
      .gy-elem-earth   { background: rgba(101,85,36,0.12); color: #a16207; border-color: #a16207; }
      .gy-elem-air     { background: rgba(110,231,183,0.12); color: #047857; border-color: #6ee7b7; }
      .gy-elem-arcane  { background: rgba(139,92,246,0.12); color: #6d28d9; border-color: #a78bfa; }
      .gy-elem-shadow  { background: rgba(30,27,75,0.18); color: #312e81; border-color: #818cf8; }
      .gy-elem-light   { background: rgba(251,191,36,0.15); color: #92400e; border-color: #fde68a; }
      .gy-elem-neutral { background: rgba(100,116,139,0.12); color: #475569; border-color: #94a3b8; }
      .gy-type-badge { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 20px; border: 1px solid #cbd5e1; color: #64748b; background: #f8fafc; }
      .gy-type-attack  { color: #b91c1c; border-color: #f87171; }
      .gy-type-defense { color: #1d4ed8; border-color: #60a5fa; }
      .gy-type-utility { color: #6d28d9; border-color: #a78bfa; }
      .close-graveyard { margin-bottom: 12px; padding: 10px 14px; border: none; border-radius: 12px; background: #2563eb; color: white; cursor: pointer; }
    `
  ]
})
export class BattleComponent implements OnInit, OnDestroy {
    state$ = this.gameState.state$;
  selectedCardId: string | null = null;
  selectedActorId: string | null = null;
  selectedTargetIds: string[] = [];
  targetSelectionType: 'companion' | 'wildMonster' | 'deck' | 'discard' | null = null;
  deckHover = false;
  discardHover = false;
  graveyardOpen = false;

  // Attack result popup state
  showAttackPopup = false;
  attackActions: EnemyTurnAction[] = [];
  attackPopupTurn = 0;

  private endTurnSub?: Subscription;

  constructor(public gameState: GameStateService, private cardPreview: CardPreviewService) {}

  ngOnInit() {
    this.endTurnSub = this.gameState.endTurnResult$.subscribe(actions => {
      this.attackActions = actions;
      this.attackPopupTurn = this.gameState.state$.value?.battle?.turn
        ? this.gameState.state$.value.battle.turn - 1
        : 0;
      this.showAttackPopup = true;
    });
  }

  ngOnDestroy() {
    this.endTurnSub?.unsubscribe();
  }

  dismissAttackPopup() {
    this.showAttackPopup = false;
    this.attackActions = [];
  }

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

    /** Returns the live enemy list from BattleState. */
    getEnemies(state: any): EnemyModel[] {
      return (state?.battle?.enemies as EnemyModel[] | undefined) ?? [];
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
    this.hidePreview();
  }

  /** Show the floating card preview on hover. */
  showPreview(event: MouseEvent, data: CardFrameData): void {
    this.cardPreview.show(data, event.clientX, event.clientY);
  }

  /** Show preview for a card in the graveyard by id. */
  showGraveyardPreview(event: MouseEvent, state: any, cardId: string): void {
    const card = this.getCard(state, cardId);
    if (card) {
      this.cardPreview.show(this.handCardData(card), event.clientX, event.clientY);
    }
  }

  hidePreview(): void {
    this.cardPreview.hide();
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

    // Compute next unlock level
    const unlockLevels = companion.abilityUnlockLevels ?? [];
    const filledSlots  = companion.specialAbilities?.length ?? 0;
    const nextUnlock   = filledSlots < unlockLevels.length
      ? unlockLevels[filledSlots]
      : null;

    return {
      name: companion.name,
      band: companion.type,
      type: 'Companion',
      element: companion.element,
      sprite: companion.sprite,
      hp: companion.life,
      maxHp: maxLife,
      energy: companion.energy,
      maxEnergy: maxEnergy,
      level: companion.level,
      exp: companion.exp,
      nextLevelExp: companion.nextLevelExp,
      energyRefill: companion.energyRefill,
      abilities: (companion.specialAbilities ?? []).map(a => ({
        name: a.name,
        description: a.description,
        trigger: a.trigger,
        unlocked: true,
      })),
      nextUnlockLevel: nextUnlock,
            statusEffects: (companion.statusEffects ?? []).map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon || this.statusIcon(s.id),
        stacks: s.stacks,
        turnsRemaining: s.turnsRemaining,
      })),
    };
  }

        enemyCardData(enemy: EnemyModel): CardFrameData {
    return {
      name:     enemy.name,
      band:     enemy.type ?? 'Beast',
      type:     'Wild Monster',
      element:  (enemy.element as any),
      hp:       enemy.life,
      maxHp:    enemy.maxLife ?? enemy.life,
      energy:   enemy.energy,
      maxEnergy: enemy.maxEnergy,
      expReward: enemy.expReward,
      rewards: (enemy.rewards ?? []).map(r => ({
        type: r.type,
        value: r.value,
        tier: r.tier,
      })),
      attacks: (enemy.attackSummaries ?? []).map(a => ({
        name: a.name,
        description: a.description,
        element: a.element,
      })),
            statusEffects: (enemy.statusEffects ?? []).map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon || this.statusIcon(s.id),
        stacks: s.stacks,
        turnsRemaining: s.turnsRemaining,
      })),
    };
  }

  /** Map a status-effect id to a display icon. */
  private statusIcon(id: string): string {
    const icons: Record<string, string> = {
      poison: '\u2620\uFE0F',
      burn: '\uD83D\uDD25',
      shield: '\uD83D\uDEE1\uFE0F',
      stun: '\uD83D\uDCAB',
      regen: '\uD83D\uDC9A',
      evade: '\uD83D\uDCA8',
    };
    return icons[id] ?? '\u2B50';
  }

  /** Returns a short contextual label shown below the battle title. */
  getBattleContext(state: any): string {
    const node    = this.gameState.getCurrentNode(state);
    const area    = node?.event?.area ?? 'unknown area';
    const enc     = state.player?.encounterCount ?? 0;
    const enemies = this.getEnemies(state);
    if (enemies.length === 0) return '';
    const lvls    = enemies.map((e: any) => e.level);
    const minLvl  = Math.min(...lvls);
    const maxLvl  = Math.max(...lvls);
    const lvlStr  = minLvl === maxLvl ? `Lv.${minLvl}` : `Lv.${minLvl}–${maxLvl}`;
    return `${area.charAt(0).toUpperCase() + area.slice(1)} · ${lvlStr} · Encounter #${enc}`;
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
