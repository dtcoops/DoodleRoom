import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';

import { registerSocketHandlers } from '../index';
import { toPublicGameState } from '../../game/gameManager';
import type { GameState } from '../../game/types';

describe('toPublicGameState', () => {
    it('replaces currentWord with its length', () => {
        const gameState: GameState = {
            phase: 'DRAWING',
            drawerId: 'player-1',
            roundNumber: 1,
            totalRounds: 3,
            currentWord: 'boat',
            roundEndsAt: Date.now() + 60_000,
            turnOrder: ['player-1', 'player-2'],
            roundTimer: null,
        };

        const publicState = toPublicGameState(gameState);

        expect(publicState).not.toHaveProperty('currentWord');
        expect(publicState.wordLength).toBe(4);
    });

    it('returns null wordLength when there is no current word', () => {
        const gameState: GameState = {
            phase: 'WAITING',
            drawerId: null,
            roundNumber: 0,
            totalRounds: 1,
            currentWord: null,
            roundEndsAt: null,
            turnOrder: [],
            roundTimer: null,
        };

        const publicState = toPublicGameState(gameState);

        expect(publicState.wordLength).toBeNull();
    });
});

describe('Room Socket Handlers', () => {
    let httpServer: ReturnType<typeof createServer>;
    let hostSocket: ClientSocket;
    const PORT = 4004; // make sure it does not use the same as app or other test packages.

    beforeEach(() => {
        return new Promise<void>((resolve) => {
            httpServer = createServer();
            registerSocketHandlers(httpServer); // wires up io on this test server
            httpServer.listen(PORT, () => {
                hostSocket = ioClient(`http://localhost:${PORT}`);
                hostSocket.on('connect', () => resolve());
            });
        });
    });
    
    afterEach(() => {
        hostSocket.close();
        httpServer.close();
    });


    it('a second player can join and the host is notified', () => {
        return new Promise<void>((resolve) => {
            let playerReceivedWord = false;

            // Step 1: host creates a fresh room for this test
            hostSocket.emit('room:create', { name: 'Host' });

            hostSocket.once('room:createResult', (createResult) => {
                const roomCode = createResult.room.roomCode;
                const playerSocket: ClientSocket = ioClient(`http://localhost:${PORT}`);

                playerSocket.on('connect', () => {
                    playerSocket.emit('room:join', { roomCode, name: 'Player' });
                });

                playerSocket.once('room:joinResult', () => {
                    // Both players are in — now the host starts the game
                    hostSocket.emit('game:start', {});
                });
                
                // Host is the drawer for round 1 — should get BOTH events
                hostSocket.once('game:state', (state) => {
                    expect(state.phase).toBe('DRAWING');
                    expect(state.wordLength).toBeGreaterThan(0);
                    expect(state).not.toHaveProperty('currentWord');
                });

                hostSocket.once('game:word', (payload) => {
                    expect(typeof payload.word).toBe('string');

                    // Now confirm the SECOND player never receives game:word
                    setTimeout(() => {
                        expect(playerReceivedWord).toBe(false);
                        playerSocket.close();
                        resolve();
                    }, 100);
                });
            })
        })
    });
});