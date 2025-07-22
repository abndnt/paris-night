import { PaymentServiceConfig } from '../services/PaymentService';
export interface PaymentConfig extends PaymentServiceConfig {
    defaultCurrency: string;
    supportedCurrencies: string[];
    maxRefundDays: number;
    enablePointsPayments: boolean;
    enableMixedPayments: boolean;
    receiptSettings: {
        enableEmailReceipts: boolean;
        defaultLanguage: string;
        supportedLanguages: string[];
        pdfGeneration: boolean;
    };
    webhookSettings: {
        enableWebhooks: boolean;
        retryAttempts: number;
        retryDelayMs: number;
    };
}
export declare const getPaymentConfig: () => PaymentConfig;
export declare const validatePaymentConfig: (config: PaymentConfig) => void;
export default getPaymentConfig;
//# sourceMappingURL=payment.d.ts.map