import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Types based on backend models
export interface RewardProgram {
  id: string;
  name: string;
  type: 'airline' | 'credit_card' | 'hotel';
  transferPartners: TransferPartner[];
  valuationRate: number;
  apiEndpoint?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransferPartner {
  id: string;
  name: string;
  transferRatio: number;
  minimumTransfer: number;
  maximumTransfer?: number;
  transferFee?: number;
  isActive: boolean;
}

export interface RewardAccount {
  id: string;
  userId: string;
  programId: string;
  accountNumber: string;
  balance: number;
  lastUpdated: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PointsBalance {
  accountId: string;
  programId: string;
  programName: string;
  balance: number;
  lastUpdated: string;
}

export interface TransferRecommendation {
  fromProgramId: string;
  fromProgramName: string;
  toProgramId: string;
  toProgramName: string;
  pointsToTransfer: number;
  pointsReceived: number;
  transferRatio: number;
  transferFee: number;
  totalCost: number;
  isRecommended: boolean;
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
  programId: string;
  accountNumber: string;
  credentials: RewardAccountCredentials;
}

export interface UpdateRewardAccountRequest {
  accountNumber?: string;
  credentials?: RewardAccountCredentials;
  isActive?: boolean;
}

interface RewardsState {
  // Programs
  programs: RewardProgram[];
  programsLoading: boolean;
  programsError: string | null;
  
  // User accounts
  accounts: RewardAccount[];
  accountsLoading: boolean;
  accountsError: string | null;
  
  // Points balances
  balances: PointsBalance[];
  balancesLoading: boolean;
  balancesError: string | null;
  
  // Transfer recommendations
  transferRecommendations: TransferRecommendation[];
  transferLoading: boolean;
  transferError: string | null;
  
  // UI state
  selectedAccount: RewardAccount | null;
  showAddAccountModal: boolean;
  showTransferModal: boolean;
}

const initialState: RewardsState = {
  programs: [],
  programsLoading: false,
  programsError: null,
  
  accounts: [],
  accountsLoading: false,
  accountsError: null,
  
  balances: [],
  balancesLoading: false,
  balancesError: null,
  
  transferRecommendations: [],
  transferLoading: false,
  transferError: null,
  
  selectedAccount: null,
  showAddAccountModal: false,
  showTransferModal: false,
};

// Async thunks
export const fetchRewardPrograms = createAsyncThunk(
  'rewards/fetchPrograms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/rewards/programs');
      if (!response.ok) {
        throw new Error('Failed to fetch reward programs');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchUserRewardAccounts = createAsyncThunk(
  'rewards/fetchAccounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/rewards/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch reward accounts');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchPointsBalances = createAsyncThunk(
  'rewards/fetchBalances',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/rewards/balances');
      if (!response.ok) {
        throw new Error('Failed to fetch points balances');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const createRewardAccount = createAsyncThunk(
  'rewards/createAccount',
  async (accountData: CreateRewardAccountRequest, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/rewards/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });
      if (!response.ok) {
        throw new Error('Failed to create reward account');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateRewardAccount = createAsyncThunk(
  'rewards/updateAccount',
  async ({ accountId, updates }: { accountId: string; updates: UpdateRewardAccountRequest }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/rewards/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update reward account');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const deleteRewardAccount = createAsyncThunk(
  'rewards/deleteAccount',
  async (accountId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/rewards/accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete reward account');
      }
      return accountId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchTransferRecommendations = createAsyncThunk(
  'rewards/fetchTransferRecommendations',
  async ({ fromProgramId, toProgramId, pointsNeeded }: { 
    fromProgramId: string; 
    toProgramId: string; 
    pointsNeeded: number; 
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/rewards/transfer-recommendations?from=${fromProgramId}&to=${toProgramId}&points=${pointsNeeded}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transfer recommendations');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const rewardsSlice = createSlice({
  name: 'rewards',
  initialState,
  reducers: {
    setSelectedAccount: (state, action: PayloadAction<RewardAccount | null>) => {
      state.selectedAccount = action.payload;
    },
    setShowAddAccountModal: (state, action: PayloadAction<boolean>) => {
      state.showAddAccountModal = action.payload;
    },
    setShowTransferModal: (state, action: PayloadAction<boolean>) => {
      state.showTransferModal = action.payload;
    },
    clearRewardsError: (state) => {
      state.programsError = null;
      state.accountsError = null;
      state.balancesError = null;
      state.transferError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch reward programs
    builder
      .addCase(fetchRewardPrograms.pending, (state) => {
        state.programsLoading = true;
        state.programsError = null;
      })
      .addCase(fetchRewardPrograms.fulfilled, (state, action) => {
        state.programsLoading = false;
        state.programs = action.payload;
      })
      .addCase(fetchRewardPrograms.rejected, (state, action) => {
        state.programsLoading = false;
        state.programsError = action.payload as string;
      });

    // Fetch user reward accounts
    builder
      .addCase(fetchUserRewardAccounts.pending, (state) => {
        state.accountsLoading = true;
        state.accountsError = null;
      })
      .addCase(fetchUserRewardAccounts.fulfilled, (state, action) => {
        state.accountsLoading = false;
        state.accounts = action.payload;
      })
      .addCase(fetchUserRewardAccounts.rejected, (state, action) => {
        state.accountsLoading = false;
        state.accountsError = action.payload as string;
      });

    // Fetch points balances
    builder
      .addCase(fetchPointsBalances.pending, (state) => {
        state.balancesLoading = true;
        state.balancesError = null;
      })
      .addCase(fetchPointsBalances.fulfilled, (state, action) => {
        state.balancesLoading = false;
        state.balances = action.payload;
      })
      .addCase(fetchPointsBalances.rejected, (state, action) => {
        state.balancesLoading = false;
        state.balancesError = action.payload as string;
      });

    // Create reward account
    builder
      .addCase(createRewardAccount.pending, (state) => {
        state.accountsLoading = true;
        state.accountsError = null;
      })
      .addCase(createRewardAccount.fulfilled, (state, action) => {
        state.accountsLoading = false;
        state.accounts.push(action.payload);
        state.showAddAccountModal = false;
      })
      .addCase(createRewardAccount.rejected, (state, action) => {
        state.accountsLoading = false;
        state.accountsError = action.payload as string;
      });

    // Update reward account
    builder
      .addCase(updateRewardAccount.pending, (state) => {
        state.accountsLoading = true;
        state.accountsError = null;
      })
      .addCase(updateRewardAccount.fulfilled, (state, action) => {
        state.accountsLoading = false;
        const index = state.accounts.findIndex(account => account.id === action.payload.id);
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
      })
      .addCase(updateRewardAccount.rejected, (state, action) => {
        state.accountsLoading = false;
        state.accountsError = action.payload as string;
      });

    // Delete reward account
    builder
      .addCase(deleteRewardAccount.pending, (state) => {
        state.accountsLoading = true;
        state.accountsError = null;
      })
      .addCase(deleteRewardAccount.fulfilled, (state, action) => {
        state.accountsLoading = false;
        state.accounts = state.accounts.filter(account => account.id !== action.payload);
      })
      .addCase(deleteRewardAccount.rejected, (state, action) => {
        state.accountsLoading = false;
        state.accountsError = action.payload as string;
      });

    // Fetch transfer recommendations
    builder
      .addCase(fetchTransferRecommendations.pending, (state) => {
        state.transferLoading = true;
        state.transferError = null;
      })
      .addCase(fetchTransferRecommendations.fulfilled, (state, action) => {
        state.transferLoading = false;
        state.transferRecommendations = action.payload;
      })
      .addCase(fetchTransferRecommendations.rejected, (state, action) => {
        state.transferLoading = false;
        state.transferError = action.payload as string;
      });
  },
});

export const {
  setSelectedAccount,
  setShowAddAccountModal,
  setShowTransferModal,
  clearRewardsError,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;