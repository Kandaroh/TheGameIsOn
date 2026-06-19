import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BattleComponent } from './battle.component';
import { AttackResultPopupComponent } from './attack-result-popup.component';
import { AbilityChoicePopupComponent } from './ability-choice-popup.component';
import { CardFrameModule } from '../../shared/components/card-frame/card-frame.module';

@NgModule({
  declarations: [BattleComponent, AttackResultPopupComponent, AbilityChoicePopupComponent],
  imports: [CommonModule, CardFrameModule],
  exports: [BattleComponent, AbilityChoicePopupComponent]
})
export class BattleModule {}
