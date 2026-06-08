import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BattleComponent } from './battle.component';
import { CardFrameModule } from '../../shared/components/card-frame/card-frame.module';

@NgModule({
  declarations: [BattleComponent],
  imports: [CommonModule, CardFrameModule],
  exports: [BattleComponent]
})
export class BattleModule {}
