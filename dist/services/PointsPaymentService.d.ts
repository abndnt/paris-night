import { Pool } from 'pg';
import { PaymentIntent, PaymentTransaction, CreatePaymentIntentRequest, ConfirmPaymentRequest, RefundPaymentRequest } from '../models/Payment';
import { PointsService } from './PointsService';
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
export declare class PointsPaymentService {
    private pointsService;
    private db;
    constructor(database: Pool, pointsService: PointsService);
    createPointsPaymentIntent(request: CreatePaymentIntentRequest): Promise<PointsPaymentResult>;
    confirmPointsPayment(request: ConfirmPaymentRequest, paymentIntent: PaymentIntent): Promise<PointsPaymentResult>;
    refundPointsPayment(request: RefundPaymentRequest, paymentIntent: PaymentIntent): Promise<PointsPaymentResult>;
    private checkPointsAvailability;
    private handlePointsTransfer;
    private deductPoints;
    private refundPoints;
    private savePointsTransaction;
    private generatePaymentIntentId;
    private generatePaymentMethodId;
    private generateTransactionId;
}
//# sourceMappingURL=PointsPaymentService.d.ts.map