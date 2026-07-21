import { generateRoomCode } from "./roomCode";
import type { Room, JoinResult, Player, LeaveResult } from "./types";

// a mutable shared state for all players
const rooms: Map<string, Room> = new Map();

export function createRoom(host: Player): Room {
    const ATTEMPT_MAX = 10;
    let attempts = 0;
    let roomCode = generateRoomCode();
    
    while (rooms.has(roomCode)) {
        if (attempts >= ATTEMPT_MAX) {
        throw new Error("Failed to generate a unique room code after multiple attempts.");
        }
        roomCode = generateRoomCode();
        attempts++;
    }

    const room: Room = { 
        roomCode: roomCode, 
        hostId: host.id, 
        players: [host] 
    };
    rooms.set(roomCode, room);
    return room;
}

export function joinRoom(code: string, player: Player): JoinResult {
    const room = rooms.get(code);
    if (!room) {
        return { success: false, reason: "Room not found."};
    }

    room.players.push(player);
    return { success: true, room };
}

export function leaveRoom(code: string, playerId: string): LeaveResult {
    const room = rooms.get(code);
    
    const isInRoom = room?.players.some((p) => p.id === playerId);
    if (!room) {
        return { success: false, reason: "Room not found."};
    }
    if (!isInRoom) {
        return { success: false, reason: "Player not in Room."};
    }

    room.players = room.players.filter((p) => { return p.id !== playerId });

    if (room.players.length === 0) {
        rooms.delete(code);
        return { success: true, room};
    }

    if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
    }
    return { success: true, room};
}

export function _clearRoomsForTesting() {
  rooms.clear();
}