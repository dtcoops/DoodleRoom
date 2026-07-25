import type { Player, Room } from "../types/types";
import { generateRandomWord } from "./wordGenerator";

const ROUND_DURATION_MS = 60_000;

function getNextDrawerId(room: Room): string {
    // First round - no drawer assigned yet
    if (room.gameState.drawerId == null) {
        return room.gameState.turnOrder[0];
    }

    // Any other round
    const lastDrawerIndex = room.gameState.turnOrder.findIndex((p) => p === room.gameState.drawerId);

    const nextIndex = (lastDrawerIndex + 1) % room.gameState.turnOrder.length;
    return room.gameState.turnOrder[nextIndex];
}

function startRound(room: Room) : void {
    room.gameState.phase = 'DRAWING';
    room.gameState.drawerId = getNextDrawerId(room);
    room.gameState.currentWord = generateRandomWord();
    room.gameState.roundEndsAt = Date.now() + ROUND_DURATION_MS;
}

export function gameStart(room: Room, totalRoundsOverride?: number): void {
    room.gameState.totalRounds = totalRoundsOverride ?? room.players.length;
    room.gameState.roundNumber = 1;
    room.gameState.turnOrder = room.players.map((p) => p.id);
    startRound(room);
}

function endGame(room: Room): void {
    room.gameState.phase = 'GAME_OVER';
    room.gameState.drawerId = null;
}

export function advanceToNextRound(room: Room): void {
    room.gameState.roundNumber += 1;

    if (room.gameState.roundNumber > room.gameState.totalRounds) {
        endGame(room);
        return;
    }

    startRound(room);
}

function removeFromTurnOrder(room: Room, playerId: string): void {
    room.gameState.turnOrder = room.gameState.turnOrder.filter((id) => id !== playerId);
}

export function handlePlayerLeftDuringGame(room: Room, playerId: string): void {
    if (room.gameState.phase === 'WAITING' || room.gameState.phase === 'GAME_OVER') {
        return;
    }

    removeFromTurnOrder(room, playerId);
    if (room.gameState.drawerId === playerId) {
        advanceToNextRound(room);
    }
}

