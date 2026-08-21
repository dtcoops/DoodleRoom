import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import type { DrawSegment } from '../../types/types';

import { registerSocketHandlers } from '../index';

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('draw:segment', () => {
    let httpServer: ReturnType<typeof createServer>;
    let hostSocket: ClientSocket;
    const PORT = 4007; // make sure it does not use the same as app or other test packages.

    const testSegment: DrawSegment = { x0: 0, y0: 0, x1: 10, y1: 10, color: '#000000', width: 3 };

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

    it('blocks a non-drawer from broadcasting a stroke during DRAWING', async () => {
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

        // Host starts the game and is the Drawer by default 
        const word: string = await new Promise((resolve) => {
            hostSocket.emit('game:start', {});
            hostSocket.once('game:word', (payload) => resolve(payload.word));
        });

        // playerSocket (non-drawer) tries to emit draw:segment during DRAWING phase
        // Host listens for a draw
        let hostReceivedSegment = false;
        hostSocket.on('draw:segment', () => { hostReceivedSegment = true; });

        playerSocket.emit('draw:segment', testSegment);
        await wait(100); // wait to arrive
        expect(hostReceivedSegment).toBe(false);

        playerSocket.close();
    });

    it('allows the drawer to broadcast a stroke during DRAWING', async () => {
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

        // Host starts the game and is the Drawer by default 
        const word: string = await new Promise((resolve) => {
            hostSocket.emit('game:start', {});
            hostSocket.once('game:word', (payload) => resolve(payload.word));
        });

        // During DRAWING phase, the players listen for draw:segment
        const receivedSegmentPromise: Promise<DrawSegment> = new Promise((resolve) => {
            playerSocket.once('draw:segment', (segment) => resolve(segment));
        });

        hostSocket.emit('draw:segment', testSegment);

        const receivedSegment = await receivedSegmentPromise;
        expect(receivedSegment).toEqual(testSegment);

        playerSocket.close();
    });

    it('clears the canvas for everyone when the game starts', async () => {
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

        // The canvas should clear on game start
        const clearPromise = new Promise<void>((resolve) => playerSocket.once('draw:clear', () => resolve()));

        hostSocket.emit('game:start', {});
        await clearPromise; // will hang/timeout if draw:clear never arrives

        playerSocket.close();
    });

    it('allows any player to draw during WAITING (lobby doodling)', async () => {
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

        // No game:start — still in WAITING phase. The second player (not a "drawer") should still be able to draw.
        const receivedSegmentPromise: Promise<DrawSegment> = new Promise((resolve) => {
            hostSocket.once('draw:segment', (segment) => resolve(segment));
        });

        playerSocket.emit('draw:segment', testSegment);

        const receivedSegment = await receivedSegmentPromise;
        expect(receivedSegment).toEqual(testSegment);

        playerSocket.close();
    });
});