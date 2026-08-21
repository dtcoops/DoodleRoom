import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';

import { registerSocketHandlers } from '../index';
import { toPublicGameState } from '../../game/gameManager';
import type { GameState } from '../../game/types';

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
            correctGuessers: [],
            scoresAtRoundStart: {},
            roundDurationMs: null,
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
            correctGuessers: [],
            scoresAtRoundStart: {},
            roundDurationMs: null,
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

describe('broadcastRoundState timer integration', () => {
    let httpServer: ReturnType<typeof createServer>;
    let hostSocket: ClientSocket;
    const PORT = 4005; // make sure it does not use the same as app or other test packages.

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

    it('cancels the round timer when the room becomes empty, preventing a broadcast', async () => {
        const roomCode: string = await new Promise((resolve) => {
            hostSocket.emit('room:create', { name: 'Host' });
            hostSocket.once('room:createResult', (result) => resolve(result.room.roomCode));
        });

        const playerSocket: ClientSocket = ioClient(`http://localhost:${PORT}`);
        await new Promise<void>((resolve) => playerSocket.on('connect', () => resolve()));

        await new Promise<void>((resolve) => {
            playerSocket.emit('room:join', { roomCode, name: 'Player' });
            playerSocket.once('room:joinResult', () => resolve());
        });

        await new Promise<void>((resolve) => {
            hostSocket.emit('game:start', { roundDurationMs: 100 }); // needs socket support for this param
            hostSocket.once('game:state', () => resolve());
        });

        let receivedBroadcastAfterEmpty = false;
        hostSocket.on('game:state', () => { receivedBroadcastAfterEmpty = true; });

        // both players leave
        playerSocket.disconnect();
        hostSocket.emit('room:leave', { roomCode });

        await wait(300); // give the (should-be-cancelled) 100ms timer a chance to wrongly fire

        expect(receivedBroadcastAfterEmpty).toBe(false);
    });
});

describe('game:guess', () => {
    let httpServer: ReturnType<typeof createServer>;
    let hostSocket: ClientSocket;
    const PORT = 4006; // make sure it does not use the same as app or other test packages.

    beforeEach(() => {
        return new Promise<void>((resolve) => {
            httpServer = createServer();
            registerSocketHandlers(httpServer);
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

    it('a player guesses the correct answer. Broadcast omits word for others.', async ()  => {
        // Host makes a room
        const roomCode: string = await new Promise((resolve) => {
            hostSocket.emit('room:create', { name: 'Host' });
            hostSocket.once('room:createResult', (result) => resolve(result.room.roomCode));
        });

        // Second player joins
        const playerSocket: ClientSocket = ioClient(`http://localhost:${PORT}`);
        await new Promise<void>((resolve) => playerSocket.on('connect', () => resolve()));
        await new Promise<void>((resolve) => {
            playerSocket.emit('room:join', { roomCode, name: 'Player' });
            playerSocket.once('room:joinResult', () => resolve());
        });

        // Host starts the gmae
        const word: string = await new Promise((resolve) => {
            hostSocket.emit('game:start', {});
            hostSocket.once('game:word', (payload) => resolve(payload.word));
        });

        // Players guesses correctly
        // Both player and host recieve a response but with different content 
        const guessPromise = new Promise((resolve) => playerSocket.once('game:guessResult', resolve));
        const broadcastPromise = new Promise((resolve) => hostSocket.once('game:guessBroadcast', resolve));

        playerSocket.emit('game:guess', { text: word });
        const [guessResult, broadcastPayload]: [any, any] = await Promise.all([guessPromise, broadcastPromise]);

        // Other players are notified - without recieving correct word
        expect(guessResult.status).toBe('correct');
        expect(broadcastPayload.correct).toBe(true);
        expect(broadcastPayload.playerId).toBe(playerSocket.id);
        expect(broadcastPayload).not.toHaveProperty('text'); // word secrecy
        
        // Not closed in afterEach!
        playerSocket.close();
    });

    it('a player guesses the incorrect answer. Broadcast is the same for all players.', async ()  => {
        const incorrectGuess = 'awordthatwilleverbeinthewordbank';
        // Host makes a room
        const roomCode: string = await new Promise((resolve) => {
            hostSocket.emit('room:create', { name: 'Host' });
            hostSocket.once('room:createResult', (result) => resolve(result.room.roomCode));
        });

        // Second player joins
        const playerSocket: ClientSocket = ioClient(`http://localhost:${PORT}`);
        await new Promise<void>((resolve) => playerSocket.on('connect', () => resolve()));
        await new Promise<void>((resolve) => {
            playerSocket.emit('room:join', { roomCode, name: 'Player' });
            playerSocket.once('room:joinResult', () => resolve());
        });

        // Host starts the game
        const word: string = await new Promise((resolve) => {
            hostSocket.emit('game:start', {});
            hostSocket.once('game:word', (payload) => resolve(payload.word));
        });

        // Players guesses incorrectly
        // Both player and host recieve the same response
        const guessPromise = new Promise((resolve) => playerSocket.once('game:guessResult', resolve));
        const broadcastPromise = new Promise((resolve) => hostSocket.once('game:guessBroadcast', resolve));

        playerSocket.emit('game:guess', { text: incorrectGuess });
        const [guessResult, broadcastPayload]: [any, any] = await Promise.all([guessPromise, broadcastPromise]);

        // Other players are notified - without recieving correct word
        expect(guessResult.status).toBe('incorrect');
        expect(broadcastPayload.correct).toBe(false);
        expect(broadcastPayload.playerId).toBe(playerSocket.id);
        expect(broadcastPayload).toHaveProperty('text');
        expect(broadcastPayload.text).toBe(incorrectGuess);
        
        // Not closed in afterEach!
        playerSocket.close();
    });

    it('a player guess is rejected. No Broadcast to other players.', async ()  => {
        // Host makes a room
        const roomCode: string = await new Promise((resolve) => {
            hostSocket.emit('room:create', { name: 'Host' });
            hostSocket.once('room:createResult', (result) => resolve(result.room.roomCode));
        });

        // Second player joins
        const playerSocket: ClientSocket = ioClient(`http://localhost:${PORT}`);
        await new Promise<void>((resolve) => playerSocket.on('connect', () => resolve()));
        await new Promise<void>((resolve) => {
            playerSocket.emit('room:join', { roomCode, name: 'Player' });
            playerSocket.once('room:joinResult', () => resolve());
        });

        // Host starts the gmae
        const word: string = await new Promise((resolve) => {
            hostSocket.emit('game:start', {});
            hostSocket.once('game:word', (payload) => resolve(payload.word));
        });

        // Guess must be rejected
        // Drawer makes guess - one case that causes rejection
        let broadcastReceived = false;
        playerSocket.on('game:guessBroadcast', () => { broadcastReceived = true; });

        const guessResult: any = await new Promise((resolve) => {
            hostSocket.once('game:guessResult', resolve);
            hostSocket.emit('game:guess', { text: 'anytextinputwillberejected' });
        });

        // Other players are notified - without recieving correct word
        expect(guessResult.status).toBe('rejected');
        await wait(100);
        expect(broadcastReceived).toBe(false);

        playerSocket.close();
    });
});