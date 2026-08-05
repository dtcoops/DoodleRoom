import type { GameState } from "./types";

export function generateGameState(totalRounds: number): GameState {
    return {
        phase: "WAITING",
        drawerId: null,
        roundNumber: 0,
        totalRounds,
        currentWord: null,
        roundEndsAt: null,
        turnOrder: [],
        roundTimer: null,
    }
}