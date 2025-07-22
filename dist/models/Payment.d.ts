import Joi from 'joi';
export type PaymentMethodType = 'credit_card' | 'points' | 'mixed';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentProvider = 'stripe' | 'points_system';
export interface CreditCardInfo {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    holderName: string;
}
export interface PointsPaymentInfo {
    program: string;
    points: number;
    cashComponent?: number;
    transferDetails?: {
        fromProgram: string;
        toProgram: string;
        transferRatio: number;
        transferredPoints: number;
    };
}
export interface PaymentMethod {
    id: string;
    type: PaymentMethodType;
    creditCard?: CreditCardInfo;
    pointsUsed?: PointsPaymentInfo;
    totalAmount: number;
    currency: string;
    provider: PaymentProvider;
    providerPaymentMethodId?: string;
}
export interface PaymentIntent {
    id: string;
    bookingId: string;
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    providerIntentId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaymentTransaction {
    id: string;
    paymentIntentId: string;
    bookingId: string;
    userId: string;
    amount: number;
    currency: string;
    type: 'charge' | 'refund' | 'points_redemption';
    status: PaymentStatus;
    provider: PaymentProvider;
    providerTransactionId?: string;
    pointsTransaction?: {
        program: string;
        pointsUsed: number;
        pointsValue: number;
    };
    failureReason?: string;
    processedAt?: Date;
    createdAt: Date;
}
export interface PaymentReceipt {
    id: string;
    paymentIntentId: string;
    bookingId: string;
    userId: string;
    receiptNumber: string;
    totalAmount: number;
    currency: string;
    paymentBreakdown: {
        cashAmount?: number;
        pointsUsed?: number;
        pointsValue?: number;
        taxes: number;
        fees: number;
    };
    paymentMethod: PaymentMethod;
    issuedAt: Date;
    receiptUrl?: string;
}
export interface CreatePaymentIntentRequest {
    bookingId: string;
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: Omit<PaymentMethod, 'id' | 'provider' | 'providerPaymentMethodId'>;
    metadata?: Record<string, any>;
}
export interface ConfirmPaymentRequest {
    paymentIntentId: string;
    paymentMethodDetails?: {
        stripePaymentMethodId?: string;
        pointsAccountId?: string;
    };
}
export interface RefundPaymentRequest {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
}
export declare const CreditCardInfoSchema: Joi.ObjectSchema<any>;
export declare const PointsPaymentInfoSchema: Joi.ObjectSchema<any>;
export declare const PaymentMethodSchema: Joi.ObjectSchema<any>;
export declare const CreatePaymentIntentSchema: Joi.ObjectSchema<any>;
export declare const ConfirmPaymentSchema: Joi.ObjectSchema<any>;
export declare const RefundPaymentSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=Payment.d.ts.map