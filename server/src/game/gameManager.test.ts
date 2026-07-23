import { describe, it, expect } from 'vitest';
import type { Player } from '../types/types';
import { createRoom } from '../rooms/roomManager';
import { gameStart } from './gameManager';

describe('Game Manager', () => {
    it('gameStart on a freshly created room with no override', () => {
        const host: Player = { id: 'player-1', name: "daniel" };
        const room = createRoom(host);
        const beforeStart = Date.now();

        gameStart(room);

        expect(room.gameState.phase).toBe('DRAWING');
        expect(room.gameState.drawerId).toBe('player-1');
        expect(room.gameState.roundNumber).toBe(1);
        expect(room.gameState.totalRounds).toBe(1);
        expect(room.gameState.currentWord).not.toBeNull();
        expect(room.gameState.roundEndsAt).toBeGreaterThan(beforeStart);
    });

    it('gameStart on a freshly created room with an override', () => {
        const host: Player = { id: 'player-1', name: "daniel" };
        const room = createRoom(host);

        gameStart(room, 3);
        
        expect(room.gameState.totalRounds).toBe(3);
    });
});

