export type gamemode = number;

export const GM_NORMAL: gamemode = 0;

// Useless function but makes things more readable. Use if want
export function isSameGameMode(gamemode1: gamemode, gamemode2: gamemode) {
  return gamemode1 === gamemode2;
}

export function gamemodeToString(gamemode: gamemode) {
  switch (gamemode) {
    case GM_NORMAL:
      return 'Normal';
    default:
      return 'Unknown Gamemode';
  }
}
