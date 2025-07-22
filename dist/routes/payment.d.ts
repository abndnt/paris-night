import { Pool } from 'pg';
import { PaymentServiceConfig } from '../services/PaymentService';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
            };
        }
    }
}
declare const router: import("express-serve-static-core").Router;
declare const initializePaymentRoutes: (database: Pool, config: PaymentServiceConfig) => void;
export { router as paymentRouter, initializePaymentRoutes };
//# sourceMappingURL=payment.d.ts.map