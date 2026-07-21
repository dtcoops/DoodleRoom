import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

import { registerRoomHandlers } from './rooms/registerRoomHandlers';

export function registerSocketHandlers(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: { origin: '*' },
    });

    const socketRoomMap = new Map<string, string>();

    io.on('connection', (socket) => {
        console.log('a client connected:', socket.id);

        registerRoomHandlers(io, socket, socketRoomMap);
    });

    return io;
}