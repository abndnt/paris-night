export interface RewardAccount {
    id: string;
    userId: string;
    programId: string;
    accountNumber: string;
    encryptedCredentials: string;
    balance: number;
    lastUpdated: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface RewardAccountCredentials {
    username?: string;
    password?: string;
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    additionalFields?: Record<string, string>;
}
export interface CreateRewardAccountRequest {
    userId: string;
    programId: string;
    accountNumber: string;
    credentials: RewardAccountCredentials;
}
export interface UpdateRewardAccountRequest {
    accountNumber?: string;
    credentials?: RewardAccountCredentials;
    isActive?: boolean;
}
export declare class RewardAccountModel {
    static create(request: CreateRewardAccountRequest, encryptedCredentials: string): RewardAccount;
    static validate(account: RewardAccount): boolean;
    static sanitizeForResponse(account: RewardAccount): Omit<RewardAccount, 'encryptedCredentials'>;
}
//# sourceMappingURL=RewardAccount.d.ts.map