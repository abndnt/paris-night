import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import Dashboard from '../Dashboard';
import { fetchDashboardData } from '../../../store/slices/adminSlice';

// Mock the redux store
const mockStore = configureStore([thunk]);

// Mock the action creators
jest.mock('../../../store/slices/adminSlice', () => ({
  fetchDashboardData: jest.fn(() => ({ type: 'admin/fetchDashboardData' })),
  selectDashboardData: (state: any) => state.admin.dashboardData,
  selectAdminLoading: (state: any) => state.admin.loading,
  selectAdminErrors: (state: any) => state.admin.error,
  selectDateRange: (state: any) => state.admin.dateRange,
  setDateRange: jest.fn((dateRange) => ({ type: 'admin/setDateRange', payload: dateRange })),
}));

describe('Dashboard Component', () => {
  const initialState = {
    admin: {
      dashboardData: {
        userMetrics: {
          totalUsers: 1000,
          activeUsers: 500,
          newUsers: 100,
          retentionRate: 50,
        },
        searchMetrics: {
          totalSearches: 2000,
          searchesToBookingRate: 15,
          averageResultsPerSearch: 15.5,
          popularOrigins: [
            { origin: 'JFK', count: 200 },
            { origin: 'LAX', count: 150 },
          ],
          popularDestinations: [
            { destination: 'LHR', count: 180 },
            { destination: 'CDG', count: 120 },
          ],
        },
        bookingMetrics: {
          totalBookings: 400,
          totalRevenue: 200000.5,
          averageBookingValue: 500.00125,
          conversionRate: 80,
          abandonmentRate: 20,
          pointsRedemptions: 150,
        },
        performanceMetrics: {
          averageApiResponseTime: 120.5,
          errorRate: 0.5,
          searchLatency: 250.3,
          systemUptime: 99.95,
        },
      },
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

  it('renders the dashboard with metrics', () => {
    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    // Check if title is rendered
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();

    // Check if user metrics are rendered
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();

    // Check if search metrics are rendered
    expect(screen.getByText('Total Searches')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();

    // Check if booking metrics are rendered
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();

    // Check if performance metrics are rendered
    expect(screen.getByText('API Response Time')).toBeInTheDocument();
    expect(screen.getByText('120.5 ms')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    const loadingState = {
      ...initialState,
      admin: {
        ...initialState.admin,
        dashboardData: null,
        loading: {
          ...initialState.admin.loading,
          dashboard: true,
        },
      },
    };
    
    const loadingStore = mockStore(loadingState);
    
    render(
      <Provider store={loadingStore}>
        <Dashboard />
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
        dashboardData: null,
        error: {
          ...initialState.admin.error,
          dashboard: 'Failed to fetch dashboard data',
        },
      },
    };
    
    const errorStore = mockStore(errorState);
    
    render(
      <Provider store={errorStore}>
        <Dashboard />
      </Provider>
    );

    // Check if error message is rendered
    expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument();
  });

  it('fetches dashboard data on mount', () => {
    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    expect(fetchDashboardData).toHaveBeenCalledWith({
      startDate: '2023-01-01',
      endDate: '2023-01-31',
    });
  });

  it('refreshes data when refresh button is clicked', () => {
    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    // Clear previous calls
    (fetchDashboardData as jest.Mock).mockClear();

    // Click refresh button
    fireEvent.click(screen.getByText('Refresh'));

    expect(fetchDashboardData).toHaveBeenCalledWith({
      startDate: '2023-01-01',
      endDate: '2023-01-31',
    });
  });
});