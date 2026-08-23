import { create } from 'zustand';
import { socket } from '../socket';
import type { Player, Room } from '../types/types';

interface GameStore {
    connected: boolean;
    room: Room | null;
    you: Player | null;
    errorMessage: string | null; // most recent error to be shown to client

    createRoom: (name: string) => void;
    joinRoom: (roomCode: string, name: string) => void;
    clearError: () => void;
}

type JoinResult =
  | { success: true; room: Room }
  | { success: false; reason: string };

type CreateResult =
  | { success: true; room: Room }
  | { success: false; reason: string };

// The store is the only connection point between socket events and React state
// Client wants to perform an action, server decides the result, client is updated asynchronously
export const useGameStore = create<GameStore>((set) => ({
    connected: false,
    room: null,
    you: null,
    errorMessage: null,
    createRoom: (name) => {
        socket.connect();
        socket.emit('room:create', { name });
    },
    joinRoom: (roomCode, name) => {
        socket.connect();
        socket.emit('room:join', { roomCode, name });
    },
    clearError: () => set({ errorMessage: null }),
}));

socket.on('connect', () => 
    useGameStore.setState({ connected: true })
);

socket.on('disconnect', () => 
    useGameStore.setState({ connected: false })
);

socket.on('room:createResult', (result: CreateResult) => {
    if (result.success) {
        const you = result.room.players.find((p) => p.id === socket.id);
        useGameStore.setState({ room: result.room, you, errorMessage: null });
    } else {
        useGameStore.setState({ errorMessage: result.reason });
    }
});

socket.on('room:joinResult', (result: JoinResult) => {
    if (result.success) {
        const you = result.room.players.find((p) => p.id === socket.id);
        useGameStore.setState({ room: result.room, you, errorMessage: null });
    } else {
        useGameStore.setState({ errorMessage: result.reason });
    }
});

socket.on('room:playerJoined', ({ player }) => {
    useGameStore.setState((s) => s.room ? { room: { ...s.room, players: [...s.room.players, player] } } : {});
});

socket.on('room:playerLeft', ({ playerId }) => {
    useGameStore.setState((s) => s.room ? {
        room: { ...s.room, players: s.room.players.filter((p) => p.id !== playerId) }
    } : {});
});