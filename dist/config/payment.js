"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePaymentConfig = exports.getPaymentConfig = void 0;
const getPaymentConfig = () => {
    const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];
    const stripeWebhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    if (!stripeWebhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }
    return {
        stripe: {
            secretKey: stripeSecretKey,
            webhookSecret: stripeWebhookSecret,
            apiVersion: process.env['STRIPE_API_VERSION'] || '2023-10-16'
        },
        defaultCurrency: process.env['DEFAULT_CURRENCY'] || 'USD',
        supportedCurrencies: (process.env['SUPPORTED_CURRENCIES'] || 'USD,EUR,GBP,CAD,AUD').split(','),
        maxRefundDays: parseInt(process.env['MAX_REFUND_DAYS'] || '30', 10),
        enablePointsPayments: process.env['ENABLE_POINTS_PAYMENTS'] !== 'false',
        enableMixedPayments: process.env['ENABLE_MIXED_PAYMENTS'] !== 'false',
        receiptSettings: {
            enableEmailReceipts: process.env['ENABLE_EMAIL_RECEIPTS'] !== 'false',
            defaultLanguage: process.env['DEFAULT_RECEIPT_LANGUAGE'] || 'en',
            supportedLanguages: (process.env['SUPPORTED_RECEIPT_LANGUAGES'] || 'en,es,fr,de').split(','),
            pdfGeneration: process.env['ENABLE_PDF_RECEIPTS'] !== 'false'
        },
        webhookSettings: {
            enableWebhooks: process.env['ENABLE_PAYMENT_WEBHOOKS'] !== 'false',
            retryAttempts: parseInt(process.env['WEBHOOK_RETRY_ATTEMPTS'] || '3', 10),
            retryDelayMs: parseInt(process.env['WEBHOOK_RETRY_DELAY_MS'] || '1000', 10)
        }
    };
};
exports.getPaymentConfig = getPaymentConfig;
const validatePaymentConfig = (config) => {
    const validCurrencyCodes = /^[A-Z]{3}$/;
    if (!validCurrencyCodes.test(config.defaultCurrency)) {
        throw new Error(`Invalid default currency: ${config.defaultCurrency}`);
    }
    for (const currency of config.supportedCurrencies) {
        if (!validCurrencyCodes.test(currency)) {
            throw new Error(`Invalid supported currency: ${currency}`);
        }
    }
    if (config.maxRefundDays < 0 || config.maxRefundDays > 365) {
        throw new Error('maxRefundDays must be between 0 and 365');
    }
    if (config.webhookSettings.retryAttempts < 0 || config.webhookSettings.retryAttempts > 10) {
        throw new Error('webhookSettings.retryAttempts must be between 0 and 10');
    }
    if (config.webhookSettings.retryDelayMs < 100 || config.webhookSettings.retryDelayMs > 60000) {
        throw new Error('webhookSettings.retryDelayMs must be between 100 and 60000');
    }
    const validLanguageCodes = /^[a-z]{2}$/;
    if (!validLanguageCodes.test(config.receiptSettings.defaultLanguage)) {
        throw new Error(`Invalid default receipt language: ${config.receiptSettings.defaultLanguage}`);
    }
    for (const language of config.receiptSettings.supportedLanguages) {
        if (!validLanguageCodes.test(language)) {
            throw new Error(`Invalid supported receipt language: ${language}`);
        }
    }
};
exports.validatePaymentConfig = validatePaymentConfig;
exports.default = exports.getPaymentConfig;
//# sourceMappingURL=payment.js.map