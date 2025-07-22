"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointsValuationEngine = void 0;
class PointsValuationEngine {
    constructor(programs = []) {
        this.rewardPrograms = new Map();
        programs.forEach(program => this.addRewardProgram(program));
    }
    addRewardProgram(program) {
        this.rewardPrograms.set(program.id, program);
    }
    getRewardProgram(programId) {
        return this.rewardPrograms.get(programId) || null;
    }
    calculatePointsValue(pointsRequired, programId) {
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
    calculateTransferRecommendations(fromProgramId, toProgramId, pointsNeeded) {
        const fromProgram = this.rewardPrograms.get(fromProgramId);
        const toProgram = this.rewardPrograms.get(toProgramId);
        if (!fromProgram || !toProgram) {
            return null;
        }
        const transferPartner = fromProgram.transferPartners.find(partner => {
            const partnerName = partner.name.toLowerCase();
            const programName = toProgram.name.toLowerCase();
            return partnerName.includes(programName) ||
                programName.includes(partnerName) ||
                partnerName.includes('united') && programName.includes('united') ||
                partnerName.includes('american') && programName.includes('american');
        });
        if (!transferPartner || !transferPartner.isActive) {
            return null;
        }
        const pointsToTransfer = Math.ceil(pointsNeeded * transferPartner.transferRatio);
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
    comparePointsOptions(pointsOptions) {
        const valuations = pointsOptions
            .map(option => this.calculatePointsValue(option.pointsRequired, option.program))
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
    optimizeFlightPricing(pricingInfo, userBalances = []) {
        const cashOption = {
            totalCost: pricingInfo.totalPrice,
            currency: pricingInfo.currency
        };
        const pointsOptions = this.comparePointsOptions(pricingInfo.pointsOptions);
        const availableOptions = pointsOptions.map(option => {
            const userBalance = userBalances.find(balance => balance.programId === option.programId);
            const hasSufficientPoints = userBalance && userBalance.balance >= option.pointsRequired;
            return {
                ...option,
                available: hasSufficientPoints || false,
                userBalance: userBalance?.balance || 0
            };
        });
        const bestPointsOption = availableOptions
            .filter(option => option.available)
            .sort((a, b) => a.cashEquivalent - b.cashEquivalent)[0] || undefined;
        let recommendedOption = 'cash';
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
    findTransferOpportunities(targetProgramId, pointsNeeded, userBalances) {
        const recommendations = [];
        for (const balance of userBalances) {
            if (balance.programId === targetProgramId) {
                continue;
            }
            const transferRec = this.calculateTransferRecommendations(balance.programId, targetProgramId, pointsNeeded);
            if (transferRec && balance.balance >= transferRec.pointsToTransfer) {
                recommendations.push(transferRec);
            }
        }
        return recommendations.sort((a, b) => a.totalCost - b.totalCost);
    }
    optimizeWithTransfers(pricingInfo, userBalances) {
        const enhancedPointsOptions = [];
        for (const pointsOption of pricingInfo.pointsOptions) {
            const valuation = this.calculatePointsValue(pointsOption.pointsRequired, pointsOption.program);
            if (!valuation)
                continue;
            const userBalance = userBalances.find(balance => balance.programId === pointsOption.program);
            const hasSufficientPoints = userBalance && userBalance.balance >= pointsOption.pointsRequired;
            if (hasSufficientPoints) {
                enhancedPointsOptions.push({
                    ...valuation,
                    transferRequired: false,
                    transferDetails: undefined
                });
            }
            else {
                const transferOpportunities = this.findTransferOpportunities(pointsOption.program, pointsOption.pointsRequired, userBalances);
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
        const bestEnhancedOption = enhancedPointsOptions
            .sort((a, b) => a.cashEquivalent - b.cashEquivalent)[0] || undefined;
        let finalRecommendation = 'cash';
        let finalSavings = 0;
        let finalSavingsPercentage = 0;
        if (bestEnhancedOption && bestEnhancedOption.cashEquivalent < pricingInfo.totalPrice) {
            finalRecommendation = 'points';
            finalSavings = pricingInfo.totalPrice - bestEnhancedOption.cashEquivalent;
            finalSavingsPercentage = (finalSavings / pricingInfo.totalPrice) * 100;
        }
        return {
            flightId: 'flight-' + Date.now(),
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
    calculateRedemptionValue(pointsUsed, cashValue) {
        if (pointsUsed === 0)
            return 0;
        return (cashValue * 100) / pointsUsed;
    }
    analyzeRedemptionValue(pointsUsed, cashValue, programId) {
        const program = this.rewardPrograms.get(programId);
        if (!program) {
            throw new Error(`Program ${programId} not found`);
        }
        const redemptionValue = this.calculateRedemptionValue(pointsUsed, cashValue);
        const baselineValue = program.valuationRate;
        const valueMultiplier = redemptionValue / baselineValue;
        const isGoodValue = valueMultiplier >= 1.0;
        return {
            redemptionValue,
            baselineValue,
            isGoodValue,
            valueMultiplier
        };
    }
}
exports.PointsValuationEngine = PointsValuationEngine;
//# sourceMappingURL=PointsValuationEngine.js.map