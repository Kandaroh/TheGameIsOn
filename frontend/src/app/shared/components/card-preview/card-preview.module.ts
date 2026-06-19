import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardPreviewComponent } from './card-preview.component';
import { CardFrameModule } from '../card-frame/card-frame.module';

@NgModule({
  declarations: [CardPreviewComponent],
  imports: [CommonModule, CardFrameModule],
  exports: [CardPreviewComponent],
})
export class CardPreviewModule {}
