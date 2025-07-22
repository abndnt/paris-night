import { RewardProgramModel, RewardProgramConfig } from '../models/RewardProgram';
import { RewardAccountModel, CreateRewardAccountRequest, RewardAccountCredentials } from '../models/RewardAccount';

describe('RewardProgram Model', () => {
  const mockConfig: RewardProgramConfig = {
    id: 'test_program',
    name: 'Test Reward Program',
    type: 'airline',
    apiConfig: {
      baseUrl: 'https://api.test.com',
      authType: 'oauth',
      requiredFields: ['username', 'password']
    },
    transferPartners: [
      {
        name: 'Partner 1',
        transferRatio: 1,
        minimumTransfer: 1000,
        isActive: true
      }
    ],
    defaultValuationRate: 1.5,
    isActive: true
  };

  describe('create', () => {
    it('should create a valid RewardProgram from config', () => {
      const program = RewardProgramModel.create(mockConfig);

      expect(program.id).toBe(mockConfig.id);
      expect(program.name).toBe(mockConfig.name);
      expect(program.type).toBe(mockConfig.type);
      expect(program.valuationRate).toBe(mockConfig.defaultValuationRate);
      expect(program.apiEndpoint).toBe(mockConfig.apiConfig.baseUrl);
      expect(program.isActive).toBe(mockConfig.isActive);
      expect(program.transferPartners).toHaveLength(1);
      expect(program.transferPartners[0]?.id).toBe('test_program_partner_0');
      expect(program.createdAt).toBeInstanceOf(Date);
      expect(program.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique partner IDs', () => {
      const configWithMultiplePartners: RewardProgramConfig = {
        ...mockConfig,
        transferPartners: [
          { name: 'Partner 1', transferRatio: 1, minimumTransfer: 1000, isActive: true },
          { name: 'Partner 2', transferRatio: 2, minimumTransfer: 2000, isActive: true }
        ]
      };

      const program = RewardProgramModel.create(configWithMultiplePartners);

      expect(program.transferPartners).toHaveLength(2);
      expect(program.transferPartners[0]?.id).toBe('test_program_partner_0');
      expect(program.transferPartners[1]?.id).toBe('test_program_partner_1');
    });
  });

  describe('validate', () => {
    it('should validate a complete RewardProgram', () => {
      const program = RewardProgramModel.create(mockConfig);
      expect(RewardProgramModel.validate(program)).toBe(true);
    });

    it('should reject invalid RewardProgram - missing id', () => {
      const program = RewardProgramModel.create(mockConfig);
      program.id = '';
      expect(RewardProgramModel.validate(program)).toBe(false);
    });

    it('should reject invalid RewardProgram - missing name', () => {
      const program = RewardProgramModel.create(mockConfig);
      program.name = '';
      expect(RewardProgramModel.validate(program)).toBe(false);
    });

    it('should reject invalid RewardProgram - invalid valuation rate', () => {
      const program = RewardProgramModel.create(mockConfig);
      program.valuationRate = 0;
      expect(RewardProgramModel.validate(program)).toBe(false);
    });

    it('should reject invalid RewardProgram - missing transfer partners array', () => {
      const program = RewardProgramModel.create(mockConfig);
      (program as any).transferPartners = null;
      expect(RewardProgramModel.validate(program)).toBe(false);
    });
  });
});

describe('RewardAccount Model', () => {
  const mockCredentials: RewardAccountCredentials = {
    username: 'testuser',
    password: 'testpass',
    additionalFields: { memberId: '12345' }
  };

  const mockRequest: CreateRewardAccountRequest = {
    userId: 'user123',
    programId: 'program456',
    accountNumber: 'ACC789',
    credentials: mockCredentials
  };

  describe('create', () => {
    it('should create a valid RewardAccount', () => {
      const encryptedCredentials = 'encrypted_data_here';
      const account = RewardAccountModel.create(mockRequest, encryptedCredentials);

      expect(account.id).toMatch(/^reward_\d+_[a-z0-9]+$/);
      expect(account.userId).toBe(mockRequest.userId);
      expect(account.programId).toBe(mockRequest.programId);
      expect(account.accountNumber).toBe(mockRequest.accountNumber);
      expect(account.encryptedCredentials).toBe(encryptedCredentials);
      expect(account.balance).toBe(0);
      expect(account.isActive).toBe(true);
      expect(account.createdAt).toBeInstanceOf(Date);
      expect(account.updatedAt).toBeInstanceOf(Date);
      expect(account.lastUpdated).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for different accounts', () => {
      const encryptedCredentials = 'encrypted_data_here';
      const account1 = RewardAccountModel.create(mockRequest, encryptedCredentials);
      const account2 = RewardAccountModel.create(mockRequest, encryptedCredentials);

      expect(account1.id).not.toBe(account2.id);
    });
  });

  describe('validate', () => {
    it('should validate a complete RewardAccount', () => {
      const account = RewardAccountModel.create(mockRequest, 'encrypted_data');
      expect(RewardAccountModel.validate(account)).toBe(true);
    });

    it('should reject invalid RewardAccount - missing id', () => {
      const account = RewardAccountModel.create(mockRequest, 'encrypted_data');
      account.id = '';
      expect(RewardAccountModel.validate(account)).toBe(false);
    });

    it('should reject invalid RewardAccount - missing userId', () => {
      const account = RewardAccountModel.create(mockRequest, 'encrypted_data');
      account.userId = '';
      expect(RewardAccountModel.validate(account)).toBe(false);
    });

    it('should reject invalid RewardAccount - negative balance', () => {
      const account = RewardAccountModel.create(mockRequest, 'encrypted_data');
      account.balance = -100;
      expect(RewardAccountModel.validate(account)).toBe(false);
    });

    it('should reject invalid RewardAccount - missing encrypted credentials', () => {
      const account = RewardAccountModel.create(mockRequest, 'encrypted_data');
      account.encryptedCredentials = '';
      expect(RewardAccountModel.validate(account)).toBe(false);
    });
  });

  describe('sanitizeForResponse', () => {
    it('should remove encrypted credentials from response', () => {
      const account = RewardAccountModel.create(mockRequest, 'encrypted_data');
      const sanitized = RewardAccountModel.sanitizeForResponse(account);

      expect(sanitized).not.toHaveProperty('encryptedCredentials');
      expect(sanitized.id).toBe(account.id);
      expect(sanitized.userId).toBe(account.userId);
      expect(sanitized.programId).toBe(account.programId);
      expect(sanitized.accountNumber).toBe(account.accountNumber);
      expect(sanitized.balance).toBe(account.balance);
    });
  });
});