import type { Player, Room } from "../types/types";
import type { GameState, OnRoundAdvance, GuessResult } from "./types";
import { generateRandomWord } from "./wordGenerator";

const DEFAULT_ROUND_DURATION_MS = 60_000;

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

function startRound(room: Room, roundDurationMs: number = DEFAULT_ROUND_DURATION_MS) : void {
    clearRoundTimer(room);

    // Core Round State
    room.gameState.phase = 'DRAWING';
    room.gameState.drawerId = getNextDrawerId(room);
    room.gameState.currentWord = generateRandomWord();
    room.gameState.roundEndsAt = Date.now() + roundDurationMs;
    room.gameState.roundDurationMs = roundDurationMs;

    // Guess tracking
    room.gameState.correctGuessers = [];
    room.gameState.scoresAtRoundStart = Object.fromEntries(
        room.players.map((p) => [p.id, p.score])
    );

    // Schedule Timer last - depends on above
    room.gameState.roundTimer = setTimeout(() => {
        advanceToNextRound(room);
    }, roundDurationMs);
}

export function gameStart(room: Room, totalRoundsOverride?: number, onRoundAdvance?: OnRoundAdvance): { success: true } | { success: false; reason: string } {
    if (room.players.length < 2) {
        return { success: false, reason: 'At least 2 players are required to start.' };
    }

    room.gameState.totalRounds = totalRoundsOverride ?? room.players.length;
    room.gameState.roundNumber = 1;
    room.gameState.turnOrder = room.players.map((p) => p.id);
    startRound(room);
    onRoundAdvance?.(room);

    return { success: true };
}

export function clearRoundTimer(room: Room): void {
    if (room.gameState.roundTimer) {
        clearTimeout(room.gameState.roundTimer);
        room.gameState.roundTimer = null;
    }
}

function endGame(room: Room): void {
    clearRoundTimer(room);
    room.gameState.phase = 'GAME_OVER';
    room.gameState.drawerId = null;
}

export function advanceToNextRound(room: Room, onRoundAdvance?: OnRoundAdvance): void {
    room.gameState.roundNumber += 1;

    if (room.gameState.roundNumber > room.gameState.totalRounds) {
        endGame(room);
    } else {
        startRound(room);
    }

    onRoundAdvance?.(room);
}

function removeFromTurnOrder(room: Room, playerId: string): void {
    room.gameState.turnOrder = room.gameState.turnOrder.filter((id) => id !== playerId);
}

export function handlePlayerLeftDuringGame(room: Room, playerId: string, onRoundAdvance?: OnRoundAdvance): void {
    if (room.gameState.phase === 'WAITING' || room.gameState.phase === 'GAME_OVER') {
        return;
    }
    
    removeFromTurnOrder(room, playerId);
    if (room.gameState.drawerId === playerId) {
        advanceToNextRound(room, onRoundAdvance);
    }
}

export function toPublicGameState(gameState: GameState): Omit<GameState, 'currentWord' | 'roundTimer'> & { wordLength: number | null } {
    const { currentWord, roundTimer, ...rest } = gameState;
    return {
        ...rest,
        wordLength: currentWord ? currentWord.length : null,
    };
}

export function submitGuess(room: Room, playerId: string, guessText: string): GuessResult {
    if (room.gameState.phase !== 'DRAWING') {
        return { status: 'rejected', reason: "Drawing Phase has not begun" };
    }

    if (playerId === room.gameState.drawerId) {
        return { status: 'rejected', reason: "Drawer can not make guesses" };
    }

    if (room.gameState.correctGuessers.includes(playerId)) {
        return { status: 'rejected', reason: `Player: ${playerId} has already guessed correctly` };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
        return { status: 'rejected', reason: "Player not found in room" };
    }

    // In the scenario that there is no current word
    // normalizedWord becomes undefined - no way to match so simply returns incorrect
    const normalizedGuess = guessText.trim().toLowerCase();
    const normalizedWord = room.gameState.currentWord?.toLowerCase();

    // Handle the Guess
    if (normalizedGuess === normalizedWord) {
        // (1) Compute points
        const timeRemainingMs = Math.max(0, (room.gameState.roundEndsAt ?? 0) - Date.now());
        const totalRoundTimeMs = room.gameState.roundDurationMs ?? 1; // avoid divide-by-zero
        const points = Math.round(100 * (timeRemainingMs / totalRoundTimeMs));

        // (2) update score
        player.score += points;
        
        // (3) add to correctGuessers
        room.gameState.correctGuessers.push(playerId);

        return  { status: 'correct', points: points };
    }
    else {
        return { status: 'incorrect' };
    }
}

function haveAllGuessersAnsweredCorrectly(room: Room): boolean {
    const eligibleGuessers = room.gameState.turnOrder.filter((id) => id !== room.gameState.drawerId);
    return eligibleGuessers.every((id) => room.gameState.correctGuessers.includes(id));
}

export function handleGuessSubmission(
    room: Room,
    playerId: string,
    guessText: string,
    onRoundAdvance?: OnRoundAdvance
): GuessResult {
    const result = submitGuess(room, playerId, guessText);

    if (result.status === 'correct' && haveAllGuessersAnsweredCorrectly(room)) {
        advanceToNextRound(room, onRoundAdvance);
    }

    return result;
}