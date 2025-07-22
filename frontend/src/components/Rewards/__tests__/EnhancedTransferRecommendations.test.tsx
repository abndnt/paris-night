import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EnhancedTransferRecommendations from '../EnhancedTransferRecommendations';
import rewardsSlice, { RewardAccount, RewardProgram, PointsBalance, TransferPartner } from '../../../store/slices/rewardsSlice';

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

const mockTransferPartners: TransferPartner[] = [
  {
    id: 'american-aa',
    name: 'American AAdvantage',
    transferRatio: 1,
    minimumTransfer: 1000,
    maximumTransfer: 250000,
    transferFee: 0,
    isActive: true,
  },
];

const mockPrograms: RewardProgram[] = [
  {
    id: 'chase-ur',
    name: 'Chase Ultimate Rewards',
    type: 'credit_card',
    transferPartners: mockTransferPartners,
    valuationRate: 1.8,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'american-aa',
    name: 'American AAdvantage',
    type: 'airline',
    transferPartners: [],
    valuationRate: 1.5,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockAccounts: RewardAccount[] = [
  {
    id: 'account-1',
    userId: 'user-1',
    programId: 'chase-ur',
    accountNumber: '1234567890',
    balance: 50000,
    lastUpdated: '2024-01-15T00:00:00Z',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const mockBalances: PointsBalance[] = [
  {
    accountId: 'account-1',
    programId: 'chase-ur',
    programName: 'Chase Ultimate Rewards',
    balance: 50000,
    lastUpdated: '2024-01-15T00:00:00Z',
  },
];

describe('EnhancedTransferRecommendations', () => {
  it('renders empty state when no accounts', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={[]}
          programs={mockPrograms}
          balances={[]}
        />
      </Provider>
    );

    expect(screen.getByText('No Transfer Options')).toBeInTheDocument();
    expect(screen.getByText('Add reward accounts to see transfer opportunities.')).toBeInTheDocument();
  });

  it('renders transfer optimizer header', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    expect(screen.getByText('Transfer Optimizer')).toBeInTheDocument();
    expect(screen.getByText('Find the best ways to transfer points for your travel goals')).toBeInTheDocument();
  });

  it('displays all three tabs', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    expect(screen.getByText('Travel Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Custom Transfer')).toBeInTheDocument();
    expect(screen.getByText('Best Opportunities')).toBeInTheDocument();
  });

  it('shows travel scenarios by default', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    expect(screen.getByText('Domestic Flight')).toBeInTheDocument();
    expect(screen.getByText('International Flight')).toBeInTheDocument();
    expect(screen.getByText('Business Class')).toBeInTheDocument();
    expect(screen.getByText('Hotel Stay')).toBeInTheDocument();
  });

  it('displays scenario details correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    expect(screen.getByText('Round-trip domestic flight in economy')).toBeInTheDocument();
    expect(screen.getByText('25,000 points needed')).toBeInTheDocument();
    expect(screen.getByText('Round-trip international flight in economy')).toBeInTheDocument();
    expect(screen.getByText('60,000 points needed')).toBeInTheDocument();
  });

  it('switches to custom transfer tab', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Custom Transfer'));

    expect(screen.getByText('Target Program')).toBeInTheDocument();
    expect(screen.getByText('Points Needed')).toBeInTheDocument();
    expect(screen.getByText('Find Transfer Options')).toBeInTheDocument();
  });

  it('shows program options in custom transfer', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Custom Transfer'));

    const targetSelect = screen.getByDisplayValue('');
    fireEvent.click(targetSelect);

    expect(screen.getByText('Chase Ultimate Rewards')).toBeInTheDocument();
    expect(screen.getByText('American AAdvantage')).toBeInTheDocument();
  });

  it('validates custom transfer form', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Custom Transfer'));

    const findButton = screen.getByText('Find Transfer Options');
    expect(findButton).toBeDisabled();
  });

  it('enables custom transfer button when form is valid', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Custom Transfer'));

    const targetSelect = screen.getByDisplayValue('');
    fireEvent.change(targetSelect, { target: { value: 'american-aa' } });

    const pointsInput = screen.getByPlaceholderText('Enter points needed...');
    fireEvent.change(pointsInput, { target: { value: '25000' } });

    await waitFor(() => {
      const findButton = screen.getByText('Find Transfer Options');
      expect(findButton).not.toBeDisabled();
    });
  });

  it('switches to best opportunities tab', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Best Opportunities'));

    expect(screen.getByText('Most Efficient Transfers')).toBeInTheDocument();
  });

  it('shows available transfers in best opportunities', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Best Opportunities'));

    expect(screen.getByText('Chase Ultimate Rewards → American AAdvantage')).toBeInTheDocument();
    expect(screen.getByText(/1:1 ratio/)).toBeInTheDocument();
    expect(screen.getByText('50,000 available')).toBeInTheDocument();
  });

  it('calculates transfer efficiency correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Best Opportunities'));

    // Efficiency = (1.5 / 1.8) * 1 = 0.833... = 83%
    expect(screen.getByText('83% efficiency')).toBeInTheDocument();
  });

  it('handles scenario selection', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Domestic Flight'));

    // Should show selected state
    const domesticFlightButton = screen.getByText('Domestic Flight').closest('button');
    expect(domesticFlightButton).toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('shows no transfers message when no opportunities available', () => {
    const accountsWithoutBalance = [{
      ...mockAccounts[0],
      balance: 0,
    }];

    const balancesWithoutBalance = [{
      ...mockBalances[0],
      balance: 0,
    }];

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={accountsWithoutBalance}
          programs={mockPrograms}
          balances={balancesWithoutBalance}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Best Opportunities'));

    expect(screen.getByText('No transfer opportunities available with current balances')).toBeInTheDocument();
  });

  it('formats numbers correctly throughout component', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <EnhancedTransferRecommendations
          accounts={mockAccounts}
          programs={mockPrograms}
          balances={mockBalances}
        />
      </Provider>
    );

    expect(screen.getByText('25,000 points needed')).toBeInTheDocument();
    expect(screen.getByText('60,000 points needed')).toBeInTheDocument();
    expect(screen.getByText('70,000 points needed')).toBeInTheDocument();
    expect(screen.getByText('50,000 points needed')).toBeInTheDocument();
  });
});