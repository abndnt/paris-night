import { Pool } from 'pg';
import { 
  PaymentIntent, 
  PaymentTransaction, 
  // PaymentStatus, // Unused import
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  RefundPaymentRequest,
  PointsPaymentInfo
} from '../models/Payment';
import { PointsService } from './PointsService';
// import { RewardAccount } from '../models/RewardProgram'; // Unused import

export interface PointsPaymentResult {
  success: boolean;
  paymentIntent?: PaymentIntent;
  transaction?: PaymentTransaction;
  error?: string;
  insufficientPoints?: {
    required: number;
    available: number;
    program: string;
  };
}

export interface PointsTransferResult {
  success: boolean;
  transferredPoints: number;
  finalBalance: number;
  error?: string;
}

export class PointsPaymentService {
  private pointsService: PointsService;
  private db: Pool;

  constructor(database: Pool, pointsService: PointsService) {
    this.db = database;
    this.pointsService = pointsService;
  }

  /**
   * Create a points-based payment intent
   */
  async createPointsPaymentIntent(request: CreatePaymentIntentRequest): Promise<PointsPaymentResult> {
    try {
      if (!request.paymentMethod.pointsUsed) {
        throw new Error('Points payment information is required');
      }

      const pointsInfo = request.paymentMethod.pointsUsed;

      // Validate points availability
      const availabilityCheck = await this.checkPointsAvailability(
        request.userId, 
        pointsInfo.program, 
        pointsInfo.points
      );

      if (!availabilityCheck.success) {
        return {
          success: false,
          error: availabilityCheck.error,
          insufficientPoints: availabilityCheck.insufficientPoints
        };
      }

      // Create payment intent
      const paymentIntent: PaymentIntent = {
        id: this.generatePaymentIntentId(),
        bookingId: request.bookingId,
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        paymentMethod: {
          ...request.paymentMethod,
          id: this.generatePaymentMethodId(),
          provider: 'points_system'
        },
        status: 'pending',
        metadata: request.metadata,
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
        error: error instanceof Error ? error.message : 'Unknown points payment error'
      };
    }
  }

  /**
   * Confirm points payment
   */
  async confirmPointsPayment(_request: ConfirmPaymentRequest, paymentIntent: PaymentIntent): Promise<PointsPaymentResult> {
    try {
      if (!paymentIntent.paymentMethod.pointsUsed) {
        throw new Error('No points payment information found');
      }

      const pointsInfo = paymentIntent.paymentMethod.pointsUsed;

      // Start database transaction for atomic points deduction
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // Handle points transfer if needed
        if (pointsInfo.transferDetails) {
          const transferResult = await this.handlePointsTransfer(
            paymentIntent.userId,
            pointsInfo.transferDetails,
            client
          );

          if (!transferResult.success) {
            await client.query('ROLLBACK');
            return {
              success: false,
              error: transferResult.error
            };
          }
        }

        // Deduct points from user account
        const deductionResult = await this.deductPoints(
          paymentIntent.userId,
          pointsInfo.program,
          pointsInfo.points,
          client
        );

        if (!deductionResult.success) {
          await client.query('ROLLBACK');
          return {
            success: false,
            error: deductionResult.error
          };
        }

        // Create transaction record
        const transaction: PaymentTransaction = {
          id: this.generateTransactionId(),
          paymentIntentId: paymentIntent.id,
          bookingId: paymentIntent.bookingId,
          userId: paymentIntent.userId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          type: 'points_redemption',
          status: 'completed',
          provider: 'points_system',
          pointsTransaction: {
            program: pointsInfo.program,
            pointsUsed: pointsInfo.points,
            pointsValue: paymentIntent.amount
          },
          processedAt: new Date(),
          createdAt: new Date()
        };

        // Save transaction to database
        await this.savePointsTransaction(transaction, client);

        await client.query('COMMIT');

        const updatedPaymentIntent: PaymentIntent = {
          ...paymentIntent,
          status: 'completed',
          updatedAt: new Date()
        };

        return {
          success: true,
          paymentIntent: updatedPaymentIntent,
          transaction
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown points confirmation error'
      };
    }
  }

  /**
   * Refund points payment
   */
  async refundPointsPayment(request: RefundPaymentRequest, paymentIntent: PaymentIntent): Promise<PointsPaymentResult> {
    try {
      if (!paymentIntent.paymentMethod.pointsUsed) {
        throw new Error('No points payment information found');
      }

      const pointsInfo = paymentIntent.paymentMethod.pointsUsed;
      const refundAmount = request.amount || paymentIntent.amount;
      const refundPoints = Math.round((pointsInfo.points * refundAmount) / paymentIntent.amount);

      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // Refund points to user account
        const refundResult = await this.refundPoints(
          paymentIntent.userId,
          pointsInfo.program,
          refundPoints,
          client
        );

        if (!refundResult.success) {
          await client.query('ROLLBACK');
          return {
            success: false,
            error: refundResult.error
          };
        }

        // Create refund transaction record
        const transaction: PaymentTransaction = {
          id: this.generateTransactionId(),
          paymentIntentId: paymentIntent.id,
          bookingId: paymentIntent.bookingId,
          userId: paymentIntent.userId,
          amount: refundAmount,
          currency: paymentIntent.currency,
          type: 'refund',
          status: 'completed',
          provider: 'points_system',
          pointsTransaction: {
            program: pointsInfo.program,
            pointsUsed: -refundPoints, // Negative for refund
            pointsValue: refundAmount
          },
          processedAt: new Date(),
          createdAt: new Date()
        };

        await this.savePointsTransaction(transaction, client);
        await client.query('COMMIT');

        return {
          success: true,
          transaction
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown points refund error'
      };
    }
  }

  /**
   * Check if user has sufficient points
   */
  private async checkPointsAvailability(
    userId: string, 
    program: string, 
    requiredPoints: number
  ): Promise<{
    success: boolean;
    error?: string;
    insufficientPoints?: { required: number; available: number; program: string };
  }> {
    try {
      const rewardAccounts = await this.pointsService.getUserRewardAccounts(userId);
      const account = rewardAccounts.find(acc => acc.program.name === program && acc.isActive);

      if (!account) {
        return {
          success: false,
          error: `No active ${program} account found`
        };
      }

      // Get current balance
      const balance = await this.pointsService.getPointsBalance(account.id);

      if (balance < requiredPoints) {
        return {
          success: false,
          error: 'Insufficient points',
          insufficientPoints: {
            required: requiredPoints,
            available: balance,
            program: program
          }
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown availability check error'
      };
    }
  }

  /**
   * Handle points transfer between programs
   */
  private async handlePointsTransfer(
    userId: string,
    transferDetails: PointsPaymentInfo['transferDetails'],
    _client: any
  ): Promise<PointsTransferResult> {
    try {
      if (!transferDetails) {
        throw new Error('Transfer details are required');
      }

      // This would integrate with the points transfer system
      // For now, we'll simulate the transfer
      const transferResult = await this.pointsService.transferPoints(
        userId,
        transferDetails.fromProgram,
        transferDetails.toProgram,
        transferDetails.transferredPoints
      );

      if (!transferResult.success) {
        return {
          success: false,
          transferredPoints: 0,
          finalBalance: 0,
          error: transferResult.error
        };
      }

      return {
        success: true,
        transferredPoints: transferDetails.transferredPoints,
        finalBalance: transferResult.newBalance || 0
      };
    } catch (error) {
      return {
        success: false,
        transferredPoints: 0,
        finalBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown transfer error'
      };
    }
  }

  /**
   * Deduct points from user account
   */
  private async deductPoints(
    userId: string,
    program: string,
    points: number,
    client: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const query = `
        UPDATE reward_accounts 
        SET balance = balance - $1, updated_at = NOW()
        WHERE user_id = $2 
          AND program_name = $3 
          AND is_active = true 
          AND balance >= $1
        RETURNING balance
      `;

      const result = await client.query(query, [points, userId, program]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Insufficient points or account not found'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deduction error'
      };
    }
  }

  /**
   * Refund points to user account
   */
  private async refundPoints(
    userId: string,
    program: string,
    points: number,
    client: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const query = `
        UPDATE reward_accounts 
        SET balance = balance + $1, updated_at = NOW()
        WHERE user_id = $2 
          AND program_name = $3 
          AND is_active = true
        RETURNING balance
      `;

      const result = await client.query(query, [points, userId, program]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Account not found for refund'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown refund error'
      };
    }
  }

  /**
   * Save points transaction to database
   */
  private async savePointsTransaction(transaction: PaymentTransaction, client: any): Promise<void> {
    const query = `
      INSERT INTO payment_transactions (
        id, payment_intent_id, booking_id, user_id, amount, currency,
        type, status, provider, points_transaction, processed_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
      JSON.stringify(transaction.pointsTransaction),
      transaction.processedAt,
      transaction.createdAt
    ];

    await client.query(query, values);
  }

  /**
   * Generate payment intent ID
   */
  private generatePaymentIntentId(): string {
    return `pi_points_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate payment method ID
   */
  private generatePaymentMethodId(): string {
    return `pm_points_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return `txn_points_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}