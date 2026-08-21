// Global Types

import { GameState } from "../game/types";

export type Player = {
  id: string;
  name: string;
  score: number;
};

export type Room = {
    roomCode: string;
    hostId: string;
    players: Player[];
    gameState: GameState;
}

export interface DrawSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  width: number;
}