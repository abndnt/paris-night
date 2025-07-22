import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SearchResultsList from '../SearchResultsList';
import searchReducer from '../../../store/slices/searchSlice';
import { FlightResult } from '../../../store/slices/searchSlice';

// Mock FlightResultCard component
jest.mock('../FlightResultCard', () => {
  return function MockFlightResultCard({ flight }: { flight: FlightResult }) {
    return <div data-testid={`flight-card-${flight.id}`}>{flight.airline} {flight.flightNumber}</div>;
  };
});

const mockStore = configureStore({
  reducer: {
    search: searchReducer,
  },
});

const mockFlights: FlightResult[] = [
  {
    id: '1',
    airline: 'American Airlines',
    flightNumber: 'AA123',
    route: [
      {
        airline: 'American Airlines',
        flightNumber: 'AA123',
        origin: 'JFK',
        destination: 'LAX',
        departureTime: new Date('2024-01-15T08:00:00Z'),
        arrivalTime: new Date('2024-01-15T11:30:00Z'),
        duration: 330,
      }
    ],
    pricing: {
      cashPrice: 300,
      currency: 'USD',
      pointsOptions: [
        {
          program: 'AAdvantage',
          pointsRequired: 25000,
          bestValue: true,
        }
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
    duration: 330,
    layovers: 0,
  },
  {
    id: '2',
    airline: 'Delta',
    flightNumber: 'DL456',
    route: [
      {
        airline: 'Delta',
        flightNumber: 'DL456',
        origin: 'JFK',
        destination: 'LAX',
        departureTime: new Date('2024-01-15T10:00:00Z'),
        arrivalTime: new Date('2024-01-15T13:30:00Z'),
        duration: 330,
      }
    ],
    pricing: {
      cashPrice: 350,
      currency: 'USD',
      pointsOptions: [
        {
          program: 'SkyMiles',
          pointsRequired: 30000,
          bestValue: true,
        }
      ],
      taxes: 60,
      fees: 30,
      totalPrice: 440,
    },
    availability: {
      availableSeats: 3,
      bookingClass: 'Y',
      fareBasis: 'YCA',
    },
    duration: 330,
    layovers: 0,
  },
];

describe('SearchResultsList', () => {
  const renderComponent = (flights: FlightResult[] = mockFlights) => {
    return render(
      <Provider store={mockStore}>
        <SearchResultsList flights={flights} />
      </Provider>
    );
  };

  it('renders flight cards for each flight', () => {
    renderComponent();
    
    expect(screen.getByTestId('flight-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('flight-card-2')).toBeInTheDocument();
    expect(screen.getByText('American Airlines AA123')).toBeInTheDocument();
    expect(screen.getByText('Delta DL456')).toBeInTheDocument();
  });

  it('renders empty state when no flights provided', () => {
    renderComponent([]);
    
    expect(screen.getByText('No flights found matching your criteria')).toBeInTheDocument();
    expect(screen.queryByTestId('flight-card-1')).not.toBeInTheDocument();
  });

  it('renders correct number of flight cards', () => {
    renderComponent();
    
    const flightCards = screen.getAllByTestId(/flight-card-/);
    expect(flightCards).toHaveLength(2);
  });

  it('maintains flight order', () => {
    renderComponent();
    
    const flightCards = screen.getAllByTestId(/flight-card-/);
    expect(flightCards[0]).toHaveAttribute('data-testid', 'flight-card-1');
    expect(flightCards[1]).toHaveAttribute('data-testid', 'flight-card-2');
  });
});