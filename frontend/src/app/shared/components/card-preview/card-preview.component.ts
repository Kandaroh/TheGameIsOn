import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CardPreviewService, CardPreviewState } from './card-preview.service';
import { CardFrameData } from '../card-frame/card-frame.component';

@Component({
  selector: 'app-card-preview',
  template: `
    <div class="card-preview-overlay"
         *ngIf="state"
         [style.top.px]="posY"
         [style.left.px]="posX">
      <app-card-frame variant="selection" [card]="state.card"></app-card-frame>
    </div>
  `,
  styles: [`
    .card-preview-overlay {
      position: fixed;
      z-index: 9999;
      width: 300px;
      pointer-events: none;
      filter: drop-shadow(0 12px 32px rgba(0,0,0,0.35));
      transition: opacity 0.12s ease;
    }
  `]
})
export class CardPreviewComponent implements OnInit, OnDestroy {
  state: CardPreviewState | null = null;
  posX = 0;
  posY = 0;

  private sub!: Subscription;

  private readonly CARD_WIDTH = 300;
  private readonly CARD_HEIGHT = 440;
  private readonly OFFSET = 18;

  constructor(private previewService: CardPreviewService) {}

  ngOnInit(): void {
    this.sub = this.previewService.preview$.subscribe(s => {
      this.state = s;
      if (s) {
        this.computePosition(s.x, s.y);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private computePosition(mx: number, my: number): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: prefer right of cursor; flip to left if it would overflow
    if (mx + this.OFFSET + this.CARD_WIDTH > vw) {
      this.posX = mx - this.CARD_WIDTH - this.OFFSET;
    } else {
      this.posX = mx + this.OFFSET;
    }

    // Vertical: centre on cursor, clamp to viewport
    let top = my - this.CARD_HEIGHT / 2;
    if (top < 8) top = 8;
    if (top + this.CARD_HEIGHT > vh - 8) top = vh - this.CARD_HEIGHT - 8;
    this.posY = top;
  }
}
