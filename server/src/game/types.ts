import { Room } from "../types/types";

export type GamePhase = 'WAITING' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export type GameState = {
  phase: GamePhase;
  drawerId: string | null;
  roundNumber: number;
  totalRounds: number;
  currentWord: string | null;
  roundEndsAt: number | null;
  turnOrder: string[];
  roundTimer: NodeJS.Timeout | null;
  correctGuessers: string[];
  scoresAtRoundStart: Record<string, number>;
  roundDurationMs: number | null;
}


export type OnRoundAdvance = (room: Room) => void;

export type GuessResult =
  | { status: 'correct'; points: number }
  | { status: 'incorrect' }
  | { status: 'rejected'; reason: string };