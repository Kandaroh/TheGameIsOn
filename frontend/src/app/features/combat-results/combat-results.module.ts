import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CombatResultsComponent } from './combat-results.component';
import { CardFrameModule } from '../../shared/components/card-frame/card-frame.module';

@NgModule({
  declarations: [CombatResultsComponent],
  imports: [CommonModule, CardFrameModule],
  exports: [CombatResultsComponent],
})
export class CombatResultsModule {}
