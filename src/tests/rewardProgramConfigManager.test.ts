import { RewardProgramConfigManager } from '../services/RewardProgramConfigManager';
import { RewardProgramConfig } from '../models/RewardProgram';

describe('RewardProgramConfigManager', () => {
  let configManager: RewardProgramConfigManager;

  beforeEach(() => {
    configManager = new RewardProgramConfigManager();
  });

  describe('initialization', () => {
    it('should initialize with default programs', () => {
      const programs = configManager.getAllPrograms();
      
      expect(programs.length).toBeGreaterThan(0);
      expect(programs.some(p => p.id === 'chase_sapphire')).toBe(true);
      expect(programs.some(p => p.id === 'american_aadvantage')).toBe(true);
      expect(programs.some(p => p.id === 'united_mileageplus')).toBe(true);
      expect(programs.some(p => p.id === 'delta_skymiles')).toBe(true);
    });

    it('should have correct program types', () => {
      const programs = configManager.getAllPrograms();
      
      const chaseSapphire = programs.find(p => p.id === 'chase_sapphire');
      const americanAA = programs.find(p => p.id === 'american_aadvantage');
      
      expect(chaseSapphire?.type).toBe('credit_card');
      expect(americanAA?.type).toBe('airline');
    });

    it('should have transfer partners configured', () => {
      const chaseSapphire = configManager.getProgram('chase_sapphire');
      
      expect(chaseSapphire?.transferPartners.length).toBeGreaterThan(0);
      expect(chaseSapphire?.transferPartners[0]?.name).toBe('United Airlines');
      expect(chaseSapphire?.transferPartners[0]?.transferRatio).toBe(1);
    });
  });

  describe('addProgramConfig', () => {
    const mockConfig: RewardProgramConfig = {
      id: 'test_program',
      name: 'Test Program',
      type: 'airline',
      apiConfig: {
        baseUrl: 'https://api.test.com',
        authType: 'oauth',
        requiredFields: ['username', 'password']
      },
      transferPartners: [
        {
          name: 'Test Partner',
          transferRatio: 1,
          minimumTransfer: 1000,
          isActive: true
        }
      ],
      defaultValuationRate: 1.8,
      isActive: true
    };

    it('should add new program config successfully', () => {
      configManager.addProgramConfig(mockConfig);
      
      const config = configManager.getProgramConfig('test_program');
      const program = configManager.getProgram('test_program');
      
      expect(config).toEqual(mockConfig);
      expect(program?.id).toBe('test_program');
      expect(program?.name).toBe('Test Program');
      expect(program?.valuationRate).toBe(1.8);
    });

    it('should generate partner IDs when creating program', () => {
      configManager.addProgramConfig(mockConfig);
      
      const program = configManager.getProgram('test_program');
      
      expect(program?.transferPartners[0]?.id).toBe('test_program_partner_0');
      expect(program?.transferPartners[0]?.name).toBe('Test Partner');
    });
  });

  describe('getProgram', () => {
    it('should return existing program', () => {
      const program = configManager.getProgram('chase_sapphire');
      
      expect(program).not.toBeNull();
      expect(program?.id).toBe('chase_sapphire');
      expect(program?.name).toBe('Chase Sapphire');
    });

    it('should return null for non-existent program', () => {
      const program = configManager.getProgram('non_existent');
      expect(program).toBeNull();
    });
  });

  describe('getAllPrograms', () => {
    it('should return only active programs', () => {
      const programs = configManager.getAllPrograms();
      
      expect(programs.every(p => p.isActive)).toBe(true);
    });

    it('should exclude deactivated programs', () => {
      configManager.deactivateProgram('chase_sapphire');
      
      const programs = configManager.getAllPrograms();
      const chaseSapphire = programs.find(p => p.id === 'chase_sapphire');
      
      expect(chaseSapphire).toBeUndefined();
    });
  });

  describe('updateProgram', () => {
    it('should update program successfully', () => {
      const updates = {
        name: 'Updated Chase Sapphire',
        valuationRate: 2.0
      };
      
      const updatedProgram = configManager.updateProgram('chase_sapphire', updates);
      
      expect(updatedProgram?.name).toBe('Updated Chase Sapphire');
      expect(updatedProgram?.valuationRate).toBe(2.0);
      expect(updatedProgram?.updatedAt.getTime()).toBeGreaterThanOrEqual(updatedProgram?.createdAt.getTime() || 0);
    });

    it('should return null for non-existent program', () => {
      const result = configManager.updateProgram('non_existent', { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should throw error for invalid updates', () => {
      expect(() => {
        configManager.updateProgram('chase_sapphire', { valuationRate: -1 });
      }).toThrow('Invalid reward program data');
    });
  });

  describe('deactivateProgram', () => {
    it('should deactivate program successfully', () => {
      const result = configManager.deactivateProgram('chase_sapphire');
      const program = configManager.getProgram('chase_sapphire');
      
      expect(result).toBe(true);
      expect(program?.isActive).toBe(false);
    });

    it('should return false for non-existent program', () => {
      const result = configManager.deactivateProgram('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('getProgramsByType', () => {
    it('should return airline programs only', () => {
      const airlinePrograms = configManager.getProgramsByType('airline');
      
      expect(airlinePrograms.every(p => p.type === 'airline')).toBe(true);
      expect(airlinePrograms.some(p => p.id === 'american_aadvantage')).toBe(true);
      expect(airlinePrograms.some(p => p.id === 'chase_sapphire')).toBe(false);
    });

    it('should return credit card programs only', () => {
      const creditCardPrograms = configManager.getProgramsByType('credit_card');
      
      expect(creditCardPrograms.every(p => p.type === 'credit_card')).toBe(true);
      expect(creditCardPrograms.some(p => p.id === 'chase_sapphire')).toBe(true);
      expect(creditCardPrograms.some(p => p.id === 'american_aadvantage')).toBe(false);
    });

    it('should return empty array for hotel type (no default hotel programs)', () => {
      const hotelPrograms = configManager.getProgramsByType('hotel');
      expect(hotelPrograms).toHaveLength(0);
    });
  });

  describe('searchPrograms', () => {
    it('should find programs by name (case insensitive)', () => {
      const results = configManager.searchPrograms('chase');
      
      expect(results.some(p => p.id === 'chase_sapphire')).toBe(true);
    });

    it('should find programs by partial name', () => {
      const results = configManager.searchPrograms('american');
      
      expect(results.some(p => p.id === 'american_aadvantage')).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = configManager.searchPrograms('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should only return active programs in search', () => {
      configManager.deactivateProgram('chase_sapphire');
      
      const results = configManager.searchPrograms('chase');
      expect(results.some(p => p.id === 'chase_sapphire')).toBe(false);
    });
  });

  describe('validateProgramConfig', () => {
    const validConfig: RewardProgramConfig = {
      id: 'test_program',
      name: 'Test Program',
      type: 'airline',
      apiConfig: {
        authType: 'oauth',
        requiredFields: ['username']
      },
      transferPartners: [],
      defaultValuationRate: 1.5,
      isActive: true
    };

    it('should validate complete config', () => {
      const isValid = configManager.validateProgramConfig(validConfig);
      expect(isValid).toBe(true);
    });

    it('should reject config without id', () => {
      const invalidConfig = { ...validConfig, id: '' };
      const isValid = configManager.validateProgramConfig(invalidConfig);
      expect(isValid).toBe(false);
    });

    it('should reject config without name', () => {
      const invalidConfig = { ...validConfig, name: '' };
      const isValid = configManager.validateProgramConfig(invalidConfig);
      expect(isValid).toBe(false);
    });

    it('should reject config with invalid valuation rate', () => {
      const invalidConfig = { ...validConfig, defaultValuationRate: 0 };
      const isValid = configManager.validateProgramConfig(invalidConfig);
      expect(isValid).toBe(false);
    });

    it('should reject config without transfer partners array', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).transferPartners;
      const isValid = configManager.validateProgramConfig(invalidConfig);
      expect(isValid).toBe(false);
    });
  });
});