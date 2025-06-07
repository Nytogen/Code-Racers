import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import {
  gamemode,
  GM_NORMAL,
  gamemodeToString,
} from 'src/app/mappings/gamemode';
import { lobbyAggregate, MAX_PLAYERS, MAX_SPECTATORS } from 'src/app/mappings/lobby';
import { LobbyService } from 'src/app/services/lobby/lobby.service';

@Component({
  selector: 'app-lobby-browser',
  templateUrl: './lobby-browser.component.html',
  styleUrls: ['./lobby-browser.component.scss'],
})
export class LobbyBrowserComponent {
  @Input() curGamemode: gamemode = GM_NORMAL;
  lobbies: lobbyAggregate[] = [];
  MAX_PLAYERS = MAX_PLAYERS;
  MAX_SPECTATORS = MAX_SPECTATORS;

  constructor(private lobbyService: LobbyService, private router: Router) {}

  getLobbies() {
    this.lobbyService
      .getLobbiesOfGamemode(this.curGamemode)
      .subscribe((result) => {
        this.lobbies = result;
      });
  }

  createLobby() {
    this.lobbyService.createLobby(this.curGamemode, 0).subscribe((result) => {
      this.router.navigate(['lobby/', result.lobby_id]);
    });
  }

  ngOnInit(): void {
    this.getLobbies();
  }

  curGamemodeString() {
    return gamemodeToString(this.curGamemode);
  }
}
