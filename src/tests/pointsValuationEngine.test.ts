import { PointsValuationEngine } from '../services/PointsValuationEngine';
import { RewardProgram, TransferPartner } from '../models/RewardProgram';
import { PricingInfo, PointsOption } from '../models/FlightSearch';
import { PointsBalance } from '../services/PointsService';

describe('PointsValuationEngine', () => {
  let engine: PointsValuationEngine;
  let chaseProgram: RewardProgram;
  let unitedProgram: RewardProgram;
  let americanProgram: RewardProgram;

  beforeEach(() => {
    // Create test reward programs
    const unitedTransferPartner: TransferPartner = {
      id: 'united_partner',
      name: 'United Airlines',
      transferRatio: 1,
      minimumTransfer: 1000,
      maximumTransfer: 100000,
      transferFee: 0,
      isActive: true
    };

    const americanTransferPartner: TransferPartner = {
      id: 'american_partner',
      name: 'American Airlines',
      transferRatio: 1,
      minimumTransfer: 1000,
      transferFee: 25, // $0.25 fee
      isActive: true
    };

    chaseProgram = {
      id: 'chase_sapphire',
      name: 'Chase Sapphire',
      type: 'credit_card',
      transferPartners: [unitedTransferPartner, americanTransferPartner],
      valuationRate: 1.25, // 1.25 cents per point
      apiEndpoint: undefined,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    unitedProgram = {
      id: 'united_mileageplus',
      name: 'United MileagePlus',
      type: 'airline',
      transferPartners: [],
      valuationRate: 1.3, // 1.3 cents per mile
      apiEndpoint: 'https://api.united.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    americanProgram = {
      id: 'american_aadvantage',
      name: 'American Airlines AAdvantage',
      type: 'airline',
      transferPartners: [],
      valuationRate: 1.4, // 1.4 cents per mile
      apiEndpoint: 'https://api.aa.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    engine = new PointsValuationEngine([chaseProgram, unitedProgram, americanProgram]);
  });

  describe('calculatePointsValue', () => {
    it('should calculate points value correctly', () => {
      const valuation = engine.calculatePointsValue(25000, 'united_mileageplus');

      expect(valuation).not.toBeNull();
      expect(valuation?.programId).toBe('united_mileageplus');
      expect(valuation?.programName).toBe('United MileagePlus');
      expect(valuation?.pointsRequired).toBe(25000);
      expect(valuation?.cashEquivalent).toBe(325); // 25000 * 1.3 / 100
      expect(valuation?.valuationRate).toBe(1.3);
      expect(valuation?.bestValue).toBe(false);
      expect(valuation?.transferRequired).toBe(false);
    });

    it('should return null for non-existent program', () => {
      const valuation = engine.calculatePointsValue(25000, 'invalid_program');
      expect(valuation).toBeNull();
    });

    it('should handle zero points', () => {
      const valuation = engine.calculatePointsValue(0, 'united_mileageplus');

      expect(valuation?.pointsRequired).toBe(0);
      expect(valuation?.cashEquivalent).toBe(0);
    });
  });

  describe('calculateTransferRecommendations', () => {
    it('should calculate transfer recommendations correctly', () => {
      const recommendation = engine.calculateTransferRecommendations(
        'chase_sapphire',
        'united_mileageplus',
        25000
      );

      expect(recommendation).not.toBeNull();
      expect(recommendation?.fromProgram).toBe('chase_sapphire');
      expect(recommendation?.toProgram).toBe('united_mileageplus');
      expect(recommendation?.transferRatio).toBe(1);
      expect(recommendation?.pointsToTransfer).toBe(25000);
      expect(recommendation?.transferFee).toBe(0);
      expect(recommendation?.minimumTransfer).toBe(1000);
      expect(recommendation?.totalCost).toBe(312.5); // 25000 * 1.25 / 100
    });

    it('should include transfer fee in total cost', () => {
      const recommendation = engine.calculateTransferRecommendations(
        'chase_sapphire',
        'american_aadvantage',
        25000
      );

      expect(recommendation?.transferFee).toBe(25);
      expect(recommendation?.totalCost).toBe(312.75); // (25000 * 1.25 / 100) + (25 / 100)
    });

    it('should return null for insufficient minimum transfer', () => {
      const recommendation = engine.calculateTransferRecommendations(
        'chase_sapphire',
        'united_mileageplus',
        500 // Below minimum of 1000
      );

      expect(recommendation).toBeNull();
    });

    it('should return null for non-existent programs', () => {
      const recommendation = engine.calculateTransferRecommendations(
        'invalid_program',
        'united_mileageplus',
        25000
      );

      expect(recommendation).toBeNull();
    });

    it('should return null when no transfer partner relationship exists', () => {
      const recommendation = engine.calculateTransferRecommendations(
        'united_mileageplus',
        'american_aadvantage',
        25000
      );

      expect(recommendation).toBeNull();
    });
  });

  describe('comparePointsOptions', () => {
    it('should identify best value option', () => {
      const pointsOptions: PointsOption[] = [
        {
          program: 'united_mileageplus',
          pointsRequired: 25000,
          bestValue: false
        },
        {
          program: 'american_aadvantage',
          pointsRequired: 25000,
          bestValue: false
        }
      ];

      const valuations = engine.comparePointsOptions(pointsOptions);

      expect(valuations).toHaveLength(2);
      
      const unitedValuation = valuations.find(v => v.programId === 'united_mileageplus');
      const americanValuation = valuations.find(v => v.programId === 'american_aadvantage');

      expect(unitedValuation?.bestValue).toBe(true); // 325 < 350
      expect(americanValuation?.bestValue).toBe(false);
      expect(unitedValuation?.cashEquivalent).toBe(325);
      expect(americanValuation?.cashEquivalent).toBe(350);
    });

    it('should handle empty options array', () => {
      const valuations = engine.comparePointsOptions([]);
      expect(valuations).toHaveLength(0);
    });

    it('should filter out invalid programs', () => {
      const pointsOptions: PointsOption[] = [
        {
          program: 'united_mileageplus',
          pointsRequired: 25000,
          bestValue: false
        },
        {
          program: 'invalid_program',
          pointsRequired: 25000,
          bestValue: false
        }
      ];

      const valuations = engine.comparePointsOptions(pointsOptions);

      expect(valuations).toHaveLength(1);
      expect(valuations[0]?.programId).toBe('united_mileageplus');
      expect(valuations[0]?.bestValue).toBe(true);
    });
  });

  describe('optimizeFlightPricing', () => {
    let mockPricingInfo: PricingInfo;
    let mockUserBalances: PointsBalance[];

    beforeEach(() => {
      mockPricingInfo = {
        cashPrice: 400,
        currency: 'USD',
        pointsOptions: [
          {
            program: 'united_mileageplus',
            pointsRequired: 25000,
            bestValue: false
          },
          {
            program: 'american_aadvantage',
            pointsRequired: 25000,
            bestValue: false
          }
        ],
        taxes: 50,
        fees: 25,
        totalPrice: 475
      };

      mockUserBalances = [
        {
          accountId: 'account1',
          programId: 'united_mileageplus',
          programName: 'United MileagePlus',
          balance: 30000,
          lastUpdated: new Date()
        },
        {
          accountId: 'account2',
          programId: 'american_aadvantage',
          programName: 'American Airlines AAdvantage',
          balance: 20000, // Insufficient for 25000 needed
          lastUpdated: new Date()
        }
      ];
    });

    it('should recommend points when they offer better value', () => {
      const optimization = engine.optimizeFlightPricing(mockPricingInfo, mockUserBalances);

      expect(optimization.recommendedOption).toBe('points');
      expect(optimization.cashOption.totalCost).toBe(475);
      expect(optimization.bestPointsOption?.programId).toBe('united_mileageplus');
      expect(optimization.savings).toBe(150); // 475 - 325
      expect(optimization.savingsPercentage).toBeCloseTo(31.58, 1);
    });

    it('should recommend cash when points offer poor value', () => {
      // Modify pricing to make cash better
      const expensivePricingInfo: PricingInfo = {
        ...mockPricingInfo,
        totalPrice: 300 // Less than points value
      };

      const optimization = engine.optimizeFlightPricing(expensivePricingInfo, mockUserBalances);

      expect(optimization.recommendedOption).toBe('cash');
      expect(optimization.bestPointsOption?.programId).toBe('united_mileageplus');
      expect(optimization.savings).toBeUndefined();
    });

    it('should handle insufficient points balances', () => {
      const lowBalances: PointsBalance[] = [
        {
          accountId: 'account1',
          programId: 'united_mileageplus',
          programName: 'United MileagePlus',
          balance: 10000, // Insufficient
          lastUpdated: new Date()
        }
      ];

      const optimization = engine.optimizeFlightPricing(mockPricingInfo, lowBalances);

      expect(optimization.recommendedOption).toBe('cash');
      expect(optimization.bestPointsOption).toBeUndefined();
    });

    it('should work with empty user balances', () => {
      const optimization = engine.optimizeFlightPricing(mockPricingInfo, []);

      expect(optimization.recommendedOption).toBe('cash');
      expect(optimization.pointsOptions).toHaveLength(2);
      expect(optimization.bestPointsOption).toBeUndefined();
    });
  });

  describe('findTransferOpportunities', () => {
    let mockUserBalances: PointsBalance[];

    beforeEach(() => {
      mockUserBalances = [
        {
          accountId: 'account1',
          programId: 'chase_sapphire',
          programName: 'Chase Sapphire',
          balance: 50000,
          lastUpdated: new Date()
        },
        {
          accountId: 'account2',
          programId: 'american_aadvantage',
          programName: 'American Airlines AAdvantage',
          balance: 10000,
          lastUpdated: new Date()
        }
      ];
    });

    it('should find valid transfer opportunities', () => {
      const opportunities = engine.findTransferOpportunities(
        'united_mileageplus',
        25000,
        mockUserBalances
      );

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0]?.fromProgram).toBe('chase_sapphire');
      expect(opportunities[0]?.toProgram).toBe('united_mileageplus');
      expect(opportunities[0]?.pointsToTransfer).toBe(25000);
    });

    it('should exclude insufficient balances', () => {
      const lowBalances: PointsBalance[] = [
        {
          accountId: 'account1',
          programId: 'chase_sapphire',
          programName: 'Chase Sapphire',
          balance: 500, // Too low
          lastUpdated: new Date()
        }
      ];

      const opportunities = engine.findTransferOpportunities(
        'united_mileageplus',
        25000,
        lowBalances
      );

      expect(opportunities).toHaveLength(0);
    });

    it('should sort by total cost', () => {
      // Add another program with higher cost
      const expensiveProgram: RewardProgram = {
        id: 'expensive_program',
        name: 'Expensive Program',
        type: 'credit_card',
        transferPartners: [{
          id: 'expensive_partner',
          name: 'United Airlines',
          transferRatio: 2, // 2:1 ratio makes it more expensive
          minimumTransfer: 1000,
          transferFee: 100,
          isActive: true
        }],
        valuationRate: 2.0,
        apiEndpoint: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      engine.addRewardProgram(expensiveProgram);

      const balancesWithExpensive: PointsBalance[] = [
        ...mockUserBalances,
        {
          accountId: 'account3',
          programId: 'expensive_program',
          programName: 'Expensive Program',
          balance: 100000,
          lastUpdated: new Date()
        }
      ];

      const opportunities = engine.findTransferOpportunities(
        'united_mileageplus',
        25000,
        balancesWithExpensive
      );

      expect(opportunities).toHaveLength(2);
      // Chase should be first (cheaper)
      expect(opportunities[0]?.fromProgram).toBe('chase_sapphire');
      expect(opportunities[1]?.fromProgram).toBe('expensive_program');
    });
  });

  describe('optimizeWithTransfers', () => {
    let mockPricingInfo: PricingInfo;
    let mockUserBalances: PointsBalance[];

    beforeEach(() => {
      mockPricingInfo = {
        cashPrice: 400,
        currency: 'USD',
        pointsOptions: [
          {
            program: 'united_mileageplus',
            pointsRequired: 25000,
            bestValue: false
          }
        ],
        taxes: 50,
        fees: 25,
        totalPrice: 475
      };

      mockUserBalances = [
        {
          accountId: 'account1',
          programId: 'chase_sapphire',
          programName: 'Chase Sapphire',
          balance: 50000,
          lastUpdated: new Date()
        }
      ];
    });

    it('should recommend transfer when it offers better value', () => {
      const comparison = engine.optimizeWithTransfers(mockPricingInfo, mockUserBalances);

      expect(comparison.optimization.recommendedOption).toBe('points');
      expect(comparison.availablePointsOptions).toHaveLength(1);
      expect(comparison.availablePointsOptions[0]?.transferRequired).toBe(true);
      expect(comparison.availablePointsOptions[0]?.transferDetails).toBeDefined();
      expect(comparison.optimization.savings).toBeGreaterThan(0);
    });

    it('should handle direct points availability', () => {
      const directBalances: PointsBalance[] = [
        {
          accountId: 'account1',
          programId: 'united_mileageplus',
          programName: 'United MileagePlus',
          balance: 30000,
          lastUpdated: new Date()
        }
      ];

      const comparison = engine.optimizeWithTransfers(mockPricingInfo, directBalances);

      expect(comparison.availablePointsOptions[0]?.transferRequired).toBe(false);
      expect(comparison.availablePointsOptions[0]?.transferDetails).toBeUndefined();
    });
  });

  describe('analyzeRedemptionValue', () => {
    it('should analyze redemption value correctly', () => {
      const analysis = engine.analyzeRedemptionValue(25000, 400, 'united_mileageplus');

      expect(analysis.redemptionValue).toBe(1.6); // (400 * 100) / 25000
      expect(analysis.baselineValue).toBe(1.3);
      expect(analysis.isGoodValue).toBe(true); // 1.6 > 1.3
      expect(analysis.valueMultiplier).toBeCloseTo(1.23, 2);
    });

    it('should identify poor value redemptions', () => {
      const analysis = engine.analyzeRedemptionValue(25000, 250, 'united_mileageplus');

      expect(analysis.redemptionValue).toBe(1.0); // (250 * 100) / 25000
      expect(analysis.baselineValue).toBe(1.3);
      expect(analysis.isGoodValue).toBe(false); // 1.0 < 1.3
      expect(analysis.valueMultiplier).toBeCloseTo(0.77, 2);
    });

    it('should handle zero points', () => {
      const analysis = engine.analyzeRedemptionValue(0, 400, 'united_mileageplus');

      expect(analysis.redemptionValue).toBe(0);
      expect(analysis.valueMultiplier).toBe(0);
      expect(analysis.isGoodValue).toBe(false);
    });

    it('should throw error for non-existent program', () => {
      expect(() => {
        engine.analyzeRedemptionValue(25000, 400, 'invalid_program');
      }).toThrow('Program invalid_program not found');
    });
  });

  describe('calculateRedemptionValue', () => {
    it('should calculate redemption value correctly', () => {
      const value = engine.calculateRedemptionValue(25000, 400);
      expect(value).toBe(1.6); // (400 * 100) / 25000
    });

    it('should handle zero points', () => {
      const value = engine.calculateRedemptionValue(0, 400);
      expect(value).toBe(0);
    });
  });
});