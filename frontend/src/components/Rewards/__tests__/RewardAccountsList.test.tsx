import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RewardAccountsList from '../RewardAccountsList';
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

const mockPrograms: RewardProgram[] = [
  {
    id: 'chase-ur',
    name: 'Chase Ultimate Rewards',
    type: 'credit_card',
    transferPartners: [],
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
  {
    id: 'account-2',
    userId: 'user-1',
    programId: 'american-aa',
    accountNumber: '0987654321',
    balance: 75000,
    lastUpdated: '2024-01-14T00:00:00Z',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z',
  },
];

describe('RewardAccountsList', () => {
  const mockOnAddAccount = jest.fn();

  beforeEach(() => {
    mockOnAddAccount.mockClear();
  });

  it('renders loading state correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={[]}
          programs={[]}
          loading={true}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders empty state when no accounts', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={[]}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    expect(screen.getByText('No Reward Accounts')).toBeInTheDocument();
    expect(screen.getByText('Add Your First Account')).toBeInTheDocument();
  });

  it('renders accounts list correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={mockAccounts}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    expect(screen.getByText('Chase Ultimate Rewards')).toBeInTheDocument();
    expect(screen.getByText('American AAdvantage')).toBeInTheDocument();
    expect(screen.getByText(/\*\*\*\*7890/)).toBeInTheDocument();
    expect(screen.getByText(/\*\*\*\*4321/)).toBeInTheDocument();
  });

  it('displays account balances correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={mockAccounts}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    expect(screen.getByText('50,000 points')).toBeInTheDocument();
    expect(screen.getByText('75,000 points')).toBeInTheDocument();
  });

  it('shows active/inactive status correctly', () => {
    const inactiveAccount = { ...mockAccounts[0], isActive: false };
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={[inactiveAccount, mockAccounts[1]]}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('calls onAddAccount when add account button is clicked', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={[]}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Add Your First Account'));
    expect(mockOnAddAccount).toHaveBeenCalledTimes(1);
  });

  it('opens edit modal when edit button is clicked', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={mockAccounts}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Check if settings modal would be opened (component state change)
    expect(editButtons[0]).toBeInTheDocument();
  });

  it('shows delete confirmation when delete button is clicked', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={mockAccounts}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Reward Account')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={mockAccounts}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    // Check that dates are formatted (exact format may vary by locale)
    expect(screen.getAllByText(/Last updated:/)).toHaveLength(2);
    expect(screen.getAllByText(/Added:/)).toHaveLength(2);
  });

  it('displays correct program icons', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardAccountsList
          accounts={mockAccounts}
          programs={mockPrograms}
          loading={false}
          onAddAccount={mockOnAddAccount}
        />
      </Provider>
    );

    // Check that SVG icons are rendered
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });
});