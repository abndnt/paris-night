import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import BookingModification from '../BookingModification';
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
const mockParams = { bookingId: 'booking-123' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

// Sample booking data
const mockBooking: Booking = {
  id: 'booking-123',
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
        departureTime: new Date('2024-06-15T10:00:00Z'),
        arrivalTime: new Date('2024-06-15T13:00:00Z'),
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
      seatPreference: 'aisle',
      mealPreference: 'vegetarian',
    },
    {
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: new Date('1992-05-15'),
      passportNumber: 'AB123456',
      knownTravelerNumber: '12345678',
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
  travelDate: new Date('2024-06-15'),
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

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
        bookings: [mockBooking],
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

describe('BookingModification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingService.getBooking.mockResolvedValue(mockBooking);
    mockBookingService.updateBooking.mockResolvedValue({
      ...mockBooking,
      updatedAt: new Date(),
    });
    mockBookingService.validatePassengerInfo.mockReturnValue([]);
  });

  describe('Loading and Display', () => {
    it('should display booking modification form with existing data', async () => {
      renderWithProviders(<BookingModification />);

      expect(screen.getByText('Modify Booking')).toBeInTheDocument();
      expect(screen.getByText('JFK → LAX')).toBeInTheDocument();
      expect(screen.getByText('American Airlines AA123')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();

      // Should show passenger forms with existing data
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      });
    });

    it('should load booking details if not already in store', async () => {
      renderWithProviders(<BookingModification />, {
        booking: {
          bookings: [], // Empty bookings array
          isLoadingBookingDetails: false,
        },
      });

      expect(screen.getByText('Loading booking details...')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockBookingService.getBooking).toHaveBeenCalledWith('booking-123');
      });
    });

    it('should show error when booking cannot be loaded', async () => {
      mockBookingService.getBooking.mockRejectedValue(new Error('Booking not found'));

      renderWithProviders(<BookingModification />, {
        booking: {
          bookings: [],
          isLoadingBookingDetails: false,
          bookingDetailsError: 'Booking not found',
        },
      });

      expect(screen.getByText('Booking not found')).toBeInTheDocument();
      expect(screen.getByText('Back to Bookings')).toBeInTheDocument();
    });

    it('should show cannot modify message for non-modifiable bookings', () => {
      const cancelledBooking = { ...mockBooking, status: 'cancelled' as const };
      
      renderWithProviders(<BookingModification />, {
        booking: {
          bookings: [cancelledBooking],
        },
      });

      expect(screen.getByText('Cannot Modify Booking')).toBeInTheDocument();
      expect(screen.getByText('This booking cannot be modified')).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    beforeEach(() => {
      renderWithProviders(<BookingModification />);
    });

    it('should allow editing passenger information', async () => {
      const user = userEvent.setup();

      // Find first passenger's first name input and modify it
      const firstNameInputs = screen.getAllByLabelText(/first name/i);
      await user.clear(firstNameInputs[0]);
      await user.type(firstNameInputs[0], 'Jonathan');

      expect(screen.getByDisplayValue('Jonathan')).toBeInTheDocument();
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });

    it('should allow editing contact information', async () => {
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john.doe@example.com');

      expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });

    it('should preserve existing passenger preferences', () => {
      // Check that existing preferences are displayed
      expect(screen.getByDisplayValue('aisle')).toBeInTheDocument();
      expect(screen.getByDisplayValue('vegetarian')).toBeInTheDocument();
      expect(screen.getByDisplayValue('AB123456')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12345678')).toBeInTheDocument();
    });

    it('should allow editing special requests', async () => {
      const user = userEvent.setup();

      // Add special request to first passenger
      const addRequestButtons = screen.getAllByText('+ Add Special Request');
      await user.click(addRequestButtons[0]);

      const specialRequestInputs = screen.getAllByPlaceholderText(/enter special request/i);
      await user.type(specialRequestInputs[0], 'Wheelchair assistance');

      expect(screen.getByDisplayValue('Wheelchair assistance')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      renderWithProviders(<BookingModification />);
    });

    it('should validate passenger information before saving', async () => {
      const user = userEvent.setup();
      mockBookingService.validatePassengerInfo.mockReturnValue(['First name is required']);

      // Clear required field
      const firstNameInputs = screen.getAllByLabelText(/first name/i);
      await user.clear(firstNameInputs[0]);

      // Try to save
      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });

      expect(mockBookingService.updateBooking).not.toHaveBeenCalled();
    });

    it('should validate contact information', async () => {
      const user = userEvent.setup();

      // Enter invalid email
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();

      // Enter invalid phone number
      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, 'invalid-phone');

      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Invalid phone number format')).toBeInTheDocument();
      });
    });
  });

  describe('Save Changes', () => {
    beforeEach(() => {
      renderWithProviders(<BookingModification />);
    });

    it('should save changes successfully', async () => {
      const user = userEvent.setup();

      // Make a change
      const firstNameInputs = screen.getAllByLabelText(/first name/i);
      await user.clear(firstNameInputs[0]);
      await user.type(firstNameInputs[0], 'Jonathan');

      // Save changes
      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockBookingService.updateBooking).toHaveBeenCalledWith('booking-123', {
          passengers: expect.arrayContaining([
            expect.objectContaining({
              firstName: 'Jonathan',
              lastName: 'Doe',
            }),
          ]),
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/booking/booking-123');
    });

    it('should include contact information in update', async () => {
      const user = userEvent.setup();

      // Add contact information
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '+1-555-123-4567');

      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockBookingService.updateBooking).toHaveBeenCalledWith('booking-123', {
          passengers: expect.any(Array),
          contactEmail: 'john@example.com',
          contactPhone: '+1-555-123-4567',
        });
      });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      mockBookingService.updateBooking.mockRejectedValue(new Error('Update failed'));

      // Make a change and save
      const firstNameInputs = screen.getAllByLabelText(/first name/i);
      await user.clear(firstNameInputs[0]);
      await user.type(firstNameInputs[0], 'Jonathan');
      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });

      // Should not navigate away
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show loading state during save', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      mockBookingService.updateBooking.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockBooking), 100))
      );

      // Make a change and save
      const firstNameInputs = screen.getAllByLabelText(/first name/i);
      await user.clear(firstNameInputs[0]);
      await user.type(firstNameInputs[0], 'Jonathan');
      await user.click(screen.getByText('Save Changes'));

      expect(screen.getByText('Saving Changes...')).toBeInTheDocument();
      
      const saveButton = screen.getByRole('button', { name: /saving changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should disable save button when no changes are made', () => {
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      renderWithProviders(<BookingModification />);
    });

    it('should navigate back to booking details when cancel is clicked', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Cancel'));

      expect(mockNavigate).toHaveBeenCalledWith('/booking/booking-123');
    });

    it('should navigate back to booking details from back button', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('← Back to Booking Details'));

      expect(mockNavigate).toHaveBeenCalledWith('/booking/booking-123');
    });
  });

  describe('Authentication', () => {
    it('should redirect unauthenticated users', () => {
      renderWithProviders(<BookingModification />, {
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

    it('should show authentication required message', () => {
      renderWithProviders(<BookingModification />, {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null,
        },
      });

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  describe('Important Notices', () => {
    beforeEach(() => {
      renderWithProviders(<BookingModification />);
    });

    it('should display modification notices', () => {
      expect(screen.getByText('Important Notice')).toBeInTheDocument();
      expect(screen.getByText(/Changes to passenger names must match government-issued ID/)).toBeInTheDocument();
      expect(screen.getByText(/Some modifications may incur additional fees/)).toBeInTheDocument();
      expect(screen.getByText(/Flight details.*cannot be changed through this interface/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      renderWithProviders(<BookingModification />);
    });

    it('should have proper headings and labels', () => {
      expect(screen.getByRole('heading', { name: /modify booking/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /contact information/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /passenger information/i })).toBeInTheDocument();
    });

    it('should have accessible form controls', () => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      
      const firstNameInputs = screen.getAllByLabelText(/first name/i);
      expect(firstNameInputs.length).toBeGreaterThan(0);
    });

    it('should have accessible buttons', () => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });
});