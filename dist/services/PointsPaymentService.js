"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointsPaymentService = void 0;
class PointsPaymentService {
    constructor(database, pointsService) {
        this.db = database;
        this.pointsService = pointsService;
    }
    async createPointsPaymentIntent(request) {
        try {
            if (!request.paymentMethod.pointsUsed) {
                throw new Error('Points payment information is required');
            }
            const pointsInfo = request.paymentMethod.pointsUsed;
            const availabilityCheck = await this.checkPointsAvailability(request.userId, pointsInfo.program, pointsInfo.points);
            if (!availabilityCheck.success) {
                return {
                    success: false,
                    error: availabilityCheck.error,
                    insufficientPoints: availabilityCheck.insufficientPoints
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown points payment error'
            };
        }
    }
    async confirmPointsPayment(request, paymentIntent) {
        try {
            if (!paymentIntent.paymentMethod.pointsUsed) {
                throw new Error('No points payment information found');
            }
            const pointsInfo = paymentIntent.paymentMethod.pointsUsed;
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');
                if (pointsInfo.transferDetails) {
                    const transferResult = await this.handlePointsTransfer(paymentIntent.userId, pointsInfo.transferDetails, client);
                    if (!transferResult.success) {
                        await client.query('ROLLBACK');
                        return {
                            success: false,
                            error: transferResult.error
                        };
                    }
                }
                const deductionResult = await this.deductPoints(paymentIntent.userId, pointsInfo.program, pointsInfo.points, client);
                if (!deductionResult.success) {
                    await client.query('ROLLBACK');
                    return {
                        success: false,
                        error: deductionResult.error
                    };
                }
                const transaction = {
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
                await this.savePointsTransaction(transaction, client);
                await client.query('COMMIT');
                const updatedPaymentIntent = {
                    ...paymentIntent,
                    status: 'completed',
                    updatedAt: new Date()
                };
                return {
                    success: true,
                    paymentIntent: updatedPaymentIntent,
                    transaction
                };
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown points confirmation error'
            };
        }
    }
    async refundPointsPayment(request, paymentIntent) {
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
                const refundResult = await this.refundPoints(paymentIntent.userId, pointsInfo.program, refundPoints, client);
                if (!refundResult.success) {
                    await client.query('ROLLBACK');
                    return {
                        success: false,
                        error: refundResult.error
                    };
                }
                const transaction = {
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
                        pointsUsed: -refundPoints,
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
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown points refund error'
            };
        }
    }
    async checkPointsAvailability(userId, program, requiredPoints) {
        try {
            const rewardAccounts = await this.pointsService.getUserRewardAccounts(userId);
            const account = rewardAccounts.find(acc => acc.program.name === program && acc.isActive);
            if (!account) {
                return {
                    success: false,
                    error: `No active ${program} account found`
                };
            }
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown availability check error'
            };
        }
    }
    async handlePointsTransfer(userId, transferDetails, client) {
        try {
            if (!transferDetails) {
                throw new Error('Transfer details are required');
            }
            const transferResult = await this.pointsService.transferPoints(userId, transferDetails.fromProgram, transferDetails.toProgram, transferDetails.transferredPoints);
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
        }
        catch (error) {
            return {
                success: false,
                transferredPoints: 0,
                finalBalance: 0,
                error: error instanceof Error ? error.message : 'Unknown transfer error'
            };
        }
    }
    async deductPoints(userId, program, points, client) {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown deduction error'
            };
        }
    }
    async refundPoints(userId, program, points, client) {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown refund error'
            };
        }
    }
    async savePointsTransaction(transaction, client) {
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
    generatePaymentIntentId() {
        return `pi_points_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generatePaymentMethodId() {
        return `pm_points_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateTransactionId() {
        return `txn_points_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.PointsPaymentService = PointsPaymentService;
//# sourceMappingURL=PointsPaymentService.js.map