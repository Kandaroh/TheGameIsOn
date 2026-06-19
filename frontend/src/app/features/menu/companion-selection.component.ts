import { Component } from '@angular/core';
import { GameStateService } from '../../shared/services/game-state.service';
import { CompanionModel } from '../../shared/models/companion.model';
import { CardFrameData } from '../../shared/components/card-frame/card-frame.component';

@Component({
  selector: 'app-companion-selection',
  template: `
    <section class="selection-screen">
      <h2>Select your companions ({{ gameState.selectedCompanions.length }}/3)</h2>
            <ng-container *ngIf="currentOptions.length; else loading">
        <div class="options">
          <div class="companion-card-wrap" *ngFor="let companion of currentOptions">
            <app-card-frame variant="selection" [card]="companionCardData(companion)">
                            <div class="selection-extra">
                <div class="unlock-schedule" *ngIf="companion.abilityUnlockLevels?.length">
                  Abilities at Lv. {{ companion.abilityUnlockLevels.join(', ') }}
                </div>
                <div class="deck-info">
                  <span><strong>Common</strong> {{ companion.priceDecks.common.length }}</span>
                  <span><strong>Uncommon</strong> {{ companion.priceDecks.uncommon.length }}</span>
                  <span><strong>Rare</strong> {{ companion.priceDecks.rare.length }}</span>
                </div>
                <button class="select-button" (click)="choose(companion)">Select</button>
              </div>
            </app-card-frame>
          </div>
        </div>
      </ng-container>
      <ng-template #loading>
        <div class="loading">Loading companions...</div>
      </ng-template>
      <div class="actions">
        <button class="cancel-button" (click)="gameState.cancelCompanionSelection()">Cancel</button>
      </div>
    </section>
  `,
    styles: [
    `:host { display: block; padding: 16px; }
     .selection-screen { display: flex; flex-direction: column; gap: 16px; }
     .options { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
     .companion-card-wrap { width: 240px; }
     .selection-extra { display: flex; flex-direction: column; gap: 10px; }
     .deck-info { display: grid; gap: 4px; }
     .deck-info span { font-size: 0.88rem; color: #475569; }
     .select-button { width: 100%; padding: 10px 12px; border: none; border-radius: 10px; background: #4f8cff; color: white; cursor: pointer; font-weight: 700; transition: transform 0.15s ease, background 0.15s ease; }
     .select-button:hover { transform: translateY(-1px); background: #2f6fdd; }
     .cancel-button { padding: 10px 20px; border: none; border-radius: 10px; background: #777; color: white; cursor: pointer; }
     .cancel-button:hover { background: #555; }
     .loading { text-align: center; color: #556; }
     .unlock-schedule { font-size: 0.75rem; font-weight: 700; color: #64748b; text-align: center; padding: 2px 0; }
    `
  ]
})
export class CompanionSelectionComponent {
  constructor(public gameState: GameStateService) {}

  get currentOptions(): CompanionModel[] {
    return this.gameState.currentCompanionOptions;
  }

    choose(c: CompanionModel) { this.gameState.pickCompanion(c); }

  getCompanionSprite(companion: CompanionModel): string {
    return companion.sprite ? `url('${companion.sprite}')` : 'none';
  }

                companionCardData(companion: CompanionModel): CardFrameData {
    const maxHp     = companion.maxLife   ?? companion.life;
    const maxEnergy = companion.maxEnergy ?? companion.energyRefill ?? companion.energy;

    // Compute next unlock level
    const unlockLevels = companion.abilityUnlockLevels ?? [];
    const filledSlots  = companion.specialAbilities?.length ?? 0;
    const nextUnlock   = filledSlots < unlockLevels.length
      ? unlockLevels[filledSlots]
      : null;

    return {
      name:      companion.name,
      band:      companion.type,
      type:      'Companion',
      element:   companion.element,
      sprite:    companion.sprite,
      hp:        companion.life,
      maxHp,
      energy:    companion.energy,
      maxEnergy,
      level:     companion.level,
      exp:       companion.exp,
      nextLevelExp: companion.nextLevelExp,
      energyRefill: companion.energyRefill,
      abilities: (companion.specialAbilities ?? []).map(a => ({
        name: a.name,
        description: a.description,
        trigger: a.trigger,
        unlocked: true,
      })),
      nextUnlockLevel: nextUnlock,
    };
  }
}
