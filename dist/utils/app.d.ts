import express from 'express';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
export declare const createApp: (db: Pool, io?: SocketIOServer) => express.Application;
declare const app: express.Application;
export default app;
//# sourceMappingURL=app.d.ts.map