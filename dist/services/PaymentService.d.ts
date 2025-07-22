import { Pool } from 'pg';
import { PaymentIntent, PaymentTransaction, PaymentReceipt, CreatePaymentIntentRequest, ConfirmPaymentRequest, RefundPaymentRequest } from '../models/Payment';
import { StripeConfig } from './StripePaymentService';
export interface PaymentServiceConfig {
    stripe: StripeConfig;
}
export interface PaymentResult {
    success: boolean;
    paymentIntent?: PaymentIntent;
    transaction?: PaymentTransaction;
    receipt?: PaymentReceipt;
    error?: string;
}
export declare class PaymentService {
    private db;
    private stripeService;
    private pointsService;
    constructor(database: Pool, config: PaymentServiceConfig);
    createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentResult>;
    confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentResult>;
    refundPayment(request: RefundPaymentRequest): Promise<PaymentResult>;
    getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null>;
    getPaymentTransactions(bookingId: string): Promise<PaymentTransaction[]>;
    private handleMixedPayment;
    private confirmMixedPayment;
    private refundMixedPayment;
    private generateReceipt;
    private savePaymentIntent;
    private updatePaymentIntent;
    private saveTransaction;
    private saveReceipt;
    private generatePaymentIntentId;
    private generatePaymentMethodId;
    private generateReceiptId;
    private generateReceiptNumber;
}
//# sourceMappingURL=PaymentService.d.ts.map