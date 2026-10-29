import { create } from 'zustand';
import { socket } from '../socket';
import type { Player, Room, ClientGameState } from '../types/types';

export type LogEntry =
    | { type: 'system'; message: string }
    | { type: 'chat'; playerName: string; text: string }
    | { type: 'guess'; playerId: string; playerName: string; text?: string; correct: boolean };

interface GameStore {
    connected: boolean;
    room: Room | null;
    you: Player | null;
    errorMessage: string | null; // most recent error to be shown to client
    roomLog: LogEntry[];
    currentWord: string | null

    createRoom: (name: string) => void;
    joinRoom: (roomCode: string, name: string) => void;
    submitGuess: (text: string) => void;
    sendChat: (text: string) => void;
    clearError: () => void;
    returnToLobby: () => void;
    requestClearCanvas: () => void; 
    leaveRoom: () => void;
    startGame: () => void;
}

type JoinResult =
  | { success: true; room: Room }
  | { success: false; reason: string };

type CreateResult =
  | { success: true; room: Room }
  | { success: false; reason: string };

type LeaveResult =
  | { success: true; room: Room }
  | { success: false; reason: string };

export type GuessResult =
  | { status: 'correct'; points: number }
  | { status: 'incorrect' }
  | { status: 'rejected'; reason: string };

// The store is the only connection point between socket events and React state
// Client wants to perform an action, server decides the result, client is updated asynchronously
export const useGameStore = create<GameStore>((set, get) => ({
    connected: false,
    room: null,
    you: null,
    errorMessage: null,
    roomLog: [],
    currentWord: null,

    createRoom: (name) => {
        socket.connect();
        socket.emit('room:create', { name });
    },
    joinRoom: (roomCode, name) => {
        socket.connect();
        socket.emit('room:join', { roomCode, name });
    },
    submitGuess: (text) => {
        socket.emit('game:guess', { text });
    },
    sendChat: (text: string) => {
        socket.emit('room:chat', { text });
    },
    returnToLobby: () => {
        socket.emit('game:returnToLobby', {})
    },
    startGame: () => {
        socket.emit('game:start', {});
    },
    requestClearCanvas: () => {
        socket.emit('draw:clear');
    },
    clearError: () => set({ errorMessage: null }),
    leaveRoom: () => {
        const roomCode = get().room?.roomCode;
        if (!roomCode) {
            return;
        }
        socket.emit('room:leave', { roomCode });
    }
}));

socket.on('connect', () => 
    useGameStore.setState({ connected: true })
);

socket.on('disconnect', () => 
    useGameStore.setState({ connected: false })
);

socket.on('connect_error', () =>
    useGameStore.setState({ errorMessage: 'Could not reach the server. Retrying…' })
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
    useGameStore.setState((s): Partial<GameStore> => {
        if (!s.room) return {};
        const entry: LogEntry = { type: 'system', message: `${player.name}: connected to room` };
        return {
            room: { ...s.room, players: [...s.room.players, player] },
            roomLog: [...s.roomLog, entry],
        };
    });
});

socket.on('room:playerLeft', ({ playerId, hostId }: { playerId: string; hostId: string }) => {
    useGameStore.setState((s) => {
        if (!s.room) return {};

        const leavingPlayer = s.room.players.find((p) => p.id === playerId);
        const updatedPlayers = s.room.players.filter((p) => p.id !== playerId);
        const hostChanged = s.room.hostId !== hostId;

        const entries: LogEntry[] = [
            { type: 'system', message: `${leavingPlayer?.name ?? 'A player'}: left the room` },
        ];

        if (hostChanged) {
            const newHost = updatedPlayers.find((p) => p.id === hostId);
            entries.push({ type: 'system', message: `${newHost?.name ?? 'Someone'}: is now the host` });
        }

        return {
            room: { ...s.room, players: updatedPlayers, hostId },
            roomLog: [...s.roomLog, ...entries],
        };
    });
});

socket.on('room:leaveResult', (result: LeaveResult) => {
    if (result.success) {
        useGameStore.setState({ room: null, you: null, roomLog: [] });
    }
});

socket.on('room:chatMessage', (payload: { playerName: string; text: string }) => {
    useGameStore.setState((s) => {
        const entry: LogEntry = { type: 'chat', ...payload };
        return { roomLog: [...s.roomLog, entry] };
    });
});

socket.on('game:guessResult', (result: GuessResult) => {
    if (result.status === 'rejected') {
        useGameStore.setState({ errorMessage: result.reason });
    } 
});

socket.on('game:guessBroadcast', (payload: { playerId: string; playerName: string; text?: string; correct: boolean }) => {
    useGameStore.setState((s) => {
        const entry: LogEntry = { type: 'guess', ...payload };
        return { roomLog: [...s.roomLog, entry] };
    });
});

socket.on('game:state', (payload: ClientGameState & { players?: Player[] }) => {
    const { players, ...gameState } = payload;
    useGameStore.setState((s) => {
        if (!s.room) return {};

        const oldPhase = s.room.gameState.phase;
        const newPhase = gameState.phase;
        const isNewRound = s.room.gameState.roundNumber !== gameState.roundNumber;

        const entries: LogEntry[] = [];
        if (oldPhase !== 'DRAWING' && newPhase === 'DRAWING' && gameState.roundNumber === 1) {
            entries.push({ type: 'system', message: 'Game started!' });
        }
        if (oldPhase !== 'WAITING' && newPhase === 'WAITING') {
            entries.push({ type: 'system', message: 'Game ended — back to the lobby.' });
        }

        return {
            room: {
                ...s.room,
                gameState,
                players: players ?? s.room.players,
            },
            roomLog: isNewRound ? entries : [...s.roomLog, ...entries],
        };
    });
});

socket.on('game:returnToLobbyResult', (result: { success: boolean; reason?: string }) => {
    if (!result.success) {
        useGameStore.setState({ errorMessage: result.reason ?? 'Failed to return to lobby.' });
    }
});

socket.on('game:startResult', (result: { success: boolean; reason?: string }) => {
    if (!result.success) {
        useGameStore.setState((s) => {
            const entry: LogEntry = { type: 'system', message: result.reason ?? 'Failed to start game.' };
            return { roomLog: [...s.roomLog, entry] };
        });
    }
});

socket.on('game:word', ({ word }: { word: string }) => {
    useGameStore.setState({ currentWord: word });
});

socket.on('game:scores', ({ players }: { players: Player[] }) => {
    useGameStore.setState((s) =>
        s.room ? { room: { ...s.room, players } } : {}
    );
});