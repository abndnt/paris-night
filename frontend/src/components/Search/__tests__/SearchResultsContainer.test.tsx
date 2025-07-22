import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SearchResultsContainer from '../SearchResultsContainer';
import searchReducer, { FlightSearch, FlightResult } from '../../../store/slices/searchSlice';
import uiReducer from '../../../store/slices/uiSlice';

// Mock child components
jest.mock('../SearchResultsList', () => {
  return function MockSearchResultsList({ flights }: { flights: FlightResult[] }) {
    return <div data-testid="search-results-list">{flights.length} flights</div>;
  };
});

jest.mock('../SearchFilters', () => {
  return function MockSearchFilters() {
    return <div data-testid="search-filters">Filters</div>;
  };
});

jest.mock('../SearchSortControls', () => {
  return function MockSearchSortControls() {
    return <div data-testid="search-sort-controls">Sort Controls</div>;
  };
});

jest.mock('../PricingModeToggle', () => {
  return function MockPricingModeToggle() {
    return <div data-testid="pricing-mode-toggle">Pricing Toggle</div>;
  };
});

jest.mock('../SearchPagination', () => {
  return function MockSearchPagination({ currentPage, totalPages, onPageChange }: any) {
    return (
      <div data-testid="search-pagination">
        Page {currentPage} of {totalPages}
        <button onClick={() => onPageChange(2)}>Next</button>
      </div>
    );
  };
});

jest.mock('../../UI/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

const mockFlightResult: FlightResult = {
  id: 'flight-1',
  airline: 'American Airlines',
  flightNumber: 'AA123',
  route: [
    {
      airline: 'American Airlines',
      flightNumber: 'AA123',
      origin: 'NYC',
      destination: 'LAX',
      departureTime: new Date('2024-06-01T08:00:00Z'),
      arrivalTime: new Date('2024-06-01T11:00:00Z'),
      duration: 360,
    },
  ],
  pricing: {
    cashPrice: 300,
    currency: 'USD',
    pointsOptions: [
      {
        program: 'AAdvantage',
        pointsRequired: 25000,
        bestValue: true,
      },
    ],
    taxes: 50,
    fees: 25,
    totalPrice: 375,
  },
  availability: {
    availableSeats: 5,
    bookingClass: 'Y',
    fareBasis: 'YCA',
  },
  duration: 360,
  layovers: 0,
};

const mockFlightSearch: FlightSearch = {
  id: 'search-1',
  userId: 'user-1',
  searchCriteria: {
    origin: 'NYC',
    destination: 'LAX',
    departureDate: new Date('2024-06-01'),
    passengers: { adults: 2, children: 1, infants: 0 },
    cabinClass: 'economy',
    flexible: false,
  },
  results: [mockFlightResult],
  status: 'completed',
  createdAt: new Date('2024-01-01'),
  expiresAt: new Date('2024-01-02'),
};

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      search: searchReducer,
      ui: uiReducer,
    },
    preloadedState: {
      search: {
        currentSearch: null,
        searchHistory: [],
        isSearching: false,
        searchError: null,
        sortBy: 'price',
        sortDirection: 'asc',
        pricingMode: 'cash',
        filters: {},
        selectedFlightId: null,
        showFilters: false,
        filteredResults: [],
        resultsPerPage: 20,
        currentPage: 1,
        ...initialState,
      },
      ui: {
        isMobileMenuOpen: false,
        isLoading: false,
        notifications: [],
      },
    },
  });
};

const renderWithStore = (store: any) => {
  return render(
    <Provider store={store}>
      <SearchResultsContainer />
    </Provider>
  );
};

describe('SearchResultsContainer', () => {
  it('renders loading state when searching', () => {
    const store = createMockStore({ isSearching: true });
    renderWithStore(store);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Searching for flights...')).toBeInTheDocument();
  });

  it('renders error state when search fails', () => {
    const store = createMockStore({ 
      isSearching: false, 
      searchError: 'Network error' 
    });
    renderWithStore(store);
    
    expect(screen.getByText('Search Error')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('renders empty state when no search results', () => {
    const store = createMockStore({ 
      isSearching: false, 
      currentSearch: null 
    });
    renderWithStore(store);
    
    expect(screen.getByText('No search results to display')).toBeInTheDocument();
    expect(screen.getByText('Start a new search to see flight options')).toBeInTheDocument();
  });

  it('renders search results with summary', () => {
    const store = createMockStore({ 
      currentSearch: mockFlightSearch,
      filteredResults: [mockFlightResult],
    });
    renderWithStore(store);
    
    // Check search summary
    expect(screen.getByText('NYC → LAX')).toBeInTheDocument();
    expect(screen.getByText('2 adults, 1 child')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 flights')).toBeInTheDocument();
    
    // Check controls are rendered
    expect(screen.getByTestId('pricing-mode-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('search-sort-controls')).toBeInTheDocument();
    expect(screen.getByTestId('search-filters')).toBeInTheDocument();
    
    // Check results list
    expect(screen.getByTestId('search-results-list')).toBeInTheDocument();
  });

  it('renders no results message when filters exclude all flights', () => {
    const store = createMockStore({ 
      currentSearch: mockFlightSearch,
      filteredResults: [], // Empty after filtering
    });
    renderWithStore(store);
    
    expect(screen.getByText('No flights match your criteria')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters or search criteria')).toBeInTheDocument();
  });

  it('renders pagination when there are multiple pages', () => {
    const manyFlights = Array.from({ length: 25 }, (_, i) => ({
      ...mockFlightResult,
      id: `flight-${i}`,
    }));
    
    const store = createMockStore({ 
      currentSearch: { ...mockFlightSearch, results: manyFlights },
      filteredResults: manyFlights,
      resultsPerPage: 20,
      currentPage: 1,
    });
    renderWithStore(store);
    
    expect(screen.getByTestId('search-pagination')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('handles pagination correctly', () => {
    const manyFlights = Array.from({ length: 25 }, (_, i) => ({
      ...mockFlightResult,
      id: `flight-${i}`,
    }));
    
    const store = createMockStore({ 
      currentSearch: { ...mockFlightSearch, results: manyFlights },
      filteredResults: manyFlights,
      resultsPerPage: 20,
      currentPage: 1,
    });
    renderWithStore(store);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    // Check that the action was dispatched (store state would be updated)
    const state = store.getState();
    expect(state.search.currentPage).toBe(2);
  });

  it('displays correct passenger count text for single adult', () => {
    const singleAdultSearch = {
      ...mockFlightSearch,
      searchCriteria: {
        ...mockFlightSearch.searchCriteria,
        passengers: { adults: 1, children: 0, infants: 0 },
      },
    };
    
    const store = createMockStore({ 
      currentSearch: singleAdultSearch,
      filteredResults: [mockFlightResult],
    });
    renderWithStore(store);
    
    expect(screen.getByText('1 adult')).toBeInTheDocument();
  });

  it('displays return date when present', () => {
    const roundTripSearch = {
      ...mockFlightSearch,
      searchCriteria: {
        ...mockFlightSearch.searchCriteria,
        returnDate: new Date('2024-06-08'),
      },
    };
    
    const store = createMockStore({ 
      currentSearch: roundTripSearch,
      filteredResults: [mockFlightResult],
    });
    renderWithStore(store);
    
    // Should show both departure and return dates
    const dateText = screen.getByText(/6\/1\/2024 - 6\/8\/2024/);
    expect(dateText).toBeInTheDocument();
  });
});