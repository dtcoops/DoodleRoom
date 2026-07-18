import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { registerSocketHandlers } from './index';

describe('socket connection', () => {
  let httpServer: ReturnType<typeof createServer>;
  let clientSocket: ClientSocket;
  const PORT = 4001; // dont use same port as actual app

  beforeAll(() => {
    return new Promise<void>((resolve) => {
      httpServer = createServer();
      registerSocketHandlers(httpServer); // wires up io on this test server
      httpServer.listen(PORT, () => {
        clientSocket = ioClient(`http://localhost:${PORT}`);
        clientSocket.on('connect', () => resolve());
      });
    });
  });

  afterAll(() => {
    clientSocket.close();
    httpServer.close();
  });

  it('connects successfully', () => {
    expect(clientSocket.connected).toBe(true);
  });
});
