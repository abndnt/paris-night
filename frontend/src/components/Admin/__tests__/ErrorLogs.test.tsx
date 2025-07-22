import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import ErrorLogs from '../ErrorLogs';
import { fetchErrorLogs, updateErrorResolution } from '../../../store/slices/adminSlice';

// Mock the redux store
const mockStore = configureStore([thunk]);

// Mock the action creators
jest.mock('../../../store/slices/adminSlice', () => ({
  fetchErrorLogs: jest.fn(() => ({ type: 'admin/fetchErrorLogs' })),
  updateErrorResolution: jest.fn(() => ({ type: 'admin/updateErrorResolution' })),
  selectErrorLogs: (state: any) => state.admin.errorLogs,
  selectAdminLoading: (state: any) => state.admin.loading,
  selectAdminErrors: (state: any) => state.admin.error,
  selectDateRange: (state: any) => state.admin.dateRange,
}));

describe('ErrorLogs Component', () => {
  const initialState = {
    admin: {
      errorLogs: [
        {
          id: 1,
          errorType: 'API_ERROR',
          errorMessage: 'Failed to fetch data',
          path: '/api/flights',
          createdAt: '2023-01-15T12:00:00Z',
          resolved: false,
        },
        {
          id: 2,
          errorType: 'DATABASE_ERROR',
          errorMessage: 'Connection timeout',
          path: '/api/bookings',
          createdAt: '2023-01-14T10:30:00Z',
          resolved: true,
          resolutionNotes: 'Fixed database connection',
        },
      ],
      loading: {
        dashboard: false,
        errors: false,
        userActivity: false,
        performance: false,
        systemHealth: false,
      },
      error: {
        dashboard: null,
        errors: null,
        userActivity: null,
        performance: null,
        systemHealth: null,
      },
      dateRange: {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      },
    },
  };

  let store: any;

  beforeEach(() => {
    store = mockStore(initialState);
    jest.clearAllMocks();
  });

  it('renders the error logs table', () => {
    render(
      <Provider store={store}>
        <ErrorLogs />
      </Provider>
    );

    // Check if title is rendered
    expect(screen.getByText('Error Logs')).toBeInTheDocument();

    // Check if table headers are rendered
    expect(screen.getByText('Error Type')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Path')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check if error logs are rendered
    expect(screen.getByText('API_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    expect(screen.getByText('/api/flights')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();

    expect(screen.getByText('DATABASE_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    expect(screen.getByText('/api/bookings')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    const loadingState = {
      ...initialState,
      admin: {
        ...initialState.admin,
        errorLogs: [],
        loading: {
          ...initialState.admin.loading,
          errors: true,
        },
      },
    };
    
    const loadingStore = mockStore(loadingState);
    
    render(
      <Provider store={loadingStore}>
        <ErrorLogs />
      </Provider>
    );

    // Check if loading spinner is rendered
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    const errorState = {
      ...initialState,
      admin: {
        ...initialState.admin,
        errorLogs: [],
        error: {
          ...initialState.admin.error,
          errors: 'Failed to fetch error logs',
        },
      },
    };
    
    const errorStore = mockStore(errorState);
    
    render(
      <Provider store={errorStore}>
        <ErrorLogs />
      </Provider>
    );

    // Check if error message is rendered
    expect(screen.getByText('Failed to fetch error logs')).toBeInTheDocument();
  });

  it('fetches error logs on mount', () => {
    render(
      <Provider store={store}>
        <ErrorLogs />
      </Provider>
    );

    expect(fetchErrorLogs).toHaveBeenCalledWith({
      startDate: '2023-01-01',
      endDate: '2023-01-31',
      page: 1,
      limit: 20,
    });
  });

  it('refreshes data when refresh button is clicked', () => {
    render(
      <Provider store={store}>
        <ErrorLogs />
      </Provider>
    );

    // Clear previous calls
    (fetchErrorLogs as jest.Mock).mockClear();

    // Click refresh button
    fireEvent.click(screen.getByText('Refresh'));

    expect(fetchErrorLogs).toHaveBeenCalledWith({
      startDate: '2023-01-01',
      endDate: '2023-01-31',
      page: 1,
      limit: 20,
    });
  });

  it('opens error details modal when Details button is clicked', () => {
    render(
      <Provider store={store}>
        <ErrorLogs />
      </Provider>
    );

    // Click Details button for the first error
    fireEvent.click(screen.getAllByText('Details')[0]);

    // Check if modal is opened
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText('API_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  it('opens resolve modal when Resolve button is clicked', () => {
    render(
      <Provider store={store}>
        <ErrorLogs />
      </Provider>
    );

    // Click Resolve button for the first error
    fireEvent.click(screen.getByText('Resolve'));

    // Check if modal is opened with resolution form
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText('Resolution Notes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter resolution notes...')).toBeInTheDocument();
    expect(screen.getByText('Mark as Resolved')).toBeInTheDocument();
  });

  it('resolves error when Mark as Resolved button is clicked', () => {
    render(
      <Provider store={store}>
        <ErrorLogs />
      </Provider>
    );

    // Click Resolve button for the first error
    fireEvent.click(screen.getByText('Resolve'));

    // Enter resolution notes
    fireEvent.change(screen.getByPlaceholderText('Enter resolution notes...'), {
      target: { value: 'Fixed the API issue' },
    });

    // Click Mark as Resolved button
    fireEvent.click(screen.getByText('Mark as Resolved'));

    expect(updateErrorResolution).toHaveBeenCalledWith({
      errorId: 1,
      resolved: true,
      notes: 'Fixed the API issue',
    });
  });
});