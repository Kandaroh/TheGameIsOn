import { Component } from '@angular/core';
import { GameStateService } from '../../shared/services/game-state.service';
import { CompanionModel } from '../../shared/models/companion.model';
import { CardFrameData } from '../../shared/components/card-frame/card-frame.component';

/** EXP required to reach each level (index = target level). */
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400];

@Component({
  selector: 'app-combat-results',
  template: `
    <div class="results-shell" *ngIf="state$ | async as state">
      <h1 class="results-title">Victory!</h1>

      <div class="results-body">

        <!-- LEFT: companions + EXP bars -->
        <div class="companions-panel">
          <div class="companion-result" *ngFor="let companion of state.companions">
            <app-card-frame variant="companion" [card]="companionCard(companion)">
            </app-card-frame>
            <div class="exp-section">
              <div class="exp-label">
                EXP&nbsp;<strong>{{ companion.exp }}</strong>
                / {{ nextThreshold(companion) }}
                &nbsp;(+{{ expShareFor(state) }})
              </div>
              <div class="exp-bar-track">
                <div class="exp-bar-fill"
                     [style.width.%]="expPercent(companion)">
                </div>
              </div>
              <div class="level-label">Lv {{ companion.level }}</div>
            </div>
          </div>
        </div>

        <!-- RIGHT: reward summary -->
        <div class="rewards-panel">
          <h2>Rewards</h2>

          <div class="reward-item" *ngIf="totalGold(state) > 0">
            <span class="reward-icon">💰</span>
            <span>Gold&nbsp;<strong>+{{ totalGold(state) }}</strong></span>
          </div>

          <div class="reward-item" *ngIf="totalExp(state) > 0">
            <span class="reward-icon">✨</span>
            <span>
              EXP&nbsp;<strong>+{{ totalExp(state) }}</strong>
              <span class="reward-sub">
                (÷{{ (state.companions?.length) || 3 }} companions)
              </span>
            </span>
          </div>

          <div class="reward-item"
               *ngIf="(state.battle?.pendingCardRewards?.length || 0) > 0">
            <span class="reward-icon">🃏</span>
            <span>Card reward pending…</span>
          </div>
        </div>

      </div>

      <div class="results-footer">
        <button class="continue-btn" (click)="continue()">Continue</button>
      </div>
    </div>
  `,
  styles: [`
    .results-shell {
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
    .results-title {
      font-size: 2.4rem;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #fbbf24;
      text-shadow: 0 2px 16px rgba(251,191,36,0.4);
      margin: 0;
    }
    .results-body {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 32px;
      width: 100%;
      max-width: 960px;
    }
    .companions-panel { display: flex; flex-direction: column; gap: 24px; }
    .companion-result { display: flex; flex-direction: column; gap: 8px; }
    .exp-section { padding: 0 4px; }
    .exp-label { font-size: 0.85rem; color: #cbd5e1; margin-bottom: 4px; }
    .exp-bar-track {
      height: 10px;
      border-radius: 99px;
      background: rgba(255,255,255,0.12);
      overflow: hidden;
    }
    .exp-bar-fill {
      height: 100%;
      border-radius: 99px;
      background: linear-gradient(90deg, #6366f1, #a78bfa);
      transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .level-label { font-size: 0.78rem; color: #94a3b8; margin-top: 2px; }
    .rewards-panel {
      background: rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .rewards-panel h2 { margin: 0; font-size: 1.3rem; color: #fbbf24; }
    .reward-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1rem;
    }
    .reward-icon { font-size: 1.4rem; }
    .reward-sub { font-size: 0.78rem; color: #94a3b8; margin-left: 4px; }
    .results-footer {
      width: 100%;
      max-width: 960px;
      display: flex;
      justify-content: flex-end;
    }
    .continue-btn {
      padding: 14px 40px;
      border: none;
      border-radius: 14px;
      background: #2563eb;
      color: white;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.04em;
    }
    .continue-btn:hover { background: #1d4ed8; }
  `]
})
export class CombatResultsComponent {
  state$ = this.gameState.state$;

  constructor(private gameState: GameStateService) {}

  continue() {
    this.gameState.proceedFromResults();
  }

  companionCard(companion: CompanionModel): CardFrameData {
    return {
      name:      companion.name,
      band:      companion.type,
      type:      'Companion',
      element:   companion.element,
      sprite:    companion.sprite,
      hp:        companion.life,
      maxHp:     companion.maxLife ?? companion.life,
      energy:    companion.energy,
      maxEnergy: companion.maxEnergy ?? companion.energy,
    };
  }

  nextThreshold(companion: CompanionModel): number {
    return LEVEL_THRESHOLDS[companion.level] ?? 9999;
  }

  expPercent(companion: CompanionModel): number {
    const prev  = LEVEL_THRESHOLDS[companion.level - 1] ?? 0;
    const next  = LEVEL_THRESHOLDS[companion.level]     ?? 9999;
    const range = next - prev;
    if (range <= 0) return 100;
    return Math.min(100, Math.round(((companion.exp - prev) / range) * 100));
  }

  /** Total gold collected from all defeated enemies. */
  totalGold(state: any): number {
    return (state.battle?.enemies ?? [])
      .filter((e: any) => e.life === 0)
      .flatMap((e: any) => e.rewards as any[])
      .filter((r: any) => r.type === 'gold')
      .reduce((sum: number, r: any) => sum + r.value, 0);
  }

  /** Total raw EXP (before companion split) from all defeated enemies. */
  totalExp(state: any): number {
    return (state.battle?.enemies ?? [])
      .filter((e: any) => e.life === 0)
      .flatMap((e: any) => e.rewards as any[])
      .filter((r: any) => r.type === 'exp')
      .reduce((sum: number, r: any) => sum + r.value, 0);
  }

  /** EXP share per companion (already applied server-side; shown for display). */
  expShareFor(state: any): number {
    const count = state.companions?.length || 3;
    return Math.floor(this.totalExp(state) / count);
  }
}
