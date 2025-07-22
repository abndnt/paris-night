import Stripe from 'stripe';
import { PaymentIntent, PaymentTransaction, CreatePaymentIntentRequest, ConfirmPaymentRequest, RefundPaymentRequest } from '../models/Payment';
export interface StripeConfig {
    secretKey: string;
    webhookSecret: string;
    apiVersion: string;
}
export interface StripePaymentResult {
    success: boolean;
    paymentIntent?: PaymentIntent;
    transaction?: PaymentTransaction;
    error?: string;
    stripeError?: Stripe.StripeError;
}
export declare class StripePaymentService {
    private stripe;
    private webhookSecret;
    constructor(config: StripeConfig);
    createPaymentIntent(request: CreatePaymentIntentRequest): Promise<StripePaymentResult>;
    confirmPayment(request: ConfirmPaymentRequest, paymentIntent: PaymentIntent): Promise<StripePaymentResult>;
    refundPayment(request: RefundPaymentRequest, paymentIntent: PaymentIntent): Promise<StripePaymentResult>;
    retrievePaymentIntent(stripePaymentIntentId: string): Promise<Stripe.PaymentIntent | null>;
    handleWebhook(payload: string, signature: string): Promise<{
        success: boolean;
        event?: Stripe.Event;
        error?: string;
    }>;
    createSetupIntent(customerId: string): Promise<Stripe.SetupIntent>;
    createCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer>;
    listCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]>;
    private mapStripeStatusToPaymentStatus;
    private mapStripeRefundStatusToPaymentStatus;
    private handleStripeError;
    private generatePaymentIntentId;
    private generatePaymentMethodId;
    private generateTransactionId;
}
//# sourceMappingURL=StripePaymentService.d.ts.map