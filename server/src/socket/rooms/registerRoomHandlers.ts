import { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, leaveRoom } from '../../rooms/roomManager';
import type { Player } from '../../rooms/types';
import { resourceLimits } from 'node:worker_threads';

export function registerRoomHandlers(io: Server, socket: Socket, socketRoomMap: Map<string, string>) {
    socket.on('room:create', ({ name }: { name: string }) => {
        try {
            const host: Player = { id: socket.id, name };
            const room = createRoom(host);

            socket.join(room.roomCode);
            socketRoomMap.set(socket.id, room.roomCode);

            socket.emit('room:createResult', { success: true, room });
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
            const player: Player = { id: socket.id, name };
            const result = joinRoom(roomCode, player);

            if (!result.success) {
                socket.emit('room:joinResult', { success: false, reason: result.reason });
                return;
            }

            socket.join(roomCode);
            socketRoomMap.set(socket.id, roomCode);

            socket.emit('room:joinResult', { success: true, room: result.room });
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

            socket.emit('room:leaveResult', result);
            socket.to(roomCode).emit('room:playerLeft', { playerId: socket.id });
        } catch (error) {
            console.error('Failed to leave room:', error);
        }
    });

    socket.on('disconnect', () => {
        try {
            const roomCode = socketRoomMap.get(socket.id);
            if (!roomCode) {
                return;
            }

            leaveRoom(roomCode, socket.id);
            socketRoomMap.delete(socket.id);

            socket.to(roomCode).emit('room:playerLeft', { playerId: socket.id });
        } catch (error) {
            console.error(error)
        }
    })
}
