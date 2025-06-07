import { Injectable } from '@angular/core';
import { BackendAPIService } from '../api/backend-api.service';
import { gamemode } from 'src/app/mappings/gamemode';
import {
  gamestate,
  lobby,
  lobbyAggregate,
  lobby_role,
  role_player,
  role_spectator,
  longPoll,
} from 'src/app/mappings/lobby';
import { Observable, forkJoin, map, of, throwError } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root',
})
export class LobbyService {
  constructor(private backendAPIService: BackendAPIService) {}

  createLobby(gamemode: gamemode, gamestate: gamestate) {
    return this.backendAPIService.post('lobbies', {
      gamemode: gamemode,
      gamestate: gamemode,
    });
  }

  joinLobby(lobby_id: string) {
    return this.backendAPIService.post(`lobbies/${lobby_id}/participants`, {});
  }

  leaveLobby(lobby_id: string) {
    return this.backendAPIService.delete(`lobbies/${lobby_id}/participants`);
  }

  getLobbiesOfGamemode(gamemode: gamemode): Observable<lobbyAggregate[]> {
    return this.backendAPIService.getMultiple('lobbies', {
      gamemode: gamemode,
    });
  }

  getLobby(lobby_id: string): Observable<lobby> {
    return this.backendAPIService.getOne('lobbies/', lobby_id);
  }

  getLobbyUpdates(lobby_id: string): Observable<longPoll> {
    return this.backendAPIService.getOne('lobbies/updates/', lobby_id);
  }

  joinSpectator(lobby_id: string) {
    return this.backendAPIService.patch(`lobbies/${lobby_id}`, {
      lobby_role: role_spectator,
    });
  }

  joinPlayers(lobby_id: string) {
    return this.backendAPIService.patch(`lobbies/${lobby_id}`, {
      lobby_role: role_player,
    });
  }

  startGame(lobby_id: string) {
    return this.backendAPIService.post(`lobbies/startGame/` + lobby_id, {});
  }

  getPlayers(lobby_id: string) {
    return this.backendAPIService.getMultiple(
      `lobbies/${lobby_id}/participants`,
      { role_id: role_player }
    );
  }
}
