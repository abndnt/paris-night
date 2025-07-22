import searchReducer, {
  startSearch,
  searchSuccess,
  searchError,
  clearSearch,
  setSortBy,
  setSortDirection,
  setPricingMode,
  setFilters,
  updateFilter,
  clearFilters,
  toggleShowFilters,
  selectFlight,
  deselectFlight,
  setCurrentPage,
  setResultsPerPage,
  updateFilteredResults,
  SearchCriteria,
  FlightSearch,
  FlightResult,
} from '../searchSlice';

// Mock data
const mockSearchCriteria: SearchCriteria = {
  origin: 'NYC',
  destination: 'LAX',
  departureDate: new Date('2024-06-01'),
  passengers: { adults: 1, children: 0, infants: 0 },
  cabinClass: 'economy',
  flexible: false,
};

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
  searchCriteria: mockSearchCriteria,
  results: [mockFlightResult],
  status: 'completed',
  createdAt: new Date('2024-01-01'),
  expiresAt: new Date('2024-01-02'),
};

describe('searchSlice', () => {
  const initialState = {
    currentSearch: null,
    searchHistory: [],
    isSearching: false,
    searchError: null,
    sortBy: 'price' as const,
    sortDirection: 'asc' as const,
    pricingMode: 'cash' as const,
    filters: {},
    selectedFlightId: null,
    showFilters: false,
    filteredResults: [],
    resultsPerPage: 20,
    currentPage: 1,
  };

  it('should return the initial state', () => {
    expect(searchReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('search actions', () => {
    it('should handle startSearch', () => {
      const actual = searchReducer(initialState, startSearch(mockSearchCriteria));
      expect(actual.isSearching).toBe(true);
      expect(actual.searchError).toBe(null);
      expect(actual.currentSearch).toBe(null);
    });

    it('should handle searchSuccess', () => {
      const searchingState = { ...initialState, isSearching: true };
      const actual = searchReducer(searchingState, searchSuccess(mockFlightSearch));
      
      expect(actual.isSearching).toBe(false);
      expect(actual.currentSearch).toEqual(mockFlightSearch);
      expect(actual.filteredResults).toEqual(mockFlightSearch.results);
      expect(actual.currentPage).toBe(1);
      expect(actual.searchHistory).toHaveLength(1);
      expect(actual.searchHistory[0]).toEqual(mockFlightSearch);
    });

    it('should handle searchError', () => {
      const searchingState = { ...initialState, isSearching: true };
      const errorMessage = 'Search failed';
      const actual = searchReducer(searchingState, searchError(errorMessage));
      
      expect(actual.isSearching).toBe(false);
      expect(actual.searchError).toBe(errorMessage);
    });

    it('should handle clearSearch', () => {
      const stateWithSearch = {
        ...initialState,
        currentSearch: mockFlightSearch,
        filteredResults: [mockFlightResult],
        selectedFlightId: 'flight-1',
        currentPage: 2,
      };
      const actual = searchReducer(stateWithSearch, clearSearch());
      
      expect(actual.currentSearch).toBe(null);
      expect(actual.filteredResults).toEqual([]);
      expect(actual.searchError).toBe(null);
      expect(actual.selectedFlightId).toBe(null);
      expect(actual.currentPage).toBe(1);
    });
  });

  describe('sorting and filtering actions', () => {
    it('should handle setSortBy', () => {
      const actual = searchReducer(initialState, setSortBy('duration'));
      expect(actual.sortBy).toBe('duration');
      expect(actual.currentPage).toBe(1);
    });

    it('should handle setSortDirection', () => {
      const actual = searchReducer(initialState, setSortDirection('desc'));
      expect(actual.sortDirection).toBe('desc');
      expect(actual.currentPage).toBe(1);
    });

    it('should handle setPricingMode', () => {
      const actual = searchReducer(initialState, setPricingMode('points'));
      expect(actual.pricingMode).toBe('points');
    });

    it('should handle setFilters', () => {
      const filters = { maxPrice: 500, maxDuration: 480 };
      const actual = searchReducer(initialState, setFilters(filters));
      expect(actual.filters).toEqual(filters);
      expect(actual.currentPage).toBe(1);
    });

    it('should handle updateFilter', () => {
      const stateWithFilters = { ...initialState, filters: { maxPrice: 500 } };
      const actual = searchReducer(stateWithFilters, updateFilter({ maxDuration: 480 }));
      expect(actual.filters).toEqual({ maxPrice: 500, maxDuration: 480 });
      expect(actual.currentPage).toBe(1);
    });

    it('should handle clearFilters', () => {
      const stateWithFilters = { ...initialState, filters: { maxPrice: 500 } };
      const actual = searchReducer(stateWithFilters, clearFilters());
      expect(actual.filters).toEqual({});
      expect(actual.currentPage).toBe(1);
    });

    it('should handle toggleShowFilters', () => {
      const actual = searchReducer(initialState, toggleShowFilters());
      expect(actual.showFilters).toBe(true);
      
      const actualToggled = searchReducer(actual, toggleShowFilters());
      expect(actualToggled.showFilters).toBe(false);
    });
  });

  describe('flight selection actions', () => {
    it('should handle selectFlight', () => {
      const actual = searchReducer(initialState, selectFlight('flight-1'));
      expect(actual.selectedFlightId).toBe('flight-1');
    });

    it('should handle deselectFlight', () => {
      const stateWithSelection = { ...initialState, selectedFlightId: 'flight-1' };
      const actual = searchReducer(stateWithSelection, deselectFlight());
      expect(actual.selectedFlightId).toBe(null);
    });
  });

  describe('pagination actions', () => {
    it('should handle setCurrentPage', () => {
      const actual = searchReducer(initialState, setCurrentPage(3));
      expect(actual.currentPage).toBe(3);
    });

    it('should handle setResultsPerPage', () => {
      const stateWithPage = { ...initialState, currentPage: 3 };
      const actual = searchReducer(stateWithPage, setResultsPerPage(50));
      expect(actual.resultsPerPage).toBe(50);
      expect(actual.currentPage).toBe(1); // Should reset to page 1
    });
  });

  describe('filtered results', () => {
    it('should handle updateFilteredResults', () => {
      const results = [mockFlightResult];
      const actual = searchReducer(initialState, updateFilteredResults(results));
      expect(actual.filteredResults).toEqual(results);
    });
  });

  describe('search history', () => {
    it('should limit search history to 10 items', () => {
      const searches = Array.from({ length: 12 }, (_, i) => ({
        ...mockFlightSearch,
        id: `search-${i}`,
      }));
      
      let state = initialState;
      searches.forEach(search => {
        state = searchReducer(state, searchSuccess(search));
      });
      
      expect(state.searchHistory).toHaveLength(10);
      expect(state.searchHistory[0].id).toBe('search-11'); // Most recent first
    });

    it('should update existing search in history', () => {
      const stateWithHistory = searchReducer(initialState, searchSuccess(mockFlightSearch));
      const updatedSearch = { ...mockFlightSearch, status: 'error' as const };
      const actual = searchReducer(stateWithHistory, searchSuccess(updatedSearch));
      
      expect(actual.searchHistory).toHaveLength(1);
      expect(actual.searchHistory[0].status).toBe('error');
    });
  });
});