// Rewards service for frontend
import api from './api';

class RewardsService {
  async getRewardAccounts() {
    return api.getRewardAccounts();
  }

  async getPointsBalance() {
    return api.getPointsBalance();
  }

  async addRewardAccount(accountData: any) {
    return api.request('/rewards/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  async updateRewardAccount(id: string, updateData: any) {
    return api.request(`/rewards/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteRewardAccount(id: string) {
    return api.request(`/rewards/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  async testConnection(accountId: string) {
    return api.request(`/rewards/accounts/${accountId}/test`, {
      method: 'POST',
    });
  }

  async testAccountConnection(accountId: string): Promise<any> {
    return this.testConnection(accountId);
  }

  async getTransferRecommendations(params: any) {
    return api.request('/rewards/transfer-recommendations', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

export const rewardsService = new RewardsService();