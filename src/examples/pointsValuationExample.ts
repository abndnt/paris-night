import { PointsValuationEngine } from '../services/PointsValuationEngine';
import { PointsService } from '../services/PointsService';
import { RewardProgramConfigManager } from '../services/RewardProgramConfigManager';

/**
 * Example demonstrating the Points Valuation and Optimization Engine
 * This shows how to:
 * 1. Calculate points valuations for different reward programs
 * 2. Compare cash vs points pricing options
 * 3. Find transfer opportunities between programs
 * 4. Optimize flight pricing recommendations
 */

async function demonstratePointsValuation() {
  console.log('=== Points Valuation and Optimization Engine Demo ===\n');

  // Initialize services
  const configManager = new RewardProgramConfigManager();
  const pointsService = new PointsService('demo-encryption-key-32-chars-long');
  const valuationEngine = new PointsValuationEngine();

  // Add reward programs to services
  const programs = configManager.getAllPrograms();
  programs.forEach(program => {
    pointsService.addRewardProgram(program);
    valuationEngine.addRewardProgram(program);
  });

  console.log('Available Reward Programs:');
  programs.forEach(program => {
    console.log(`- ${program.name}: ${program.valuationRate} cents per point`);
  });
  console.log();

  // Example 1: Basic Points Valuation
  console.log('=== Example 1: Basic Points Valuation ===');
  const unitedValuation = valuationEngine.calculatePointsValue(25000, 'united_mileageplus');
  const americanValuation = valuationEngine.calculatePointsValue(25000, 'american_aadvantage');

  console.log(`United 25,000 miles = $${unitedValuation?.cashEquivalent.toFixed(2)}`);
  console.log(`American 25,000 miles = $${americanValuation?.cashEquivalent.toFixed(2)}`);
  console.log();

  // Example 2: Transfer Recommendations
  console.log('=== Example 2: Transfer Recommendations ===');
  const transferRec = valuationEngine.calculateTransferRecommendations(
    'chase_sapphire',
    'united_mileageplus',
    25000
  );

  if (transferRec) {
    console.log(`Transfer 25,000 Chase points to United:`);
    console.log(`- Points to transfer: ${transferRec.pointsToTransfer.toLocaleString()}`);
    console.log(`- Transfer ratio: ${transferRec.transferRatio}:1`);
    console.log(`- Total cost: $${transferRec.totalCost.toFixed(2)}`);
    console.log(`- Transfer fee: $${(transferRec.transferFee || 0) / 100}`);
  }
  console.log();

  // Example 3: Flight Pricing Optimization
  console.log('=== Example 3: Flight Pricing Optimization ===');
  
  // Mock flight pricing data
  const flightPricing = {
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

  // Mock user balances
  const userBalances = [
    {
      accountId: 'account1',
      programId: 'united_mileageplus',
      programName: 'United MileagePlus',
      balance: 30000,
      lastUpdated: new Date()
    },
    {
      accountId: 'account2',
      programId: 'chase_sapphire',
      programName: 'Chase Sapphire',
      balance: 50000,
      lastUpdated: new Date()
    }
  ];

  const optimization = valuationEngine.optimizeFlightPricing(flightPricing, userBalances);

  console.log(`Flight Cost: $${flightPricing.totalPrice}`);
  console.log(`Recommended Option: ${optimization.recommendedOption.toUpperCase()}`);
  
  if (optimization.bestPointsOption) {
    console.log(`Best Points Option: ${optimization.bestPointsOption.programName}`);
    console.log(`Points Required: ${optimization.bestPointsOption.pointsRequired.toLocaleString()}`);
    console.log(`Equivalent Value: $${optimization.bestPointsOption.cashEquivalent.toFixed(2)}`);
  }

  if (optimization.savings) {
    console.log(`Savings: $${optimization.savings.toFixed(2)} (${optimization.savingsPercentage?.toFixed(1)}%)`);
  }
  console.log();

  // Example 4: Transfer Optimization
  console.log('=== Example 4: Transfer Optimization ===');
  
  // User with only Chase points, no airline miles
  const transferUserBalances = [
    {
      accountId: 'account1',
      programId: 'chase_sapphire',
      programName: 'Chase Sapphire',
      balance: 50000,
      lastUpdated: new Date()
    }
  ];

  const transferOptimization = valuationEngine.optimizeWithTransfers(
    flightPricing,
    transferUserBalances
  );

  console.log(`With Transfer Opportunities:`);
  console.log(`Recommended Option: ${transferOptimization.optimization.recommendedOption.toUpperCase()}`);
  
  if (transferOptimization.availablePointsOptions.length > 0) {
    const bestOption = transferOptimization.availablePointsOptions[0];
    console.log(`Best Option: ${bestOption?.programName}`);
    console.log(`Transfer Required: ${bestOption?.transferRequired ? 'Yes' : 'No'}`);
    
    if (bestOption?.transferDetails) {
      console.log(`Transfer from: ${bestOption.transferDetails.fromProgram}`);
      console.log(`Points to transfer: ${bestOption.transferDetails.pointsToTransfer.toLocaleString()}`);
      console.log(`Total cost: $${bestOption.transferDetails.totalCost.toFixed(2)}`);
    }
  }

  if (transferOptimization.optimization.savings) {
    console.log(`Savings: $${transferOptimization.optimization.savings.toFixed(2)} (${transferOptimization.optimization.savingsPercentage?.toFixed(1)}%)`);
  }
  console.log();

  // Example 5: Redemption Value Analysis
  console.log('=== Example 5: Redemption Value Analysis ===');
  
  const redemptionAnalysis = valuationEngine.analyzeRedemptionValue(
    25000, // points used
    400,   // cash value of flight
    'united_mileageplus'
  );

  console.log(`Redemption Analysis for 25,000 United miles → $400 flight:`);
  console.log(`- Redemption value: ${redemptionAnalysis.redemptionValue.toFixed(2)} cents per mile`);
  console.log(`- Baseline value: ${redemptionAnalysis.baselineValue.toFixed(2)} cents per mile`);
  console.log(`- Value multiplier: ${redemptionAnalysis.valueMultiplier.toFixed(2)}x`);
  console.log(`- Good value: ${redemptionAnalysis.isGoodValue ? 'Yes' : 'No'}`);
  console.log();

  console.log('=== Demo Complete ===');
}

// Run the demonstration
if (require.main === module) {
  demonstratePointsValuation().catch(console.error);
}

export { demonstratePointsValuation };