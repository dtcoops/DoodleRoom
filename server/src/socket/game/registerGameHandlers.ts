import { Server, Socket } from 'socket.io';
import { gameStart, handleGuessSubmission } from '../../game/gameManager';
import { getRoom } from '../../rooms/roomManager';
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

    socket.on('game:guess', ({ text }: { text: string }) => {
        try {
            const roomCode = socketRoomMap.get(socket.id);
            if (!roomCode) {
                return;
            }

            const room = getRoom(roomCode);
            if (!room) {
                return;
            }

            const player = room.players.find((p) => p.id === socket.id);
            if (!player) {
                return;
            }

            const result = handleGuessSubmission(room, socket.id, text, (updatedRoom) => {
                broadcastRoundState(io, updatedRoom);
            });

            // The guesser always gets a detailed result
            socket.emit('game:guessResult', result);

            // Others will only hear about valid guesses
            if (result.status === 'incorrect') {
                // Show others an incorrect guess
                socket.to(roomCode).emit('game:guessBroadcast', {
                    playerId: socket.id,
                    playerName: player.name,
                    text,
                    correct: false,
                });
            } else if (result.status === 'correct') {
                // Omit Text - tell others a correct guess was made, but not what it was
                socket.to(roomCode).emit('game:guessBroadcast', {
                    playerId: socket.id,
                    playerName: player.name,
                    correct: true,
                });
            }
        } catch (error) {
            console.error('Failed to submit guess:', error);
        }
    });
}