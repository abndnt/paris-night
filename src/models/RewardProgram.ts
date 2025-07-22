export interface TransferPartner {
  id: string;
  name: string;
  transferRatio: number; // e.g., 1:1, 2:1, etc.
  minimumTransfer: number;
  maximumTransfer?: number;
  transferFee?: number;
  isActive: boolean;
}

export interface RewardProgram {
  id: string;
  name: string;
  type: 'airline' | 'credit_card' | 'hotel';
  transferPartners: TransferPartner[];
  valuationRate: number; // cents per point
  apiEndpoint: string | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardProgramConfig {
  id: string;
  name: string;
  type: 'airline' | 'credit_card' | 'hotel';
  apiConfig: {
    baseUrl?: string;
    authType: 'oauth' | 'api_key' | 'basic';
    requiredFields: string[];
  };
  transferPartners: Omit<TransferPartner, 'id'>[];
  defaultValuationRate: number;
  isActive: boolean;
}

export class RewardProgramModel {
  static create(config: RewardProgramConfig): RewardProgram {
    const now = new Date();
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      transferPartners: config.transferPartners.map((partner, index) => ({
        id: `${config.id}_partner_${index}`,
        ...partner
      })),
      valuationRate: config.defaultValuationRate,
      apiEndpoint: config.apiConfig.baseUrl,
      isActive: config.isActive,
      createdAt: now,
      updatedAt: now
    };
  }

  static validate(program: RewardProgram): boolean {
    return !!(
      program.id &&
      program.name &&
      program.type &&
      program.valuationRate > 0 &&
      Array.isArray(program.transferPartners)
    );
  }
}