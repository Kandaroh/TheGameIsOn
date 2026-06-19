import { Component } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { CardPreviewService } from '../card-preview/card-preview.service';
import { CardFrameData } from '../card-frame/card-frame.component';
import { CardModel } from '../../models/card.model';
import { CompanionModel } from '../../models/companion.model';
import { GameStateModel } from '../../models/game-state.model';

/** Element → emoji mapping (mirrors CardFrameComponent.elementIcon). */
const ELEMENT_ICONS: Record<string, string> = {
  fire: '🔥', water: '💧', earth: '🌿',
  air: '💨', arcane: '✨', shadow: '🌑',
  light: '☀️', neutral: '⚪',
};

@Component({
  selector: 'app-player-info-panel',
  template: `
    <ng-container *ngIf="gameState.playerInfoOpen$ | async">
      <div class="pip-backdrop" (click)="close()"></div>

      <div class="pip-panel" *ngIf="gameState.state$ | async as state">
        <!-- Header -->
        <div class="pip-header">
          <h2 class="pip-title">Player Info</h2>
          <button class="pip-close" (click)="close()">&times;</button>
        </div>

        <!-- Tabs -->
        <div class="pip-tabs">
          <button class="pip-tab" [class.active]="activeTab === 'deck'"
                  (click)="activeTab = 'deck'">Deck</button>
          <button class="pip-tab" [class.active]="activeTab === 'companions'"
                  (click)="activeTab = 'companions'">Companions</button>
        </div>

        <!-- ============ Deck Tab ============ -->
        <div class="pip-body" *ngIf="activeTab === 'deck'">
          <ng-container *ngIf="deckCards(state) as cards">
            <p class="pip-empty" *ngIf="cards.length === 0">Your deck is empty.</p>

            <!-- In deck -->
            <div class="pip-section-label" *ngIf="inDeckCards(state).length">
              In Deck ({{ inDeckCards(state).length }})
            </div>
            <div class="pip-card-row"
                 *ngFor="let card of inDeckCards(state)"
                 (mouseenter)="showCardPreview($event, card)"
                 (mouseleave)="hidePreview()">
              <span class="pcr-name">{{ card.name }}</span>
              <span class="pcr-type" [ngClass]="'pcr-type-' + card.type">{{ card.type }}</span>
              <span class="pcr-elem" *ngIf="card.element" [ngClass]="'pcr-elem-' + card.element">
                {{ elementIcon(card.element) }} {{ card.element }}
              </span>
              <span class="pcr-cost">{{ card.cost }}<span class="pcr-mana">✦</span></span>
            </div>

            <!-- In discard -->
            <ng-container *ngIf="inDiscardCards(state).length">
              <div class="pip-section-label dimmed">
                In Discard ({{ inDiscardCards(state).length }})
              </div>
              <div class="pip-card-row dimmed"
                   *ngFor="let card of inDiscardCards(state)"
                   (mouseenter)="showCardPreview($event, card)"
                   (mouseleave)="hidePreview()">
                <span class="pcr-name">{{ card.name }}</span>
                <span class="pcr-type" [ngClass]="'pcr-type-' + card.type">{{ card.type }}</span>
                <span class="pcr-elem" *ngIf="card.element" [ngClass]="'pcr-elem-' + card.element">
                  {{ elementIcon(card.element) }} {{ card.element }}
                </span>
                <span class="pcr-cost">{{ card.cost }}<span class="pcr-mana">✦</span></span>
              </div>
            </ng-container>

            <!-- In hand -->
            <ng-container *ngIf="inHandCards(state).length">
              <div class="pip-section-label dimmed">
                In Hand ({{ inHandCards(state).length }})
              </div>
              <div class="pip-card-row dimmed"
                   *ngFor="let card of inHandCards(state)"
                   (mouseenter)="showCardPreview($event, card)"
                   (mouseleave)="hidePreview()">
                <span class="pcr-name">{{ card.name }}</span>
                <span class="pcr-type" [ngClass]="'pcr-type-' + card.type">{{ card.type }}</span>
                <span class="pcr-elem" *ngIf="card.element" [ngClass]="'pcr-elem-' + card.element">
                  {{ elementIcon(card.element) }} {{ card.element }}
                </span>
                <span class="pcr-cost">{{ card.cost }}<span class="pcr-mana">✦</span></span>
              </div>
            </ng-container>
          </ng-container>
        </div>

        <!-- ============ Companions Tab ============ -->
        <div class="pip-body" *ngIf="activeTab === 'companions'">
          <p class="pip-empty" *ngIf="!state.companions?.length">No companions.</p>

          <div class="comp-card" *ngFor="let c of state.companions || []">
            <!-- Name + badges -->
            <div class="comp-header">
              <span class="comp-name">{{ c.name }}</span>
              <span class="comp-type-badge" [ngClass]="'comp-type-' + c.type">{{ c.type }}</span>
              <span class="comp-elem-badge" *ngIf="c.element" [ngClass]="'comp-elem-' + c.element">
                {{ elementIcon(c.element) }} {{ c.element }}
              </span>
            </div>

            <!-- Level + EXP -->
            <div class="comp-level-row">
              <span class="comp-level">Lv. {{ c.level }}</span>
              <div class="comp-exp-bar-wrap">
                <div class="comp-exp-bar">
                  <div class="comp-exp-fill" [style.width.%]="expPercent(c)"></div>
                </div>
                <span class="comp-exp-label">{{ c.exp }} / {{ c.nextLevelExp ?? 100 }} EXP</span>
              </div>
            </div>

            <!-- HP bar -->
            <div class="comp-stat-row">
              <span class="comp-stat-icon">❤️</span>
              <div class="comp-bar hp-bar">
                <div class="comp-bar-fill hp-fill" [style.width.%]="hpPercent(c)"
                     [ngClass]="hpColorClass(c)"></div>
              </div>
              <span class="comp-stat-val">{{ c.life }} / {{ c.maxLife ?? c.life }}</span>
            </div>

            <!-- Energy tokens -->
            <div class="comp-stat-row">
              <span class="comp-stat-icon">⚡</span>
              <div class="comp-energy-tokens">
                <span *ngFor="let dot of energyDots(c); let i = index"
                      class="comp-energy-dot"
                      [class.filled]="i < c.energy"></span>
              </div>
              <span class="comp-stat-val">{{ c.energy }} / {{ c.maxEnergy ?? c.energy }}</span>
            </div>

            <!-- Special Abilities -->
            <div class="comp-abilities" *ngIf="c.specialAbilities?.length">
              <div class="comp-ability-title">Abilities</div>
              <div class="comp-ability" *ngFor="let ab of c.specialAbilities">
                <span class="ab-name" [title]="ab.description">{{ ab.name }}</span>
                <span class="ab-trigger">{{ ab.trigger }}</span>
                <span class="ab-desc" [title]="ab.description">{{ ab.description }}</span>
              </div>
            </div>
            <div class="comp-next-unlock" *ngIf="nextUnlockLevel(c) as lvl">
              Next ability at Lv. {{ lvl }}
            </div>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    /* ── Backdrop ────────────────────────────────────────── */
    .pip-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      z-index: 200;
    }

    /* ── Panel ───────────────────────────────────────────── */
    .pip-panel {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 210;
      width: min(680px, calc(100% - 32px));
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }

    /* ── Header ──────────────────────────────────────────── */
    .pip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px;
      background: #1e3a8a;
      color: #fff;
    }
    .pip-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
    }
    .pip-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
      opacity: 0.7;
      transition: opacity 0.15s;
    }
    .pip-close:hover { opacity: 1; }

    /* ── Tabs ────────────────────────────────────────────── */
    .pip-tabs {
      display: flex;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
    }
    .pip-tab {
      flex: 1;
      padding: 10px 0;
      border: none;
      background: transparent;
      font-size: 0.85rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      transition: color 0.15s, box-shadow 0.15s;
    }
    .pip-tab.active {
      color: #1e3a8a;
      box-shadow: inset 0 -3px 0 #2563eb;
    }
    .pip-tab:hover:not(.active) { color: #334155; }

    /* ── Body (scrollable) ───────────────────────────────── */
    .pip-body {
      padding: 16px 20px 20px;
      overflow-y: auto;
      flex: 1;
    }
    .pip-empty {
      color: #94a3b8;
      font-size: 0.9rem;
      text-align: center;
      padding: 24px 0;
    }

    /* ── Deck tab — section labels ────────────────────────── */
    .pip-section-label {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #475569;
      margin: 14px 0 6px;
    }
    .pip-section-label.dimmed { color: #94a3b8; }

    /* ── Deck tab — card rows ─────────────────────────────── */
    .pip-card-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 8px;
      cursor: default;
      transition: background 0.12s;
    }
    .pip-card-row:hover { background: #f1f5f9; }
    .pip-card-row.dimmed { opacity: 0.55; }
    .pip-card-row.dimmed:hover { opacity: 0.8; }

    .pcr-name {
      flex: 1;
      font-weight: 600;
      font-size: 0.88rem;
      color: #1e293b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pcr-type {
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      color: #64748b;
      background: #f8fafc;
    }
    .pcr-type-attack  { color: #b91c1c; border-color: #f87171; }
    .pcr-type-defense { color: #1d4ed8; border-color: #60a5fa; }
    .pcr-type-utility { color: #6d28d9; border-color: #a78bfa; }

    .pcr-elem {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: capitalize;
      padding: 2px 8px;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      background: #e2e8f0;
      color: #475569;
      white-space: nowrap;
    }
    .pcr-elem-fire    { background: rgba(239,68,68,0.12); color: #b91c1c; border-color: #f87171; }
    .pcr-elem-water   { background: rgba(59,130,246,0.12); color: #1d4ed8; border-color: #60a5fa; }
    .pcr-elem-earth   { background: rgba(101,85,36,0.12); color: #a16207; border-color: #a16207; }
    .pcr-elem-air     { background: rgba(110,231,183,0.12); color: #047857; border-color: #6ee7b7; }
    .pcr-elem-arcane  { background: rgba(139,92,246,0.12); color: #6d28d9; border-color: #a78bfa; }
    .pcr-elem-shadow  { background: rgba(30,27,75,0.18); color: #312e81; border-color: #818cf8; }
    .pcr-elem-light   { background: rgba(251,191,36,0.15); color: #92400e; border-color: #fde68a; }
    .pcr-elem-neutral { background: rgba(100,116,139,0.12); color: #475569; border-color: #94a3b8; }

    .pcr-cost {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 0.85rem;
      font-weight: 900;
      color: #d97706;
    }
    .pcr-mana { font-size: 0.7rem; opacity: 0.8; }

    /* ── Companions tab — card panels ─────────────────────── */
    .comp-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 14px;
      background: #f8fafc;
    }
    .comp-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .comp-name {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      flex: 1;
    }
    .comp-type-badge {
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 8px;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      color: #64748b;
      background: #fff;
    }
    .comp-type-attack  { color: #b91c1c; border-color: #f87171; }
    .comp-type-defense { color: #1d4ed8; border-color: #60a5fa; }
    .comp-type-utility { color: #6d28d9; border-color: #a78bfa; }

    .comp-elem-badge {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: capitalize;
      padding: 2px 8px;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      background: #e2e8f0;
      color: #475569;
      white-space: nowrap;
    }
    .comp-elem-fire    { background: rgba(239,68,68,0.12); color: #b91c1c; border-color: #f87171; }
    .comp-elem-water   { background: rgba(59,130,246,0.12); color: #1d4ed8; border-color: #60a5fa; }
    .comp-elem-earth   { background: rgba(101,85,36,0.12); color: #a16207; border-color: #a16207; }
    .comp-elem-air     { background: rgba(110,231,183,0.12); color: #047857; border-color: #6ee7b7; }
    .comp-elem-arcane  { background: rgba(139,92,246,0.12); color: #6d28d9; border-color: #a78bfa; }
    .comp-elem-shadow  { background: rgba(30,27,75,0.18); color: #312e81; border-color: #818cf8; }
    .comp-elem-light   { background: rgba(251,191,36,0.15); color: #92400e; border-color: #fde68a; }
    .comp-elem-neutral { background: rgba(100,116,139,0.12); color: #475569; border-color: #94a3b8; }

    /* Level + EXP */
    .comp-level-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .comp-level {
      font-size: 0.8rem;
      font-weight: 800;
      color: #1e3a8a;
      white-space: nowrap;
    }
    .comp-exp-bar-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .comp-exp-bar {
      flex: 1;
      height: 7px;
      border-radius: 99px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .comp-exp-fill {
      height: 100%;
      border-radius: 99px;
      background: linear-gradient(90deg, #6366f1, #818cf8);
      transition: width 0.3s ease;
    }
    .comp-exp-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: #64748b;
      white-space: nowrap;
    }

    /* HP bar */
    .comp-stat-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .comp-stat-icon { font-size: 0.85rem; flex-shrink: 0; }
    .comp-stat-val {
      font-size: 0.72rem;
      font-weight: 700;
      color: #334155;
      white-space: nowrap;
      min-width: 48px;
      text-align: right;
    }
    .comp-bar {
      flex: 1;
      height: 8px;
      border-radius: 99px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .comp-bar-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.35s ease;
    }
    .hp-fill { background: linear-gradient(90deg, #22c55e, #4ade80); }
    .hp-fill.hp-warn { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .hp-fill.hp-danger { background: linear-gradient(90deg, #ef4444, #f97316); }

    /* Energy tokens */
    .comp-energy-tokens {
      display: flex;
      gap: 4px;
      flex: 1;
      flex-wrap: wrap;
      align-items: center;
    }
    .comp-energy-dot {
      width: 13px;
      height: 13px;
      border-radius: 3px;
      background: #e2e8f0;
      border: 1.5px solid #94a3b8;
      flex-shrink: 0;
    }
    .comp-energy-dot.filled {
      background: linear-gradient(135deg, #facc15, #f59e0b);
      border-color: #d97706;
      box-shadow: 0 0 5px rgba(245, 158, 11, 0.5);
    }

    /* Special Abilities */
    .comp-abilities {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
    }
    .comp-ability-title {
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      margin-bottom: 6px;
    }
    .comp-ability {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      font-size: 0.78rem;
    }
    .ab-name {
      font-weight: 700;
      color: #1e293b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 140px;
      cursor: help;
    }
    .ab-trigger {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 20px;
      background: #e2e8f0;
      color: #64748b;
    }
    .ab-unlock {
      font-size: 0.65rem;
      font-weight: 600;
      color: #94a3b8;
    }
    .ab-desc {
      flex: 1;
      color: #475569;
      font-size: 0.76rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: help;
    }

    /* Next unlock label */
    .comp-next-unlock {
      font-size: 0.68rem;
      font-weight: 700;
      color: #94a3b8;
      font-style: italic;
      padding: 4px 0 0;
    }
  `]
})
export class PlayerInfoPanelComponent {
  activeTab: 'deck' | 'companions' = 'deck';

  constructor(
    public gameState: GameStateService,
    private cardPreview: CardPreviewService,
  ) {}

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  close(): void {
    this.hidePreview();
    this.gameState.closePlayerInfo();
  }

  // ---------------------------------------------------------------------------
  // Deck helpers
  // ---------------------------------------------------------------------------

  /** All cards owned by the player (deck + hand + discard). */
  deckCards(state: GameStateModel): CardModel[] {
    const allIds = [
      ...state.player.deck.cardIds,
      ...state.player.hand,
      ...state.player.discard,
    ];
    const unique = [...new Set(allIds)];
    return unique
      .map(id => state.cards.find(c => c.id === id))
      .filter((c): c is CardModel => !!c);
  }

  /** Cards currently in the draw pile. */
  inDeckCards(state: GameStateModel): CardModel[] {
    return state.player.deck.cardIds
      .map(id => state.cards.find(c => c.id === id))
      .filter((c): c is CardModel => !!c);
  }

  /** Cards currently in the discard pile. */
  inDiscardCards(state: GameStateModel): CardModel[] {
    return state.player.discard
      .map(id => state.cards.find(c => c.id === id))
      .filter((c): c is CardModel => !!c);
  }

  /** Cards currently in hand. */
  inHandCards(state: GameStateModel): CardModel[] {
    return state.player.hand
      .map(id => state.cards.find(c => c.id === id))
      .filter((c): c is CardModel => !!c);
  }

  // ---------------------------------------------------------------------------
  // Card preview hover
  // ---------------------------------------------------------------------------

  showCardPreview(event: MouseEvent, card: CardModel): void {
    const data: CardFrameData = {
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
    this.cardPreview.show(data, event.clientX, event.clientY);
  }

  hidePreview(): void {
    this.cardPreview.hide();
  }

  // ---------------------------------------------------------------------------
  // Companion helpers
  // ---------------------------------------------------------------------------

  elementIcon(element: string): string {
    return ELEMENT_ICONS[element] ?? '❓';
  }

  /**
   * EXP progress percentage — reads `nextLevelExp` provided by the backend.
   * No leveling formula lives on the frontend.
   */
  expPercent(c: CompanionModel): number {
    const needed = c.nextLevelExp ?? 100;
    return needed > 0 ? Math.min(100, Math.round((c.exp / needed) * 100)) : 0;
  }

  hpPercent(c: CompanionModel): number {
    const max = c.maxLife ?? c.life;
    return max > 0 ? Math.round((c.life / max) * 100) : 0;
  }

  hpColorClass(c: CompanionModel): string {
    const pct = this.hpPercent(c);
    if (pct <= 25) return 'hp-danger';
    if (pct <= 50) return 'hp-warn';
    return '';
  }

  energyDots(c: CompanionModel): number[] {
    const max = c.maxEnergy ?? c.energy;
    return Array.from({ length: max }, (_, i) => i);
  }

  /** Returns the level at which the next ability slot unlocks, or null if all slots are filled. */
  nextUnlockLevel(c: CompanionModel): number | null {
    const levels = c.abilityUnlockLevels ?? [];
    const filled = c.specialAbilities?.length ?? 0;
    return filled < levels.length ? levels[filled] : null;
  }
}
