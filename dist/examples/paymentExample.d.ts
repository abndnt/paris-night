import { Pool } from 'pg';
import { PaymentServiceConfig } from '../services/PaymentService';
export declare class PaymentExample {
    private paymentService;
    constructor(database: Pool, config: PaymentServiceConfig);
    processCreditCardPayment(): Promise<void>;
    processPointsPayment(): Promise<void>;
    processMixedPayment(): Promise<void>;
    processRefund(paymentIntentId: string): Promise<void>;
    getBookingTransactions(bookingId: string): Promise<void>;
    runAllExamples(): Promise<void>;
}
export declare function runPaymentExamples(): Promise<void>;
export default PaymentExample;
//# sourceMappingURL=paymentExample.d.ts.map