import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CardFrameData } from '../card-frame/card-frame.component';

export interface CardPreviewState {
  card: CardFrameData;
  x: number;
  y: number;
}

@Injectable({ providedIn: 'root' })
export class CardPreviewService {
  private _preview$ = new BehaviorSubject<CardPreviewState | null>(null);
  preview$ = this._preview$.asObservable();

  show(card: CardFrameData, x: number, y: number): void {
    this._preview$.next({ card, x, y });
  }

  hide(): void {
    this._preview$.next(null);
  }
}
