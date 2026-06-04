import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { MenuModule } from './features/menu/menu.module';
import { MapModule } from './features/map/map.module';
import { BattleModule } from './features/battle/battle.module';
import { RestComponent } from './features/events/rest/rest.component';
import { HardBattleComponent } from './features/events/hard-battle/hard-battle.component';
import { NewObjectComponent } from './features/events/new-object/new-object.component';
import { PowerUpComponent } from './features/events/power-up/power-up.component';
import { EndComponent } from './features/events/end/end.component';
import { EventMapComponent } from './shared/components/event-map/event-map.component';

@NgModule({
  declarations: [AppComponent, RestComponent, HardBattleComponent, NewObjectComponent, PowerUpComponent, EndComponent, EventMapComponent],
  imports: [BrowserModule, HttpClientModule, MenuModule, MapModule, BattleModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
