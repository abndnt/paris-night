import { RewardProgram, RewardProgramModel, RewardProgramConfig } from '../models/RewardProgram';

export class RewardProgramConfigManager {
  private programs: Map<string, RewardProgram> = new Map();
  private configs: Map<string, RewardProgramConfig> = new Map();

  constructor() {
    this.initializeDefaultPrograms();
  }

  private initializeDefaultPrograms(): void {
    const defaultConfigs: RewardProgramConfig[] = [
      {
        id: 'chase_sapphire',
        name: 'Chase Sapphire',
        type: 'credit_card',
        apiConfig: {
          authType: 'oauth',
          requiredFields: ['username', 'password']
        },
        transferPartners: [
          {
            name: 'United Airlines',
            transferRatio: 1,
            minimumTransfer: 1000,
            isActive: true
          },
          {
            name: 'Southwest Airlines',
            transferRatio: 1,
            minimumTransfer: 1000,
            isActive: true
          }
        ],
        defaultValuationRate: 1.25, // 1.25 cents per point
        isActive: true
      },
      {
        id: 'american_aadvantage',
        name: 'American Airlines AAdvantage',
        type: 'airline',
        apiConfig: {
          baseUrl: 'https://api.aa.com',
          authType: 'oauth',
          requiredFields: ['username', 'password']
        },
        transferPartners: [
          {
            name: 'Marriott Bonvoy',
            transferRatio: 1,
            minimumTransfer: 1000,
            isActive: true
          }
        ],
        defaultValuationRate: 1.4, // 1.4 cents per mile
        isActive: true
      },
      {
        id: 'united_mileageplus',
        name: 'United MileagePlus',
        type: 'airline',
        apiConfig: {
          baseUrl: 'https://api.united.com',
          authType: 'oauth',
          requiredFields: ['username', 'password']
        },
        transferPartners: [
          {
            name: 'Chase Ultimate Rewards',
            transferRatio: 1,
            minimumTransfer: 1000,
            isActive: true
          }
        ],
        defaultValuationRate: 1.3, // 1.3 cents per mile
        isActive: true
      },
      {
        id: 'delta_skymiles',
        name: 'Delta SkyMiles',
        type: 'airline',
        apiConfig: {
          baseUrl: 'https://api.delta.com',
          authType: 'oauth',
          requiredFields: ['username', 'password']
        },
        transferPartners: [
          {
            name: 'American Express Membership Rewards',
            transferRatio: 1,
            minimumTransfer: 1000,
            isActive: true
          }
        ],
        defaultValuationRate: 1.2, // 1.2 cents per mile
        isActive: true
      }
    ];

    defaultConfigs.forEach(config => {
      this.addProgramConfig(config);
    });
  }

  addProgramConfig(config: RewardProgramConfig): void {
    this.configs.set(config.id, config);
    const program = RewardProgramModel.create(config);
    this.programs.set(program.id, program);
  }

  getProgramConfig(programId: string): RewardProgramConfig | null {
    return this.configs.get(programId) || null;
  }

  getProgram(programId: string): RewardProgram | null {
    return this.programs.get(programId) || null;
  }

  getAllPrograms(): RewardProgram[] {
    return Array.from(this.programs.values()).filter(program => program.isActive);
  }

  getAllConfigs(): RewardProgramConfig[] {
    return Array.from(this.configs.values()).filter(config => config.isActive);
  }

  updateProgram(programId: string, updates: Partial<RewardProgram>): RewardProgram | null {
    const program = this.programs.get(programId);
    if (!program) {
      return null;
    }

    const updatedProgram: RewardProgram = {
      ...program,
      ...updates,
      updatedAt: new Date()
    };

    if (!RewardProgramModel.validate(updatedProgram)) {
      throw new Error('Invalid reward program data');
    }

    this.programs.set(programId, updatedProgram);
    return updatedProgram;
  }

  deactivateProgram(programId: string): boolean {
    const program = this.programs.get(programId);
    if (!program) {
      return false;
    }

    const updatedProgram: RewardProgram = {
      ...program,
      isActive: false,
      updatedAt: new Date()
    };

    this.programs.set(programId, updatedProgram);
    return true;
  }

  getProgramsByType(type: 'airline' | 'credit_card' | 'hotel'): RewardProgram[] {
    return Array.from(this.programs.values())
      .filter(program => program.type === type && program.isActive);
  }

  searchPrograms(query: string): RewardProgram[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.programs.values())
      .filter(program => 
        program.isActive && 
        program.name.toLowerCase().includes(lowerQuery)
      );
  }

  validateProgramConfig(config: RewardProgramConfig): boolean {
    return !!(
      config.id &&
      config.name &&
      config.type &&
      config.apiConfig &&
      config.defaultValuationRate > 0 &&
      Array.isArray(config.transferPartners)
    );
  }
}