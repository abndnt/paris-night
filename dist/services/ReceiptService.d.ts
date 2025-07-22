import { Pool } from 'pg';
import { PaymentReceipt, PaymentTransaction, PaymentIntent } from '../models/Payment';
import { Booking } from '../models/Booking';
export interface ReceiptGenerationOptions {
    includeFlightDetails?: boolean;
    includePassengerInfo?: boolean;
    format?: 'pdf' | 'html' | 'json';
    language?: 'en' | 'es' | 'fr' | 'de';
}
export interface ReceiptEmailOptions {
    recipientEmail: string;
    recipientName: string;
    subject?: string;
    includeAttachment?: boolean;
}
export declare class ReceiptService {
    private db;
    constructor(database: Pool);
    generateReceipt(transaction: PaymentTransaction, paymentIntent: PaymentIntent, booking?: Booking, options?: ReceiptGenerationOptions): Promise<PaymentReceipt>;
    getReceipt(receiptId: string): Promise<PaymentReceipt | null>;
    getReceiptByNumber(receiptNumber: string): Promise<PaymentReceipt | null>;
    getUserReceipts(userId: string, limit?: number, offset?: number): Promise<PaymentReceipt[]>;
    sendReceiptEmail(receiptId: string, emailOptions: ReceiptEmailOptions): Promise<{
        success: boolean;
        error?: string;
    }>;
    private calculatePaymentBreakdown;
    private generateReceiptContent;
    private generateHTMLReceipt;
    private generatePDFReceipt;
    private generateReceiptEmailContent;
    private sendEmail;
    private saveReceipt;
    private formatCurrency;
    private formatPaymentMethod;
    private getTranslations;
    private generateReceiptId;
    private generateReceiptNumber;
}
//# sourceMappingURL=ReceiptService.d.ts.map