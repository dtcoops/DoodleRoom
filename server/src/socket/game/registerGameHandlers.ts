import { Server, Socket } from 'socket.io';
import { gameStart } from '../../game/gameManager';
import { getRoom } from '../../rooms/roomManager';
import { toPublicGameState } from '../../game/gameManager';
import { broadcastRoundState } from './broadcastRoundState';

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

            gameStart(room, totalRounds, (updatedRoom) => {
                broadcastRoundState(io, updatedRoom);
            });
        } catch (error) {
            console.error('Failed to start game:', error);
        }
    });
}