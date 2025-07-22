import { PointsService } from '../services/PointsService';
import { RewardProgram } from '../models/RewardProgram';
import { CreateRewardAccountRequest, RewardAccountCredentials } from '../models/RewardAccount';

describe('PointsService', () => {
  let pointsService: PointsService;
  let mockProgram: RewardProgram;

  beforeEach(() => {
    pointsService = new PointsService('test-key-32-chars-long-for-testing');
    
    mockProgram = {
      id: 'test_program',
      name: 'Test Airline Miles',
      type: 'airline',
      transferPartners: [],
      valuationRate: 1.5, // 1.5 cents per point
      apiEndpoint: undefined,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    pointsService.addRewardProgram(mockProgram);
  });

  describe('createRewardAccount', () => {
    const mockCredentials: RewardAccountCredentials = {
      username: 'testuser',
      password: 'testpass'
    };

    const mockRequest: CreateRewardAccountRequest = {
      userId: 'user123',
      programId: 'test_program',
      accountNumber: 'ACC789',
      credentials: mockCredentials
    };

    it('should create a reward account successfully', async () => {
      const account = await pointsService.createRewardAccount(mockRequest);

      expect(account.userId).toBe(mockRequest.userId);
      expect(account.programId).toBe(mockRequest.programId);
      expect(account.accountNumber).toBe(mockRequest.accountNumber);
      expect(account.balance).toBe(0);
      expect(account.isActive).toBe(true);
      expect(account.encryptedCredentials).toBeDefined();
      expect(account.encryptedCredentials).not.toContain('testuser');
    });

    it('should throw error for non-existent program', async () => {
      const invalidRequest = { ...mockRequest, programId: 'invalid_program' };

      await expect(pointsService.createRewardAccount(invalidRequest))
        .rejects.toThrow('Reward program invalid_program not found');
    });

    it('should encrypt credentials properly', async () => {
      const account = await pointsService.createRewardAccount(mockRequest);
      const decryptedCredentials = await pointsService.getDecryptedCredentials(account.id);

      expect(decryptedCredentials.username).toBe(mockCredentials.username);
      expect(decryptedCredentials.password).toBe(mockCredentials.password);
    });
  });

  describe('getRewardAccount', () => {
    it('should retrieve existing account', async () => {
      const mockRequest: CreateRewardAccountRequest = {
        userId: 'user123',
        programId: 'test_program',
        accountNumber: 'ACC789',
        credentials: { username: 'test', password: 'pass' }
      };

      const createdAccount = await pointsService.createRewardAccount(mockRequest);
      const retrievedAccount = await pointsService.getRewardAccount(createdAccount.id);

      expect(retrievedAccount).toEqual(createdAccount);
    });

    it('should return null for non-existent account', async () => {
      const account = await pointsService.getRewardAccount('non_existent_id');
      expect(account).toBeNull();
    });
  });

  describe('getUserRewardAccounts', () => {
    it('should return user accounts only', async () => {
      const user1Request: CreateRewardAccountRequest = {
        userId: 'user1',
        programId: 'test_program',
        accountNumber: 'ACC1',
        credentials: { username: 'user1', password: 'pass1' }
      };

      const user2Request: CreateRewardAccountRequest = {
        userId: 'user2',
        programId: 'test_program',
        accountNumber: 'ACC2',
        credentials: { username: 'user2', password: 'pass2' }
      };

      await pointsService.createRewardAccount(user1Request);
      await pointsService.createRewardAccount(user2Request);

      const user1Accounts = await pointsService.getUserRewardAccounts('user1');
      const user2Accounts = await pointsService.getUserRewardAccounts('user2');

      expect(user1Accounts).toHaveLength(1);
      expect(user2Accounts).toHaveLength(1);
      expect(user1Accounts[0]?.userId).toBe('user1');
      expect(user2Accounts[0]?.userId).toBe('user2');
    });

    it('should only return active accounts', async () => {
      const mockRequest: CreateRewardAccountRequest = {
        userId: 'user123',
        programId: 'test_program',
        accountNumber: 'ACC789',
        credentials: { username: 'test', password: 'pass' }
      };

      const account = await pointsService.createRewardAccount(mockRequest);
      await pointsService.updateRewardAccount(account.id, { isActive: false });

      const userAccounts = await pointsService.getUserRewardAccounts('user123');
      expect(userAccounts).toHaveLength(0);
    });
  });

  describe('updatePointsBalance', () => {
    it('should update points balance successfully', async () => {
      const mockRequest: CreateRewardAccountRequest = {
        userId: 'user123',
        programId: 'test_program',
        accountNumber: 'ACC789',
        credentials: { username: 'test', password: 'pass' }
      };

      const account = await pointsService.createRewardAccount(mockRequest);
      
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      await pointsService.updatePointsBalance(account.id, 5000);

      const updatedAccount = await pointsService.getRewardAccount(account.id);
      expect(updatedAccount?.balance).toBe(5000);
      expect(updatedAccount?.lastUpdated.getTime()).toBeGreaterThanOrEqual(account.lastUpdated.getTime());
    });

    it('should throw error for negative balance', async () => {
      const mockRequest: CreateRewardAccountRequest = {
        userId: 'user123',
        programId: 'test_program',
        accountNumber: 'ACC789',
        credentials: { username: 'test', password: 'pass' }
      };

      const account = await pointsService.createRewardAccount(mockRequest);

      await expect(pointsService.updatePointsBalance(account.id, -100))
        .rejects.toThrow('Points balance cannot be negative');
    });

    it('should throw error for non-existent account', async () => {
      await expect(pointsService.updatePointsBalance('invalid_id', 1000))
        .rejects.toThrow('Reward account invalid_id not found');
    });
  });

  describe('getPointsBalances', () => {
    it('should return formatted points balances', async () => {
      const mockRequest: CreateRewardAccountRequest = {
        userId: 'user123',
        programId: 'test_program',
        accountNumber: 'ACC789',
        credentials: { username: 'test', password: 'pass' }
      };

      const account = await pointsService.createRewardAccount(mockRequest);
      await pointsService.updatePointsBalance(account.id, 10000);

      const balances = await pointsService.getPointsBalances('user123');

      expect(balances).toHaveLength(1);
      expect(balances[0]?.accountId).toBe(account.id);
      expect(balances[0]?.programId).toBe('test_program');
      expect(balances[0]?.programName).toBe('Test Airline Miles');
      expect(balances[0]?.balance).toBe(10000);
    });
  });

  describe('calculatePointsValuation', () => {
    it('should calculate points valuation correctly', () => {
      const valuation = pointsService.calculatePointsValuation(10000, 'test_program');

      expect(valuation).not.toBeNull();
      expect(valuation?.programId).toBe('test_program');
      expect(valuation?.programName).toBe('Test Airline Miles');
      expect(valuation?.pointsRequired).toBe(10000);
      expect(valuation?.cashEquivalent).toBe(150); // 10000 * 1.5 / 100
      expect(valuation?.valuationRate).toBe(1.5);
      expect(valuation?.bestValue).toBe(false);
    });

    it('should return null for non-existent program', () => {
      const valuation = pointsService.calculatePointsValuation(10000, 'invalid_program');
      expect(valuation).toBeNull();
    });
  });

  describe('comparePointsValuations', () => {
    beforeEach(() => {
      const expensiveProgram: RewardProgram = {
        id: 'expensive_program',
        name: 'Expensive Miles',
        type: 'airline',
        transferPartners: [],
        valuationRate: 2.0, // More expensive
        apiEndpoint: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      pointsService.addRewardProgram(expensiveProgram);
    });

    it('should identify best value option', () => {
      const options = [
        { programId: 'test_program', pointsRequired: 10000 },
        { programId: 'expensive_program', pointsRequired: 10000 }
      ];

      const valuations = pointsService.comparePointsValuations(options);

      expect(valuations).toHaveLength(2);
      
      const testProgramValuation = valuations.find(v => v.programId === 'test_program');
      const expensiveProgramValuation = valuations.find(v => v.programId === 'expensive_program');

      expect(testProgramValuation?.bestValue).toBe(true);
      expect(expensiveProgramValuation?.bestValue).toBe(false);
      expect(testProgramValuation?.cashEquivalent).toBe(150);
      expect(expensiveProgramValuation?.cashEquivalent).toBe(200);
    });

    it('should handle empty options array', () => {
      const valuations = pointsService.comparePointsValuations([]);
      expect(valuations).toHaveLength(0);
    });
  });

  describe('getSanitizedAccount', () => {
    it('should return account without encrypted credentials', async () => {
      const mockRequest: CreateRewardAccountRequest = {
        userId: 'user123',
        programId: 'test_program',
        accountNumber: 'ACC789',
        credentials: { username: 'test', password: 'pass' }
      };

      const account = await pointsService.createRewardAccount(mockRequest);
      const sanitized = pointsService.getSanitizedAccount(account.id);

      expect(sanitized).not.toHaveProperty('encryptedCredentials');
      expect(sanitized?.id).toBe(account.id);
      expect(sanitized?.userId).toBe(account.userId);
    });

    it('should return null for non-existent account', () => {
      const sanitized = pointsService.getSanitizedAccount('invalid_id');
      expect(sanitized).toBeNull();
    });
  });

  describe('Enhanced Valuation Methods', () => {
    beforeEach(() => {
      // Add a second program for comparison tests
      const secondProgram = {
        id: 'expensive_program',
        name: 'Expensive Miles',
        type: 'airline' as const,
        transferPartners: [],
        valuationRate: 2.0,
        apiEndpoint: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      pointsService.addRewardProgram(secondProgram);
    });

    describe('calculateDetailedValuation', () => {
      it('should calculate detailed valuation', () => {
        const valuation = pointsService.calculateDetailedValuation(10000, 'test_program');

        expect(valuation).not.toBeNull();
        expect(valuation?.programId).toBe('test_program');
        expect(valuation?.pointsRequired).toBe(10000);
        expect(valuation?.cashEquivalent).toBe(150);
        expect(valuation?.transferRequired).toBe(false);
      });

      it('should return null for invalid program', () => {
        const valuation = pointsService.calculateDetailedValuation(10000, 'invalid_program');
        expect(valuation).toBeNull();
      });
    });

    describe('optimizeFlightPricing', () => {
      it('should optimize flight pricing with user balances', async () => {
        const mockRequest: CreateRewardAccountRequest = {
          userId: 'user123',
          programId: 'test_program',
          accountNumber: 'ACC789',
          credentials: { username: 'test', password: 'pass' }
        };

        const account = await pointsService.createRewardAccount(mockRequest);
        await pointsService.updatePointsBalance(account.id, 15000);

        const pricingInfo = {
          cashPrice: 200,
          currency: 'USD',
          pointsOptions: [
            {
              program: 'test_program',
              pointsRequired: 10000,
              bestValue: false
            }
          ],
          taxes: 25,
          fees: 10,
          totalPrice: 235
        };

        const optimization = await pointsService.optimizeFlightPricing('user123', pricingInfo);

        expect(optimization.recommendedOption).toBe('points');
        expect(optimization.bestPointsOption?.programId).toBe('test_program');
        expect(optimization.savings).toBe(85); // 235 - 150
      });
    });

    describe('analyzeRedemptionValue', () => {
      it('should analyze redemption value', () => {
        const analysis = pointsService.analyzeRedemptionValue(10000, 200, 'test_program');

        expect(analysis.redemptionValue).toBe(2.0); // (200 * 100) / 10000
        expect(analysis.baselineValue).toBe(1.5);
        expect(analysis.isGoodValue).toBe(true);
        expect(analysis.valueMultiplier).toBeCloseTo(1.33, 2);
      });
    });

    describe('getEnhancedValuations', () => {
      it('should get enhanced valuations for user', async () => {
        const mockRequest: CreateRewardAccountRequest = {
          userId: 'user123',
          programId: 'test_program',
          accountNumber: 'ACC789',
          credentials: { username: 'test', password: 'pass' }
        };

        const account = await pointsService.createRewardAccount(mockRequest);
        await pointsService.updatePointsBalance(account.id, 15000);

        const pointsOptions = [
          { programId: 'test_program', pointsRequired: 10000 },
          { programId: 'expensive_program', pointsRequired: 10000 }
        ];

        const valuations = await pointsService.getEnhancedValuations('user123', pointsOptions);

        expect(valuations).toHaveLength(2);
        
        const testProgramValuation = valuations.find(v => v.programId === 'test_program');
        const expensiveValuation = valuations.find(v => v.programId === 'expensive_program');

        expect(testProgramValuation?.bestValue).toBe(true);
        expect(expensiveValuation?.bestValue).toBe(false);
        expect(testProgramValuation?.transferRequired).toBe(false);
      });
    });
  });
});