import { io, Socket } from 'socket.io-client';

const serverURL = import.meta.env.VITE_SERVER_URL

if (!serverURL) {
    throw new Error('VITE_SERVER_URL is not defined — check your .env file.');
}

// exportable singleton socket instance for a client
// autoconnect is false - will only attempt a connection when
// player creates or joins a room
export const socket: Socket = io(serverURL, { autoConnect: false, });