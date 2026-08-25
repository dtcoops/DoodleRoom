export type Player = {
    id: string;
    name: string;
    score: number;
};

export type GamePhase = 'WAITING' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export type ClientGameState = {
    phase: GamePhase;
    drawerId: string | null;
    roundNumber: number;
    totalRounds: number;
    roundEndsAt: number | null;
    turnOrder: string[];
    correctGuessers: string[];
    scoresAtRoundStart: Record<string, number>;
    roundDurationMs: number | null;
    wordLength: number | null; // present instead of currentWord
};

export type Room = {
    roomCode: string;
    hostId: string;
    players: Player[];
    gameState: ClientGameState;
};

export type DrawSegment = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    color: string;
    width: number;
};