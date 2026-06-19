import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardRewardComponent } from './card-reward.component';
import { CardFrameModule } from '../../shared/components/card-frame/card-frame.module';

@NgModule({
  declarations: [CardRewardComponent],
  imports: [CommonModule, CardFrameModule],
  exports: [CardRewardComponent],
})
export class CardRewardModule {}
