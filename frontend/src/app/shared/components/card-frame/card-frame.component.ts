import { Component, Input } from '@angular/core';
import { CardElement } from '../../models/card.model';

export type CardFrameVariant = 'hand' | 'companion' | 'enemy' | 'selection';

export interface CardFrameData {
  name: string;
  /** Sub-type label shown in the band (e.g. 'Companion', 'Beast', 'attack') */
  band?: string;
  bandClass?: string;
  cost?: number;
  /** Card type used internally; also displayed in content area for playable cards */
  type?: string;
  element?: CardElement;
  description?: string;
  target?: string;
  targetNumber?: number | string;
  sprite?: string;
  /** For companion/enemy bars: current and max values */
  hp?: number;
  maxHp?: number;
  energy?: number;
  maxEnergy?: number;
  /** Extra stat rows rendered as label/value pairs below the description */
  stats?: { label: string; value: string | number }[];
  /** Normal effect text shown on the card face. */
  effect?: string;
  /** Enhanced effect text shown when the companion's type matches the card's type. */
  enhancedEffect?: string;
}

@Component({
  selector: 'app-card-frame',
  template: `
    <div class="card-frame" [ngClass]="[variantClass, bandClass]">

      <!-- TOP BAR: name (left) + element badge (centre) + cost gem (right) -->
      <div class="card-top-bar">
        <span class="card-name">{{ card.name }}</span>
        <span *ngIf="card.element" class="element-badge top-bar-element" [ngClass]="'elem-' + card.element">
          {{ elementIcon(card.element) }} {{ card.element | titlecase }}
        </span>
        <span class="card-cost" *ngIf="card.cost !== undefined">
          {{ card.cost }}<span class="mana-icon">✦</span>
        </span>
      </div>

      <!-- BAND / sub-type label (creature type for companions & enemies) -->
      <div class="card-band" *ngIf="card.band" [ngClass]="card.bandClass || ''">
        <span class="band-type-text">{{ card.band }}</span>
      </div>

      <!-- ART -->
      <div class="card-art"
           [class.sprite]="!!card.sprite"
           [ngStyle]="card.sprite ? { 'background-image': 'url(' + card.sprite + ')' } : {}">
      </div>

      <!-- DETAIL -->
      <div class="card-content">
        <!-- Playable cards: show type pill -->
        <div class="card-type-pill" *ngIf="card.type && !hasBarStats">
          <span class="type-pill" [ngClass]="'type-' + card.type">{{ card.type | titlecase }}</span>
        </div>

        <p class="card-description" *ngIf="card.description">{{ card.description }}</p>

        <!-- Effect block (playable cards only) -->
        <div class="card-effects" *ngIf="card.effect || card.enhancedEffect">
          <div class="card-effect normal-effect" *ngIf="card.effect">
            <span class="effect-icon">⚔</span>
            <span class="effect-text">{{ card.effect }}</span>
          </div>
          <div class="card-effect enhanced-effect" *ngIf="card.enhancedEffect">
            <span class="effect-icon">✨</span>
            <span class="effect-text">{{ card.enhancedEffect }}</span>
            <span class="enhanced-badge">Type Match</span>
          </div>
        </div>

        <!-- Playable cards: target -->
        <div class="card-target" *ngIf="card.target">
          <span class="target-icon">🎯</span>
          <span class="target-label">{{ friendlyTarget(card.target) }}</span>
          <span class="target-number" *ngIf="card.targetNumber !== undefined">
            &times;{{ card.targetNumber === 'ALL' ? 'ALL' : card.targetNumber }}
          </span>
        </div>

        <!-- Companion / Wild Monster: HP bar + energy tokens -->
        <ng-container *ngIf="card.hp !== undefined">
          <div class="stat-bar-row">
            <span class="stat-bar-label">❤️</span>
            <div class="stat-bar hp-bar">
              <div class="stat-bar-fill hp-fill"
                   [style.width.%]="hpPercent"
                   [ngClass]="hpColorClass"></div>
            </div>
            <span class="stat-bar-value">{{ card.hp }}<span *ngIf="card.maxHp !== undefined" class="stat-bar-max">/{{ card.maxHp }}</span></span>
          </div>
        </ng-container>

        <ng-container *ngIf="card.energy !== undefined">
          <div class="stat-bar-row">
            <span class="stat-bar-label">⚡</span>
            <div class="energy-tokens">
              <span *ngFor="let dot of energyDots; let i = index"
                    class="energy-token"
                    [class.filled]="i < card.energy!"
                    [style.transition-delay]="(i * 40) + 'ms'"></span>
            </div>
          </div>
        </ng-container>

        <!-- Legacy stats grid (fallback for callers that still pass stats) -->
        <div class="stats-grid" *ngIf="!hasBarStats && card.stats?.length">
          <div *ngFor="let stat of card.stats">
            <span>{{ stat.label }}</span><strong>{{ stat.value }}</strong>
          </div>
        </div>

        <ng-content></ng-content>
      </div>

    </div>
  `,
  styles: [`
    /* ── Layout ──────────────────────────────────────────── */
    .card-frame {
      border-radius: 22px;
      background: linear-gradient(180deg, #fefefe 0%, #eaf2ff 100%);
      border: 1px solid #cbd5e1;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ── Top bar ─────────────────────────────────────────── */
    .card-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px 8px;
      background: #1e3a8a;
      gap: 6px;
    }

    .card-name {
      font-size: 0.88rem;
      font-weight: 800;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .top-bar-element {
      flex-shrink: 0;
    }

    .card-cost {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.95rem;
      font-weight: 900;
      color: #fbbf24;
      margin-left: 4px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .mana-icon {
      font-size: 0.75rem;
      opacity: 0.85;
    }

    /* ── Band ────────────────────────────────────────────── */
    .card-band {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.68rem;
      background: #1e3a8a;
      color: rgba(255,255,255,0.75);
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .band-type-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Element badge ───────────────────────────────────── */
    .element-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 0.67rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: capitalize;
      white-space: nowrap;
      border: 1.5px solid rgba(255,255,255,0.25);
      background: rgba(0,0,0,0.32);
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    }

    /* element colour accents */
    .elem-fire    { background: rgba(239, 68, 68, 0.55);  border-color: #f87171; }
    .elem-water   { background: rgba(59, 130, 246, 0.55); border-color: #60a5fa; }
    .elem-earth   { background: rgba(101, 85, 36, 0.65);  border-color: #a16207; }
    .elem-air     { background: rgba(167, 243, 208, 0.35);border-color: #6ee7b7; color: #d1fae5; }
    .elem-arcane  { background: rgba(139, 92, 246, 0.55); border-color: #a78bfa; }
    .elem-shadow  { background: rgba(30, 27, 75, 0.75);   border-color: #818cf8; }
    .elem-light   { background: rgba(251, 191, 36, 0.45); border-color: #fde68a; color: #1e293b; }
    .elem-neutral { background: rgba(100, 116, 139, 0.45);border-color: #94a3b8; }

    /* ── Variant colour overrides for band ───────────────── */
    .variant-enemy   .card-top-bar,
    .variant-enemy   .card-band  { background: #111827; }
    .variant-companion .card-top-bar,
    .variant-companion .card-band { background: #2563eb; }
    .variant-selection .card-top-bar,
    .variant-selection .card-band { background: #2563eb; }

    /* ── Art ─────────────────────────────────────────────── */
    .card-art {
      min-height: 120px;
      background-color: #cbd5e1;
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-art::before {
      content: '\\2605';
      opacity: 0.12;
      font-size: 4rem;
    }
    .card-art.sprite { color: #334155; font-size: 0.9rem; }

    /* ── Content ─────────────────────────────────────────── */
    .card-content {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    /* ── Card type pill (playable cards) ─────────────────── */
    .card-type-pill {
      display: flex;
    }
    .type-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 0.70rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: capitalize;
      border: 1.5px solid;
    }
    .type-attack  { background: rgba(239,68,68,0.10);  border-color: #f87171; color: #b91c1c; }
    .type-defense { background: rgba(37,99,235,0.10);  border-color: #60a5fa; color: #1d4ed8; }
    .type-utility { background: rgba(139,92,246,0.10); border-color: #a78bfa; color: #6d28d9; }

    .card-description {
      margin: 0;
      font-size: 0.88rem;
      color: #1e293b;
      line-height: 1.4;
    }

    /* ── Effect block (playable cards) ────────────────────── */
    .card-effects {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .card-effect {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      border-radius: 8px;
      padding: 5px 8px;
      font-size: 0.80rem;
      line-height: 1.35;
    }
    .normal-effect {
      background: rgba(37, 99, 235, 0.07);
      border: 1px solid rgba(37, 99, 235, 0.18);
    }
    .enhanced-effect {
      background: rgba(234, 179, 8, 0.10);
      border: 1px solid rgba(234, 179, 8, 0.35);
    }
    .effect-icon {
      flex-shrink: 0;
      font-size: 0.85rem;
      margin-top: 1px;
    }
    .effect-text {
      flex: 1;
      color: #1e293b;
    }
    .enhanced-badge {
      flex-shrink: 0;
      align-self: center;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(234, 179, 8, 0.20);
      color: #92400e;
      border: 1px solid rgba(234, 179, 8, 0.45);
      border-radius: 20px;
      padding: 1px 6px;
    }

    /* ── Target row (playable cards) ─────────────────────── */
    .card-target {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      background: rgba(37, 99, 235, 0.08);
      border: 1px solid rgba(37, 99, 235, 0.18);
      border-radius: 8px;
      padding: 4px 8px;
    }
    .target-icon { font-size: 0.85rem; }
    .target-label {
      font-weight: 700;
      color: #1e40af;
      text-transform: capitalize;
    }
    .target-number {
      margin-left: auto;
      font-weight: 800;
      color: #2563eb;
      font-size: 0.82rem;
    }

    /* ── HP bar ──────────────────────────────────────────── */
    .stat-bar-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stat-bar-label { font-size: 0.9rem; flex-shrink: 0; }
    .stat-bar-value {
      font-size: 0.75rem;
      font-weight: 700;
      color: #334155;
      white-space: nowrap;
      flex-shrink: 0;
      min-width: 28px;
      text-align: right;
    }
    .stat-bar-max {
      font-weight: 400;
      opacity: 0.6;
    }
    .stat-bar {
      flex: 1;
      height: 8px;
      border-radius: 99px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .stat-bar-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .hp-fill {
      background: linear-gradient(90deg, #22c55e, #4ade80);
    }
    .hp-fill.hp-warn {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
    .hp-fill.hp-danger {
      background: linear-gradient(90deg, #ef4444, #f97316);
    }

    /* ── Energy tokens ───────────────────────────────────── */
    .energy-tokens {
      display: flex;
      gap: 5px;
      flex: 1;
      flex-wrap: wrap;
      align-items: center;
    }
    .energy-token {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background: #e2e8f0;
      border: 1.5px solid #94a3b8;
      transition: background 0.25s ease, border-color 0.25s ease,
                  box-shadow 0.25s ease, transform 0.2s ease;
      flex-shrink: 0;
    }
    .energy-token.filled {
      background: linear-gradient(135deg, #facc15, #f59e0b);
      border-color: #d97706;
      box-shadow: 0 0 6px rgba(245, 158, 11, 0.55),
                  inset 0 1px 0 rgba(255,255,255,0.3);
      transform: scale(1.08);
    }

    /* ── Legacy stats grid (fallback) ────────────────────── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .stats-grid span {
      display: block;
      color: #64748b;
      font-size: 0.82rem;
    }
    .stats-grid strong {
      display: block;
      font-size: 0.95rem;
    }
  `]
})
export class CardFrameComponent {
  @Input() card!: CardFrameData;
  @Input() variant: CardFrameVariant = 'hand';

  get variantClass(): string {
    return `variant-${this.variant}`;
  }

  get bandClass(): string {
    return this.card?.bandClass ?? '';
  }

  /** True when the card has bar-style stats (hp/energy), suppresses legacy stats-grid */
  get hasBarStats(): boolean {
    return this.card?.hp !== undefined || this.card?.energy !== undefined;
  }

  /** HP percentage 0–100 for the bar fill */
  get hpPercent(): number {
    if (this.card.hp === undefined) return 0;
    const max = this.card.maxHp ?? this.card.hp;
    return max > 0 ? Math.round((this.card.hp / max) * 100) : 0;
  }

  /** CSS class for HP bar colour: green / yellow / red by threshold */
  get hpColorClass(): string {
    const pct = this.hpPercent;
    if (pct <= 25) return 'hp-danger';
    if (pct <= 50) return 'hp-warn';
    return '';
  }

  /** Array of dot slots for energy display */
  get energyDots(): number[] {
    const max = this.card.maxEnergy ?? this.card.energy ?? 0;
    return Array.from({ length: max as number }, (_, i) => i);
  }

  /** Map CardElement to an emoji icon */
  elementIcon(element: string): string {
    const icons: Record<string, string> = {
      fire: '🔥', water: '💧', earth: '🌿',
      air: '💨', arcane: '✨', shadow: '🌑',
      light: '☀️', neutral: '⚪'
    };
    return icons[element] ?? '❓';
  }

  /** Human-readable target label */
  friendlyTarget(target: string): string {
    const labels: Record<string, string> = {
      companion: 'Companion',
      wildMonster: 'Wild Monster',
      deck: 'Deck',
      discard: 'Discard'
    };
    return labels[target] ?? target;
  }
}
