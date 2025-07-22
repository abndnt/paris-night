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

export class RewardAccountModel {
  static create(request: CreateRewardAccountRequest, encryptedCredentials: string): RewardAccount {
    const now = new Date();
    return {
      id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      programId: request.programId,
      accountNumber: request.accountNumber,
      encryptedCredentials,
      balance: 0,
      lastUpdated: now,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
  }

  static validate(account: RewardAccount): boolean {
    return !!(
      account.id &&
      account.userId &&
      account.programId &&
      account.accountNumber &&
      account.encryptedCredentials &&
      typeof account.balance === 'number' &&
      account.balance >= 0
    );
  }

  static sanitizeForResponse(account: RewardAccount): Omit<RewardAccount, 'encryptedCredentials'> {
    const { encryptedCredentials, ...sanitized } = account;
    return sanitized;
  }
}