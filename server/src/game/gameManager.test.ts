import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Player } from '../types/types';
import { createRoom, joinRoom, leaveRoom } from '../rooms/roomManager';
import { gameStart, advanceToNextRound, handlePlayerLeftDuringGame, returnToLobby, submitGuess, handleGuessSubmission } from './gameManager';

describe('Game Manager', () => {
    
    it('gameStart on a freshly created room with no override', () => {
        const host: Player = { id: 'player-1', name: "host", score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'player2', score: 0 });
        const beforeStart = Date.now();

        gameStart(room);

        expect(room.gameState.phase).toBe('DRAWING');
        expect(room.gameState.drawerId).toBe('player-1');
        expect(room.gameState.roundNumber).toBe(1);
        expect(room.gameState.totalRounds).toBe(2);
        expect(room.gameState.currentWord).not.toBeNull();
        expect(room.gameState.roundEndsAt).toBeGreaterThan(beforeStart);
        expect(room.gameState.turnOrder).toEqual(['player-1', 'player-2']);

    });

    it('gameStart requires a minimum of 2 players', () => {
        const host: Player = { id: 'player-1', name: "host", score: 0 };
        const room = createRoom(host);
        const beforeStart = Date.now();

        const result = gameStart(room);
        expect(result.success).toBe(false);
        expect(room.gameState.phase).toBe('WAITING');
    });

    it('gameStart on a freshly created room with an override', () => {
        const host: Player = { id: 'player-1', name: "daniel", score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'player2', score: 0 });

        gameStart(room, 3);
        
        expect(room.gameState.totalRounds).toBe(3);
    });

    it('resets the game back to a fresh WAITING lobby, clearing scores and the timer', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'p2', score: 0 });
        gameStart(room, 1);

        // simulate someone having scored
        room.players[0].score = 50;

        returnToLobby(room);

        expect(room.gameState.phase).toBe('WAITING');
        expect(room.gameState.roundTimer).toBeNull();
        expect(room.players[0].score).toBe(0);
        expect(room.players[1].score).toBe(0);
    });

    it('ends the game if fewer than 2 players remain after someone leaves', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const player: Player = { id: 'player-2', name: 'Player', score: 0 };
        const room = createRoom(host);
        room.players.push(player);
        gameStart(room, 2);

        // Simulate player-2 actually leaving the room (not just the game state)
        room.players = room.players.filter((p) => p.id !== 'player-2');

        handlePlayerLeftDuringGame(room, 'player-2');

        expect(room.gameState.phase).toBe('GAME_OVER');
    });
});

describe('advanceToNextRound', () => {
    it('advances to the next round and picks the next drawer', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Bob', score: 0 });
        gameStart(room, 2); // 2 total rounds

        advanceToNextRound(room);

        expect(room.gameState.phase).toBe('DRAWING');
        expect(room.gameState.roundNumber).toBe(2);
        expect(room.gameState.drawerId).toBe('player-2');
    });

    it('transitions to GAME_OVER once all rounds are complete', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0  };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Bob', score: 0 });
        gameStart(room, 1);

        advanceToNextRound(room);

        expect(room.gameState.phase).toBe('GAME_OVER');
        expect(room.gameState.drawerId).toBeNull();
    });

    it('resets correctGuessers and snapshots scores when a new round starts', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const player: Player = { id: 'player-2', name: 'Player', score: 0 };
        const room = createRoom(host);
        room.players.push(player);
        gameStart(room, 2);

        // Simulate round 1 progress: someone guessed, someone scored
        room.gameState.correctGuessers.push('player-2');
        player.score = 50;

        advanceToNextRound(room);

        expect(room.gameState.correctGuessers).toEqual([]);
        expect(room.gameState.scoresAtRoundStart).toEqual({ 'player-1': 0, 'player-2': 50 });
    });
});

describe("handlePlayerLeftDuringGame", () => {
    it('Does nothing during WAITING the game state', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0  };
        const room = createRoom(host);

        handlePlayerLeftDuringGame(room, 'player-1');

        expect(room.gameState.turnOrder).toEqual([]);
    });
    it('Does nothing during GAME_OVER the game state', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0  };
        const room = createRoom(host);
        gameStart(room, 1); // 1 round max
        advanceToNextRound(room); // triggers end as there was only 1 round

        const turnOrderBefore = [...room.gameState.turnOrder];
        handlePlayerLeftDuringGame(room, 'player-1');

        expect(room.gameState.turnOrder).toEqual(turnOrderBefore);
    });
    it('Non-drawing player leaves during DRAWING game state, silently removes player from turn order', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0  };
        const player: Player = { id: 'player-2', name: 'Player', score: 0  };
        const room = createRoom(host);
        room.players.push(player);
        gameStart(room, 2);

        handlePlayerLeftDuringGame(room, 'player-2');
        expect(room.gameState.turnOrder).toEqual(['player-1']);
    });
    it('The drawer leaves during DRAWING game state, should move to next round', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0  };
        const player: Player = { id: 'player-2', name: 'Player', score: 0  };
        const room = createRoom(host);
        room.players.push(player);
        gameStart(room, 2);

        handlePlayerLeftDuringGame(room, 'player-1'); // Room host defaults to drawerId. Drawer leaves during game.
        expect(room.gameState.turnOrder).toEqual(['player-2']);
        expect(room.gameState.roundNumber).toBe(2);
        expect(room.gameState.drawerId).toBe('player-2');
        expect(room.gameState.phase).toBe('DRAWING');
    });
});

describe('round timer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('automatically advances to the next round once time runs out', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0  };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Player', score: 0  });
        gameStart(room, 2);

        expect(room.gameState.roundNumber).toBe(1);

        vi.advanceTimersByTime(60_000); // fast-forward exactly one round's duration

        expect(room.gameState.roundNumber).toBe(2);
    });

    it('schedules a new timer for each round', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Player', score: 0 });
        gameStart(room, 2);

        const firstRoundTimer = room.gameState.roundTimer;
        expect(firstRoundTimer).not.toBeNull();

        vi.advanceTimersByTime(60_000);

        const secondRoundTimer = room.gameState.roundTimer;
        expect(secondRoundTimer).not.toBeNull();
        expect(secondRoundTimer).not.toBe(firstRoundTimer);
    });

    it('does not leave a stale timer behind when advancing rounds', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Bob', score: 0 });
        gameStart(room, 2);

        expect(vi.getTimerCount()).toBe(1); // one timer scheduled

        vi.advanceTimersByTime(60_000); // round advances

        expect(vi.getTimerCount()).toBe(1); // still just one — old one was cleared, new one scheduled
    });
});

describe('submitGuess', () => {
    it('reject a guess when the game is not in DRAWING phase', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);

        const result = submitGuess(room, 'player-2', 'boat');

        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
            expect(result.reason).toContain('Drawing Phase has not begun');
        }
    });

    it('reject a guess when made by the Drawer', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'player2', score: 0 });
        
        gameStart(room);

        const currentWord = room.gameState.currentWord!; // Word is guarenteed
        const result = submitGuess(room, host.id, currentWord);

        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
            expect(result.reason).toContain('Drawer can not make guesses');
        }
    });

    it('reject a guess if the guessing player has already correctly guessed', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'player2', score: 0 });
        gameStart(room);

        // Player guesses correctly
        const result = submitGuess(room, 'player-2', room.gameState.currentWord!);
        expect(result.status).toBe('correct');

        // Guess again
        const resultRepeat = submitGuess(room, 'player-2', room.gameState.currentWord!);
        expect(resultRepeat.status).toBe('rejected');
        if (resultRepeat.status === 'rejected') {
            expect(resultRepeat.reason).toContain(`Player: player-2 has already guessed correctly`);
        }
    });

    it('reject a guess as the guessing player is no longer in the room', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'player2', score: 0 });
        gameStart(room);

        // Player drops during guess submission
        leaveRoom(room.roomCode, 'player-2');
        const result = submitGuess(room, 'player-2', room.gameState.currentWord!);
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
            expect(result.reason).toContain(`Player not found in room`);
        }
    });

    it('accept a guess from a player with the incorrect answer', () => {{
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'player2', score: 0 });
        gameStart(room);

        // Player submits an incorrect guess
        const result = submitGuess(room, 'player-2', "");
        expect(result.status).toBe('incorrect');
    }});

    it('accept a guess from a player with the correct answer', () => {{
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        const player: Player = { id: 'player-2', name: 'player2', score: 0 }
        room.players.push(player);
        gameStart(room);

        // Player submits a correct guess
        const result = submitGuess(room, 'player-2', room.gameState.currentWord!);
        expect(result.status).toBe('correct');
        if (result.status === 'correct') {
            // Score is calculated with a time remaining. Should be near 100.
            expect(result.points).toBeGreaterThanOrEqual(95);
            expect(result.points).toBeLessThanOrEqual(100);
        }

        // Player score increases and they are added to correctGuessers
        expect(player.score).toBe(result.status === 'correct' ? result.points : 0);
        expect(room.gameState.correctGuessers).toContain('player-2');
    }});

    it('accept a guess from a player with the correct answer that is case insensitive with white-space', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        const player: Player = { id: 'player-2', name: 'player2', score: 0 }
        room.players.push(player);
        gameStart(room);

        // Player submits a correct guess
        const guess = room.gameState.currentWord!.toUpperCase() + "   ";
        const result = submitGuess(room, 'player-2', guess);
        expect(result.status).toBe('correct');
        if (result.status === 'correct') {
            // Score is calculated with a time remaining. Should be near 100.
            expect(result.points).toBeGreaterThanOrEqual(95);
            expect(result.points).toBeLessThanOrEqual(100);
        }

        // Player score increases and they are added to correctGuessers
        expect(player.score).toBe(result.status === 'correct' ? result.points : 0);
        expect(room.gameState.correctGuessers).toContain('player-2');
    });
});

describe('handleGuessSubmission', () => {
    it('does not advance the round if eligible guessers remain', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'p2', score: 0 });
        room.players.push({ id: 'player-3', name: 'p3', score: 0 });
        gameStart(room, 3);

        const roundBefore = room.gameState.roundNumber;
        handleGuessSubmission(room, 'player-2', room.gameState.currentWord!);

        expect(room.gameState.roundNumber).toBe(roundBefore); // player-3 hasn't guessed yet
    });

    it('advances the round once all eligible guessers have answered correctly', () => {
        const host: Player = { id: 'player-1', name: 'Host', score: 0 };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'p2', score: 0 });
        room.players.push({ id: 'player-3', name: 'p3', score: 0 });
        gameStart(room, 3);

        const word = room.gameState.currentWord!;
        handleGuessSubmission(room, 'player-2', word);
        handleGuessSubmission(room, 'player-3', word);

        expect(room.gameState.roundNumber).toBe(2);
    });
});