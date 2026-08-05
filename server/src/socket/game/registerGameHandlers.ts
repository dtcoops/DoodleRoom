import { Server, Socket } from 'socket.io';
import { gameStart } from '../../game/gameManager';
import { getRoom } from '../../rooms/roomManager';
import { toPublicGameState } from '../../game/gameManager';

export function registerGameHandlers(io: Server, socket: Socket, socketRoomMap: Map<string, string>) {
    socket.on('game:start', ({ totalRounds }: { totalRounds?: number }) => {
        try {
            const roomCode = socketRoomMap.get(socket.id);
            if (!roomCode) {
                return;
            }
            const room = getRoom(roomCode);
            if (!room) {
                return;   
            }

            if (socket.id !== room.hostId) {
                socket.emit('game:startResult', { success: false, reason: 'Only the host can start the game.' });
                return;
            }

            gameStart(room, totalRounds);

            // Send sanitized state to everyone in the room
            const publicState = toPublicGameState(room.gameState);
            io.to(room.roomCode).emit('game:state', publicState);
            // Send the word to the Drawer
            if (!room.gameState.drawerId) {  // shouldn't happen — host is guaranteed present
                return;
            }
            const drawerSocket = io.sockets.sockets.get(room.gameState.drawerId);
            drawerSocket?.emit('game:word', {word: room.gameState.currentWord});
        } catch (error) {
            console.error('Failed to start game:', error);
        }
    });
}