import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AddAccountModal from '../AddAccountModal';
import rewardsSlice, { RewardProgram } from '../../../store/slices/rewardsSlice';

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
  {
    id: 'inactive-program',
    name: 'Inactive Program',
    type: 'hotel',
    transferPartners: [],
    valuationRate: 1.0,
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('AddAccountModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders modal with correct title', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Add Reward Account')).toBeInTheDocument();
  });

  it('shows program selection step initially', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Choose a reward program')).toBeInTheDocument();
    expect(screen.getByText('Chase Ultimate Rewards')).toBeInTheDocument();
    expect(screen.getByText('American AAdvantage')).toBeInTheDocument();
  });

  it('only shows active programs', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Chase Ultimate Rewards')).toBeInTheDocument();
    expect(screen.getByText('American AAdvantage')).toBeInTheDocument();
    expect(screen.queryByText('Inactive Program')).not.toBeInTheDocument();
  });

  it('progresses to account info step when program is selected', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Chase Ultimate Rewards'));

    await waitFor(() => {
      expect(screen.getByText('Account Number *')).toBeInTheDocument();
    });
  });

  it('shows progress indicators correctly', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    // Initial step
    expect(screen.getByText('Select Program')).toBeInTheDocument();
    expect(screen.getByText('Account Info')).toBeInTheDocument();
    expect(screen.getByText('Credentials')).toBeInTheDocument();

    // Progress to next step
    fireEvent.click(screen.getByText('Chase Ultimate Rewards'));

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  it('validates account number input', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    // Select program
    fireEvent.click(screen.getByText('Chase Ultimate Rewards'));

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    // Try to proceed without account number
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Account number is required')).toBeInTheDocument();
    });
  });

  it('progresses to credentials step with valid account number', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    // Select program
    fireEvent.click(screen.getByText('Chase Ultimate Rewards'));

    await waitFor(() => {
      const accountInput = screen.getByPlaceholderText('Enter your account number');
      fireEvent.change(accountInput, { target: { value: '1234567890' } });
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Account Credentials')).toBeInTheDocument();
      expect(screen.getByText('Username/Email')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });
  });

  it('shows security notice in credentials step', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    // Navigate to credentials step
    fireEvent.click(screen.getByText('Chase Ultimate Rewards'));

    await waitFor(() => {
      const accountInput = screen.getByPlaceholderText('Enter your account number');
      fireEvent.change(accountInput, { target: { value: '1234567890' } });
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Security Notice')).toBeInTheDocument();
      expect(screen.getByText(/encrypted using industry-standard encryption/)).toBeInTheDocument();
    });
  });

  it('allows navigation back through steps', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    // Navigate forward
    fireEvent.click(screen.getByText('Chase Ultimate Rewards'));

    await waitFor(() => {
      const accountInput = screen.getByPlaceholderText('Enter your account number');
      fireEvent.change(accountInput, { target: { value: '1234567890' } });
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Account Credentials')).toBeInTheDocument();
    });

    // Navigate back
    fireEvent.click(screen.getByText('Back'));

    await waitFor(() => {
      expect(screen.getByText('Account Number *')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
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
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays program types correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    expect(screen.getByText('Credit Card Program')).toBeInTheDocument();
    expect(screen.getByText('Airline Program')).toBeInTheDocument();
  });

  it('handles form submission with credentials', async () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AddAccountModal
          programs={mockPrograms}
          onClose={mockOnClose}
        />
      </Provider>
    );

    // Navigate to credentials step
    fireEvent.click(screen.getByText('Chase Ultimate Rewards'));

    await waitFor(() => {
      const accountInput = screen.getByPlaceholderText('Enter your account number');
      fireEvent.change(accountInput, { target: { value: '1234567890' } });
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      const usernameInput = screen.getByPlaceholderText('Your login username or email');
      const passwordInput = screen.getByPlaceholderText('Your login password');
      
      fireEvent.change(usernameInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    const addAccountButton = screen.getByText('Add Account');
    expect(addAccountButton).toBeInTheDocument();
    expect(addAccountButton).not.toBeDisabled();
  });
});