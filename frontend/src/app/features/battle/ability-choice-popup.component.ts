import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PendingAbilityChoice } from '../../shared/models/game-state.model';
import { SpecialAbility } from '../../shared/models/companion.model';

@Component({
  selector: 'app-ability-choice-popup',
  template: `
    <div class="ability-popup-backdrop" *ngIf="choice">
      <div class="ability-popup">
        <h2 class="popup-title">{{ choice.companionName }} — New Ability!</h2>
        <p class="popup-subtitle">Choose one ability to learn (slot {{ choice.unlockIndex + 1 }}/3):</p>
        <div class="ability-options">
          <div class="ability-option" *ngFor="let ab of choice.options"
               (click)="pick(ab)">
            <span class="ab-trigger-icon">{{ ab.trigger === 'passive' ? '🔵' : '🟡' }}</span>
            <div class="ab-info">
              <span class="ab-name">{{ ab.name }}</span>
              <span class="ab-desc">{{ ab.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ability-popup-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      z-index: 300;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ability-popup {
      background: #ffffff;
      border-radius: 20px;
      padding: 28px 24px;
      width: min(480px, calc(100% - 32px));
      box-shadow: 0 24px 64px rgba(0,0,0,0.35);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .popup-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      color: #1e293b;
      text-align: center;
    }
    .popup-subtitle {
      margin: 0;
      font-size: 0.82rem;
      color: #64748b;
      text-align: center;
    }
    .ability-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ability-option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, transform 0.12s;
      background: #f8fafc;
    }
    .ability-option:hover {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.06);
      transform: translateY(-2px);
    }
    .ab-trigger-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .ab-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .ab-name {
      font-size: 0.92rem;
      font-weight: 700;
      color: #312e81;
    }
    .ab-desc {
      font-size: 0.8rem;
      color: #475569;
      line-height: 1.35;
    }
  `]
})
export class AbilityChoicePopupComponent {
  @Input() choice!: PendingAbilityChoice;
  @Output() chosen = new EventEmitter<{ companionId: string; abilityId: string }>();

  pick(ability: SpecialAbility): void {
    this.chosen.emit({ companionId: this.choice.companionId, abilityId: ability.id });
  }
}
