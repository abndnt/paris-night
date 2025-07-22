import { RewardProgram } from '../models/RewardProgram';
import { PointsOption, PricingInfo } from '../models/FlightSearch';
import { PointsBalance } from './PointsService';
export interface ValuationResult {
    programId: string;
    programName: string;
    pointsRequired: number;
    cashEquivalent: number;
    valuationRate: number;
    bestValue: boolean;
    transferRequired: boolean | undefined;
    transferDetails: TransferRecommendation | undefined;
}
export interface TransferRecommendation {
    fromProgram: string;
    toProgram: string;
    transferRatio: number;
    pointsToTransfer: number;
    transferFee: number | undefined;
    minimumTransfer: number;
    maximumTransfer: number | undefined;
    totalCost: number;
}
export interface OptimizationResult {
    recommendedOption: 'cash' | 'points';
    cashOption: {
        totalCost: number;
        currency: string;
    };
    pointsOptions: ValuationResult[];
    bestPointsOption: ValuationResult | undefined;
    savings: number | undefined;
    savingsPercentage: number | undefined;
}
export interface FlightPricingComparison {
    flightId: string;
    cashPrice: number;
    currency: string;
    availablePointsOptions: ValuationResult[];
    optimization: OptimizationResult;
}
export declare class PointsValuationEngine {
    private rewardPrograms;
    constructor(programs?: RewardProgram[]);
    addRewardProgram(program: RewardProgram): void;
    getRewardProgram(programId: string): RewardProgram | null;
    calculatePointsValue(pointsRequired: number, programId: string): ValuationResult | null;
    calculateTransferRecommendations(fromProgramId: string, toProgramId: string, pointsNeeded: number): TransferRecommendation | null;
    comparePointsOptions(pointsOptions: PointsOption[]): ValuationResult[];
    optimizeFlightPricing(pricingInfo: PricingInfo, userBalances?: PointsBalance[]): OptimizationResult;
    findTransferOpportunities(targetProgramId: string, pointsNeeded: number, userBalances: PointsBalance[]): TransferRecommendation[];
    optimizeWithTransfers(pricingInfo: PricingInfo, userBalances: PointsBalance[]): FlightPricingComparison;
    calculateRedemptionValue(pointsUsed: number, cashValue: number): number;
    analyzeRedemptionValue(pointsUsed: number, cashValue: number, programId: string): {
        redemptionValue: number;
        baselineValue: number;
        isGoodValue: boolean;
        valueMultiplier: number;
    };
}
//# sourceMappingURL=PointsValuationEngine.d.ts.map