import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FlightResultCard from '../FlightResultCard';
import searchReducer, { FlightResult } from '../../../store/slices/searchSlice';

// Mock the FlightDetailsModal
jest.mock('../FlightDetailsModal', () => {
  return function MockFlightDetailsModal({ flight, isOpen, onClose }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="flight-details-modal">
        Flight Details for {flight.id}
        <button onClick={onClose}>Close</button>
      </div>
    );
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
    restrictions: ['Non-refundable', 'Change fee applies'],
  },
  duration: 360,
  layovers: 0,
};

const mockFlightWithLayovers: FlightResult = {
  ...mockFlightResult,
  id: 'flight-2',
  route: [
    {
      airline: 'American Airlines',
      flightNumber: 'AA123',
      origin: 'NYC',
      destination: 'DFW',
      departureTime: new Date('2024-06-01T08:00:00Z'),
      arrivalTime: new Date('2024-06-01T10:00:00Z'),
      duration: 180,
    },
    {
      airline: 'American Airlines',
      flightNumber: 'AA456',
      origin: 'DFW',
      destination: 'LAX',
      departureTime: new Date('2024-06-01T11:30:00Z'),
      arrivalTime: new Date('2024-06-01T13:00:00Z'),
      duration: 150,
    },
  ],
  layovers: 1,
  layoverDuration: 90,
};

const createMockStore = (pricingMode: 'cash' | 'points' = 'cash') => {
  return configureStore({
    reducer: {
      search: searchReducer,
    },
    preloadedState: {
      search: {
        currentSearch: null,
        searchHistory: [],
        isSearching: false,
        searchError: null,
        sortBy: 'price',
        sortDirection: 'asc',
        pricingMode,
        filters: {},
        selectedFlightId: null,
        showFilters: false,
        filteredResults: [],
        resultsPerPage: 20,
        currentPage: 1,
      },
    },
  });
};

const renderWithStore = (flight: FlightResult, pricingMode: 'cash' | 'points' = 'cash') => {
  const store = createMockStore(pricingMode);
  return render(
    <Provider store={store}>
      <FlightResultCard flight={flight} />
    </Provider>
  );
};

describe('FlightResultCard', () => {
  it('renders flight information correctly', () => {
    renderWithStore(mockFlightResult);
    
    // Check departure and arrival times
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    
    // Check airports
    expect(screen.getByText('NYC')).toBeInTheDocument();
    expect(screen.getByText('LAX')).toBeInTheDocument();
    
    // Check airline and flight number
    expect(screen.getByText('American Airlines AA123')).toBeInTheDocument();
    
    // Check duration
    expect(screen.getByText('6h 0m')).toBeInTheDocument();
  });

  it('displays cash pricing correctly', () => {
    renderWithStore(mockFlightResult, 'cash');
    
    expect(screen.getByText('$375')).toBeInTheDocument();
    expect(screen.getByText('+ $75 taxes & fees')).toBeInTheDocument();
    expect(screen.getByText('or 25,000 pts')).toBeInTheDocument();
  });

  it('displays points pricing correctly', () => {
    renderWithStore(mockFlightResult, 'points');
    
    expect(screen.getByText('25,000 pts')).toBeInTheDocument();
    expect(screen.getByText('AAdvantage')).toBeInTheDocument();
  });

  it('displays points pricing with cash component', () => {
    const flightWithCashComponent = {
      ...mockFlightResult,
      pricing: {
        ...mockFlightResult.pricing,
        pointsOptions: [
          {
            program: 'AAdvantage',
            pointsRequired: 20000,
            cashComponent: 100,
            bestValue: true,
          },
        ],
      },
    };
    
    renderWithStore(flightWithCashComponent, 'points');
    
    expect(screen.getByText('20,000 pts')).toBeInTheDocument();
    expect(screen.getByText('+ $100 cash')).toBeInTheDocument();
  });

  it('handles flights without points options', () => {
    const flightWithoutPoints = {
      ...mockFlightResult,
      pricing: {
        ...mockFlightResult.pricing,
        pointsOptions: [],
      },
    };
    
    renderWithStore(flightWithoutPoints, 'points');
    
    expect(screen.getByText('Points not available')).toBeInTheDocument();
  });

  it('displays layover information', () => {
    renderWithStore(mockFlightWithLayovers);
    
    expect(screen.getByText('1 stop')).toBeInTheDocument();
    expect(screen.getByText('Layover: 1h 30m')).toBeInTheDocument();
    expect(screen.getByText('via DFW')).toBeInTheDocument();
  });

  it('displays multiple layovers correctly', () => {
    const flightWithMultipleLayovers = {
      ...mockFlightWithLayovers,
      layovers: 2,
    };
    
    renderWithStore(flightWithMultipleLayovers);
    
    expect(screen.getByText('2 stops')).toBeInTheDocument();
  });

  it('displays availability information', () => {
    renderWithStore(mockFlightResult);
    
    expect(screen.getByText('5 seats left')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument(); // Booking class
  });

  it('displays restrictions when present', () => {
    renderWithStore(mockFlightResult);
    
    expect(screen.getByText('Restrictions apply')).toBeInTheDocument();
  });

  it('handles select button click', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <FlightResultCard flight={mockFlightResult} />
      </Provider>
    );
    
    const selectButton = screen.getByText('Select');
    fireEvent.click(selectButton);
    
    const state = store.getState();
    expect(state.search.selectedFlightId).toBe('flight-1');
  });

  it('opens flight details modal', () => {
    renderWithStore(mockFlightResult);
    
    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);
    
    expect(screen.getByTestId('flight-details-modal')).toBeInTheDocument();
    expect(screen.getByText('Flight Details for flight-1')).toBeInTheDocument();
  });

  it('closes flight details modal', () => {
    renderWithStore(mockFlightResult);
    
    // Open modal
    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);
    
    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('flight-details-modal')).not.toBeInTheDocument();
  });

  it('formats dates correctly for different days', () => {
    const flightWithDifferentDates = {
      ...mockFlightResult,
      route: [
        {
          ...mockFlightResult.route[0],
          departureTime: new Date('2024-06-01T23:00:00Z'),
          arrivalTime: new Date('2024-06-02T02:00:00Z'),
        },
      ],
    };
    
    renderWithStore(flightWithDifferentDates);
    
    expect(screen.getByText('Jun 1')).toBeInTheDocument();
    expect(screen.getByText('Jun 2')).toBeInTheDocument();
  });

  it('handles flights with operating airline different from marketing airline', () => {
    const flightWithOperatingAirline = {
      ...mockFlightResult,
      route: [
        {
          ...mockFlightResult.route[0],
          operatingAirline: 'Regional Carrier',
        },
      ],
    };
    
    renderWithStore(flightWithOperatingAirline);
    
    // The operating airline info would be shown in the details modal
    // For the card view, we just show the marketing airline
    expect(screen.getByText('American Airlines AA123')).toBeInTheDocument();
  });
});