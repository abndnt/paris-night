import React from 'react';
import { render, screen } from '@testing-library/react';
import PointsBalanceOverview from '../PointsBalanceOverview';
import { PointsBalance, RewardProgram } from '../../../store/slices/rewardsSlice';

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

describe('PointsBalanceOverview', () => {
  it('renders loading state correctly', () => {
    render(
      <PointsBalanceOverview
        balances={[]}
        programs={[]}
        loading={true}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders empty state when no balances', () => {
    render(
      <PointsBalanceOverview
        balances={[]}
        programs={mockPrograms}
        loading={false}
      />
    );

    expect(screen.getByText('No Points Balances')).toBeInTheDocument();
    expect(screen.getByText('Add reward accounts to see your points balances here.')).toBeInTheDocument();
  });

  it('calculates and displays total value correctly', () => {
    render(
      <PointsBalanceOverview
        balances={mockBalances}
        programs={mockPrograms}
        loading={false}
      />
    );

    // Total value should be: (50000 * 1.8 + 75000 * 1.5) / 100 = $2025
    expect(screen.getByText('$2,025.00')).toBeInTheDocument();
  });

  it('displays active programs count correctly', () => {
    render(
      <PointsBalanceOverview
        balances={mockBalances}
        programs={mockPrograms}
        loading={false}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // Active Programs count
  });

  it('renders individual balance cards correctly', () => {
    render(
      <PointsBalanceOverview
        balances={mockBalances}
        programs={mockPrograms}
        loading={false}
      />
    );

    expect(screen.getByText('Chase Ultimate Rewards')).toBeInTheDocument();
    expect(screen.getByText('American AAdvantage')).toBeInTheDocument();
    expect(screen.getByText('50,000')).toBeInTheDocument();
    expect(screen.getByText('75,000')).toBeInTheDocument();
  });

  it('calculates individual program values correctly', () => {
    render(
      <PointsBalanceOverview
        balances={mockBalances}
        programs={mockPrograms}
        loading={false}
      />
    );

    // Chase UR: 50000 * 1.8 / 100 = $900
    expect(screen.getByText('$900.00')).toBeInTheDocument();
    // American AA: 75000 * 1.5 / 100 = $1125
    expect(screen.getByText('$1,125.00')).toBeInTheDocument();
  });

  it('displays program types with correct styling', () => {
    render(
      <PointsBalanceOverview
        balances={mockBalances}
        programs={mockPrograms}
        loading={false}
      />
    );

    expect(screen.getByText('CREDIT_CARD')).toBeInTheDocument();
    expect(screen.getByText('AIRLINE')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(
      <PointsBalanceOverview
        balances={mockBalances}
        programs={mockPrograms}
        loading={false}
      />
    );

    // Check that dates are formatted (exact format may vary by locale)
    const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('handles missing program data gracefully', () => {
    const balanceWithMissingProgram: PointsBalance = {
      accountId: 'account-3',
      programId: 'missing-program',
      programName: 'Missing Program',
      balance: 10000,
      lastUpdated: '2024-01-15T00:00:00Z',
    };

    render(
      <PointsBalanceOverview
        balances={[...mockBalances, balanceWithMissingProgram]}
        programs={mockPrograms}
        loading={false}
      />
    );

    expect(screen.getByText('Missing Program')).toBeInTheDocument();
    // Should still render even without program data
  });

  it('displays correct program icons', () => {
    render(
      <PointsBalanceOverview
        balances={mockBalances}
        programs={mockPrograms}
        loading={false}
      />
    );

    // Check that SVG icons are rendered
    const svgElements = screen.getAllByRole('img', { hidden: true });
    expect(svgElements.length).toBeGreaterThan(0);
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

    render(
      <PointsBalanceOverview
        balances={largeBalances}
        programs={mockPrograms}
        loading={false}
      />
    );

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});