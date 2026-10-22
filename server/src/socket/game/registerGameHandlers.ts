import { Server, Socket } from 'socket.io';
import { gameStart, handleGuessSubmission, returnToLobby } from '../../game/gameManager';
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

            const result = gameStart(room, totalRounds, (updatedRoom) => {
                broadcastRoundState(io, updatedRoom);
            });

            if (!result.success) {
                socket.emit('game:startResult', result);
                return;
            }
            
            socket.emit('game:startResult', { success: true });
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

                // new: send updated scores to everyone, including the guesser
                io.to(roomCode).emit('game:scores', { players: room.players });
            }
        } catch (error) {
            console.error('Failed to submit guess:', error);
        }
    });

    socket.on('game:returnToLobby', () => {
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
                socket.emit('game:returnToLobbyResult', { success: false, reason: 'Only the host can end the game early' });
                return;
            }

            returnToLobby(room)
            broadcastRoundState(io, room);
            
            socket.emit('game:returnToLobbyResult', { success: true });
        } catch (error) {
            console.error('Failed to return to lobby:', error);
        }
    });
}