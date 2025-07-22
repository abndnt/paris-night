import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { paymentRouter, initializePaymentRoutes } from '../routes/payment';
import { PaymentServiceConfig } from '../services/PaymentService';

// Mock database
const mockDb = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn()
  })
} as unknown as Pool;

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_stripe_123',
        status: 'requires_confirmation',
        amount: 29999,
        currency: 'usd'
      }),
      confirm: jest.fn().mockResolvedValue({
        id: 'pi_stripe_123',
        status: 'succeeded',
        amount: 29999,
        currency: 'usd'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_stripe_123',
        status: 'succeeded'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 'ref_stripe_123',
        status: 'succeeded',
        amount: 10000
      })
    },
    webhooks: {
      constructEvent: jest.fn()
    },
    customers: {
      create: jest.fn(),
      list: jest.fn().mockResolvedValue({ data: [] })
    },
    paymentMethods: {
      list: jest.fn().mockResolvedValue({ data: [] })
    },
    setupIntents: {
      create: jest.fn()
    }
  }));
});

describe('Payment Routes Integration Tests', () => {
  let app: express.Application;

  const mockConfig: PaymentServiceConfig = {
    stripe: {
      secretKey: 'sk_test_mock',
      webhookSecret: 'whsec_mock',
      apiVersion: '2023-10-16'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, _res, next) => {
      (req as any).user = { id: '123e4567-e89b-12d3-a456-426614174001' };
      next();
    });

    initializePaymentRoutes(mockDb, mockConfig);
    app.use('/api/payment', paymentRouter);
  });

  describe('POST /api/payment/intents', () => {
    const validPaymentRequest = {
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 299.99,
      currency: 'USD',
      paymentMethod: {
        type: 'credit_card',
        creditCard: {
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          holderName: 'John Doe'
        },
        totalAmount: 299.99,
        currency: 'USD'
      }
    };

    it('should create payment intent successfully', async () => {
      mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/payment/intents')
        .send(validPaymentRequest)
        .expect(201);

      expect(response.body.paymentIntent).toBeDefined();
      expect(response.body.paymentIntent.amount).toBe(299.99);
      expect(response.body.clientSecret).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        ...validPaymentRequest,
        amount: -100
      };

      const response = await request(app)
        .post('/api/payment/intents')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain('Validation error');
      expect(response.body.code).toBe('PAYMENT_INTENT_CREATION_FAILED');
    });

    it('should create points payment intent', async () => {
      const pointsRequest = {
        ...validPaymentRequest,
        paymentMethod: {
          type: 'points',
          pointsUsed: {
            program: 'Chase Ultimate Rewards',
            points: 29999,
            cashComponent: 0
          },
          totalAmount: 299.99,
          currency: 'USD'
        }
      };

      // Mock points availability
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'acc1', 
            program: { name: 'Chase Ultimate Rewards' }, 
            isActive: true 
          }] 
        })
        .mockResolvedValueOnce({ rows: [{ balance: 50000 }] })
        .mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/payment/intents')
        .send(pointsRequest)
        .expect(201);

      expect(response.body.paymentIntent.paymentMethod.type).toBe('points');
    });

    it('should handle insufficient points', async () => {
      const pointsRequest = {
        ...validPaymentRequest,
        paymentMethod: {
          type: 'points',
          pointsUsed: {
            program: 'Chase Ultimate Rewards',
            points: 50000,
            cashComponent: 0
          },
          totalAmount: 299.99,
          currency: 'USD'
        }
      };

      // Mock insufficient points
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'acc1', 
            program: { name: 'Chase Ultimate Rewards' }, 
            isActive: true 
          }] 
        })
        .mockResolvedValueOnce({ rows: [{ balance: 10000 }] });

      const response = await request(app)
        .post('/api/payment/intents')
        .send(pointsRequest)
        .expect(400);

      expect(response.body.error).toContain('Insufficient points');
    });
  });

  describe('POST /api/payment/intents/:id/confirm', () => {
    const mockPaymentIntent = {
      id: 'pi_test_123',
      booking_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      amount: '299.99',
      currency: 'USD',
      payment_method: {
        id: 'pm_test_123',
        type: 'credit_card',
        creditCard: {
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          holderName: 'John Doe'
        },
        totalAmount: 299.99,
        currency: 'USD',
        provider: 'stripe'
      },
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should confirm payment successfully', async () => {
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockPaymentIntent] })
        .mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/payment/intents/pi_test_123/confirm')
        .send({
          paymentMethodDetails: {
            stripePaymentMethodId: 'pm_stripe_123'
          }
        })
        .expect(200);

      expect(response.body.paymentIntent).toBeDefined();
      expect(response.body.transaction).toBeDefined();
    });

    it('should handle payment intent not found', async () => {
      mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/payment/intents/pi_nonexistent/confirm')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Payment intent not found');
      expect(response.body.code).toBe('PAYMENT_CONFIRMATION_FAILED');
    });

    it('should handle invalid status for confirmation', async () => {
      const completedPaymentIntent = {
        ...mockPaymentIntent,
        status: 'completed'
      };

      mockDb.query = jest.fn().mockResolvedValue({ rows: [completedPaymentIntent] });

      const response = await request(app)
        .post('/api/payment/intents/pi_test_123/confirm')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('cannot be confirmed');
    });
  });

  describe('GET /api/payment/intents/:id', () => {
    const mockPaymentIntent = {
      id: 'pi_test_123',
      booking_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      amount: '299.99',
      currency: 'USD',
      payment_method: {
        type: 'credit_card',
        provider: 'stripe'
      },
      status: 'completed',
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should retrieve payment intent successfully', async () => {
      mockDb.query = jest.fn().mockResolvedValue({ rows: [mockPaymentIntent] });

      const response = await request(app)
        .get('/api/payment/intents/pi_test_123')
        .expect(200);

      expect(response.body.paymentIntent).toBeDefined();
      expect(response.body.paymentIntent.id).toBe('pi_test_123');
    });

    it('should handle payment intent not found', async () => {
      mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/payment/intents/pi_nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Payment intent not found');
      expect(response.body.code).toBe('PAYMENT_INTENT_NOT_FOUND');
    });

    it('should handle access denied for other user payment intent', async () => {
      const otherUserPaymentIntent = {
        ...mockPaymentIntent,
        user_id: 'other-user-id'
      };

      mockDb.query = jest.fn().mockResolvedValue({ rows: [otherUserPaymentIntent] });

      const response = await request(app)
        .get('/api/payment/intents/pi_test_123')
        .expect(403);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.code).toBe('ACCESS_DENIED');
    });
  });

  describe('POST /api/payment/intents/:id/refund', () => {
    const mockPaymentIntent = {
      id: 'pi_test_123',
      booking_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      amount: '299.99',
      currency: 'USD',
      payment_method: {
        type: 'credit_card',
        provider: 'stripe'
      },
      status: 'completed',
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should process refund successfully', async () => {
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockPaymentIntent] })
        .mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/payment/intents/pi_test_123/refund')
        .send({
          amount: 100.00,
          reason: 'Customer request'
        })
        .expect(200);

      expect(response.body.transaction).toBeDefined();
      expect(response.body.message).toBe('Refund processed successfully');
    });

    it('should handle full refund', async () => {
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockPaymentIntent] })
        .mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/payment/intents/pi_test_123/refund')
        .send({
          reason: 'Flight cancelled'
        })
        .expect(200);

      expect(response.body.transaction).toBeDefined();
    });

    it('should handle refund of non-completed payment', async () => {
      const pendingPaymentIntent = {
        ...mockPaymentIntent,
        status: 'pending'
      };

      mockDb.query = jest.fn().mockResolvedValue({ rows: [pendingPaymentIntent] });

      const response = await request(app)
        .post('/api/payment/intents/pi_test_123/refund')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('cannot be refunded');
      expect(response.body.code).toBe('REFUND_FAILED');
    });
  });

  describe('GET /api/payment/bookings/:bookingId/transactions', () => {
    it('should retrieve payment transactions for booking', async () => {
      const mockTransactions = [
        {
          id: 'txn_1',
          payment_intent_id: 'pi_test_123',
          booking_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          amount: '299.99',
          currency: 'USD',
          type: 'charge',
          status: 'completed',
          provider: 'stripe',
          provider_transaction_id: 'ch_stripe_123',
          points_transaction: null,
          failure_reason: null,
          processed_at: new Date(),
          created_at: new Date()
        }
      ];

      mockDb.query = jest.fn().mockResolvedValue({ rows: mockTransactions });

      const response = await request(app)
        .get('/api/payment/bookings/123e4567-e89b-12d3-a456-426614174000/transactions')
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].id).toBe('txn_1');
    });

    it('should return empty array for booking with no transactions', async () => {
      mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/payment/bookings/123e4567-e89b-12d3-a456-426614174000/transactions')
        .expect(200);

      expect(response.body.transactions).toHaveLength(0);
    });
  });

  describe('POST /api/payment/webhooks/stripe', () => {
    it('should handle Stripe webhook successfully', async () => {
      const response = await request(app)
        .post('/api/payment/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send({ type: 'payment_intent.succeeded' })
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    it('should handle missing Stripe signature', async () => {
      const response = await request(app)
        .post('/api/payment/webhooks/stripe')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);

      expect(response.body.error).toBe('Missing Stripe signature');
      expect(response.body.code).toBe('MISSING_SIGNATURE');
    });
  });

  describe('GET /api/payment/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/payment/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
      expect(response.body.services.payment).toBe('operational');
      expect(response.body.services.stripe).toBe('operational');
      expect(response.body.services.points).toBe('operational');
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors', async () => {
      mockDb.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/payment/intents')
        .send({
          bookingId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 299.99,
          currency: 'USD',
          paymentMethod: {
            type: 'credit_card',
            creditCard: {
              last4: '4242',
              brand: 'visa',
              expiryMonth: 12,
              expiryYear: 2025,
              holderName: 'John Doe'
            },
            totalAmount: 299.99,
            currency: 'USD'
          }
        })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });
  });
});