"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundPaymentSchema = exports.ConfirmPaymentSchema = exports.CreatePaymentIntentSchema = exports.PaymentMethodSchema = exports.PointsPaymentInfoSchema = exports.CreditCardInfoSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.CreditCardInfoSchema = joi_1.default.object({
    last4: joi_1.default.string().length(4).pattern(/^[0-9]{4}$/).required(),
    brand: joi_1.default.string().valid('visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay').required(),
    expiryMonth: joi_1.default.number().integer().min(1).max(12).required(),
    expiryYear: joi_1.default.number().integer().min(new Date().getFullYear()).required(),
    holderName: joi_1.default.string().min(1).max(100).required()
});
exports.PointsPaymentInfoSchema = joi_1.default.object({
    program: joi_1.default.string().min(1).max(50).required(),
    points: joi_1.default.number().integer().min(1).required(),
    cashComponent: joi_1.default.number().min(0).optional(),
    transferDetails: joi_1.default.object({
        fromProgram: joi_1.default.string().min(1).max(50).required(),
        toProgram: joi_1.default.string().min(1).max(50).required(),
        transferRatio: joi_1.default.number().min(0).required(),
        transferredPoints: joi_1.default.number().integer().min(1).required()
    }).optional()
});
exports.PaymentMethodSchema = joi_1.default.object({
    type: joi_1.default.string().valid('credit_card', 'points', 'mixed').required(),
    creditCard: joi_1.default.when('type', {
        is: joi_1.default.valid('credit_card', 'mixed'),
        then: exports.CreditCardInfoSchema.required(),
        otherwise: joi_1.default.optional()
    }),
    pointsUsed: joi_1.default.when('type', {
        is: joi_1.default.valid('points', 'mixed'),
        then: exports.PointsPaymentInfoSchema.required(),
        otherwise: joi_1.default.optional()
    }),
    totalAmount: joi_1.default.number().min(0).required(),
    currency: joi_1.default.string().length(3).uppercase().required()
});
exports.CreatePaymentIntentSchema = joi_1.default.object({
    bookingId: joi_1.default.string().uuid().required(),
    userId: joi_1.default.string().uuid().required(),
    amount: joi_1.default.number().min(0).required(),
    currency: joi_1.default.string().length(3).uppercase().required(),
    paymentMethod: exports.PaymentMethodSchema.required(),
    metadata: joi_1.default.object().optional()
});
exports.ConfirmPaymentSchema = joi_1.default.object({
    paymentIntentId: joi_1.default.string().uuid().required(),
    paymentMethodDetails: joi_1.default.object({
        stripePaymentMethodId: joi_1.default.string().optional(),
        pointsAccountId: joi_1.default.string().uuid().optional()
    }).optional()
});
exports.RefundPaymentSchema = joi_1.default.object({
    paymentIntentId: joi_1.default.string().uuid().required(),
    amount: joi_1.default.number().min(0).optional(),
    reason: joi_1.default.string().max(500).optional()
});
//# sourceMappingURL=Payment.js.map