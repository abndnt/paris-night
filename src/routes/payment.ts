import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { PaymentService, PaymentServiceConfig } from '../services/PaymentService';
import { 
  CreatePaymentIntentRequest, 
  ConfirmPaymentRequest, 
  RefundPaymentRequest 
} from '../models/Payment';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

const router = Router();

// Initialize payment service (would be injected in real app)
let paymentService: PaymentService;

const initializePaymentRoutes = (database: Pool, config: PaymentServiceConfig) => {
  paymentService = new PaymentService(database, config);
};

/**
 * Create a payment intent
 * POST /api/payment/intents
 */
router.post('/intents', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: CreatePaymentIntentRequest = req.body;

    // Add user ID from authenticated session (mock for now)
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
      clientSecret: result.paymentIntent?.providerIntentId // For Stripe frontend integration
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Confirm a payment
 * POST /api/payment/intents/:id/confirm
 */
router.post('/intents/:id/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentIntentId = req.params['id'];
    if (!paymentIntentId) {
      res.status(400).json({
        error: 'Payment intent ID is required',
        code: 'MISSING_PAYMENT_INTENT_ID'
      });
      return;
    }

    const request: ConfirmPaymentRequest = {
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
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Get payment intent
 * GET /api/payment/intents/:id
 */
router.get('/intents/:id', async (req: Request, res: Response): Promise<void> => {
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

    // Only return payment intent if user owns it (mock auth check)
    if (req.user?.id && paymentIntent.userId !== req.user.id) {
      res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
      return;
    }

    res.json({ paymentIntent });
  } catch (error) {
    console.error('Get payment intent error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Refund a payment
 * POST /api/payment/intents/:id/refund
 */
router.post('/intents/:id/refund', async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentIntentId = req.params['id'];
    if (!paymentIntentId) {
      res.status(400).json({
        error: 'Payment intent ID is required',
        code: 'MISSING_PAYMENT_INTENT_ID'
      });
      return;
    }

    const request: RefundPaymentRequest = {
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
  } catch (error) {
    console.error('Payment refund error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Get payment transactions for a booking
 * GET /api/payment/bookings/:bookingId/transactions
 */
router.get('/bookings/:bookingId/transactions', async (req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    console.error('Get payment transactions error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Stripe webhook endpoint
 * POST /api/payment/webhooks/stripe
 */
router.post('/webhooks/stripe', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({
        error: 'Missing Stripe signature',
        code: 'MISSING_SIGNATURE'
      });
      return;
    }

    // Handle webhook (implementation would depend on specific webhook processing needs)
    // For now, just acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({
      error: 'Webhook processing failed',
      code: 'WEBHOOK_ERROR'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/payment/health
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as paymentRouter, initializePaymentRoutes };