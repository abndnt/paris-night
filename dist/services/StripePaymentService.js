"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripePaymentService = void 0;
const stripe_1 = __importDefault(require("stripe"));
class StripePaymentService {
    constructor(config) {
        this.stripe = new stripe_1.default(config.secretKey, {
            apiVersion: config.apiVersion
        });
        this.webhookSecret = config.webhookSecret;
    }
    async createPaymentIntent(request) {
        try {
            const amountInCents = Math.round(request.amount * 100);
            const stripePaymentIntent = await this.stripe.paymentIntents.create({
                amount: amountInCents,
                currency: request.currency.toLowerCase(),
                metadata: {
                    bookingId: request.bookingId,
                    userId: request.userId,
                    ...request.metadata
                },
                automatic_payment_methods: {
                    enabled: true
                },
                capture_method: 'automatic',
                confirmation_method: 'automatic'
            });
            const paymentIntent = {
                id: this.generatePaymentIntentId(),
                bookingId: request.bookingId,
                userId: request.userId,
                amount: request.amount,
                currency: request.currency,
                paymentMethod: {
                    ...request.paymentMethod,
                    id: this.generatePaymentMethodId(),
                    provider: 'stripe',
                    providerPaymentMethodId: stripePaymentIntent.id
                },
                status: this.mapStripeStatusToPaymentStatus(stripePaymentIntent.status),
                providerIntentId: stripePaymentIntent.id,
                metadata: request.metadata,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            return {
                success: true,
                paymentIntent
            };
        }
        catch (error) {
            return this.handleStripeError(error);
        }
    }
    async confirmPayment(request, paymentIntent) {
        try {
            if (!paymentIntent.providerIntentId) {
                throw new Error('No Stripe payment intent ID found');
            }
            const confirmParams = {};
            if (request.paymentMethodDetails?.stripePaymentMethodId) {
                confirmParams.payment_method = request.paymentMethodDetails.stripePaymentMethodId;
            }
            const stripePaymentIntent = await this.stripe.paymentIntents.confirm(paymentIntent.providerIntentId, confirmParams);
            const updatedPaymentIntent = {
                ...paymentIntent,
                status: this.mapStripeStatusToPaymentStatus(stripePaymentIntent.status),
                updatedAt: new Date()
            };
            let transaction;
            if (stripePaymentIntent.status === 'succeeded') {
                transaction = {
                    id: this.generateTransactionId(),
                    paymentIntentId: paymentIntent.id,
                    bookingId: paymentIntent.bookingId,
                    userId: paymentIntent.userId,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    type: 'charge',
                    status: 'completed',
                    provider: 'stripe',
                    providerTransactionId: stripePaymentIntent.id,
                    processedAt: new Date(),
                    createdAt: new Date()
                };
            }
            return {
                success: true,
                paymentIntent: updatedPaymentIntent,
                transaction
            };
        }
        catch (error) {
            return this.handleStripeError(error);
        }
    }
    async refundPayment(request, paymentIntent) {
        try {
            if (!paymentIntent.providerIntentId) {
                throw new Error('No Stripe payment intent ID found');
            }
            const refundParams = {
                payment_intent: paymentIntent.providerIntentId
            };
            if (request.amount && request.amount < paymentIntent.amount) {
                refundParams.amount = Math.round(request.amount * 100);
            }
            if (request.reason) {
                refundParams.reason = 'requested_by_customer';
                refundParams.metadata = {
                    reason: request.reason
                };
            }
            const stripeRefund = await this.stripe.refunds.create(refundParams);
            const transaction = {
                id: this.generateTransactionId(),
                paymentIntentId: paymentIntent.id,
                bookingId: paymentIntent.bookingId,
                userId: paymentIntent.userId,
                amount: request.amount || paymentIntent.amount,
                currency: paymentIntent.currency,
                type: 'refund',
                status: this.mapStripeRefundStatusToPaymentStatus(stripeRefund.status),
                provider: 'stripe',
                providerTransactionId: stripeRefund.id,
                processedAt: stripeRefund.status === 'succeeded' ? new Date() : undefined,
                createdAt: new Date()
            };
            return {
                success: true,
                transaction
            };
        }
        catch (error) {
            return this.handleStripeError(error);
        }
    }
    async retrievePaymentIntent(stripePaymentIntentId) {
        try {
            return await this.stripe.paymentIntents.retrieve(stripePaymentIntentId);
        }
        catch (error) {
            if (error instanceof stripe_1.default.errors.StripeError && error.code === 'resource_missing') {
                return null;
            }
            throw error;
        }
    }
    async handleWebhook(payload, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
            switch (event.type) {
                case 'payment_intent.succeeded':
                case 'payment_intent.payment_failed':
                case 'payment_intent.canceled':
                    break;
                case 'charge.dispute.created':
                    break;
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
            return { success: true, event };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown webhook error'
            };
        }
    }
    async createSetupIntent(customerId) {
        return await this.stripe.setupIntents.create({
            customer: customerId,
            automatic_payment_methods: {
                enabled: true
            }
        });
    }
    async createCustomer(userId, email, name) {
        const existingCustomers = await this.stripe.customers.list({
            email: email,
            limit: 1
        });
        if (existingCustomers.data.length > 0) {
            return existingCustomers.data[0];
        }
        return await this.stripe.customers.create({
            email: email,
            name: name,
            metadata: {
                userId: userId
            }
        });
    }
    async listCustomerPaymentMethods(customerId) {
        const paymentMethods = await this.stripe.paymentMethods.list({
            customer: customerId,
            type: 'card'
        });
        return paymentMethods.data;
    }
    mapStripeStatusToPaymentStatus(stripeStatus) {
        switch (stripeStatus) {
            case 'requires_payment_method':
            case 'requires_confirmation':
            case 'requires_action':
                return 'pending';
            case 'processing':
                return 'processing';
            case 'succeeded':
                return 'completed';
            case 'canceled':
                return 'cancelled';
            default:
                return 'failed';
        }
    }
    mapStripeRefundStatusToPaymentStatus(stripeStatus) {
        switch (stripeStatus) {
            case 'pending':
                return 'processing';
            case 'succeeded':
                return 'refunded';
            case 'failed':
                return 'failed';
            case 'canceled':
                return 'cancelled';
            default:
                return 'failed';
        }
    }
    handleStripeError(error) {
        if (error instanceof stripe_1.default.errors.StripeError) {
            return {
                success: false,
                error: error.message,
                stripeError: error
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown Stripe error'
        };
    }
    generatePaymentIntentId() {
        return `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generatePaymentMethodId() {
        return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateTransactionId() {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.StripePaymentService = StripePaymentService;
//# sourceMappingURL=StripePaymentService.js.map