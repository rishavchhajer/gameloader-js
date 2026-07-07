import { DinoGame } from './dino.js';
import { ShooterGame } from './shooter.js';
import { TetrisGame } from './tetris.js';
import { ArcheryGame } from './archery.js';
import { SnakeGame } from './snake.js';
import { PacmanGame } from './pacman.js';
import { RoadFighterGame } from './roadfighter.js';

export const GAMES = {
  [DinoGame.id]: DinoGame,
  [ShooterGame.id]: ShooterGame,
  [TetrisGame.id]: TetrisGame,
  [ArcheryGame.id]: ArcheryGame,
  [SnakeGame.id]: SnakeGame,
  [PacmanGame.id]: PacmanGame,
  [RoadFighterGame.id]: RoadFighterGame,
};

export function getGame(name) {
  const G = GAMES[name];
  if (!G) {
    throw new Error(
      `[GameLoader] Unknown game "${name}". Valid options: ${Object.keys(GAMES).join(', ')}`
    );
  }
  return G;
}
