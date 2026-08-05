import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Player } from '../types/types';
import { createRoom } from '../rooms/roomManager';
import { gameStart, advanceToNextRound, handlePlayerLeftDuringGame, toPublicGameState } from './gameManager';

describe('Game Manager', () => {
    it('gameStart on a freshly created room with no override', () => {
        const host: Player = { id: 'player-1', name: "host" };
        const room = createRoom(host);
        const beforeStart = Date.now();

        gameStart(room);

        expect(room.gameState.phase).toBe('DRAWING');
        expect(room.gameState.drawerId).toBe('player-1');
        expect(room.gameState.roundNumber).toBe(1);
        expect(room.gameState.totalRounds).toBe(1);
        expect(room.gameState.currentWord).not.toBeNull();
        expect(room.gameState.roundEndsAt).toBeGreaterThan(beforeStart);
        expect(room.gameState.turnOrder).toEqual(['player-1']);

    });

    it('gameStart on a freshly created room with an override', () => {
        const host: Player = { id: 'player-1', name: "daniel" };
        const room = createRoom(host);

        gameStart(room, 3);
        
        expect(room.gameState.totalRounds).toBe(3);
    });
});

describe('advanceToNextRound', () => {
    it('advances to the next round and picks the next drawer', () => {
        const host: Player = { id: 'player-1', name: 'Host' };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Bob' });
        gameStart(room, 2); // 2 total rounds

        advanceToNextRound(room);

        expect(room.gameState.phase).toBe('DRAWING');
        expect(room.gameState.roundNumber).toBe(2);
        expect(room.gameState.drawerId).toBe('player-2');
    });

    it('transitions to GAME_OVER once all rounds are complete', () => {
        const host: Player = { id: 'player-1', name: 'Host' };
        const room = createRoom(host);
        gameStart(room, 1);

        advanceToNextRound(room);

        expect(room.gameState.phase).toBe('GAME_OVER');
        expect(room.gameState.drawerId).toBeNull();
    });
});

describe("handlePlayerLeftDuringGame", () => {
    it('Does nothing during WAITING the game state', () => {
        const host: Player = { id: 'player-1', name: 'Host' };
        const room = createRoom(host);

        handlePlayerLeftDuringGame(room, 'player-1');

        expect(room.gameState.turnOrder).toEqual([]);
    });
    it('Does nothing during GAME_OVER the game state', () => {
        const host: Player = { id: 'player-1', name: 'Host' };
        const room = createRoom(host);
        gameStart(room, 1); // 1 round max
        advanceToNextRound(room); // triggers end as there was only 1 round

        const turnOrderBefore = [...room.gameState.turnOrder];
        handlePlayerLeftDuringGame(room, 'player-1');

        expect(room.gameState.turnOrder).toEqual(turnOrderBefore);
    });
    it('Non-drawing player leaves during DRAWING game state, silently removes player from turn order', () => {
        const host: Player = { id: 'player-1', name: 'Host' };
        const player: Player = { id: 'player-2', name: 'Player' };
        const room = createRoom(host);
        room.players.push(player);
        gameStart(room, 2);

        handlePlayerLeftDuringGame(room, 'player-2');
        expect(room.gameState.turnOrder).toEqual(['player-1']);
    });
    it('The drawer leaves during DRAWING game state, should move to next round', () => {
        const host: Player = { id: 'player-1', name: 'Host' };
        const player: Player = { id: 'player-2', name: 'Player' };
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
        const host: Player = { id: 'player-1', name: 'Host' };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Player' });
        gameStart(room, 2);

        expect(room.gameState.roundNumber).toBe(1);

        vi.advanceTimersByTime(60_000); // fast-forward exactly one round's duration

        expect(room.gameState.roundNumber).toBe(2);
    });

    it('schedules a new timer for each round', () => {
        const host: Player = { id: 'player-1', name: 'Host' };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Player' });
        gameStart(room, 2);

        const firstRoundTimer = room.gameState.roundTimer;
        expect(firstRoundTimer).not.toBeNull();

        vi.advanceTimersByTime(60_000);

        const secondRoundTimer = room.gameState.roundTimer;
        expect(secondRoundTimer).not.toBeNull();
        expect(secondRoundTimer).not.toBe(firstRoundTimer);
    });

    it('does not leave a stale timer behind when advancing rounds', () => {
        const host: Player = { id: 'player-1', name: 'Host' };
        const room = createRoom(host);
        room.players.push({ id: 'player-2', name: 'Bob' });
        gameStart(room, 2);

        expect(vi.getTimerCount()).toBe(1); // one timer scheduled

        vi.advanceTimersByTime(60_000); // round advances

        expect(vi.getTimerCount()).toBe(1); // still just one — old one was cleared, new one scheduled
    });
});