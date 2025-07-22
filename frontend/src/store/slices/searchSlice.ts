import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types based on backend models
export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

export interface SearchCriteria {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  passengers: PassengerCount;
  cabinClass: 'economy' | 'premium' | 'business' | 'first';
  flexible: boolean;
}

export interface FlightSegment {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  aircraft?: string;
  operatingAirline?: string;
}

export interface PointsOption {
  program: string;
  pointsRequired: number;
  cashComponent?: number;
  transferRatio?: number;
  bestValue: boolean;
}

export interface PricingInfo {
  cashPrice: number;
  currency: string;
  pointsOptions: PointsOption[];
  taxes: number;
  fees: number;
  totalPrice: number;
}

export interface AvailabilityInfo {
  availableSeats: number;
  bookingClass: string;
  fareBasis: string;
  restrictions?: string[];
}

export interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  route: FlightSegment[];
  pricing: PricingInfo;
  availability: AvailabilityInfo;
  duration: number;
  layovers: number;
  layoverDuration?: number;
  score?: number;
}

export interface FlightSearch {
  id: string;
  userId?: string;
  searchCriteria: SearchCriteria;
  results: FlightResult[];
  status: 'pending' | 'completed' | 'error';
  createdAt: Date;
  expiresAt: Date;
}

export type SortOption = 'price' | 'duration' | 'departure' | 'arrival' | 'points';
export type SortDirection = 'asc' | 'desc';
export type PricingMode = 'cash' | 'points';

export interface SearchFilters {
  maxPrice?: number;
  maxDuration?: number;
  maxLayovers?: number;
  airlines?: string[];
  departureTimeRange?: [number, number]; // hours in 24h format
  arrivalTimeRange?: [number, number];
  directFlightsOnly?: boolean;
}

interface SearchState {
  currentSearch: FlightSearch | null;
  searchHistory: FlightSearch[];
  isSearching: boolean;
  searchError: string | null;
  
  // UI state
  sortBy: SortOption;
  sortDirection: SortDirection;
  pricingMode: PricingMode;
  filters: SearchFilters;
  selectedFlightId: string | null;
  showFilters: boolean;
  
  // Results display
  filteredResults: FlightResult[];
  resultsPerPage: number;
  currentPage: number;
}

const initialState: SearchState = {
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
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    // Search actions
    startSearch: (state, action: PayloadAction<SearchCriteria>) => {
      state.isSearching = true;
      state.searchError = null;
      state.currentSearch = null;
    },
    
    searchSuccess: (state, action: PayloadAction<FlightSearch>) => {
      state.isSearching = false;
      state.currentSearch = action.payload;
      state.filteredResults = action.payload.results;
      state.currentPage = 1;
      
      // Add to search history
      const existingIndex = state.searchHistory.findIndex(s => s.id === action.payload.id);
      if (existingIndex >= 0) {
        state.searchHistory[existingIndex] = action.payload;
      } else {
        state.searchHistory.unshift(action.payload);
        // Keep only last 10 searches
        if (state.searchHistory.length > 10) {
          state.searchHistory = state.searchHistory.slice(0, 10);
        }
      }
    },
    
    searchError: (state, action: PayloadAction<string>) => {
      state.isSearching = false;
      state.searchError = action.payload;
    },
    
    clearSearch: (state) => {
      state.currentSearch = null;
      state.filteredResults = [];
      state.searchError = null;
      state.selectedFlightId = null;
      state.currentPage = 1;
    },
    
    // Sorting and filtering
    setSortBy: (state, action: PayloadAction<SortOption>) => {
      state.sortBy = action.payload;
      state.currentPage = 1;
    },
    
    setSortDirection: (state, action: PayloadAction<SortDirection>) => {
      state.sortDirection = action.payload;
      state.currentPage = 1;
    },
    
    setPricingMode: (state, action: PayloadAction<PricingMode>) => {
      state.pricingMode = action.payload;
    },
    
    setFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.filters = action.payload;
      state.currentPage = 1;
    },
    
    updateFilter: (state, action: PayloadAction<Partial<SearchFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1;
    },
    
    clearFilters: (state) => {
      state.filters = {};
      state.currentPage = 1;
    },
    
    toggleShowFilters: (state) => {
      state.showFilters = !state.showFilters;
    },
    
    // Flight selection
    selectFlight: (state, action: PayloadAction<string>) => {
      state.selectedFlightId = action.payload;
    },
    
    deselectFlight: (state) => {
      state.selectedFlightId = null;
    },
    
    // Pagination
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    
    setResultsPerPage: (state, action: PayloadAction<number>) => {
      state.resultsPerPage = action.payload;
      state.currentPage = 1;
    },
    
    // Update filtered results (typically called after sorting/filtering)
    updateFilteredResults: (state, action: PayloadAction<FlightResult[]>) => {
      state.filteredResults = action.payload;
    },
  },
});

export const {
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
} = searchSlice.actions;

export default searchSlice.reducer;