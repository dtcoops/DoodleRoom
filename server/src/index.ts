import express from 'express';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import { createServer } from 'http';
import { registerSocketHandlers } from './socket';

dotenv.config();
const app = express();

app.get('/health', (req: Request, res: Response) => {
    res.json({ ok: true });
});

// node.io
const httpServer = createServer(app);
registerSocketHandlers(httpServer);

const PORT = process.env.PORT || 4000;

// httpServer not App
// httpServer holds both Express and Socket.io
httpServer.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`)
});