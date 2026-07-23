import type { Room } from "../types/types";
import { generateRandomWord } from "./wordGenerator";

const ROUND_DURATION_MS = 60_000;

export function gameStart(room: Room, totalRoundsOverride?: number): void {
    const totalRounds = totalRoundsOverride ?? room.players.length;

    room.gameState.phase = 'DRAWING';
    room.gameState.totalRounds = totalRounds;
    room.gameState.drawerId = room.players[0].id;
    room.gameState.roundNumber = 1;
    room.gameState.currentWord = generateRandomWord();
    room.gameState.roundEndsAt = Date.now() + ROUND_DURATION_MS;
}