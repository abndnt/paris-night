import { RewardAccount, RewardAccountModel, CreateRewardAccountRequest, UpdateRewardAccountRequest, RewardAccountCredentials } from '../models/RewardAccount';
import { RewardProgram } from '../models/RewardProgram';
import { EncryptionService } from './EncryptionService';
import { PointsValuationEngine, ValuationResult, OptimizationResult, FlightPricingComparison, TransferRecommendation } from './PointsValuationEngine';
import { PricingInfo } from '../models/FlightSearch';

export interface PointsBalance {
  accountId: string;
  programId: string;
  programName: string;
  balance: number;
  lastUpdated: Date;
}

export interface PointsValuation {
  programId: string;
  programName: string;
  pointsRequired: number;
  cashEquivalent: number;
  valuationRate: number;
  bestValue: boolean;
}

export class PointsService {
  private encryptionService: EncryptionService;
  private rewardAccounts: Map<string, RewardAccount> = new Map();
  private rewardPrograms: Map<string, RewardProgram> = new Map();
  private valuationEngine: PointsValuationEngine;

  constructor(encryptionKey?: string) {
    this.encryptionService = new EncryptionService(encryptionKey);
    this.valuationEngine = new PointsValuationEngine();
  }

  // Reward Account Management
  async createRewardAccount(request: CreateRewardAccountRequest): Promise<RewardAccount> {
    try {
      // Validate program exists
      if (!this.rewardPrograms.has(request.programId)) {
        throw new Error(`Reward program ${request.programId} not found`);
      }

      // Encrypt credentials
      const encryptedCredentials = this.encryptionService.encryptCredentials(request.credentials);

      // Create account
      const account = RewardAccountModel.create(request, encryptedCredentials);

      // Validate account
      if (!RewardAccountModel.validate(account)) {
        throw new Error('Invalid reward account data');
      }

      // Store account
      this.rewardAccounts.set(account.id, account);

      return account;
    } catch (error) {
      throw new Error(`Failed to create reward account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRewardAccount(accountId: string): Promise<RewardAccount | null> {
    return this.rewardAccounts.get(accountId) || null;
  }

  async getUserRewardAccounts(userId: string): Promise<RewardAccount[]> {
    return Array.from(this.rewardAccounts.values())
      .filter(account => account.userId === userId && account.isActive);
  }

  async updateRewardAccount(accountId: string, updates: UpdateRewardAccountRequest): Promise<RewardAccount> {
    const account = this.rewardAccounts.get(accountId);
    if (!account) {
      throw new Error(`Reward account ${accountId} not found`);
    }

    const updatedAccount: RewardAccount = {
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

  async deleteRewardAccount(accountId: string): Promise<boolean> {
    return this.rewardAccounts.delete(accountId);
  }

  // Points Balance Management
  async updatePointsBalance(accountId: string, balance: number): Promise<void> {
    const account = this.rewardAccounts.get(accountId);
    if (!account) {
      throw new Error(`Reward account ${accountId} not found`);
    }

    if (balance < 0) {
      throw new Error('Points balance cannot be negative');
    }

    const updatedAccount: RewardAccount = {
      ...account,
      balance,
      lastUpdated: new Date(),
      updatedAt: new Date()
    };

    this.rewardAccounts.set(accountId, updatedAccount);
  }

  async getPointsBalances(userId: string): Promise<PointsBalance[]> {
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

  // Points Valuation
  calculatePointsValuation(pointsRequired: number, programId: string): PointsValuation | null {
    const program = this.rewardPrograms.get(programId);
    if (!program) {
      return null;
    }

    const cashEquivalent = (pointsRequired * program.valuationRate) / 100; // Convert cents to dollars

    return {
      programId,
      programName: program.name,
      pointsRequired,
      cashEquivalent,
      valuationRate: program.valuationRate,
      bestValue: false // Will be determined by comparison logic
    };
  }

  comparePointsValuations(pointsOptions: { programId: string; pointsRequired: number }[]): PointsValuation[] {
    const valuations = pointsOptions
      .map(option => this.calculatePointsValuation(option.pointsRequired, option.programId))
      .filter((valuation): valuation is PointsValuation => valuation !== null);

    if (valuations.length === 0) {
      return [];
    }

    // Find the best value (lowest cash equivalent for same service)
    const bestValuation = valuations.reduce((best, current) => 
      current.cashEquivalent < best.cashEquivalent ? current : best
    );

    return valuations.map(valuation => ({
      ...valuation,
      bestValue: valuation.programId === bestValuation.programId
    }));
  }

  // Credential Management
  async getDecryptedCredentials(accountId: string): Promise<RewardAccountCredentials> {
    const account = this.rewardAccounts.get(accountId);
    if (!account) {
      throw new Error(`Reward account ${accountId} not found`);
    }

    try {
      return this.encryptionService.decryptCredentials(account.encryptedCredentials);
    } catch (error) {
      throw new Error(`Failed to decrypt credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Program Management (for testing and configuration)
  addRewardProgram(program: RewardProgram): void {
    this.rewardPrograms.set(program.id, program);
    this.valuationEngine.addRewardProgram(program);
  }

  getRewardProgram(programId: string): RewardProgram | null {
    return this.rewardPrograms.get(programId) || null;
  }

  getAllRewardPrograms(): RewardProgram[] {
    return Array.from(this.rewardPrograms.values()).filter(program => program.isActive);
  }

  // Utility methods
  getSanitizedAccount(accountId: string): Omit<RewardAccount, 'encryptedCredentials'> | null {
    const account = this.rewardAccounts.get(accountId);
    if (!account) {
      return null;
    }
    return RewardAccountModel.sanitizeForResponse(account);
  }

  getSanitizedUserAccounts(userId: string): Omit<RewardAccount, 'encryptedCredentials'>[] {
    return Array.from(this.rewardAccounts.values())
      .filter(account => account.userId === userId && account.isActive)
      .map(account => RewardAccountModel.sanitizeForResponse(account));
  }

  // Enhanced Valuation and Optimization Methods
  
  /**
   * Calculate detailed points valuation for a specific program
   */
  calculateDetailedValuation(pointsRequired: number, programId: string): ValuationResult | null {
    return this.valuationEngine.calculatePointsValue(pointsRequired, programId);
  }

  /**
   * Get transfer recommendations between programs
   */
  getTransferRecommendations(
    fromProgramId: string,
    toProgramId: string,
    pointsNeeded: number
  ): TransferRecommendation | null {
    return this.valuationEngine.calculateTransferRecommendations(fromProgramId, toProgramId, pointsNeeded);
  }

  /**
   * Find all possible transfer opportunities for a user to acquire needed points
   */
  async findTransferOpportunities(
    userId: string,
    targetProgramId: string,
    pointsNeeded: number
  ): Promise<TransferRecommendation[]> {
    const userBalances = await this.getPointsBalances(userId);
    return this.valuationEngine.findTransferOpportunities(targetProgramId, pointsNeeded, userBalances);
  }

  /**
   * Optimize flight pricing by comparing cash vs points options
   */
  async optimizeFlightPricing(
    userId: string,
    pricingInfo: PricingInfo
  ): Promise<OptimizationResult> {
    const userBalances = await this.getPointsBalances(userId);
    return this.valuationEngine.optimizeFlightPricing(pricingInfo, userBalances);
  }

  /**
   * Comprehensive optimization including transfer opportunities
   */
  async optimizeWithTransfers(
    userId: string,
    pricingInfo: PricingInfo
  ): Promise<FlightPricingComparison> {
    const userBalances = await this.getPointsBalances(userId);
    return this.valuationEngine.optimizeWithTransfers(pricingInfo, userBalances);
  }

  /**
   * Analyze the value of a specific redemption
   */
  analyzeRedemptionValue(
    pointsUsed: number,
    cashValue: number,
    programId: string
  ): {
    redemptionValue: number;
    baselineValue: number;
    isGoodValue: boolean;
    valueMultiplier: number;
  } {
    return this.valuationEngine.analyzeRedemptionValue(pointsUsed, cashValue, programId);
  }

  /**
   * Get enhanced points valuations with transfer options
   */
  async getEnhancedValuations(
    userId: string,
    pointsOptions: { programId: string; pointsRequired: number }[]
  ): Promise<ValuationResult[]> {
    const userBalances = await this.getPointsBalances(userId);
    const results: ValuationResult[] = [];

    for (const option of pointsOptions) {
      const baseValuation = this.valuationEngine.calculatePointsValue(option.pointsRequired, option.programId);
      if (!baseValuation) continue;

      const userBalance = userBalances.find(balance => balance.programId === option.programId);
      const hasSufficientPoints = userBalance && userBalance.balance >= option.pointsRequired;

      if (hasSufficientPoints) {
        results.push({
          ...baseValuation,
          transferRequired: false
        });
      } else {
        // Check for transfer opportunities
        const transferOpportunities = this.valuationEngine.findTransferOpportunities(
          option.programId,
          option.pointsRequired,
          userBalances
        );

        if (transferOpportunities.length > 0) {
          const bestTransfer = transferOpportunities[0];
          results.push({
            ...baseValuation,
            transferRequired: true,
            transferDetails: bestTransfer,
            cashEquivalent: bestTransfer!.totalCost
          });
        } else {
          // Include option even if not available to show what's needed
          results.push({
            ...baseValuation,
            transferRequired: false
          });
        }
      }
    }

    // Mark best value option
    if (results.length > 0) {
      const bestOption = results.reduce((best, current) => 
        current.cashEquivalent < best.cashEquivalent ? current : best
      );
      
      return results.map(result => ({
        ...result,
        bestValue: result.programId === bestOption.programId && 
                   result.cashEquivalent === bestOption.cashEquivalent
      }));
    }

    return results;
  }
}