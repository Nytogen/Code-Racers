import { Injectable } from '@angular/core';
import { BackendAPIService } from '../api/backend-api.service';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  constructor(private backendAPIService: BackendAPIService) {}

  generateRandomPassage(lobby_id: string) {
    return this.backendAPIService.post(
      'game/generateRandomPassage/' + lobby_id,
      {}
    );
  }

  generateGameProgress(lobby_id: string) {
    return this.backendAPIService.post(`game/${lobby_id}/progress`, {});
  }

  getPassage(lobby_id: string) {
    return this.backendAPIService.getOne('game/getPassage/', lobby_id);
  }

  getGameProgress(lobby_id: string) {
    return this.backendAPIService.get(`game/${lobby_id}/progress`);
  }

  getRole(user_id: string) {
    return this.backendAPIService.getOne('game/userRole/', user_id);
  }

  updateGameProgress(lobby_id: string, text_typed: string, progress: number) {
    return this.backendAPIService.patch(`game/${lobby_id}/progress`, {
      text_typed,
      progress,
    });
  }

  checkWinner(lobby_id: string, player_id: string) {
    return this.backendAPIService.get(
      `game/winner/${lobby_id}/player/${player_id}`
    );
  }
}
