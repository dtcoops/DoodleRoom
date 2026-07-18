import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

export function registerSocketHandlers(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: { origin: '*' },
    });

    io.on('connection', (socket) => {
        console.log('a client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('client disconnected:', socket.id);
        });
    });

    return io;
}