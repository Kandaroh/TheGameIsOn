import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EnemyTurnAction } from '../../shared/models/battle-state.model';

@Component({
  selector: 'app-attack-result-popup',
  template: `
    <div class="popup-backdrop" (click)="dismiss.emit()">
      <div class="popup-panel" (click)="$event.stopPropagation()">
        <h3 class="popup-title">Enemy Actions &mdash; Turn {{ turn }}</h3>

        <div class="popup-body">
          <div class="action-row" *ngFor="let action of actions">
            <span class="enemy-name">{{ action.enemyName }}</span>
            <span class="arrow">&rarr;</span>
            <span class="attack-name">{{ action.attackName }}</span>
            <span class="arrow">&rarr;</span>
            <span class="target-name">{{ action.targetName }}</span>
            <span
              class="damage-badge"
              [class.heal]="action.damageDealt < 0"
            >
              {{ action.damageDealt >= 0 ? '−' : '+' }}{{ abs(action.damageDealt) }} HP
            </span>
            <span class="killed-badge" *ngIf="action.killedTarget" title="Killed!">&#x1F480;</span>
          </div>

          <div class="no-actions" *ngIf="actions.length === 0">
            No enemy actions this turn.
          </div>
        </div>

        <div class="popup-footer">
          <button class="continue-btn" (click)="dismiss.emit()">Continue</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .popup-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }

      .popup-panel {
        width: min(480px, calc(100% - 32px));
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
        overflow: hidden;
      }

      .popup-title {
        margin: 0;
        padding: 16px 24px;
        font-size: 1.1rem;
        font-weight: 700;
        color: #1e293b;
        background: #f1f5f9;
        border-bottom: 1px solid #e2e8f0;
      }

      .popup-body {
        padding: 16px 24px;
        max-height: 340px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .action-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 10px;
        background: #f8fafc;
        font-size: 0.9rem;
      }

      .enemy-name {
        font-weight: 700;
        color: #b91c1c;
        min-width: 80px;
      }

      .arrow {
        color: #94a3b8;
        font-size: 1rem;
      }

      .attack-name {
        font-weight: 600;
        color: #475569;
      }

      .target-name {
        font-weight: 600;
        color: #1d4ed8;
      }

      .damage-badge {
        margin-left: auto;
        background: rgba(239, 68, 68, 0.12);
        color: #b91c1c;
        font-weight: 800;
        font-size: 0.82rem;
        padding: 2px 10px;
        border-radius: 20px;
        border: 1px solid #f87171;
        white-space: nowrap;
      }

      .damage-badge.heal {
        background: rgba(34, 197, 94, 0.12);
        color: #15803d;
        border-color: #4ade80;
      }

      .killed-badge {
        font-size: 1.1rem;
        margin-left: 4px;
      }

      .no-actions {
        text-align: center;
        color: #94a3b8;
        padding: 24px 0;
        font-size: 0.9rem;
      }

      .popup-footer {
        padding: 12px 24px 16px;
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid #e2e8f0;
      }

      .continue-btn {
        padding: 10px 28px;
        border: none;
        border-radius: 12px;
        background: #2563eb;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.92rem;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .continue-btn:hover {
        background: #1d4ed8;
      }
    `,
  ],
})
export class AttackResultPopupComponent {
  @Input() actions: EnemyTurnAction[] = [];
  @Input() turn = 0;
  @Output() dismiss = new EventEmitter<void>();

  abs(value: number): number {
    return Math.abs(value);
  }
}
