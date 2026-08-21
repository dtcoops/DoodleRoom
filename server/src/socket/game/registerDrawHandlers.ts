import type { Server, Socket } from 'socket.io';
import type { Room } from '../../types/types';
import { getRoom } from '../../rooms/roomManager';

export function registerDrawHandlers(io: Server, socket: Socket, socketRoomMap: Map<string, string>) {
    function isAuthorizedToDraw(room: Room | undefined): boolean {
        if (!room) {
            return false;
        }

        if (room.gameState.phase === 'WAITING') {
            return true;
        }

        return room.gameState.phase === 'DRAWING' && socket.id === room.gameState.drawerId;
    }

    socket.on('draw:segment', (segment) => {
        const roomCode = socketRoomMap.get(socket.id);
        if (!roomCode) {
            return;
        }

        const room = getRoom(roomCode);
        if (!isAuthorizedToDraw(room)) {
            return;
        }

        socket.to(roomCode).emit('draw:segment', segment);
    });

    socket.on('draw:clear', () => {
        const roomCode = socketRoomMap.get(socket.id);
        if (!roomCode) {
            return;
        }

        const room = getRoom(roomCode);
        if (!isAuthorizedToDraw(room)) {
            return;
        }

        socket.to(roomCode).emit('draw:clear');
    });
}