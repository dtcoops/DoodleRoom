import { generateRoomCode } from "./roomCode";
import type { Room, JoinResult, Player } from "./types";

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

export function leaveRoom(code: string, player: Player): void {
    const room = rooms.get(code);
    
    const isInRoom = room?.players.some((p) => p.id === player.id);
    if (!room || !isInRoom) {
        return;
    }

    room.players = room.players.filter((p) => { return p.id !== player.id });

    if (room.players.length === 0) {
        rooms.delete(code);
        return;
    }

    if (room.hostId === player.id) {
        room.hostId = room.players[0].id;
    }
}

export function _clearRoomsForTesting() {
  rooms.clear();
}