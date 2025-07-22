"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardAccountModel = void 0;
class RewardAccountModel {
    static create(request, encryptedCredentials) {
        const now = new Date();
        return {
            id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: request.userId,
            programId: request.programId,
            accountNumber: request.accountNumber,
            encryptedCredentials,
            balance: 0,
            lastUpdated: now,
            isActive: true,
            createdAt: now,
            updatedAt: now
        };
    }
    static validate(account) {
        return !!(account.id &&
            account.userId &&
            account.programId &&
            account.accountNumber &&
            account.encryptedCredentials &&
            typeof account.balance === 'number' &&
            account.balance >= 0);
    }
    static sanitizeForResponse(account) {
        const { encryptedCredentials, ...sanitized } = account;
        return sanitized;
    }
}
exports.RewardAccountModel = RewardAccountModel;
//# sourceMappingURL=RewardAccount.js.map