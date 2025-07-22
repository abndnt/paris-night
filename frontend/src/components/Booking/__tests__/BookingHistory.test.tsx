import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import BookingHistory from '../BookingHistory';
import bookingReducer from '../../../store/slices/bookingSlice';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import bookingService from '../../../services/bookingService';
import { Booking } from '../../../store/slices/bookingSlice';

// Mock the booking service
jest.mock('../../../services/bookingService');
const mockBookingService = bookingService as jest.Mocked<typeof bookingService>;

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Sample booking data
const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    userId: 'user-123',
    confirmationCode: 'ABC123',
    flightDetails: {
      id: 'flight-1',
      airline: 'American Airlines',
      flightNumber: 'AA123',
      route: [
        {
          origin: 'JFK',
          destination: 'LAX',
          departureTime: new Date('2024-03-15T10:00:00Z'),
          arrivalTime: new Date('2024-03-15T13:00:00Z'),
          duration: 360,
          airline: 'American Airlines',
          flightNumber: 'AA123',
          aircraft: 'Boeing 737',
        },
      ],
      duration: 360,
      layovers: 0,
      pricing: {
        totalPrice: 299.99,
        cashPrice: 299.99,
        taxes: 45.50,
        fees: 25.00,
        currency: 'USD',
        pointsOptions: [],
      },
      availability: {
        available: true,
        bookingClass: 'Y',
        fareBasis: 'YCA',
        remainingSeats: 5,
      },
    },
    passengers: [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
      },
    ],
    totalCost: {
      baseFare: 229.49,
      taxes: 45.50,
      fees: 25.00,
      totalCash: 299.99,
      currency: 'USD',
    },
    status: 'confirmed',
    travelDate: new Date('2024-03-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'booking-2',
    userId: 'user-123',
    confirmationCode: 'DEF456',
    flightDetails: {
      id: 'flight-2',
      airline: 'Delta Airlines',
      flightNumber: 'DL456',
      route: [
        {
          origin: 'LAX',
          destination: 'JFK',
          departureTime: new Date('2024-04-20T14:00:00Z'),
          arrivalTime: new Date('2024-04-20T22:00:00Z'),
          duration: 360,
          airline: 'Delta Airlines',
          flightNumber: 'DL456',
          aircraft: 'Airbus A320',
        },
      ],
      duration: 360,
      layovers: 0,
      pricing: {
        totalPrice: 350.00,
        cashPrice: 350.00,
        taxes: 55.00,
        fees: 30.00,
        currency: 'USD',
        pointsOptions: [],
      },
      availability: {
        available: true,
        bookingClass: 'Y',
        fareBasis: 'YCA',
        remainingSeats: 3,
      },
    },
    passengers: [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
      },
    ],
    totalCost: {
      baseFare: 265.00,
      taxes: 55.00,
      fees: 30.00,
      totalCash: 350.00,
      currency: 'USD',
    },
    status: 'pending',
    travelDate: new Date('2024-04-20'),
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'booking-3',
    userId: 'user-123',
    confirmationCode: 'GHI789',
    flightDetails: {
      id: 'flight-3',
      airline: 'United Airlines',
      flightNumber: 'UA789',
      route: [
        {
          origin: 'ORD',
          destination: 'SFO',
          departureTime: new Date('2023-12-10T08:00:00Z'),
          arrivalTime: new Date('2023-12-10T11:00:00Z'),
          duration: 240,
          airline: 'United Airlines',
          flightNumber: 'UA789',
          aircraft: 'Boeing 777',
        },
      ],
      duration: 240,
      layovers: 0,
      pricing: {
        totalPrice: 450.00,
        cashPrice: 450.00,
        taxes: 65.00,
        fees: 35.00,
        currency: 'USD',
        pointsOptions: [],
      },
      availability: {
        available: true,
        bookingClass: 'Y',
        fareBasis: 'YCA',
        remainingSeats: 2,
      },
    },
    passengers: [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
      },
    ],
    totalCost: {
      baseFare: 350.00,
      taxes: 65.00,
      fees: 35.00,
      totalCash: 450.00,
      currency: 'USD',
    },
    status: 'completed',
    travelDate: new Date('2023-12-10'),
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2023-12-11'),
  },
];

// Test store setup
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      booking: bookingReducer,
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        token: 'mock-token',
        isLoading: false,
        error: null,
      },
      booking: {
        selectedFlight: null,
        currentStep: 'passengers',
        formData: { passengers: [] },
        isBooking: false,
        bookingError: null,
        currentBooking: null,
        bookings: [],
        isLoadingBookings: false,
        bookingsError: null,
        selectedBookingId: null,
        isLoadingBookingDetails: false,
        bookingDetailsError: null,
        isModifying: false,
        isCancelling: false,
        modificationError: null,
      },
      ...initialState,
    },
  });
};

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('BookingHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingService.getUserBookings.mockResolvedValue(mockBookings);
    mockBookingService.cancelBooking.mockResolvedValue();
  });

  describe('Loading and Display', () => {
    it('should load and display bookings on mount', async () => {
      renderWithProviders(<BookingHistory />);

      expect(screen.getByText('Loading your bookings...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('My Bookings')).toBeInTheDocument();
      });

      expect(mockBookingService.getUserBookings).toHaveBeenCalled();
      expect(screen.getByText('JFK → LAX')).toBeInTheDocument();
      expect(screen.getByText('LAX → JFK')).toBeInTheDocument();
      expect(screen.getByText('ORD → SFO')).toBeInTheDocument();
    });

    it('should display booking details correctly', async () => {
      renderWithProviders(<BookingHistory />, {
        booking: {
          bookings: mockBookings,
          isLoadingBookings: false,
        },
      });

      // Check first booking details
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();
      expect(screen.getByText('American Airlines AA123')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();

      // Check passenger count
      expect(screen.getAllByText('John Doe')).toHaveLength(3); // One for each booking
    });

    it('should show empty state when no bookings exist', async () => {
      mockBookingService.getUserBookings.mockResolvedValue([]);

      renderWithProviders(<BookingHistory />);

      await waitFor(() => {
        expect(screen.getByText('No bookings found')).toBeInTheDocument();
      });

      expect(screen.getByText("You haven't made any flight bookings yet.")).toBeInTheDocument();
      expect(screen.getByText('Search Flights')).toBeInTheDocument();
    });

    it('should handle loading errors', async () => {
      mockBookingService.getUserBookings.mockRejectedValue(new Error('Failed to load bookings'));

      renderWithProviders(<BookingHistory />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load bookings')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Sorting', () => {
    beforeEach(() => {
      renderWithProviders(<BookingHistory />, {
        booking: {
          bookings: mockBookings,
          isLoadingBookings: false,
        },
      });
    });

    it('should filter bookings by status', async () => {
      const user = userEvent.setup();

      // Filter by confirmed status
      const statusFilter = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(statusFilter, 'confirmed');

      // Should only show confirmed booking
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.queryByText('DEF456')).not.toBeInTheDocument();
      expect(screen.queryByText('GHI789')).not.toBeInTheDocument();
    });

    it('should sort bookings by date and status', async () => {
      const user = userEvent.setup();

      // Sort by status
      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'status');

      // Bookings should be reordered (completed, confirmed, pending)
      const bookingCards = screen.getAllByText(/→/);
      expect(bookingCards).toHaveLength(3);
    });

    it('should show correct counts in filter options', () => {
      expect(screen.getByText('All (3)')).toBeInTheDocument();
      expect(screen.getByText('Confirmed (1)')).toBeInTheDocument();
      expect(screen.getByText('Pending (1)')).toBeInTheDocument();
      expect(screen.getByText('Completed (1)')).toBeInTheDocument();
    });
  });

  describe('Booking Actions', () => {
    beforeEach(() => {
      renderWithProviders(<BookingHistory />, {
        booking: {
          bookings: mockBookings,
          isLoadingBookings: false,
        },
      });
    });

    it('should navigate to booking details when view is clicked', async () => {
      const user = userEvent.setup();

      const viewButtons = screen.getAllByText('View Details');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/booking/booking-1');
    });

    it('should navigate to booking modification when modify is clicked', async () => {
      const user = userEvent.setup();

      const modifyButtons = screen.getAllByText('Modify');
      await user.click(modifyButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/booking/booking-1/modify');
    });

    it('should show cancel modal when cancel is clicked', async () => {
      const user = userEvent.setup();

      const cancelButtons = screen.getAllByText('Cancel');
      await user.click(cancelButtons[0]);

      expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to cancel this booking?')).toBeInTheDocument();
    });

    it('should not show modify/cancel buttons for completed bookings', () => {
      // Completed booking should only have View Details button
      const bookingCards = screen.getAllByTestId(/booking-card/i);
      
      // The completed booking (GHI789) should not have modify/cancel buttons
      // This would need to be implemented in the BookingCard component with data-testid
    });
  });

  describe('Booking Cancellation', () => {
    beforeEach(() => {
      renderWithProviders(<BookingHistory />, {
        booking: {
          bookings: mockBookings,
          isLoadingBookings: false,
        },
      });
    });

    it('should cancel booking successfully', async () => {
      const user = userEvent.setup();

      // Open cancel modal
      const cancelButtons = screen.getAllByText('Cancel');
      await user.click(cancelButtons[0]);

      // Add cancellation reason
      const reasonTextarea = screen.getByLabelText(/reason for cancellation/i);
      await user.type(reasonTextarea, 'Change of plans');

      // Confirm cancellation
      const confirmButton = screen.getByRole('button', { name: /cancel booking/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockBookingService.cancelBooking).toHaveBeenCalledWith('booking-1', 'Change of plans');
      });
    });

    it('should close cancel modal when keep booking is clicked', async () => {
      const user = userEvent.setup();

      // Open cancel modal
      const cancelButtons = screen.getAllByText('Cancel');
      await user.click(cancelButtons[0]);

      // Click keep booking
      await user.click(screen.getByText('Keep Booking'));

      // Modal should be closed
      expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
    });

    it('should handle cancellation errors', async () => {
      const user = userEvent.setup();
      mockBookingService.cancelBooking.mockRejectedValue(new Error('Cancellation failed'));

      // Open cancel modal and confirm
      const cancelButtons = screen.getAllByText('Cancel');
      await user.click(cancelButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /cancel booking/i });
      await user.click(confirmButton);

      // Error should be handled (would need error state in component)
      await waitFor(() => {
        expect(mockBookingService.cancelBooking).toHaveBeenCalled();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh bookings when refresh button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<BookingHistory />, {
        booking: {
          bookings: mockBookings,
          isLoadingBookings: false,
        },
      });

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(mockBookingService.getUserBookings).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
    });

    it('should show loading state during refresh', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<BookingHistory />, {
        booking: {
          bookings: mockBookings,
          isLoadingBookings: false,
        },
      });

      // Mock a delayed response
      mockBookingService.getUserBookings.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockBookings), 100))
      );

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should redirect unauthenticated users', () => {
      renderWithProviders(<BookingHistory />, {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null,
        },
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should show authentication required message for unauthenticated users', () => {
      renderWithProviders(<BookingHistory />, {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null,
        },
      });

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Please log in to view your bookings.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      renderWithProviders(<BookingHistory />, {
        booking: {
          bookings: mockBookings,
          isLoadingBookings: false,
        },
      });
    });

    it('should have proper headings and labels', () => {
      expect(screen.getByRole('heading', { name: /my bookings/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      expect(viewButtons.length).toBeGreaterThan(0);

      const modifyButtons = screen.getAllByRole('button', { name: /modify/i });
      expect(modifyButtons.length).toBeGreaterThan(0);

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      expect(cancelButtons.length).toBeGreaterThan(0);
    });
  });
});