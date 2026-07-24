import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { registerSocketHandlers } from '../index';
import { createRoom } from '../../rooms/roomManager';

describe('Room Socket Handlers', () => {
    let httpServer: ReturnType<typeof createServer>;
    let hostSocket: ClientSocket;
    const PORT = 4002; // make sure it does not use the same as app or other test packages.

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

    it('creates a room successfully', () => {
        return new Promise<void>((resolve) => {
            hostSocket.emit('room:create', { name: 'Alanna' });

            hostSocket.on('room:createResult', (result) => {
                expect(result.success).toBe(true);
                expect(result.room.players).toHaveLength(1);
                resolve();
            });
        });
    });

    it('a second player can join and the host is notified', () => {
        return new Promise<void>((resolve) => {
            // Step 1: host creates a fresh room for this test
            hostSocket.emit('room:create', { name: 'Host' });

            hostSocket.once('room:createResult', (createResult) => {
                expect(createResult.success).toBe(true);
                const roomCode = createResult.room.roomCode;

                // Step 2: connect a second client
                const playerSocket: ClientSocket = ioClient(`http://localhost:${PORT}`);

                playerSocket.on('connect', () => {
                    // Step 3: second player joins the room we just created
                    playerSocket.emit('room:join', { roomCode, name: 'Player' });
                });

                // Step 4: wait for the joiner's own confirmation
                playerSocket.once('room:joinResult', (joinResult) => {
                    expect(joinResult.success).toBe(true);
                });

                // Step 5: wait for the HOST to be told someone joined
                hostSocket.once('room:playerJoined', (payload) => {
                    expect(payload.player.name).toBe('Player');
                    playerSocket.close(); // cleanup this test's extra client
                    resolve(); // only now is the test truly done
                });
            });
        });
    });

    it('when a player leaves, the host is notified', () => {
        return new Promise<void>((resolve) => {
            hostSocket.emit('room:create', { name: 'Alanna' });

            hostSocket.once('room:createResult', (createResult) => {
                const roomCode = createResult.room.roomCode;
                const playerSocket: ClientSocket = ioClient(`http://localhost:${PORT}`);

                playerSocket.on('connect', () => {
                    playerSocket.emit('room:join', { roomCode, name: 'Bob' });
                });

                playerSocket.once('room:joinResult', () => {
                    // now that they've joined, have them leave
                    playerSocket.emit('room:leave', { roomCode });
                });

                hostSocket.once('room:playerLeft', (payload) => {
                    expect(payload.playerId).toBe(playerSocket.id);
                    playerSocket.close();
                    resolve();
                });
            });
        });
    });

    it('when a player disconnects, the host is notified', () => {
        return new Promise<void>((resolve) => {
            hostSocket.emit('room:create', { name: 'Alanna' });

            hostSocket.once('room:createResult', (createResult) => {
                const roomCode = createResult.room.roomCode;
                const playerSocket: ClientSocket = ioClient(`http://localhost:${PORT}`);

                playerSocket.on('connect', () => {
                    playerSocket.emit('room:join', { roomCode, name: 'Bob' });
                });

                playerSocket.once('room:joinResult', () => {
                    const disconnectedId = playerSocket.id; // capture before disconnecting — same gotcha as your earlier disconnect test!
                    playerSocket.disconnect(); // simulates a dropped connection, not an explicit leave

                    hostSocket.once('room:playerLeft', (payload) => {
                        expect(payload.playerId).toBe(disconnectedId);
                        resolve();
                    });
                });
            });
        });
    });

    it('returns a failure result when joining a nonexistent room', () => {
        return new Promise<void>((resolve) => {
            hostSocket.emit('room:join', { roomCode: 'FAKECODE', name: 'Nobody' });

            hostSocket.once('room:joinResult', (result) => {
                expect(result.success).toBe(false);
                resolve();
            });
        });
    });
});