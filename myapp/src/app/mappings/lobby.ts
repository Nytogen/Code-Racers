import { user } from './users';
import { gamemode } from './gamemode';

export type gamestate = number;
export const pregame: gamestate = 0;
export const inProgress: gamestate = 1;

export type lobby_role = number;
export const role_player: gamestate = 0;
export const role_spectator: gamestate = 1;

export const MAX_PLAYERS = 4;
export const MAX_SPECTATORS = 4;

export interface lobby {
  lobby_name: string;
  lobby_id: string;
  players: user[];
  spectators: user[];
  owner_id: string;
  gamemode: gamemode;
  gamestate: gamestate;
  isOwner: boolean;
  lobby_role: lobby_role;
}

export interface longPoll {
  result: any;
  data: any;
  error: any;
}

export interface lobbyAggregate {
  lobby_name: string;
  lobby_id: number;
  numOfPlayers: number;
  numOfSpectators: number;
  gamestate: gamestate;
  gamemode: gamemode;
}

export function gamestateToString(gamestate: gamestate): string {
  switch (gamestate) {
    case pregame:
      return 'Pre-Game';
    case inProgress:
      return 'In-Progress';
    default:
      return 'Unknown Lobby Status';
  }
}
