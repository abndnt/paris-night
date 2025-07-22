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
  totalCost: number; // in cents
}

export interface OptimizationResult {
  recommendedOption: 'cash' | 'points';
  cashOption: {
    totalCost: number;
    currency: string;
  };
  pointsOptions: ValuationResult[];
  bestPointsOption: ValuationResult | undefined;
  savings: number | undefined; // Amount saved by using recommended option
  savingsPercentage: number | undefined;
}

export interface FlightPricingComparison {
  flightId: string;
  cashPrice: number;
  currency: string;
  availablePointsOptions: ValuationResult[];
  optimization: OptimizationResult;
}

export class PointsValuationEngine {
  private rewardPrograms: Map<string, RewardProgram> = new Map();

  constructor(programs: RewardProgram[] = []) {
    programs.forEach(program => this.addRewardProgram(program));
  }

  addRewardProgram(program: RewardProgram): void {
    this.rewardPrograms.set(program.id, program);
  }

  getRewardProgram(programId: string): RewardProgram | null {
    return this.rewardPrograms.get(programId) || null;
  }

  /**
   * Calculate the cash equivalent value of points for a specific program
   */
  calculatePointsValue(pointsRequired: number, programId: string): ValuationResult | null {
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
      bestValue: false,
      transferRequired: false,
      transferDetails: undefined
    };
  }

  /**
   * Calculate transfer recommendations between reward programs
   */
  calculateTransferRecommendations(
    fromProgramId: string,
    toProgramId: string,
    pointsNeeded: number
  ): TransferRecommendation | null {
    const fromProgram = this.rewardPrograms.get(fromProgramId);
    const toProgram = this.rewardPrograms.get(toProgramId);

    if (!fromProgram || !toProgram) {
      return null;
    }

    // Find transfer partner relationship
    const transferPartner = fromProgram.transferPartners.find(
      partner => {
        const partnerName = partner.name.toLowerCase();
        const programName = toProgram.name.toLowerCase();
        return partnerName.includes(programName) || 
               programName.includes(partnerName) ||
               partnerName.includes('united') && programName.includes('united') ||
               partnerName.includes('american') && programName.includes('american');
      }
    );

    if (!transferPartner || !transferPartner.isActive) {
      return null;
    }

    const pointsToTransfer = Math.ceil(pointsNeeded * transferPartner.transferRatio);
    
    // Check transfer limits
    if (pointsToTransfer < transferPartner.minimumTransfer) {
      return null;
    }

    if (transferPartner.maximumTransfer && pointsToTransfer > transferPartner.maximumTransfer) {
      return null;
    }

    const transferFee = transferPartner.transferFee || 0;
    const totalCost = (pointsToTransfer * fromProgram.valuationRate) / 100 + (transferFee / 100);

    return {
      fromProgram: fromProgramId,
      toProgram: toProgramId,
      transferRatio: transferPartner.transferRatio,
      pointsToTransfer,
      transferFee: transferFee,
      minimumTransfer: transferPartner.minimumTransfer,
      maximumTransfer: transferPartner.maximumTransfer || undefined,
      totalCost
    };
  }

  /**
   * Compare multiple points options and identify the best value
   */
  comparePointsOptions(pointsOptions: PointsOption[]): ValuationResult[] {
    const valuations = pointsOptions
      .map(option => this.calculatePointsValue(option.pointsRequired, option.program))
      .filter((valuation): valuation is ValuationResult => valuation !== null);

    if (valuations.length === 0) {
      return [];
    }

    // Find the best value (lowest cash equivalent)
    const bestValuation = valuations.reduce((best, current) => 
      current.cashEquivalent < best.cashEquivalent ? current : best
    );

    return valuations.map(valuation => ({
      ...valuation,
      bestValue: valuation.programId === bestValuation.programId
    }));
  }

  /**
   * Optimize flight pricing by comparing cash vs points options
   */
  optimizeFlightPricing(
    pricingInfo: PricingInfo,
    userBalances: PointsBalance[] = []
  ): OptimizationResult {
    const cashOption = {
      totalCost: pricingInfo.totalPrice,
      currency: pricingInfo.currency
    };

    // Calculate valuations for all points options
    const pointsOptions = this.comparePointsOptions(pricingInfo.pointsOptions);

    // Check if user has sufficient points for each option
    const availableOptions = pointsOptions.map(option => {
      const userBalance = userBalances.find(balance => balance.programId === option.programId);
      const hasSufficientPoints = userBalance && userBalance.balance >= option.pointsRequired;

      return {
        ...option,
        available: hasSufficientPoints || false,
        userBalance: userBalance?.balance || 0
      };
    });

    // Find best available points option
    const bestPointsOption = availableOptions
      .filter(option => option.available)
      .sort((a, b) => a.cashEquivalent - b.cashEquivalent)[0] || undefined;

    // Determine recommendation
    let recommendedOption: 'cash' | 'points' = 'cash';
    let savings = 0;
    let savingsPercentage = 0;

    if (bestPointsOption && bestPointsOption.cashEquivalent < cashOption.totalCost) {
      recommendedOption = 'points';
      savings = cashOption.totalCost - bestPointsOption.cashEquivalent;
      savingsPercentage = (savings / cashOption.totalCost) * 100;
    }

    return {
      recommendedOption,
      cashOption,
      pointsOptions: availableOptions,
      bestPointsOption: bestPointsOption || undefined,
      savings: savings > 0 ? savings : undefined,
      savingsPercentage: savingsPercentage > 0 ? savingsPercentage : undefined
    };
  }

  /**
   * Find transfer opportunities to make points redemptions possible
   */
  findTransferOpportunities(
    targetProgramId: string,
    pointsNeeded: number,
    userBalances: PointsBalance[]
  ): TransferRecommendation[] {
    const recommendations: TransferRecommendation[] = [];

    for (const balance of userBalances) {
      if (balance.programId === targetProgramId) {
        continue; // Skip same program
      }

      const transferRec = this.calculateTransferRecommendations(
        balance.programId,
        targetProgramId,
        pointsNeeded
      );

      if (transferRec && balance.balance >= transferRec.pointsToTransfer) {
        recommendations.push(transferRec);
      }
    }

    // Sort by total cost (most efficient transfers first)
    return recommendations.sort((a, b) => a.totalCost - b.totalCost);
  }

  /**
   * Comprehensive optimization including transfer opportunities
   */
  optimizeWithTransfers(
    pricingInfo: PricingInfo,
    userBalances: PointsBalance[]
  ): FlightPricingComparison {
    const enhancedPointsOptions: ValuationResult[] = [];

    // For each points option, check if transfers can make it viable
    for (const pointsOption of pricingInfo.pointsOptions) {
      const valuation = this.calculatePointsValue(pointsOption.pointsRequired, pointsOption.program);
      if (!valuation) continue;

      const userBalance = userBalances.find(balance => balance.programId === pointsOption.program);
      const hasSufficientPoints = userBalance && userBalance.balance >= pointsOption.pointsRequired;

      if (hasSufficientPoints) {
        enhancedPointsOptions.push({
          ...valuation,
          transferRequired: false,
          transferDetails: undefined
        });
      } else {
        // Look for transfer opportunities
        const transferOpportunities = this.findTransferOpportunities(
          pointsOption.program,
          pointsOption.pointsRequired,
          userBalances
        );

        if (transferOpportunities.length > 0) {
          const bestTransfer = transferOpportunities[0];
          if (bestTransfer) {
            enhancedPointsOptions.push({
              ...valuation,
              transferRequired: true,
              transferDetails: bestTransfer,
              cashEquivalent: bestTransfer.totalCost
            });
          }
        }
      }
    }

    // Re-evaluate best option with transfer possibilities
    const bestEnhancedOption = enhancedPointsOptions
      .sort((a, b) => a.cashEquivalent - b.cashEquivalent)[0] || undefined;

    let finalRecommendation: 'cash' | 'points' = 'cash';
    let finalSavings = 0;
    let finalSavingsPercentage = 0;

    if (bestEnhancedOption && bestEnhancedOption.cashEquivalent < pricingInfo.totalPrice) {
      finalRecommendation = 'points';
      finalSavings = pricingInfo.totalPrice - bestEnhancedOption.cashEquivalent;
      finalSavingsPercentage = (finalSavings / pricingInfo.totalPrice) * 100;
    }

    return {
      flightId: 'flight-' + Date.now(), // This would come from the flight result
      cashPrice: pricingInfo.totalPrice,
      currency: pricingInfo.currency,
      availablePointsOptions: enhancedPointsOptions,
      optimization: {
        recommendedOption: finalRecommendation,
        cashOption: {
          totalCost: pricingInfo.totalPrice,
          currency: pricingInfo.currency
        },
        pointsOptions: enhancedPointsOptions,
        bestPointsOption: bestEnhancedOption || undefined,
        savings: finalSavings > 0 ? finalSavings : undefined,
        savingsPercentage: finalSavingsPercentage > 0 ? finalSavingsPercentage : undefined
      }
    };
  }

  /**
   * Calculate the effective value rate for a points redemption
   */
  calculateRedemptionValue(
    pointsUsed: number,
    cashValue: number
  ): number {
    if (pointsUsed === 0) return 0;
    return (cashValue * 100) / pointsUsed; // Return cents per point
  }

  /**
   * Analyze if a redemption offers good value compared to program's baseline
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
    const program = this.rewardPrograms.get(programId);
    if (!program) {
      throw new Error(`Program ${programId} not found`);
    }

    const redemptionValue = this.calculateRedemptionValue(pointsUsed, cashValue);
    const baselineValue = program.valuationRate;
    const valueMultiplier = redemptionValue / baselineValue;
    const isGoodValue = valueMultiplier >= 1.0; // At least baseline value

    return {
      redemptionValue,
      baselineValue,
      isGoodValue,
      valueMultiplier
    };
  }
}