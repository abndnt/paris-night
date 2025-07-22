export interface TransferPartner {
    id: string;
    name: string;
    transferRatio: number;
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
    valuationRate: number;
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
export declare class RewardProgramModel {
    static create(config: RewardProgramConfig): RewardProgram;
    static validate(program: RewardProgram): boolean;
}
//# sourceMappingURL=RewardProgram.d.ts.map