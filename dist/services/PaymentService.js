"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const Payment_1 = require("../models/Payment");
const StripePaymentService_1 = require("./StripePaymentService");
const PointsPaymentService_1 = require("./PointsPaymentService");
const PointsService_1 = require("./PointsService");
class PaymentService {
    constructor(database, config) {
        this.db = database;
        this.stripeService = new StripePaymentService_1.StripePaymentService(config.stripe);
        const pointsServiceInstance = new PointsService_1.PointsService(database);
        this.pointsService = new PointsPaymentService_1.PointsPaymentService(database, pointsServiceInstance);
    }
    async createPaymentIntent(request) {
        try {
            const { error, value } = Payment_1.CreatePaymentIntentSchema.validate(request);
            if (error) {
                return {
                    success: false,
                    error: `Validation error: ${error.details[0].message}`
                };
            }
            let result;
            switch (value.paymentMethod.type) {
                case 'credit_card':
                    const stripeResult = await this.stripeService.createPaymentIntent(value);
                    result = {
                        success: stripeResult.success,
                        paymentIntent: stripeResult.paymentIntent,
                        error: stripeResult.error
                    };
                    break;
                case 'points':
                    const pointsResult = await this.pointsService.createPointsPaymentIntent(value);
                    result = {
                        success: pointsResult.success,
                        paymentIntent: pointsResult.paymentIntent,
                        error: pointsResult.error
                    };
                    break;
                case 'mixed':
                    result = await this.handleMixedPayment(value);
                    break;
                default:
                    result = {
                        success: false,
                        error: 'Unsupported payment method type'
                    };
            }
            if (result.success && result.paymentIntent) {
                await this.savePaymentIntent(result.paymentIntent);
            }
            return result;
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown payment creation error'
            };
        }
    }
    async confirmPayment(request) {
        try {
            const { error, value } = Payment_1.ConfirmPaymentSchema.validate(request);
            if (error) {
                return {
                    success: false,
                    error: `Validation error: ${error.details[0].message}`
                };
            }
            const paymentIntent = await this.getPaymentIntent(value.paymentIntentId);
            if (!paymentIntent) {
                return {
                    success: false,
                    error: 'Payment intent not found'
                };
            }
            if (paymentIntent.status !== 'pending') {
                return {
                    success: false,
                    error: `Payment intent is in ${paymentIntent.status} status and cannot be confirmed`
                };
            }
            let result;
            switch (paymentIntent.paymentMethod.type) {
                case 'credit_card':
                    const stripeResult = await this.stripeService.confirmPayment(value, paymentIntent);
                    result = {
                        success: stripeResult.success,
                        paymentIntent: stripeResult.paymentIntent,
                        transaction: stripeResult.transaction,
                        error: stripeResult.error
                    };
                    break;
                case 'points':
                    const pointsResult = await this.pointsService.confirmPointsPayment(value, paymentIntent);
                    result = {
                        success: pointsResult.success,
                        paymentIntent: pointsResult.paymentIntent,
                        transaction: pointsResult.transaction,
                        error: pointsResult.error
                    };
                    break;
                case 'mixed':
                    result = await this.confirmMixedPayment(value, paymentIntent);
                    break;
                default:
                    result = {
                        success: false,
                        error: 'Unsupported payment method type'
                    };
            }
            if (result.success) {
                if (result.paymentIntent) {
                    await this.updatePaymentIntent(result.paymentIntent);
                }
                if (result.transaction) {
                    await this.saveTransaction(result.transaction);
                    result.receipt = await this.generateReceipt(result.transaction);
                }
            }
            return result;
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown payment confirmation error'
            };
        }
    }
    async refundPayment(request) {
        try {
            const { error, value } = Payment_1.RefundPaymentSchema.validate(request);
            if (error) {
                return {
                    success: false,
                    error: `Validation error: ${error.details[0].message}`
                };
            }
            const paymentIntent = await this.getPaymentIntent(value.paymentIntentId);
            if (!paymentIntent) {
                return {
                    success: false,
                    error: 'Payment intent not found'
                };
            }
            if (paymentIntent.status !== 'completed') {
                return {
                    success: false,
                    error: `Payment intent is in ${paymentIntent.status} status and cannot be refunded`
                };
            }
            let result;
            switch (paymentIntent.paymentMethod.type) {
                case 'credit_card':
                    const stripeResult = await this.stripeService.refundPayment(value, paymentIntent);
                    result = {
                        success: stripeResult.success,
                        transaction: stripeResult.transaction,
                        error: stripeResult.error
                    };
                    break;
                case 'points':
                    const pointsResult = await this.pointsService.refundPointsPayment(value, paymentIntent);
                    result = {
                        success: pointsResult.success,
                        transaction: pointsResult.transaction,
                        error: pointsResult.error
                    };
                    break;
                case 'mixed':
                    result = await this.refundMixedPayment(value, paymentIntent);
                    break;
                default:
                    result = {
                        success: false,
                        error: 'Unsupported payment method type'
                    };
            }
            if (result.success && result.transaction) {
                await this.saveTransaction(result.transaction);
            }
            return result;
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown refund error'
            };
        }
    }
    async getPaymentIntent(paymentIntentId) {
        try {
            const query = `
        SELECT id, booking_id, user_id, amount, currency, payment_method,
               status, provider_intent_id, metadata, created_at, updated_at
        FROM payment_intents
        WHERE id = $1
      `;
            const result = await this.db.query(query, [paymentIntentId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                bookingId: row.booking_id,
                userId: row.user_id,
                amount: parseFloat(row.amount),
                currency: row.currency,
                paymentMethod: row.payment_method,
                status: row.status,
                providerIntentId: row.provider_intent_id,
                metadata: row.metadata,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            };
        }
        catch (error) {
            throw new Error(`Failed to get payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getPaymentTransactions(bookingId) {
        try {
            const query = `
        SELECT id, payment_intent_id, booking_id, user_id, amount, currency,
               type, status, provider, provider_transaction_id, points_transaction,
               failure_reason, processed_at, created_at
        FROM payment_transactions
        WHERE booking_id = $1
        ORDER BY created_at DESC
      `;
            const result = await this.db.query(query, [bookingId]);
            return result.rows.map(row => ({
                id: row.id,
                paymentIntentId: row.payment_intent_id,
                bookingId: row.booking_id,
                userId: row.user_id,
                amount: parseFloat(row.amount),
                currency: row.currency,
                type: row.type,
                status: row.status,
                provider: row.provider,
                providerTransactionId: row.provider_transaction_id,
                pointsTransaction: row.points_transaction,
                failureReason: row.failure_reason,
                processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
                createdAt: new Date(row.created_at)
            }));
        }
        catch (error) {
            throw new Error(`Failed to get payment transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async handleMixedPayment(request) {
        try {
            if (!request.paymentMethod.creditCard || !request.paymentMethod.pointsUsed) {
                return {
                    success: false,
                    error: 'Mixed payment requires both credit card and points information'
                };
            }
            const pointsValue = request.paymentMethod.pointsUsed.cashComponent || 0;
            const creditCardAmount = request.amount - pointsValue;
            if (creditCardAmount < 0) {
                return {
                    success: false,
                    error: 'Points value exceeds total amount'
                };
            }
            const paymentIntent = {
                id: this.generatePaymentIntentId(),
                bookingId: request.bookingId,
                userId: request.userId,
                amount: request.amount,
                currency: request.currency,
                paymentMethod: {
                    ...request.paymentMethod,
                    id: this.generatePaymentMethodId(),
                    provider: 'stripe'
                },
                status: 'pending',
                metadata: {
                    ...request.metadata,
                    mixedPayment: true,
                    pointsValue: pointsValue,
                    creditCardAmount: creditCardAmount
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            return {
                success: true,
                paymentIntent
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown mixed payment error'
            };
        }
    }
    async confirmMixedPayment(request, paymentIntent) {
        try {
            const pointsValue = paymentIntent.metadata?.pointsValue || 0;
            const creditCardAmount = paymentIntent.metadata?.creditCardAmount || paymentIntent.amount;
            if (pointsValue > 0) {
                const pointsRequest = {
                    bookingId: paymentIntent.bookingId,
                    userId: paymentIntent.userId,
                    amount: pointsValue,
                    currency: paymentIntent.currency,
                    paymentMethod: {
                        type: 'points',
                        pointsUsed: paymentIntent.paymentMethod.pointsUsed,
                        totalAmount: pointsValue,
                        currency: paymentIntent.currency
                    }
                };
                const pointsResult = await this.pointsService.createPointsPaymentIntent(pointsRequest);
                if (!pointsResult.success || !pointsResult.paymentIntent) {
                    return {
                        success: false,
                        error: `Points payment failed: ${pointsResult.error}`
                    };
                }
                const pointsConfirmResult = await this.pointsService.confirmPointsPayment(request, pointsResult.paymentIntent);
                if (!pointsConfirmResult.success) {
                    return {
                        success: false,
                        error: `Points confirmation failed: ${pointsConfirmResult.error}`
                    };
                }
            }
            if (creditCardAmount > 0) {
                const stripeRequest = {
                    bookingId: paymentIntent.bookingId,
                    userId: paymentIntent.userId,
                    amount: creditCardAmount,
                    currency: paymentIntent.currency,
                    paymentMethod: {
                        type: 'credit_card',
                        creditCard: paymentIntent.paymentMethod.creditCard,
                        totalAmount: creditCardAmount,
                        currency: paymentIntent.currency
                    }
                };
                const stripeResult = await this.stripeService.createPaymentIntent(stripeRequest);
                if (!stripeResult.success || !stripeResult.paymentIntent) {
                    return {
                        success: false,
                        error: `Credit card payment failed: ${stripeResult.error}`
                    };
                }
                const stripeConfirmResult = await this.stripeService.confirmPayment(request, stripeResult.paymentIntent);
                if (!stripeConfirmResult.success) {
                    return {
                        success: false,
                        error: `Credit card confirmation failed: ${stripeConfirmResult.error}`
                    };
                }
            }
            const updatedPaymentIntent = {
                ...paymentIntent,
                status: 'completed',
                updatedAt: new Date()
            };
            return {
                success: true,
                paymentIntent: updatedPaymentIntent
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown mixed payment confirmation error'
            };
        }
    }
    async refundMixedPayment(request, paymentIntent) {
        try {
            const pointsValue = paymentIntent.metadata?.pointsValue || 0;
            const creditCardAmount = paymentIntent.metadata?.creditCardAmount || paymentIntent.amount;
            const refundAmount = request.amount || paymentIntent.amount;
            const pointsRefund = (pointsValue / paymentIntent.amount) * refundAmount;
            const creditCardRefund = (creditCardAmount / paymentIntent.amount) * refundAmount;
            const transactions = [];
            if (pointsRefund > 0) {
                const pointsRefundRequest = {
                    paymentIntentId: paymentIntent.id,
                    amount: pointsRefund,
                    reason: request.reason
                };
                const pointsResult = await this.pointsService.refundPointsPayment(pointsRefundRequest, paymentIntent);
                if (pointsResult.success && pointsResult.transaction) {
                    transactions.push(pointsResult.transaction);
                }
            }
            if (creditCardRefund > 0) {
                const stripeRefundRequest = {
                    paymentIntentId: paymentIntent.id,
                    amount: creditCardRefund,
                    reason: request.reason
                };
                const stripeResult = await this.stripeService.refundPayment(stripeRefundRequest, paymentIntent);
                if (stripeResult.success && stripeResult.transaction) {
                    transactions.push(stripeResult.transaction);
                }
            }
            return {
                success: transactions.length > 0,
                transaction: transactions[0]
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown mixed payment refund error'
            };
        }
    }
    async generateReceipt(transaction) {
        const receiptNumber = this.generateReceiptNumber();
        const receipt = {
            id: this.generateReceiptId(),
            paymentIntentId: transaction.paymentIntentId,
            bookingId: transaction.bookingId,
            userId: transaction.userId,
            receiptNumber: receiptNumber,
            totalAmount: transaction.amount,
            currency: transaction.currency,
            paymentBreakdown: {
                cashAmount: transaction.type === 'charge' ? transaction.amount : undefined,
                pointsUsed: transaction.pointsTransaction?.pointsUsed,
                pointsValue: transaction.pointsTransaction?.pointsValue,
                taxes: 0,
                fees: 0
            },
            paymentMethod: {
                id: this.generatePaymentMethodId(),
                type: transaction.pointsTransaction ? 'points' : 'credit_card',
                totalAmount: transaction.amount,
                currency: transaction.currency,
                provider: transaction.provider
            },
            issuedAt: new Date()
        };
        await this.saveReceipt(receipt);
        return receipt;
    }
    async savePaymentIntent(paymentIntent) {
        const query = `
      INSERT INTO payment_intents (
        id, booking_id, user_id, amount, currency, payment_method,
        status, provider_intent_id, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
        const values = [
            paymentIntent.id,
            paymentIntent.bookingId,
            paymentIntent.userId,
            paymentIntent.amount,
            paymentIntent.currency,
            JSON.stringify(paymentIntent.paymentMethod),
            paymentIntent.status,
            paymentIntent.providerIntentId,
            JSON.stringify(paymentIntent.metadata),
            paymentIntent.createdAt,
            paymentIntent.updatedAt
        ];
        await this.db.query(query, values);
    }
    async updatePaymentIntent(paymentIntent) {
        const query = `
      UPDATE payment_intents 
      SET status = $1, updated_at = $2
      WHERE id = $3
    `;
        await this.db.query(query, [paymentIntent.status, paymentIntent.updatedAt, paymentIntent.id]);
    }
    async saveTransaction(transaction) {
        const query = `
      INSERT INTO payment_transactions (
        id, payment_intent_id, booking_id, user_id, amount, currency,
        type, status, provider, provider_transaction_id, points_transaction,
        failure_reason, processed_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;
        const values = [
            transaction.id,
            transaction.paymentIntentId,
            transaction.bookingId,
            transaction.userId,
            transaction.amount,
            transaction.currency,
            transaction.type,
            transaction.status,
            transaction.provider,
            transaction.providerTransactionId,
            JSON.stringify(transaction.pointsTransaction),
            transaction.failureReason,
            transaction.processedAt,
            transaction.createdAt
        ];
        await this.db.query(query, values);
    }
    async saveReceipt(receipt) {
        const query = `
      INSERT INTO payment_receipts (
        id, payment_intent_id, booking_id, user_id, receipt_number,
        total_amount, currency, payment_breakdown, payment_method,
        issued_at, receipt_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
        const values = [
            receipt.id,
            receipt.paymentIntentId,
            receipt.bookingId,
            receipt.userId,
            receipt.receiptNumber,
            receipt.totalAmount,
            receipt.currency,
            JSON.stringify(receipt.paymentBreakdown),
            JSON.stringify(receipt.paymentMethod),
            receipt.issuedAt,
            receipt.receiptUrl
        ];
        await this.db.query(query, values);
    }
    generatePaymentIntentId() {
        return `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generatePaymentMethodId() {
        return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateReceiptId() {
        return `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateReceiptNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `RCP-${year}${month}${day}-${random}`;
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=PaymentService.js.map