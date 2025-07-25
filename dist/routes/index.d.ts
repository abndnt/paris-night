import { Router } from 'express';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
export declare function createRouter(db: Pool, io?: SocketIOServer): Router;
declare const router: Router;
export default router;
//# sourceMappingURL=index.d.ts.map