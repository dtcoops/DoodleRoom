import type { Server } from 'socket.io';
import type { Room } from '../../types/types';
import { toPublicGameState } from '../../game/gameManager';

export function broadcastRoundState(io: Server, room: Room): void {
    const publicState = toPublicGameState(room.gameState);
    io.to(room.roomCode).emit('game:state', publicState);

    if (room.gameState.drawerId) {
        const drawerSocket = io.sockets.sockets.get(room.gameState.drawerId);
        drawerSocket?.emit('game:word', { word: room.gameState.currentWord });
    }
}