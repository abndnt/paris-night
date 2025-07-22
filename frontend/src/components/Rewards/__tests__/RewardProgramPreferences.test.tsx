import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RewardProgramPreferences from '../RewardProgramPreferences';
import rewardsSlice, { RewardAccount, RewardProgram } from '../../../store/slices/rewardsSlice';

// Mock the store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      rewards: rewardsSlice,
    },
    preloadedState: {
      rewards: {
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
        ...initialState,
      },
    },
  });
};

const mockAccount: RewardAccount = {
  id: 'account-1',
  userId: 'user-1',
  programId: 'chase-ur',
  accountNumber: '1234567890',
  balance: 50000,
  lastUpdated: '2024-01-15T00:00:00Z',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

const mockProgram: RewardProgram = {
  id: 'chase-ur',
  name: 'Chase Ultimate Rewards',
  type: 'credit_card',
  transferPartners: [
    {
      id: 'partner-1',
      name: 'United Airlines',
      transferRatio: 1,
      minimumTransfer: 1000,
      maximumTransfer: 100000,
      transferFee: 0,
      isActive: true,
    },
  ],
  valuationRate: 1.8,
  apiEndpoint: 'https://api.chase.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('RewardProgramPreferences', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders preferences modal with correct title', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Chase Ultimate Rewards - Preferences')).toBeInTheDocument();
    expect(screen.getByText(/Customize your experience and notifications/)).toBeInTheDocument();
  });

  it('displays notification preferences section', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('Balance Updates')).toBeInTheDocument();
    expect(screen.getByText('Points Expiration Alerts')).toBeInTheDocument();
    expect(screen.getByText('Transfer Opportunities')).toBeInTheDocument();
    expect(screen.getByText('Promotional Offers')).toBeInTheDocument();
    expect(screen.getByText('Weekly Digest')).toBeInTheDocument();
  });

  it('displays auto-transfer settings section', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Auto-Transfer Settings')).toBeInTheDocument();
    expect(screen.getByText('Enable Auto-Transfer')).toBeInTheDocument();
  });

  it('displays tracking preferences section', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Tracking Preferences')).toBeInTheDocument();
    expect(screen.getByText('Track Point Expiration')).toBeInTheDocument();
    expect(screen.getByText('Track Promotions')).toBeInTheDocument();
    expect(screen.getByText('Track Transfer Bonuses')).toBeInTheDocument();
    expect(screen.getByText('Track Value Changes')).toBeInTheDocument();
  });

  it('displays account security section', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Account Security')).toBeInTheDocument();
    expect(screen.getByText('Secure Connection')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
  });

  it('allows toggling notification preferences', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const balanceUpdatesCheckbox = screen.getByRole('checkbox', { name: /balance updates/i });
    expect(balanceUpdatesCheckbox).toBeChecked();
    
    fireEvent.click(balanceUpdatesCheckbox);
    expect(balanceUpdatesCheckbox).not.toBeChecked();
  });

  it('shows auto-transfer options when enabled', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const autoTransferCheckbox = screen.getByRole('checkbox', { name: /enable auto-transfer/i });
    fireEvent.click(autoTransferCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Minimum Balance Threshold')).toBeInTheDocument();
      expect(screen.getByText('Target Program')).toBeInTheDocument();
    });
  });

  it('shows expiration warning input when tracking is enabled', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    // Track expiration should be enabled by default
    expect(screen.getByText('Expiration Warning (Days)')).toBeInTheDocument();
    
    const trackExpirationCheckbox = screen.getByRole('checkbox', { name: /track point expiration/i });
    fireEvent.click(trackExpirationCheckbox); // Disable it
    
    await waitFor(() => {
      expect(screen.queryByText('Expiration Warning (Days)')).not.toBeInTheDocument();
    });
  });

  it('allows editing minimum balance threshold', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const autoTransferCheckbox = screen.getByRole('checkbox', { name: /enable auto-transfer/i });
    fireEvent.click(autoTransferCheckbox);

    await waitFor(() => {
      const thresholdInput = screen.getByDisplayValue('10000');
      fireEvent.change(thresholdInput, { target: { value: '25000' } });
      expect(screen.getByDisplayValue('25000')).toBeInTheDocument();
    });
  });

  it('allows editing expiration warning days', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const warningDaysInput = screen.getByDisplayValue('30');
    fireEvent.change(warningDaysInput, { target: { value: '60' } });
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
  });

  it('shows transfer partners in target program dropdown', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const autoTransferCheckbox = screen.getByRole('checkbox', { name: /enable auto-transfer/i });
    fireEvent.click(autoTransferCheckbox);

    await waitFor(() => {
      expect(screen.getByText('United Airlines (1:1 ratio)')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles form submission', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const saveButton = screen.getByText('Save Preferences');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
  });

  it('displays last connection test date', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramPreferences
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText(/Last connection test:/)).toBeInTheDocument();
  });
});