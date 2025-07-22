import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import BookingFlow from '../BookingFlow';
import bookingReducer from '../../../store/slices/bookingSlice';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import bookingService from '../../../services/bookingService';

// Mock the booking service
jest.mock('../../../services/bookingService');
const mockBookingService = bookingService as jest.Mocked<typeof bookingService>;

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
const mockLocation = {
  pathname: '/booking',
  state: {
    flight: {
      id: 'flight-123',
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
        pointsOptions: [
          {
            program: 'AA AAdvantage',
            pointsRequired: 25000,
            cashComponent: 5.60,
            bestValue: true,
          },
        ],
      },
      availability: {
        available: true,
        bookingClass: 'Y',
        fareBasis: 'YCA',
        remainingSeats: 5,
      },
    },
  },
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

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

describe('BookingFlow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingService.validatePassengerInfo.mockReturnValue([]);
    mockBookingService.validatePaymentMethod.mockReturnValue([]);
    mockBookingService.createBooking.mockResolvedValue({
      id: 'booking-123',
      userId: 'user-123',
      confirmationCode: 'ABC123',
      flightDetails: mockLocation.state.flight,
      passengers: [
        {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
        },
      ],
      paymentMethod: {
        type: 'credit_card',
        totalAmount: 299.99,
        currency: 'USD',
        creditCard: {
          last4: '1234',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          holderName: 'John Doe',
        },
      },
      totalCost: {
        baseFare: 229.49,
        taxes: 45.50,
        fees: 25.00,
        totalCash: 299.99,
        currency: 'USD',
      },
      status: 'confirmed',
      travelDate: new Date('2024-03-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('Complete Booking Flow', () => {
    it('should complete the entire booking process successfully', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BookingFlow />);

      // Step 1: Passenger Information
      expect(screen.getByText('Passenger Information')).toBeInTheDocument();
      expect(screen.getByText('JFK → LAX')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();

      // Fill passenger information
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');

      // Continue to payment
      await user.click(screen.getByText('Continue to Payment'));

      // Step 2: Payment Information
      await waitFor(() => {
        expect(screen.getByText('Payment Information')).toBeInTheDocument();
      });

      // Fill credit card information
      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '1234');
      await user.selectOptions(screen.getByLabelText(/expiry month/i), '12');
      await user.selectOptions(screen.getByLabelText(/expiry year/i), '2025');

      // Continue to review
      await user.click(screen.getByText('Continue to Review'));

      // Step 3: Review Booking
      await waitFor(() => {
        expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('VISA ending in 1234')).toBeInTheDocument();

      // Accept terms and confirm
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      await user.click(screen.getByText('Confirm Booking'));

      // Step 4: Confirmation
      await waitFor(() => {
        expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
      });

      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(mockBookingService.createBooking).toHaveBeenCalledWith({
        flightDetails: mockLocation.state.flight,
        passengers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: new Date('1990-01-01'),
          },
        ],
        paymentMethod: expect.objectContaining({
          type: 'credit_card',
          creditCard: expect.objectContaining({
            holderName: 'John Doe',
            last4: '1234',
          }),
        }),
        contactEmail: 'john@example.com',
        contactPhone: '',
      });
    });

    it('should handle points payment method', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BookingFlow />);

      // Fill passenger information
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.click(screen.getByText('Continue to Payment'));

      // Select points payment
      await waitFor(() => {
        expect(screen.getByText('Payment Information')).toBeInTheDocument();
      });

      const pointsRadio = screen.getByLabelText(/points only/i);
      await user.click(pointsRadio);

      // Fill points information
      await user.selectOptions(screen.getByLabelText(/reward program/i), 'chase-ur');
      await user.type(screen.getByLabelText(/points to use/i), '25000');

      await user.click(screen.getByText('Continue to Review'));

      // Review and confirm
      await waitFor(() => {
        expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
      });

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      await user.click(screen.getByText('Confirm Booking'));

      await waitFor(() => {
        expect(mockBookingService.createBooking).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethod: expect.objectContaining({
              type: 'points',
              pointsUsed: expect.objectContaining({
                program: 'chase-ur',
                points: 25000,
              }),
            }),
          })
        );
      });
    });

    it('should handle multiple passengers', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BookingFlow />);

      // Add second passenger
      await user.click(screen.getByText('+ Add Another Passenger'));

      // Fill first passenger
      const passengerForms = screen.getAllByText(/passenger \d+/i);
      expect(passengerForms).toHaveLength(2);

      const firstNameInputs = screen.getAllByLabelText(/first name/i);
      const lastNameInputs = screen.getAllByLabelText(/last name/i);
      const dobInputs = screen.getAllByLabelText(/date of birth/i);

      await user.type(firstNameInputs[0], 'John');
      await user.type(lastNameInputs[0], 'Doe');
      await user.type(dobInputs[0], '1990-01-01');

      await user.type(firstNameInputs[1], 'Jane');
      await user.type(lastNameInputs[1], 'Doe');
      await user.type(dobInputs[1], '1992-05-15');

      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.click(screen.getByText('Continue to Payment'));

      // Complete payment step
      await waitFor(() => {
        expect(screen.getByText('Payment Information')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '1234');
      await user.click(screen.getByText('Continue to Review'));

      // Review should show both passengers
      await waitFor(() => {
        expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate passenger information', async () => {
      const user = userEvent.setup();
      mockBookingService.validatePassengerInfo.mockReturnValue(['First name is required']);

      renderWithProviders(<BookingFlow />);

      // Try to continue without filling required fields
      await user.click(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });

      // Should not proceed to payment step
      expect(screen.queryByText('Payment Information')).not.toBeInTheDocument();
    });

    it('should validate payment information', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BookingFlow />);

      // Fill passenger info and proceed
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.click(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByText('Payment Information')).toBeInTheDocument();
      });

      // Try to continue without payment info
      await user.click(screen.getByText('Continue to Review'));

      await waitFor(() => {
        expect(screen.getByText('Cardholder name is required')).toBeInTheDocument();
      });
    });

    it('should handle booking creation errors', async () => {
      const user = userEvent.setup();
      mockBookingService.createBooking.mockRejectedValue(new Error('Payment failed'));

      renderWithProviders(<BookingFlow />);

      // Complete the flow
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.click(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByText('Payment Information')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '1234');
      await user.click(screen.getByText('Continue to Review'));

      await waitFor(() => {
        expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
      });

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);
      await user.click(screen.getByText('Confirm Booking'));

      await waitFor(() => {
        expect(screen.getByText('Payment failed')).toBeInTheDocument();
      });

      // Should stay on review step
      expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
    });
  });

  describe('Navigation and State Management', () => {
    it('should allow navigation between steps', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BookingFlow />);

      // Fill passenger info and go to payment
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.click(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByText('Payment Information')).toBeInTheDocument();
      });

      // Go back to passenger info
      await user.click(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByText('Passenger Information')).toBeInTheDocument();
      });

      // Data should be preserved
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('should redirect unauthenticated users', () => {
      renderWithProviders(<BookingFlow />, {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null,
        },
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { from: mockLocation } });
    });

    it('should redirect when no flight is selected', () => {
      const mockLocationNoFlight = {
        ...mockLocation,
        state: null,
      };

      jest.mocked(require('react-router-dom').useLocation).mockReturnValue(mockLocationNoFlight);

      renderWithProviders(<BookingFlow />);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      renderWithProviders(<BookingFlow />);

      // Check for proper form labels
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();

      // Check for proper headings
      expect(screen.getByRole('heading', { name: /passenger information/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /contact information/i })).toBeInTheDocument();
    });

    it('should have proper progress indicators', () => {
      renderWithProviders(<BookingFlow />);

      // Check progress indicator
      const progressSteps = screen.getAllByText(/passenger info|payment|review|confirmation/i);
      expect(progressSteps.length).toBeGreaterThan(0);

      // Current step should be highlighted
      const currentStep = screen.getByText('Passenger Info');
      expect(currentStep.closest('div')).toHaveClass('text-blue-600');
    });
  });
});