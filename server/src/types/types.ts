// Global Types

import { GameState } from "../game/types";

export type Player = {
  id: string;
  name: string;
};

export type Room = {
    roomCode: string;
    hostId: string;
    players: Player[];
    gameState: GameState;
}