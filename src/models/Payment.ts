import Joi from 'joi';

// Payment method types
export type PaymentMethodType = 'credit_card' | 'points' | 'mixed';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentProvider = 'stripe' | 'points_system';

// Core payment interfaces
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
  providerPaymentMethodId?: string; // Stripe payment method ID
}

export interface PaymentIntent {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  providerIntentId?: string; // Stripe payment intent ID
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

// Request/Response DTOs
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
  amount?: number; // Partial refund if specified
  reason?: string;
}

// Validation schemas
export const CreditCardInfoSchema = Joi.object({
  last4: Joi.string().length(4).pattern(/^[0-9]{4}$/).required(),
  brand: Joi.string().valid('visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay').required(),
  expiryMonth: Joi.number().integer().min(1).max(12).required(),
  expiryYear: Joi.number().integer().min(new Date().getFullYear()).required(),
  holderName: Joi.string().min(1).max(100).required()
});

export const PointsPaymentInfoSchema = Joi.object({
  program: Joi.string().min(1).max(50).required(),
  points: Joi.number().integer().min(1).required(),
  cashComponent: Joi.number().min(0).optional(),
  transferDetails: Joi.object({
    fromProgram: Joi.string().min(1).max(50).required(),
    toProgram: Joi.string().min(1).max(50).required(),
    transferRatio: Joi.number().min(0).required(),
    transferredPoints: Joi.number().integer().min(1).required()
  }).optional()
});

export const PaymentMethodSchema = Joi.object({
  type: Joi.string().valid('credit_card', 'points', 'mixed').required(),
  creditCard: Joi.when('type', {
    is: Joi.valid('credit_card', 'mixed'),
    then: CreditCardInfoSchema.required(),
    otherwise: Joi.optional()
  }),
  pointsUsed: Joi.when('type', {
    is: Joi.valid('points', 'mixed'),
    then: PointsPaymentInfoSchema.required(),
    otherwise: Joi.optional()
  }),
  totalAmount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().required()
});

export const CreatePaymentIntentSchema = Joi.object({
  bookingId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().required(),
  paymentMethod: PaymentMethodSchema.required(),
  metadata: Joi.object().optional()
});

export const ConfirmPaymentSchema = Joi.object({
  paymentIntentId: Joi.string().uuid().required(),
  paymentMethodDetails: Joi.object({
    stripePaymentMethodId: Joi.string().optional(),
    pointsAccountId: Joi.string().uuid().optional()
  }).optional()
});

export const RefundPaymentSchema = Joi.object({
  paymentIntentId: Joi.string().uuid().required(),
  amount: Joi.number().min(0).optional(),
  reason: Joi.string().max(500).optional()
});