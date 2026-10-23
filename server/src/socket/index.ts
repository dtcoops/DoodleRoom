import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

import { registerRoomHandlers } from './rooms/registerRoomHandlers';
import { registerGameHandlers } from './game/registerGameHandlers';
import { registerDrawHandlers } from './game/registerDrawHandlers';

export function registerSocketHandlers(httpServer: HttpServer): Server {
    const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim());

    const io = new Server(httpServer, {
        cors: { origin: allowedOrigins },
    });

    const socketRoomMap = new Map<string, string>();

    io.on('connection', (socket) => {
        console.log('a client connected:', socket.id);

        registerRoomHandlers(io, socket, socketRoomMap);
        registerGameHandlers(io, socket, socketRoomMap);
        registerDrawHandlers(io, socket, socketRoomMap);
    });

    return io;
}