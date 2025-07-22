"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePaymentRoutes = exports.paymentRouter = void 0;
const express_1 = require("express");
const PaymentService_1 = require("../services/PaymentService");
const router = (0, express_1.Router)();
exports.paymentRouter = router;
let paymentService;
const initializePaymentRoutes = (database, config) => {
    paymentService = new PaymentService_1.PaymentService(database, config);
};
exports.initializePaymentRoutes = initializePaymentRoutes;
router.post('/intents', async (req, res) => {
    try {
        const request = req.body;
        if (!request.userId && req.user?.id) {
            request.userId = req.user.id;
        }
        const result = await paymentService.createPaymentIntent(request);
        if (!result.success) {
            res.status(400).json({
                error: result.error,
                code: 'PAYMENT_INTENT_CREATION_FAILED'
            });
            return;
        }
        res.status(201).json({
            paymentIntent: result.paymentIntent,
            clientSecret: result.paymentIntent?.providerIntentId
        });
    }
    catch (error) {
        console.error('Payment intent creation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.post('/intents/:id/confirm', async (req, res) => {
    try {
        const paymentIntentId = req.params['id'];
        if (!paymentIntentId) {
            res.status(400).json({
                error: 'Payment intent ID is required',
                code: 'MISSING_PAYMENT_INTENT_ID'
            });
            return;
        }
        const request = {
            paymentIntentId,
            paymentMethodDetails: req.body.paymentMethodDetails
        };
        const result = await paymentService.confirmPayment(request);
        if (!result.success) {
            res.status(400).json({
                error: result.error,
                code: 'PAYMENT_CONFIRMATION_FAILED'
            });
            return;
        }
        res.json({
            paymentIntent: result.paymentIntent,
            transaction: result.transaction,
            receipt: result.receipt
        });
    }
    catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.get('/intents/:id', async (req, res) => {
    try {
        const paymentIntentId = req.params['id'];
        if (!paymentIntentId) {
            res.status(400).json({
                error: 'Payment intent ID is required',
                code: 'MISSING_PAYMENT_INTENT_ID'
            });
            return;
        }
        const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);
        if (!paymentIntent) {
            res.status(404).json({
                error: 'Payment intent not found',
                code: 'PAYMENT_INTENT_NOT_FOUND'
            });
            return;
        }
        if (req.user?.id && paymentIntent.userId !== req.user.id) {
            res.status(403).json({
                error: 'Access denied',
                code: 'ACCESS_DENIED'
            });
            return;
        }
        res.json({ paymentIntent });
    }
    catch (error) {
        console.error('Get payment intent error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.post('/intents/:id/refund', async (req, res) => {
    try {
        const paymentIntentId = req.params['id'];
        if (!paymentIntentId) {
            res.status(400).json({
                error: 'Payment intent ID is required',
                code: 'MISSING_PAYMENT_INTENT_ID'
            });
            return;
        }
        const request = {
            paymentIntentId,
            amount: req.body.amount,
            reason: req.body.reason
        };
        const result = await paymentService.refundPayment(request);
        if (!result.success) {
            res.status(400).json({
                error: result.error,
                code: 'REFUND_FAILED'
            });
            return;
        }
        res.json({
            transaction: result.transaction,
            message: 'Refund processed successfully'
        });
    }
    catch (error) {
        console.error('Payment refund error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.get('/bookings/:bookingId/transactions', async (req, res) => {
    try {
        const bookingId = req.params['bookingId'];
        if (!bookingId) {
            res.status(400).json({
                error: 'Booking ID is required',
                code: 'MISSING_BOOKING_ID'
            });
            return;
        }
        const transactions = await paymentService.getPaymentTransactions(bookingId);
        res.json({ transactions });
    }
    catch (error) {
        console.error('Get payment transactions error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.post('/webhooks/stripe', async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            res.status(400).json({
                error: 'Missing Stripe signature',
                code: 'MISSING_SIGNATURE'
            });
            return;
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(400).json({
            error: 'Webhook processing failed',
            code: 'WEBHOOK_ERROR'
        });
    }
});
router.get('/health', async (_req, res) => {
    try {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                payment: 'operational',
                stripe: 'operational',
                points: 'operational'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=payment.js.map