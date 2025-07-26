import { Pool } from 'pg';
import { 
  PaymentIntent, 
  PaymentTransaction, 
  PaymentReceipt,
  // PaymentStatus, // Unused import
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  RefundPaymentRequest,
  CreatePaymentIntentSchema,
  ConfirmPaymentSchema,
  RefundPaymentSchema
} from '../models/Payment';
import { StripePaymentService, StripeConfig } from './StripePaymentService';
import { PointsPaymentService } from './PointsPaymentService';
import { PointsService } from './PointsService';

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

export class PaymentService {
  private db: Pool;
  private stripeService: StripePaymentService;
  private pointsService: PointsPaymentService;

  constructor(database: Pool, config: PaymentServiceConfig) {
    this.db = database;
    this.stripeService = new StripePaymentService(config.stripe);
    
    const pointsServiceInstance = new PointsService(database);
    this.pointsService = new PointsPaymentService(database, pointsServiceInstance);
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentResult> {
    try {
      // Validate request
      const { error, value } = CreatePaymentIntentSchema.validate(request);
      if (error) {
        return {
          success: false,
          error: `Validation error: ${error.details[0]!.message}`
        };
      }

      let result: PaymentResult;

      // Route to appropriate payment service based on payment method type
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

      // Save payment intent to database if successful
      if (result.success && result.paymentIntent) {
        await this.savePaymentIntent(result.paymentIntent);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown payment creation error'
      };
    }
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentResult> {
    try {
      // Validate request
      const { error, value } = ConfirmPaymentSchema.validate(request);
      if (error) {
        return {
          success: false,
          error: `Validation error: ${error.details[0]!.message}`
        };
      }

      // Get payment intent from database
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

      let result: PaymentResult;

      // Route to appropriate payment service
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

      // Update payment intent and save transaction if successful
      if (result.success) {
        if (result.paymentIntent) {
          await this.updatePaymentIntent(result.paymentIntent);
        }
        if (result.transaction) {
          await this.saveTransaction(result.transaction);
          // Generate receipt
          result.receipt = await this.generateReceipt(result.transaction);
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown payment confirmation error'
      };
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(request: RefundPaymentRequest): Promise<PaymentResult> {
    try {
      // Validate request
      const { error, value } = RefundPaymentSchema.validate(request);
      if (error) {
        return {
          success: false,
          error: `Validation error: ${error.details[0]!.message}`
        };
      }

      // Get payment intent from database
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

      let result: PaymentResult;

      // Route to appropriate payment service
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

      // Save refund transaction if successful
      if (result.success && result.transaction) {
        await this.saveTransaction(result.transaction);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown refund error'
      };
    }
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
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
    } catch (error) {
      throw new Error(`Failed to get payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get payment transactions for a booking
   */
  async getPaymentTransactions(bookingId: string): Promise<PaymentTransaction[]> {
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
    } catch (error) {
      throw new Error(`Failed to get payment transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle mixed payment (credit card + points)
   */
  private async handleMixedPayment(request: CreatePaymentIntentRequest): Promise<PaymentResult> {
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

      // Create payment intent for mixed payment
      const paymentIntent: PaymentIntent = {
        id: this.generatePaymentIntentId(),
        bookingId: request.bookingId,
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        paymentMethod: {
          ...request.paymentMethod,
          id: this.generatePaymentMethodId(),
          provider: 'stripe' // Primary provider for mixed payments
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown mixed payment error'
      };
    }
  }

  /**
   * Confirm mixed payment
   */
  private async confirmMixedPayment(request: ConfirmPaymentRequest, paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      const pointsValue = paymentIntent.metadata?.pointsValue || 0;
      const creditCardAmount = paymentIntent.metadata?.creditCardAmount || paymentIntent.amount;

      // First, process points payment
      if (pointsValue > 0) {
        const pointsRequest: CreatePaymentIntentRequest = {
          bookingId: paymentIntent.bookingId,
          userId: paymentIntent.userId,
          amount: pointsValue,
          currency: paymentIntent.currency,
          paymentMethod: {
            type: 'points',
            pointsUsed: paymentIntent.paymentMethod.pointsUsed!,
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

      // Then, process credit card payment if there's a remaining amount
      if (creditCardAmount > 0) {
        const stripeRequest: CreatePaymentIntentRequest = {
          bookingId: paymentIntent.bookingId,
          userId: paymentIntent.userId,
          amount: creditCardAmount,
          currency: paymentIntent.currency,
          paymentMethod: {
            type: 'credit_card',
            creditCard: paymentIntent.paymentMethod.creditCard!,
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

      const updatedPaymentIntent: PaymentIntent = {
        ...paymentIntent,
        status: 'completed',
        updatedAt: new Date()
      };

      return {
        success: true,
        paymentIntent: updatedPaymentIntent
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown mixed payment confirmation error'
      };
    }
  }

  /**
   * Refund mixed payment
   */
  private async refundMixedPayment(request: RefundPaymentRequest, paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      const pointsValue = paymentIntent.metadata?.pointsValue || 0;
      const creditCardAmount = paymentIntent.metadata?.creditCardAmount || paymentIntent.amount;
      const refundAmount = request.amount || paymentIntent.amount;

      // Calculate proportional refunds
      const pointsRefund = (pointsValue / paymentIntent.amount) * refundAmount;
      const creditCardRefund = (creditCardAmount / paymentIntent.amount) * refundAmount;

      // Process refunds
      const transactions: PaymentTransaction[] = [];

      if (pointsRefund > 0) {
        const pointsRefundRequest: RefundPaymentRequest = {
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
        const stripeRefundRequest: RefundPaymentRequest = {
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
        transaction: transactions[0] // Return first transaction, could be enhanced to return all
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown mixed payment refund error'
      };
    }
  }

  /**
   * Generate payment receipt
   */
  private async generateReceipt(transaction: PaymentTransaction): Promise<PaymentReceipt> {
    const receiptNumber = this.generateReceiptNumber();
    
    const receipt: PaymentReceipt = {
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
        taxes: 0, // Would be calculated based on booking details
        fees: 0   // Would be calculated based on booking details
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

    // Save receipt to database
    await this.saveReceipt(receipt);

    return receipt;
  }

  /**
   * Save payment intent to database
   */
  private async savePaymentIntent(paymentIntent: PaymentIntent): Promise<void> {
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

  /**
   * Update payment intent in database
   */
  private async updatePaymentIntent(paymentIntent: PaymentIntent): Promise<void> {
    const query = `
      UPDATE payment_intents 
      SET status = $1, updated_at = $2
      WHERE id = $3
    `;

    await this.db.query(query, [paymentIntent.status, paymentIntent.updatedAt, paymentIntent.id]);
  }

  /**
   * Save transaction to database
   */
  private async saveTransaction(transaction: PaymentTransaction): Promise<void> {
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

  /**
   * Save receipt to database
   */
  private async saveReceipt(receipt: PaymentReceipt): Promise<void> {
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

  /**
   * Generate payment intent ID
   */
  private generatePaymentIntentId(): string {
    return `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate payment method ID
   */
  private generatePaymentMethodId(): string {
    return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate receipt ID
   */
  private generateReceiptId(): string {
    return `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate receipt number
   */
  private generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    return `RCP-${year}${month}${day}-${random}`;
  }
}