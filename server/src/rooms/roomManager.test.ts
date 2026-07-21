import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoom, joinRoom, leaveRoom, _clearRoomsForTesting} from "./roomManager";
import type { Player } from './types';

vi.mock('./roomCode', () => ({
    generateRoomCode: () => 'AAAA',
}));

beforeEach(() => {
    _clearRoomsForTesting();
});

describe('Create Room', () => {
    it('creates a room with the host as the sole player', () => {
        const host: Player = { id: 'player-1', name: "daniel" };
        // roomCode will always be mock - randomness tested in roomCode.test
        const room = createRoom(host);
        
        expect(room.hostId).toBe(host.id);
        expect(room.players).toEqual([host]);
    });

     it('throws after exceeding max attempts if every code collides', () => {
        const host: Player = { id: 'p1', name: 'Alanna' };
        createRoom(host);

        // Second call will collide every single attempt, since the mock never varies
        const host2: Player = { id: 'p2', name: 'Bob' };
        expect(() => createRoom(host2)).toThrow();
    });
});

describe('Join Room', () => {
    it('join an already created room', () => {
        const host: Player = { id: 'player-1', name: "host" };
        const player: Player = { id: 'player-2', name: "invitee" };

        const room = createRoom(host);
        joinRoom(room.roomCode, player);

        expect(room.players).toEqual([host, player]);
    });

    it('returns a failure result when the room does not exist', () => {
        const player: Player = { id: 'player-2', name: 'invitee' };
        const result = joinRoom('FAKECODE', player);

        expect(result.success).toBe(false);
    });
});

describe('Leave Room', () => {
    it('player leaves a room they have joined', () => {
        const host: Player = { id: 'player-1', name: "host" };
        const player: Player = { id: 'player-2', name: "invitee" };

        const room = createRoom(host);
        joinRoom(room.roomCode, player);
        leaveRoom(room.roomCode, player.id);

        expect(room.players).toEqual([host]);
    });

    it('player and host leave the room', () => {
        const host: Player = { id: 'player-1', name: "host" };
        const player: Player = { id: 'player-2', name: "invitee" };

        const room = createRoom(host);
        joinRoom(room.roomCode, player);
        leaveRoom(room.roomCode, player.id);
        leaveRoom(room.roomCode, host.id);

        // An Empty Room deletes itself
        // Can't check with room as it is a local variable
        // Need to access roomMananger.rooms which is private
        // joinRoom has a check for if room is found in rooms.
        const rejoinAttempt = joinRoom(room.roomCode, player);
        expect(rejoinAttempt.success).toBe(false);
    });

    it('reassigns host if the host leaves and other players remain', () => {
        const host: Player = { id: 'player-1', name: "host" };
        const player: Player = { id: 'player-2', name: "invitee" };

        const room = createRoom(host);
        joinRoom(room.roomCode, player);
        leaveRoom(room.roomCode, host.id);

        expect(room.hostId).toBe(player.id);
    });
});