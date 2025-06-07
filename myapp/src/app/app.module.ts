import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { ButtonComponent } from './components/buttons/button/button.component';
import { MainComponent } from './components/routes/main/main.component';
import { RedirectButtonComponent } from './components/buttons/redirect-button/redirect-button.component';
import { LobbyComponent } from './components/routes/lobbies/lobby/lobby.component';
import { LobbyBrowserComponent } from './components/routes/lobbyBrowsers/lobby-browser/lobby-browser.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpInterceptorProviders } from './httpInterceptors';
import { GameComponent } from './components/routes/game/game.component';
import { GameTextComponent } from './components/gameComponents/game-text/game-text.component';
import { TextInputComponent } from './components/gameComponents/text-input/text-input.component';
import { ProgressBarComponent } from './components/gameComponents/progress-bar/progress-bar.component';
import { HeaderComponent } from './components/header/header.component';

const appRoutes: Routes = [
  { path: '', component: MainComponent },
  { path: 'lobby/:lobby_id', component: LobbyComponent },
  { path: 'lobbyBrowser', component: LobbyBrowserComponent },
  { path: 'game/:game_id', component: GameComponent },
];

@NgModule({
  declarations: [
    AppComponent,
    ButtonComponent,
    MainComponent,
    RedirectButtonComponent,
    LobbyComponent,
    LobbyBrowserComponent,
    GameComponent,
    GameTextComponent,
    TextInputComponent,
    ProgressBarComponent,
    HeaderComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    RouterModule.forRoot(appRoutes, { enableTracing: false }),
    HttpClientModule,
    NgbModule,
    FormsModule,
  ],
  providers: [HttpInterceptorProviders],
  bootstrap: [AppComponent],
})
export class AppModule {}
