import { Component, ViewChild, ElementRef } from '@angular/core';
import { gamemodeToString } from 'src/app/mappings/gamemode';
import { ActivatedRoute } from '@angular/router';
import { LobbyService } from 'src/app/services/lobby/lobby.service';
import {
  inProgress,
  lobby,
  lobby_role,
  role_player,
  role_spectator,
} from 'src/app/mappings/lobby';
import { Subscription } from 'rxjs';
import { GameService } from 'src/app/services/game/game.service';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user/user.service';

const overlayMap: { [key: string]: string } = {
  'Joined another lobby': 'Joined another lobby',
  'Rejoined the same lobby': 'Another tab of this Lobby was opened',
  'Owner left': 'Owner has left the lobby',
  'Lobby left': 'Lobby was left from another tab',
  'Stale Lobby': 'Lobby was inactive for too long',
};

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent {
  lobby_id: string;
  dataLoaded: boolean = false;
  overlayText: string = 'Loading...';

  lobby: lobby = {
    gamemode: null,
    lobby_name: null,
    lobby_id: null,
    owner_id: null,
    players: [],
    spectators: [],
    gamestate: 0,
    isOwner: false,
    lobby_role: -1,
  };

  joinLobbySubscription: Subscription;
  getLobbySubscription: Subscription;
  getLobbyUpdatesSubscription: Subscription;

  constructor(
    private route: ActivatedRoute,
    private lobbyService: LobbyService,
    private gameService: GameService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.lobby_id = this.route.snapshot.paramMap.get('lobby_id');
    this.joinLobbySubscription = this.lobbyService
      .joinLobby(this.lobby_id)
      .subscribe({
        next: (res) => {
          this.getLobbySubscription = this.lobbyService
            .getLobby(this.lobby_id)
            .subscribe({
              next: (result) => {
                this.lobby = result;
                this.dataLoaded = true;
                this.overlayText = '';
                if (
                  res.result === 'Lobby full' &&
                  this.lobby.lobby_role === -1
                ) {
                  this.overlayText = 'This lobby is already full';
                  return;
                }
                if (result.gamestate === inProgress) {
                  this.redirectToGame();
                  return;
                }
                this.getLobbyUpdates();
              },
              error: (err) => {
                if (err.status === 404) {
                  this.overlayText = 'Lobby does not exist';
                }
              },
            });
        },
        error: (err) => {
          if (err.status === 404) {
            this.overlayText = 'Lobby does not exist';
          }
        },
      });
  }

  getLobbyUpdates() {
    this.getLobbyUpdatesSubscription = this.lobbyService
      .getLobbyUpdates(this.lobby_id)
      .subscribe((res) => {
        if (res.result === 'lobby update') {
          this.lobby = res.data;
          if (this.lobby.gamestate === inProgress) {
            this.redirectToGame();
            return;
          } else {
            this.getLobbyUpdates();
          }
        } else {
          this.dataLoaded = false;
          this.overlayText =
            overlayMap[res.result] === undefined
              ? 'Disconnected'
              : overlayMap[res.result];
        }
      });
  }

  curGamemodeString() {
    if (!this.dataLoaded) {
      return 'Loading Lobby...';
    }
    return `${gamemodeToString(this.lobby.gamemode)} Mode`;
  }

  redirectToGame() {
    if (this.isPlayer()) {
    }
    this.router.navigate(['/game/' + this.lobby_id]);
  }

  redirectToLobbyBrowser() {
    this.router.navigate(['/lobbyBrowser']);
  }

  startGame() {
    this.gameService.generateRandomPassage(this.lobby_id).subscribe(() => {
      this.gameService.generateGameProgress(this.lobby_id).subscribe(() => {
        this.lobbyService.startGame(this.lobby_id).subscribe((res) => {});
      });
    });
  }

  joinSpectator() {
    this.lobbyService.joinSpectator(this.lobby_id).subscribe(() => {
      return;
    });
  }

  joinPlayers() {
    this.lobbyService.joinPlayers(this.lobby_id).subscribe(() => {
      return;
    });
  }

  ngOnDestroy() {
    if (this.joinLobbySubscription) {
      this.joinLobbySubscription.unsubscribe();
    }
    if (this.getLobbySubscription) {
      this.getLobbySubscription.unsubscribe();
    }
    if (this.getLobbyUpdatesSubscription) {
      this.getLobbyUpdatesSubscription.unsubscribe();
    }
    // If we aren't disconnected already
    this.disconnect();
  }

  isOwner() {
    return this.lobby.isOwner;
  }

  isPlayer() {
    return this.lobby.lobby_role === role_player;
  }

  isSpectator() {
    return this.lobby.lobby_role === role_spectator;
  }

  disconnect() {
    if (this.dataLoaded != false && this.lobby.gamestate != inProgress) {
      this.lobbyService.leaveLobby(this.lobby_id).subscribe(() => {});
    }
  }
}
