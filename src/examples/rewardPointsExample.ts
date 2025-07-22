import { PointsService } from '../services/PointsService';
import { RewardProgramConfigManager } from '../services/RewardProgramConfigManager';
import { CreateRewardAccountRequest } from '../models/RewardAccount';

/**
 * Example demonstrating the reward points system functionality
 */
export async function demonstrateRewardPointsSystem(): Promise<void> {
  console.log('=== Reward Points System Demo ===\n');

  // Initialize services
  const configManager = new RewardProgramConfigManager();
  const pointsService = new PointsService();

  // Load reward programs into points service
  const programs = configManager.getAllPrograms();
  programs.forEach(program => {
    pointsService.addRewardProgram(program);
  });

  console.log('1. Available Reward Programs:');
  programs.forEach(program => {
    console.log(`   - ${program.name} (${program.type}): ${program.valuationRate}¢ per point`);
  });
  console.log();

  // Create user reward accounts
  const userId = 'demo_user_123';
  
  const chaseAccount: CreateRewardAccountRequest = {
    userId,
    programId: 'chase_sapphire',
    accountNumber: 'CHASE123456',
    credentials: {
      username: 'demo_user',
      password: 'secure_password_123',
      additionalFields: { memberId: 'MEMBER789' }
    }
  };

  const unitedAccount: CreateRewardAccountRequest = {
    userId,
    programId: 'united_mileageplus',
    accountNumber: 'UNITED789012',
    credentials: {
      username: 'demo_user',
      password: 'another_secure_password'
    }
  };

  console.log('2. Creating Reward Accounts...');
  const chaseRewardAccount = await pointsService.createRewardAccount(chaseAccount);
  const unitedRewardAccount = await pointsService.createRewardAccount(unitedAccount);
  
  console.log(`   - Chase Sapphire account created: ${chaseRewardAccount.id}`);
  console.log(`   - United MileagePlus account created: ${unitedRewardAccount.id}`);
  console.log();

  // Update points balances
  console.log('3. Updating Points Balances...');
  await pointsService.updatePointsBalance(chaseRewardAccount.id, 75000);
  await pointsService.updatePointsBalance(unitedRewardAccount.id, 45000);
  
  console.log('   - Chase Sapphire: 75,000 points');
  console.log('   - United MileagePlus: 45,000 miles');
  console.log();

  // Get user's points balances
  console.log('4. User Points Summary:');
  const balances = await pointsService.getPointsBalances(userId);
  balances.forEach(balance => {
    console.log(`   - ${balance.programName}: ${balance.balance.toLocaleString()} points`);
  });
  console.log();

  // Calculate points valuations for a hypothetical flight
  console.log('5. Points Valuation for Flight (25,000 points required):');
  const flightPointsRequired = 25000;
  
  const valuationOptions = [
    { programId: 'chase_sapphire', pointsRequired: flightPointsRequired },
    { programId: 'united_mileageplus', pointsRequired: flightPointsRequired }
  ];

  const valuations = pointsService.comparePointsValuations(valuationOptions);
  valuations.forEach(valuation => {
    const bestValueIndicator = valuation.bestValue ? ' ⭐ BEST VALUE' : '';
    console.log(`   - ${valuation.programName}: ${valuation.pointsRequired.toLocaleString()} points = $${valuation.cashEquivalent.toFixed(2)}${bestValueIndicator}`);
  });
  console.log();

  // Demonstrate credential security
  console.log('6. Credential Security Demo:');
  const sanitizedAccounts = pointsService.getSanitizedUserAccounts(userId);
  console.log('   - Sanitized account data (credentials hidden):');
  sanitizedAccounts.forEach(account => {
    console.log(`     * ${account.accountNumber}: Balance ${account.balance.toLocaleString()}`);
  });
  
  // Show that credentials are encrypted but can be decrypted when needed
  const decryptedCredentials = await pointsService.getDecryptedCredentials(chaseRewardAccount.id);
  console.log(`   - Decrypted credentials available for API calls: username="${decryptedCredentials.username}"`);
  console.log();

  // Search for programs
  console.log('7. Program Search Demo:');
  const airlinePrograms = configManager.getProgramsByType('airline');
  const searchResults = configManager.searchPrograms('chase');
  
  console.log(`   - Airline programs: ${airlinePrograms.length} found`);
  console.log(`   - Search for "chase": ${searchResults.length} results`);
  console.log();

  console.log('=== Demo Complete ===');
}

// Export for potential use in other examples or tests
export { PointsService, RewardProgramConfigManager };