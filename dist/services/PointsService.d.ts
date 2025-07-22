import { RewardAccount, CreateRewardAccountRequest, UpdateRewardAccountRequest, RewardAccountCredentials } from '../models/RewardAccount';
import { RewardProgram } from '../models/RewardProgram';
import { ValuationResult, OptimizationResult, FlightPricingComparison, TransferRecommendation } from './PointsValuationEngine';
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
export declare class PointsService {
    private encryptionService;
    private rewardAccounts;
    private rewardPrograms;
    private valuationEngine;
    constructor(encryptionKey?: string);
    createRewardAccount(request: CreateRewardAccountRequest): Promise<RewardAccount>;
    getRewardAccount(accountId: string): Promise<RewardAccount | null>;
    getUserRewardAccounts(userId: string): Promise<RewardAccount[]>;
    updateRewardAccount(accountId: string, updates: UpdateRewardAccountRequest): Promise<RewardAccount>;
    deleteRewardAccount(accountId: string): Promise<boolean>;
    updatePointsBalance(accountId: string, balance: number): Promise<void>;
    getPointsBalances(userId: string): Promise<PointsBalance[]>;
    calculatePointsValuation(pointsRequired: number, programId: string): PointsValuation | null;
    comparePointsValuations(pointsOptions: {
        programId: string;
        pointsRequired: number;
    }[]): PointsValuation[];
    getDecryptedCredentials(accountId: string): Promise<RewardAccountCredentials>;
    addRewardProgram(program: RewardProgram): void;
    getRewardProgram(programId: string): RewardProgram | null;
    getAllRewardPrograms(): RewardProgram[];
    getSanitizedAccount(accountId: string): Omit<RewardAccount, 'encryptedCredentials'> | null;
    getSanitizedUserAccounts(userId: string): Omit<RewardAccount, 'encryptedCredentials'>[];
    calculateDetailedValuation(pointsRequired: number, programId: string): ValuationResult | null;
    getTransferRecommendations(fromProgramId: string, toProgramId: string, pointsNeeded: number): TransferRecommendation | null;
    findTransferOpportunities(userId: string, targetProgramId: string, pointsNeeded: number): Promise<TransferRecommendation[]>;
    optimizeFlightPricing(userId: string, pricingInfo: PricingInfo): Promise<OptimizationResult>;
    optimizeWithTransfers(userId: string, pricingInfo: PricingInfo): Promise<FlightPricingComparison>;
    analyzeRedemptionValue(pointsUsed: number, cashValue: number, programId: string): {
        redemptionValue: number;
        baselineValue: number;
        isGoodValue: boolean;
        valueMultiplier: number;
    };
    getEnhancedValuations(userId: string, pointsOptions: {
        programId: string;
        pointsRequired: number;
    }[]): Promise<ValuationResult[]>;
}
//# sourceMappingURL=PointsService.d.ts.map