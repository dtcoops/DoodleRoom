export type GamePhase = 'WAITING' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export type GameState = {
  phase: GamePhase;
  drawerId: string | null;
  roundNumber: number;
  totalRounds: number;
  currentWord: string | null;
  roundEndsAt: number | null;
  turnOrder: string[];
}