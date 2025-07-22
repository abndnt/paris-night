import { 
  RewardProgram, 
  RewardAccount, 
  PointsBalance, 
  TransferRecommendation,
  CreateRewardAccountRequest,
  UpdateRewardAccountRequest 
} from '../store/slices/rewardsSlice';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class RewardsService {
  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('authToken');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    return response;
  }

  // Reward Programs
  async getRewardPrograms(): Promise<RewardProgram[]> {
    const response = await this.fetchWithAuth('/api/rewards/programs');
    if (!response.ok) {
      throw new Error('Failed to fetch reward programs');
    }
    return response.json();
  }

  async getRewardProgram(programId: string): Promise<RewardProgram> {
    const response = await this.fetchWithAuth(`/api/rewards/programs/${programId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch reward program');
    }
    return response.json();
  }

  // User Reward Accounts
  async getUserRewardAccounts(): Promise<RewardAccount[]> {
    const response = await this.fetchWithAuth('/api/rewards/accounts');
    if (!response.ok) {
      throw new Error('Failed to fetch reward accounts');
    }
    return response.json();
  }

  async getRewardAccount(accountId: string): Promise<RewardAccount> {
    const response = await this.fetchWithAuth(`/api/rewards/accounts/${accountId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch reward account');
    }
    return response.json();
  }

  async createRewardAccount(accountData: CreateRewardAccountRequest): Promise<RewardAccount> {
    const response = await this.fetchWithAuth('/api/rewards/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create reward account');
    }
    return response.json();
  }

  async updateRewardAccount(accountId: string, updates: UpdateRewardAccountRequest): Promise<RewardAccount> {
    const response = await this.fetchWithAuth(`/api/rewards/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update reward account');
    }
    return response.json();
  }

  async deleteRewardAccount(accountId: string): Promise<void> {
    const response = await this.fetchWithAuth(`/api/rewards/accounts/${accountId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete reward account');
    }
  }

  // Points Balances
  async getPointsBalances(): Promise<PointsBalance[]> {
    const response = await this.fetchWithAuth('/api/rewards/balances');
    if (!response.ok) {
      throw new Error('Failed to fetch points balances');
    }
    return response.json();
  }

  async refreshPointsBalance(accountId: string): Promise<PointsBalance> {
    const response = await this.fetchWithAuth(`/api/rewards/accounts/${accountId}/refresh-balance`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to refresh points balance');
    }
    return response.json();
  }

  // Transfer Recommendations
  async getTransferRecommendations(
    fromProgramId: string, 
    toProgramId: string, 
    pointsNeeded: number
  ): Promise<TransferRecommendation[]> {
    const params = new URLSearchParams({
      from: fromProgramId,
      to: toProgramId,
      points: pointsNeeded.toString(),
    });
    
    const response = await this.fetchWithAuth(`/api/rewards/transfer-recommendations?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch transfer recommendations');
    }
    return response.json();
  }

  async getAllTransferOpportunities(targetProgramId: string, pointsNeeded: number): Promise<TransferRecommendation[]> {
    const params = new URLSearchParams({
      target: targetProgramId,
      points: pointsNeeded.toString(),
    });
    
    const response = await this.fetchWithAuth(`/api/rewards/transfer-opportunities?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch transfer opportunities');
    }
    return response.json();
  }

  // Points Valuation
  async getPointsValuation(pointsRequired: number, programId: string): Promise<{
    programId: string;
    programName: string;
    pointsRequired: number;
    cashEquivalent: number;
    valuationRate: number;
    bestValue: boolean;
  }> {
    const params = new URLSearchParams({
      points: pointsRequired.toString(),
      program: programId,
    });
    
    const response = await this.fetchWithAuth(`/api/rewards/valuation?${params}`);
    if (!response.ok) {
      throw new Error('Failed to get points valuation');
    }
    return response.json();
  }

  async comparePointsValuations(pointsOptions: { programId: string; pointsRequired: number }[]): Promise<{
    programId: string;
    programName: string;
    pointsRequired: number;
    cashEquivalent: number;
    valuationRate: number;
    bestValue: boolean;
  }[]> {
    const response = await this.fetchWithAuth('/api/rewards/compare-valuations', {
      method: 'POST',
      body: JSON.stringify({ pointsOptions }),
    });
    if (!response.ok) {
      throw new Error('Failed to compare points valuations');
    }
    return response.json();
  }

  // Account Connection Testing
  async testAccountConnection(accountId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    const response = await this.fetchWithAuth(`/api/rewards/accounts/${accountId}/test-connection`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to test account connection');
    }
    return response.json();
  }
}

export const rewardsService = new RewardsService();
export default rewardsService;