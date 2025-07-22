import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RewardProgramSettings from '../RewardProgramSettings';
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

describe('RewardProgramSettings', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders settings modal with correct title', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Chase Ultimate Rewards')).toBeInTheDocument();
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
  });

  it('displays all three tabs', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Credentials')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('shows general tab content by default', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Account Number')).toBeInTheDocument();
    expect(screen.getByText('Program Type')).toBeInTheDocument();
    expect(screen.getByText('Account is active')).toBeInTheDocument();
  });

  it('switches to credentials tab when clicked', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Credentials'));

    await waitFor(() => {
      expect(screen.getByText('Security Notice')).toBeInTheDocument();
      expect(screen.getByText('Username/Email')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });
  });

  it('switches to preferences tab when clicked', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Preferences'));

    await waitFor(() => {
      expect(screen.getByText('Transfer Partners')).toBeInTheDocument();
      expect(screen.getByText('Program Details')).toBeInTheDocument();
    });
  });

  it('displays account information correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CREDIT CARD')).toBeInTheDocument();
    expect(screen.getByText('50,000 points')).toBeInTheDocument();
  });

  it('shows transfer partners in preferences tab', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Preferences'));

    await waitFor(() => {
      expect(screen.getByText('United Airlines')).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent?.includes('1:1 ratio') || false;
      })).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent?.includes('Min: 1,000 points') || false;
      })).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
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
        <RewardProgramSettings
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

  it('allows editing account number', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const accountNumberInput = screen.getByDisplayValue('1234567890');
    fireEvent.change(accountNumberInput, { target: { value: '0987654321' } });
    
    expect(screen.getByDisplayValue('0987654321')).toBeInTheDocument();
  });

  it('allows toggling account active status', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const activeCheckbox = screen.getByRole('checkbox', { name: /account is active/i });
    expect(activeCheckbox).toBeChecked();
    
    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).not.toBeChecked();
  });

  it('displays program icon based on type', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    // Check that SVG icons are rendered
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('shows security notice in credentials tab', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Credentials'));

    await waitFor(() => {
      expect(screen.getByText(/encrypted using industry-standard encryption/)).toBeInTheDocument();
    });
  });

  it('handles form submission', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <RewardProgramSettings
          account={mockAccount}
          program={mockProgram}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
  });
});