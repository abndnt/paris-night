import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountConnectionTester from '../AccountConnectionTester';
import { RewardAccount, RewardProgram } from '../../../store/slices/rewardsSlice';
import { rewardsService } from '../../../services/rewardsService';

// Mock the rewards service
jest.mock('../../../services/rewardsService', () => ({
  rewardsService: {
    testAccountConnection: jest.fn(),
  },
}));

const mockRewardsService = rewardsService as jest.Mocked<typeof rewardsService>;

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
  transferPartners: [],
  valuationRate: 1.8,
  apiEndpoint: 'https://api.chase.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('AccountConnectionTester', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders connection status section', () => {
    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    expect(screen.getByText('Connection Status')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    expect(screen.getByText('Connection not tested')).toBeInTheDocument();
  });

  it('shows loading state when testing connection', async () => {
    mockRewardsService.testAccountConnection.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, balance: 50000 }), 100))
    );

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    expect(screen.getByText('Testing...')).toBeInTheDocument();
    expect(screen.getByText('Testing connection...')).toBeInTheDocument();
  });

  it('shows successful connection result', async () => {
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: true,
      balance: 50000,
    });

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText(/Connection successful/)).toBeInTheDocument();
      expect(screen.getByText('50,000 points')).toBeInTheDocument();
    });
  });

  it('shows failed connection result', async () => {
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    });

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('Connection failed: Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows troubleshooting tips on connection failure', async () => {
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: false,
      error: 'Connection timeout',
    });

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('Troubleshooting Tips:')).toBeInTheDocument();
      expect(screen.getByText(/Check if your login credentials are still valid/)).toBeInTheDocument();
      expect(screen.getByText(/Verify that your account is not locked/)).toBeInTheDocument();
    });
  });

  it('shows success message on successful connection', async () => {
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: true,
      balance: 50000,
    });

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText(/Connection is working properly/)).toBeInTheDocument();
    });
  });

  it('displays response time', async () => {
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: true,
      balance: 50000,
    });

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText(/Response time:/)).toBeInTheDocument();
      expect(screen.getByText(/ms/)).toBeInTheDocument();
    });
  });

  it('displays last tested timestamp', async () => {
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: true,
      balance: 50000,
    });

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('Last tested:')).toBeInTheDocument();
    });
  });

  it('displays API endpoint for successful connections', async () => {
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: true,
      balance: 50000,
    });

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('API endpoint:')).toBeInTheDocument();
      expect(screen.getByText('https://api.chase.com')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockRewardsService.testAccountConnection.mockRejectedValue(
      new Error('Network error')
    );

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('Connection failed: Network error')).toBeInTheDocument();
    });
  });

  it('disables test button while testing', async () => {
    mockRewardsService.testAccountConnection.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    const testButton = screen.getByText('Test Connection');
    fireEvent.click(testButton);

    expect(testButton).toBeDisabled();
  });

  it('shows correct status icons', async () => {
    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    // Initial state - question mark icon
    expect(document.querySelector('svg')).toBeInTheDocument();

    // Test successful connection
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: true,
      balance: 50000,
    });

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      // Should show success icon (checkmark)
      expect(document.querySelectorAll('svg').length).toBeGreaterThan(0);
    });
  });

  it('calls testAccountConnection with correct account ID', async () => {
    mockRewardsService.testAccountConnection.mockResolvedValue({
      success: true,
      balance: 50000,
    });

    render(
      <AccountConnectionTester
        account={mockAccount}
        program={mockProgram}
      />
    );

    fireEvent.click(screen.getByText('Test Connection'));

    expect(mockRewardsService.testAccountConnection).toHaveBeenCalledWith('account-1');
  });
});