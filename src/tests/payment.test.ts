import { Pool } from 'pg';
import { PaymentService, PaymentServiceConfig } from '../services/PaymentService';
import { StripePaymentService } from '../services/StripePaymentService';
import { PointsPaymentService } from '../services/PointsPaymentService';
import { PointsService } from '../services/PointsService';
import { 
  CreatePaymentIntentRequest, 
  ConfirmPaymentRequest, 
  RefundPaymentRequest,
  PaymentMethodType 
} from '../models/Payment';

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
      create: jest.fn(),
      confirm: jest.fn(),
      retrieve: jest.fn()
    },
    refunds: {
      create: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    },
    customers: {
      create: jest.fn(),
      list: jest.fn()
    },
    paymentMethods: {
      list: jest.fn()
    },
    setupIntents: {
      create: jest.fn()
    }
  }));
});

describe('PaymentService', () => {
  let paymentService: PaymentService;

  const mockConfig: PaymentServiceConfig = {
    stripe: {
      secretKey: 'sk_test_mock',
      webhookSecret: 'whsec_mock',
      apiVersion: '2023-10-16'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService(mockDb, mockConfig);
  });

  describe('createPaymentIntent', () => {
    const mockRequest: CreatePaymentIntentRequest = {
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

    it('should create credit card payment intent successfully', async () => {
      // Mock database save
      mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await paymentService.createPaymentIntent(mockRequest);

      expect(result.success).toBe(true);
      expect(result.paymentIntent).toBeDefined();
      expect(result.paymentIntent?.amount).toBe(299.99);
      expect(result.paymentIntent?.paymentMethod.type).toBe('credit_card');
    });

    it('should create points payment intent successfully', async () => {
      const pointsRequest: CreatePaymentIntentRequest = {
        ...mockRequest,
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

      // Mock points availability check
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

      const result = await paymentService.createPaymentIntent(pointsRequest);

      expect(result.success).toBe(true);
      expect(result.paymentIntent?.paymentMethod.type).toBe('points');
    });

    it('should create mixed payment intent successfully', async () => {
      const mixedRequest: CreatePaymentIntentRequest = {
        ...mockRequest,
        paymentMethod: {
          type: 'mixed',
          creditCard: {
            last4: '4242',
            brand: 'visa',
            expiryMonth: 12,
            expiryYear: 2025,
            holderName: 'John Doe'
          },
          pointsUsed: {
            program: 'Chase Ultimate Rewards',
            points: 15000,
            cashComponent: 150.00
          },
          totalAmount: 299.99,
          currency: 'USD'
        }
      };

      mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await paymentService.createPaymentIntent(mixedRequest);

      expect(result.success).toBe(true);
      expect(result.paymentIntent?.paymentMethod.type).toBe('mixed');
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        ...mockRequest,
        amount: -100 // Invalid negative amount
      };

      const result = await paymentService.createPaymentIntent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should handle insufficient points', async () => {
      const pointsRequest: CreatePaymentIntentRequest = {
        ...mockRequest,
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
        .mockResolvedValueOnce({ rows: [{ balance: 10000 }] }); // Insufficient balance

      const result = await paymentService.createPaymentIntent(pointsRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient points');
    });
  });

  describe('confirmPayment', () => {
    const mockPaymentIntent = {
      id: 'pi_test_123',
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 299.99,
      currency: 'USD',
      paymentMethod: {
        id: 'pm_test_123',
        type: 'credit_card' as PaymentMethodType,
        creditCard: {
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          holderName: 'John Doe'
        },
        totalAmount: 299.99,
        currency: 'USD',
        provider: 'stripe' as const
      },
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should confirm credit card payment successfully', async () => {
      const confirmRequest: ConfirmPaymentRequest = {
        paymentIntentId: 'pi_test_123',
        paymentMethodDetails: {
          stripePaymentMethodId: 'pm_stripe_123'
        }
      };

      // Mock database queries
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: mockPaymentIntent.id,
            booking_id: mockPaymentIntent.bookingId,
            user_id: mockPaymentIntent.userId,
            amount: mockPaymentIntent.amount,
            currency: mockPaymentIntent.currency,
            payment_method: mockPaymentIntent.paymentMethod,
            status: mockPaymentIntent.status,
            created_at: mockPaymentIntent.createdAt,
            updated_at: mockPaymentIntent.updatedAt
          }] 
        })
        .mockResolvedValue({ rows: [] });

      const result = await paymentService.confirmPayment(confirmRequest);

      expect(result.success).toBe(true);
      expect(result.paymentIntent?.status).toBe('completed');
    });

    it('should handle payment intent not found', async () => {
      const confirmRequest: ConfirmPaymentRequest = {
        paymentIntentId: 'pi_nonexistent'
      };

      mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await paymentService.confirmPayment(confirmRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment intent not found');
    });

    it('should handle invalid status transition', async () => {
      const completedPaymentIntent = {
        ...mockPaymentIntent,
        status: 'completed' as const
      };

      const confirmRequest: ConfirmPaymentRequest = {
        paymentIntentId: 'pi_test_123'
      };

      mockDb.query = jest.fn().mockResolvedValue({ 
        rows: [{ 
          id: completedPaymentIntent.id,
          booking_id: completedPaymentIntent.bookingId,
          user_id: completedPaymentIntent.userId,
          amount: completedPaymentIntent.amount,
          currency: completedPaymentIntent.currency,
          payment_method: completedPaymentIntent.paymentMethod,
          status: completedPaymentIntent.status,
          created_at: completedPaymentIntent.createdAt,
          updated_at: completedPaymentIntent.updatedAt
        }] 
      });

      const result = await paymentService.confirmPayment(confirmRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be confirmed');
    });
  });

  describe('refundPayment', () => {
    const mockPaymentIntent = {
      id: 'pi_test_123',
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 299.99,
      currency: 'USD',
      paymentMethod: {
        id: 'pm_test_123',
        type: 'credit_card' as PaymentMethodType,
        creditCard: {
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          holderName: 'John Doe'
        },
        totalAmount: 299.99,
        currency: 'USD',
        provider: 'stripe' as const
      },
      status: 'completed' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should refund payment successfully', async () => {
      const refundRequest: RefundPaymentRequest = {
        paymentIntentId: 'pi_test_123',
        amount: 100.00,
        reason: 'Customer request'
      };

      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: mockPaymentIntent.id,
            booking_id: mockPaymentIntent.bookingId,
            user_id: mockPaymentIntent.userId,
            amount: mockPaymentIntent.amount,
            currency: mockPaymentIntent.currency,
            payment_method: mockPaymentIntent.paymentMethod,
            status: mockPaymentIntent.status,
            created_at: mockPaymentIntent.createdAt,
            updated_at: mockPaymentIntent.updatedAt
          }] 
        })
        .mockResolvedValue({ rows: [] });

      const result = await paymentService.refundPayment(refundRequest);

      expect(result.success).toBe(true);
      expect(result.transaction?.type).toBe('refund');
      expect(result.transaction?.amount).toBe(100.00);
    });

    it('should handle full refund', async () => {
      const refundRequest: RefundPaymentRequest = {
        paymentIntentId: 'pi_test_123',
        reason: 'Flight cancelled'
      };

      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: mockPaymentIntent.id,
            booking_id: mockPaymentIntent.bookingId,
            user_id: mockPaymentIntent.userId,
            amount: mockPaymentIntent.amount,
            currency: mockPaymentIntent.currency,
            payment_method: mockPaymentIntent.paymentMethod,
            status: mockPaymentIntent.status,
            created_at: mockPaymentIntent.createdAt,
            updated_at: mockPaymentIntent.updatedAt
          }] 
        })
        .mockResolvedValue({ rows: [] });

      const result = await paymentService.refundPayment(refundRequest);

      expect(result.success).toBe(true);
      expect(result.transaction?.amount).toBe(299.99);
    });

    it('should handle refund of non-completed payment', async () => {
      const pendingPaymentIntent = {
        ...mockPaymentIntent,
        status: 'pending' as const
      };

      const refundRequest: RefundPaymentRequest = {
        paymentIntentId: 'pi_test_123'
      };

      mockDb.query = jest.fn().mockResolvedValue({ 
        rows: [{ 
          id: pendingPaymentIntent.id,
          booking_id: pendingPaymentIntent.bookingId,
          user_id: pendingPaymentIntent.userId,
          amount: pendingPaymentIntent.amount,
          currency: pendingPaymentIntent.currency,
          payment_method: pendingPaymentIntent.paymentMethod,
          status: pendingPaymentIntent.status,
          created_at: pendingPaymentIntent.createdAt,
          updated_at: pendingPaymentIntent.updatedAt
        }] 
      });

      const result = await paymentService.refundPayment(refundRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be refunded');
    });
  });

  describe('getPaymentTransactions', () => {
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

      const transactions = await paymentService.getPaymentTransactions('123e4567-e89b-12d3-a456-426614174000');

      expect(transactions).toHaveLength(1);
      expect(transactions[0]?.id).toBe('txn_1');
      expect(transactions[0]?.type).toBe('charge');
      expect(transactions[0]?.amount).toBe(299.99);
    });

    it('should return empty array for booking with no transactions', async () => {
      mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

      const transactions = await paymentService.getPaymentTransactions('123e4567-e89b-12d3-a456-426614174000');

      expect(transactions).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const mockRequest: CreatePaymentIntentRequest = {
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

      mockDb.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const result = await paymentService.createPaymentIntent(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle invalid UUID formats', async () => {
      const invalidRequest: CreatePaymentIntentRequest = {
        bookingId: 'invalid-uuid',
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

      const result = await paymentService.createPaymentIntent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });
});