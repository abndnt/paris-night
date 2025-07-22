"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointsService = void 0;
const RewardAccount_1 = require("../models/RewardAccount");
const EncryptionService_1 = require("./EncryptionService");
const PointsValuationEngine_1 = require("./PointsValuationEngine");
class PointsService {
    constructor(encryptionKey) {
        this.rewardAccounts = new Map();
        this.rewardPrograms = new Map();
        this.encryptionService = new EncryptionService_1.EncryptionService(encryptionKey);
        this.valuationEngine = new PointsValuationEngine_1.PointsValuationEngine();
    }
    async createRewardAccount(request) {
        try {
            if (!this.rewardPrograms.has(request.programId)) {
                throw new Error(`Reward program ${request.programId} not found`);
            }
            const encryptedCredentials = this.encryptionService.encryptCredentials(request.credentials);
            const account = RewardAccount_1.RewardAccountModel.create(request, encryptedCredentials);
            if (!RewardAccount_1.RewardAccountModel.validate(account)) {
                throw new Error('Invalid reward account data');
            }
            this.rewardAccounts.set(account.id, account);
            return account;
        }
        catch (error) {
            throw new Error(`Failed to create reward account: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getRewardAccount(accountId) {
        return this.rewardAccounts.get(accountId) || null;
    }
    async getUserRewardAccounts(userId) {
        return Array.from(this.rewardAccounts.values())
            .filter(account => account.userId === userId && account.isActive);
    }
    async updateRewardAccount(accountId, updates) {
        const account = this.rewardAccounts.get(accountId);
        if (!account) {
            throw new Error(`Reward account ${accountId} not found`);
        }
        const updatedAccount = {
            ...account,
            updatedAt: new Date()
        };
        if (updates.accountNumber) {
            updatedAccount.accountNumber = updates.accountNumber;
        }
        if (updates.credentials) {
            updatedAccount.encryptedCredentials = this.encryptionService.encryptCredentials(updates.credentials);
        }
        if (typeof updates.isActive === 'boolean') {
            updatedAccount.isActive = updates.isActive;
        }
        this.rewardAccounts.set(accountId, updatedAccount);
        return updatedAccount;
    }
    async deleteRewardAccount(accountId) {
        return this.rewardAccounts.delete(accountId);
    }
    async updatePointsBalance(accountId, balance) {
        const account = this.rewardAccounts.get(accountId);
        if (!account) {
            throw new Error(`Reward account ${accountId} not found`);
        }
        if (balance < 0) {
            throw new Error('Points balance cannot be negative');
        }
        const updatedAccount = {
            ...account,
            balance,
            lastUpdated: new Date(),
            updatedAt: new Date()
        };
        this.rewardAccounts.set(accountId, updatedAccount);
    }
    async getPointsBalances(userId) {
        const userAccounts = await this.getUserRewardAccounts(userId);
        return userAccounts.map(account => {
            const program = this.rewardPrograms.get(account.programId);
            return {
                accountId: account.id,
                programId: account.programId,
                programName: program?.name || 'Unknown Program',
                balance: account.balance,
                lastUpdated: account.lastUpdated
            };
        });
    }
    calculatePointsValuation(pointsRequired, programId) {
        const program = this.rewardPrograms.get(programId);
        if (!program) {
            return null;
        }
        const cashEquivalent = (pointsRequired * program.valuationRate) / 100;
        return {
            programId,
            programName: program.name,
            pointsRequired,
            cashEquivalent,
            valuationRate: program.valuationRate,
            bestValue: false
        };
    }
    comparePointsValuations(pointsOptions) {
        const valuations = pointsOptions
            .map(option => this.calculatePointsValuation(option.pointsRequired, option.programId))
            .filter((valuation) => valuation !== null);
        if (valuations.length === 0) {
            return [];
        }
        const bestValuation = valuations.reduce((best, current) => current.cashEquivalent < best.cashEquivalent ? current : best);
        return valuations.map(valuation => ({
            ...valuation,
            bestValue: valuation.programId === bestValuation.programId
        }));
    }
    async getDecryptedCredentials(accountId) {
        const account = this.rewardAccounts.get(accountId);
        if (!account) {
            throw new Error(`Reward account ${accountId} not found`);
        }
        try {
            return this.encryptionService.decryptCredentials(account.encryptedCredentials);
        }
        catch (error) {
            throw new Error(`Failed to decrypt credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    addRewardProgram(program) {
        this.rewardPrograms.set(program.id, program);
        this.valuationEngine.addRewardProgram(program);
    }
    getRewardProgram(programId) {
        return this.rewardPrograms.get(programId) || null;
    }
    getAllRewardPrograms() {
        return Array.from(this.rewardPrograms.values()).filter(program => program.isActive);
    }
    getSanitizedAccount(accountId) {
        const account = this.rewardAccounts.get(accountId);
        if (!account) {
            return null;
        }
        return RewardAccount_1.RewardAccountModel.sanitizeForResponse(account);
    }
    getSanitizedUserAccounts(userId) {
        return Array.from(this.rewardAccounts.values())
            .filter(account => account.userId === userId && account.isActive)
            .map(account => RewardAccount_1.RewardAccountModel.sanitizeForResponse(account));
    }
    calculateDetailedValuation(pointsRequired, programId) {
        return this.valuationEngine.calculatePointsValue(pointsRequired, programId);
    }
    getTransferRecommendations(fromProgramId, toProgramId, pointsNeeded) {
        return this.valuationEngine.calculateTransferRecommendations(fromProgramId, toProgramId, pointsNeeded);
    }
    async findTransferOpportunities(userId, targetProgramId, pointsNeeded) {
        const userBalances = await this.getPointsBalances(userId);
        return this.valuationEngine.findTransferOpportunities(targetProgramId, pointsNeeded, userBalances);
    }
    async optimizeFlightPricing(userId, pricingInfo) {
        const userBalances = await this.getPointsBalances(userId);
        return this.valuationEngine.optimizeFlightPricing(pricingInfo, userBalances);
    }
    async optimizeWithTransfers(userId, pricingInfo) {
        const userBalances = await this.getPointsBalances(userId);
        return this.valuationEngine.optimizeWithTransfers(pricingInfo, userBalances);
    }
    analyzeRedemptionValue(pointsUsed, cashValue, programId) {
        return this.valuationEngine.analyzeRedemptionValue(pointsUsed, cashValue, programId);
    }
    async getEnhancedValuations(userId, pointsOptions) {
        const userBalances = await this.getPointsBalances(userId);
        const results = [];
        for (const option of pointsOptions) {
            const baseValuation = this.valuationEngine.calculatePointsValue(option.pointsRequired, option.programId);
            if (!baseValuation)
                continue;
            const userBalance = userBalances.find(balance => balance.programId === option.programId);
            const hasSufficientPoints = userBalance && userBalance.balance >= option.pointsRequired;
            if (hasSufficientPoints) {
                results.push({
                    ...baseValuation,
                    transferRequired: false
                });
            }
            else {
                const transferOpportunities = this.valuationEngine.findTransferOpportunities(option.programId, option.pointsRequired, userBalances);
                if (transferOpportunities.length > 0) {
                    const bestTransfer = transferOpportunities[0];
                    results.push({
                        ...baseValuation,
                        transferRequired: true,
                        transferDetails: bestTransfer,
                        cashEquivalent: bestTransfer.totalCost
                    });
                }
                else {
                    results.push({
                        ...baseValuation,
                        transferRequired: false
                    });
                }
            }
        }
        if (results.length > 0) {
            const bestOption = results.reduce((best, current) => current.cashEquivalent < best.cashEquivalent ? current : best);
            return results.map(result => ({
                ...result,
                bestValue: result.programId === bestOption.programId &&
                    result.cashEquivalent === bestOption.cashEquivalent
            }));
        }
        return results;
    }
}
exports.PointsService = PointsService;
//# sourceMappingURL=PointsService.js.map