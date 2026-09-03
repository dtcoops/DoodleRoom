import { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, leaveRoom } from '../../rooms/roomManager';
import { handlePlayerLeftDuringGame, clearRoundTimer, toPublicRoom } from '../../game/gameManager';
import { broadcastRoundState } from '../game/broadcastRoundState';
import { getRoom } from '../../rooms/roomManager';
import type { Player } from '../../types/types';

export function registerRoomHandlers(io: Server, socket: Socket, socketRoomMap: Map<string, string>) {
    socket.on('room:create', ({ name }: { name: string }) => {
        try {
             const trimmedName = name?.trim();
            if (!trimmedName) {
                socket.emit('room:createResult', { success: false, reason: 'A name is required.' });
                return;
            }

            const host: Player = { id: socket.id, name, score: 0 };
            const room = createRoom(host);

            socket.join(room.roomCode);
            socketRoomMap.set(socket.id, room.roomCode);

            socket.emit('room:createResult', { 
                success: true, 
                room: toPublicRoom(room) 
            });
        } catch (error) {
            console.error('Failed to create room:', error);
            socket.emit('room:createResult', {
                success: false,
                reason: 'Something went wrong creating the room. Please try again.',
            });
        }
    });

    socket.on('room:join', ({ roomCode, name }: { roomCode: string; name: string }) => {
        try {
            const player: Player = { id: socket.id, name, score: 0 };
            const result = joinRoom(roomCode, player);

            if (!result.success) {
                socket.emit('room:joinResult', { success: false, reason: result.reason });
                return;
            }

            socket.join(roomCode);
            socketRoomMap.set(socket.id, roomCode);

            socket.emit('room:joinResult', { 
                success: true, 
                room: toPublicRoom(result.room) 
            });
            // Notify everyone else already in the room that a new player joined
            socket.to(roomCode).emit('room:playerJoined', { player });
        } catch (error) {
            console.error('Failed to join room:', error);
            socket.emit('room:joinResult', {
                success: false,
                reason: 'Something went wrong joining the room. Please try again.',
            });
        }
    });

    socket.on('room:leave', ({ roomCode }: { roomCode: string; }) => {
        try {
            const result = leaveRoom(roomCode, socket.id);
            
            if (!result.success) {
                socket.emit('room:leaveResult', result);
                return;
            }

            socket.leave(roomCode);
            socketRoomMap.delete(socket.id);
            
            console.log('about to check roomDeleted');
            if (result.roomDeleted) {
                clearRoundTimer(result.room);
            } else {
                console.log('about to call handlePlayerLeftDuringGame');
                handlePlayerLeftDuringGame(result.room, socket.id, (updatedRoom) => {
                    console.log('about to broadcastRoundState');
                    broadcastRoundState(io, updatedRoom);
                    console.log('broadcastRoundState succeeded');
                });
                console.log('handlePlayerLeftDuringGame returned');
            }

            console.log('about to emit leaveResult');
            socket.emit('room:leaveResult', { 
                ...result, 
                room: toPublicRoom(result.room) 
            });
            console.log('about to emit playerLeft');
            socket.to(roomCode).emit('room:playerLeft', { playerId: socket.id, hostId: result.room.hostId });
            console.log('all emits succeeded');
        } catch (error) {
            console.error('Failed to leave room:', error);
        }
    });
    socket.on('room:chat', ({ text }: { text: string }) => {
        try {
            const roomCode = socketRoomMap.get(socket.id);
            if (!roomCode) return;

            const room = getRoom(roomCode);
            if (!room) return;

            const player = room.players.find((p) => p.id === socket.id);
            if (!player) return;

            const trimmedText = text?.trim();
            if (!trimmedText) return;

            io.to(roomCode).emit('room:chatMessage', {
                playerName: player.name,
                text: trimmedText,
            });
        } catch (error) {
            console.error('Failed to send chat message:', error);
        }
    });

    socket.on('disconnect', () => {
        try {
            const roomCode = socketRoomMap.get(socket.id);
            if (!roomCode) {
                return;
            }

            const result = leaveRoom(roomCode, socket.id);
            socketRoomMap.delete(socket.id);
            
            if (!result.success) {
                return
            }

            if (result.roomDeleted) {
                clearRoundTimer(result.room); // stop any pending timer for this now-dead room
            } else {
                handlePlayerLeftDuringGame(result.room, socket.id, (updatedRoom) => {
                    broadcastRoundState(io, updatedRoom);
                });
            }
            socket.to(roomCode).emit('room:playerLeft', { playerId: socket.id, hostId: result.room.hostId });
        } catch (error) {
            console.error(error)
        }
    })
}
