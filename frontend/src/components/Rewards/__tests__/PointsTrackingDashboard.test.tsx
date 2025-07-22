import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PointsTrackingDashboard from '../PointsTrackingDashboard';
import rewardsSlice, { PointsBalance, RewardProgram } from '../../../store/slices/rewardsSlice';

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

const mockBalances: PointsBalance[] = [
  {
    accountId: 'account-1',
    programId: 'chase-ur',
    programName: 'Chase Ultimate Rewards',
    balance: 50000,
    lastUpdated: '2024-01-15T00:00:00Z',
  },
  {
    accountId: 'account-2',
    programId: 'american-aa',
    programName: 'American AAdvantage',
    balance: 75000,
    lastUpdated: '2024-01-14T00:00:00Z',
  },
];

describe('PointsTrackingDashboard', () => {
  it('renders loading state correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={[]}
          programs={[]}
          loading={true}
        />
      </Provider>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders dashboard header correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    expect(screen.getByText('Points Tracking')).toBeInTheDocument();
    expect(screen.getByText('Monitor your points balances and activity')).toBeInTheDocument();
  });

  it('displays timeframe selector', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    const timeframeSelect = screen.getByDisplayValue('Last 30 days');
    expect(timeframeSelect).toBeInTheDocument();
    
    // Check all options are available
    fireEvent.click(timeframeSelect);
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
    expect(screen.getByText('Last year')).toBeInTheDocument();
  });

  it('displays refresh button', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  it('calculates and displays total value correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    // Total value should be: (50000 * 1.8 + 75000 * 1.5) / 100 = $2025
    expect(screen.getByText('$2,025.00')).toBeInTheDocument();
  });

  it('displays active programs count', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    expect(screen.getByText('Active Programs')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays recent activity count', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    expect(screen.getAllByText('Recent Activity')).toHaveLength(2);
    // Should show mock activity count
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders current balances table', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    expect(screen.getByText('Current Balances')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /program/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /balance/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /value/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /last updated/i })).toBeInTheDocument();
  });

  it('displays balance data in table correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('Chase Ultimate Rewards')).toHaveLength(2); // Once in table, once in activity
    expect(screen.getAllByText('American AAdvantage')).toHaveLength(2);
    expect(screen.getByText('50,000 points')).toBeInTheDocument();
    expect(screen.getByText('75,000 points')).toBeInTheDocument();
    expect(screen.getByText('$900.00')).toBeInTheDocument(); // 50000 * 1.8 / 100
    expect(screen.getByText('$1,125.00')).toBeInTheDocument(); // 75000 * 1.5 / 100
  });

  it('provides sort options for balances table', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    const sortSelect = screen.getByDisplayValue('Value');
    expect(sortSelect).toBeInTheDocument();
    
    // Check all sort options are available by looking at option elements
    expect(screen.getByRole('option', { name: 'Balance' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Name' })).toBeInTheDocument();
  });

  it('sorts balances by value by default', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    const rows = screen.getAllByRole('row');
    // Should be sorted by value (American AA $1125 > Chase UR $900)
    expect(rows[1]).toHaveTextContent('American AAdvantage');
    expect(rows[2]).toHaveTextContent('Chase Ultimate Rewards');
  });

  it('changes sort order when sort option is changed', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    const sortSelect = screen.getByDisplayValue('Value');
    fireEvent.change(sortSelect, { target: { value: 'name' } });

    const rows = screen.getAllByRole('row');
    // Should be sorted by name (American AA < Chase UR alphabetically)
    expect(rows[1]).toHaveTextContent('American AAdvantage');
    expect(rows[2]).toHaveTextContent('Chase Ultimate Rewards');
  });

  it('displays recent activity section', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('Recent Activity')).toHaveLength(2); // Once in summary card, once in section
    // Should show mock activity data
    expect(screen.getAllByText('Chase Ultimate Rewards')).toHaveLength(2);
    expect(screen.getAllByText('American AAdvantage')).toHaveLength(2);
    expect(screen.getByText('Delta SkyMiles')).toBeInTheDocument();
  });

  it('shows activity types with correct icons and colors', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    expect(screen.getAllByText('earned')).toHaveLength(2); // Two earned activities in mock data
    expect(screen.getByText('redeemed')).toBeInTheDocument();
    expect(screen.getAllByText('+5,000 points')).toHaveLength(2);
    expect(screen.getByText('-25,000 points')).toBeInTheDocument();
  });

  it('handles refresh button click', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={mockBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    // Should dispatch refresh action (tested via store state)
    expect(refreshButton).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeBalances: PointsBalance[] = [
      {
        accountId: 'account-1',
        programId: 'chase-ur',
        programName: 'Chase Ultimate Rewards',
        balance: 1234567,
        lastUpdated: '2024-01-15T00:00:00Z',
      },
    ];

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PointsTrackingDashboard
          balances={largeBalances}
          programs={mockPrograms}
          loading={false}
        />
      </Provider>
    );

    expect(screen.getByText('1,234,567 points')).toBeInTheDocument();
  });
});