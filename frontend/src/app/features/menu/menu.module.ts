import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from './menu.component';
import { CompanionSelectionComponent } from './companion-selection.component';
import { CardFrameModule } from '../../shared/components/card-frame/card-frame.module';

@NgModule({
  declarations: [MenuComponent, CompanionSelectionComponent],
  imports: [CommonModule, CardFrameModule],
  exports: [MenuComponent, CompanionSelectionComponent]
})
export class MenuModule {}
