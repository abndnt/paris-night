import bookingService, { CreateBookingRequest, UpdateBookingRequest } from '../bookingService';
import { Booking, PassengerInfo, PaymentMethod } from '../../store/slices/bookingSlice';
import { FlightResult } from '../../store/slices/searchSlice';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Sample data
const mockFlightResult: FlightResult = {
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
    pointsOptions: [],
  },
  availability: {
    available: true,
    bookingClass: 'Y',
    fareBasis: 'YCA',
    remainingSeats: 5,
  },
};

const mockPassenger: PassengerInfo = {
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: new Date('1990-01-01'),
  passportNumber: 'AB123456',
  knownTravelerNumber: '12345678',
  seatPreference: 'aisle',
  mealPreference: 'vegetarian',
  specialRequests: ['Wheelchair assistance'],
};

const mockPaymentMethod: PaymentMethod = {
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
};

const mockBooking: Booking = {
  id: 'booking-123',
  userId: 'user-123',
  confirmationCode: 'ABC123',
  flightDetails: mockFlightResult,
  passengers: [mockPassenger],
  paymentMethod: mockPaymentMethod,
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
};

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('createBooking', () => {
    const createBookingRequest: CreateBookingRequest = {
      flightDetails: mockFlightResult,
      passengers: [mockPassenger],
      paymentMethod: mockPaymentMethod,
      contactEmail: 'john@example.com',
      contactPhone: '+1-555-123-4567',
    };

    it('should create booking successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockBooking,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          travelDate: '2024-03-15T00:00:00Z',
        }),
      } as Response);

      const result = await bookingService.createBooking(createBookingRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify(createBookingRequest),
        }
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'booking-123',
        confirmationCode: 'ABC123',
        status: 'confirmed',
      }));

      // Check date conversion
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.travelDate).toBeInstanceOf(Date);
    });

    it('should handle booking creation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid payment method' }),
      } as Response);

      await expect(bookingService.createBooking(createBookingRequest))
        .rejects.toThrow('Invalid payment method');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(bookingService.createBooking(createBookingRequest))
        .rejects.toThrow('Network error');
    });
  });

  describe('getBooking', () => {
    it('should get booking by ID successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockBooking,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          travelDate: '2024-03-15T00:00:00Z',
        }),
      } as Response);

      const result = await bookingService.getBooking('booking-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking/booking-123',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
        }
      );

      expect(result.id).toBe('booking-123');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle booking not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Booking not found' }),
      } as Response);

      await expect(bookingService.getBooking('invalid-id'))
        .rejects.toThrow('Booking not found');
    });
  });

  describe('getBookingByConfirmation', () => {
    it('should get booking by confirmation code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockBooking,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          travelDate: '2024-03-15T00:00:00Z',
        }),
      } as Response);

      const result = await bookingService.getBookingByConfirmation('ABC123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking/confirmation/ABC123',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.confirmationCode).toBe('ABC123');
    });
  });

  describe('getUserBookings', () => {
    it('should get user bookings with pagination', async () => {
      const mockBookings = [mockBooking];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBookings.map(booking => ({
          ...booking,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          travelDate: '2024-03-15T00:00:00Z',
        })),
      } as Response);

      const result = await bookingService.getUserBookings(1, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking/user?limit=10&offset=0',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('should use default pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      await bookingService.getUserBookings();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking/user?limit=20&offset=0',
        expect.any(Object)
      );
    });
  });

  describe('updateBooking', () => {
    const updateRequest: UpdateBookingRequest = {
      passengers: [{ ...mockPassenger, firstName: 'Jonathan' }],
      contactEmail: 'jonathan@example.com',
    };

    it('should update booking successfully', async () => {
      const updatedBooking = {
        ...mockBooking,
        passengers: [{ ...mockPassenger, firstName: 'Jonathan' }],
        updatedAt: new Date(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...updatedBooking,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-16T00:00:00Z',
          travelDate: '2024-03-15T00:00:00Z',
        }),
      } as Response);

      const result = await bookingService.updateBooking('booking-123', updateRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking/booking-123',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify(updateRequest),
        }
      );

      expect(result.passengers[0].firstName).toBe('Jonathan');
    });

    it('should handle update errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid passenger data' }),
      } as Response);

      await expect(bookingService.updateBooking('booking-123', updateRequest))
        .rejects.toThrow('Invalid passenger data');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await bookingService.cancelBooking('booking-123', 'Change of plans');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking/booking-123/cancel',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({ reason: 'Change of plans' }),
        }
      );
    });

    it('should cancel booking without reason', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await bookingService.cancelBooking('booking-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ reason: undefined }),
        })
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockBooking,
          status: 'confirmed',
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          travelDate: '2024-03-15T00:00:00Z',
        }),
      } as Response);

      const result = await bookingService.confirmPayment('booking-123', { paymentIntentId: 'pi_123' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking/booking-123/confirm-payment',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ paymentMethodDetails: { paymentIntentId: 'pi_123' } }),
        })
      );

      expect(result.status).toBe('confirmed');
    });
  });

  describe('getBookingReceipt', () => {
    it('should download booking receipt', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      } as Response);

      const result = await bookingService.getBookingReceipt('booking-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/booking/booking-123/receipt',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
            Accept: 'application/pdf',
          },
        }
      );

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle receipt download errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(bookingService.getBookingReceipt('booking-123'))
        .rejects.toThrow('Failed to download receipt: 404');
    });
  });

  describe('Validation Methods', () => {
    describe('validatePassengerInfo', () => {
      it('should validate valid passenger info', () => {
        const errors = bookingService.validatePassengerInfo(mockPassenger);
        expect(errors).toHaveLength(0);
      });

      it('should validate required fields', () => {
        const invalidPassenger: PassengerInfo = {
          firstName: '',
          lastName: '',
          dateOfBirth: new Date(),
        };

        const errors = bookingService.validatePassengerInfo(invalidPassenger);
        expect(errors).toContain('First name is required');
        expect(errors).toContain('Last name is required');
      });

      it('should validate name format', () => {
        const invalidPassenger: PassengerInfo = {
          firstName: 'John123',
          lastName: 'Doe@',
          dateOfBirth: new Date('1990-01-01'),
        };

        const errors = bookingService.validatePassengerInfo(invalidPassenger);
        expect(errors).toContain('First name can only contain letters, spaces, hyphens, and apostrophes');
        expect(errors).toContain('Last name can only contain letters, spaces, hyphens, and apostrophes');
      });

      it('should validate date of birth', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const invalidPassenger: PassengerInfo = {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: futureDate,
        };

        const errors = bookingService.validatePassengerInfo(invalidPassenger);
        expect(errors).toContain('Date of birth cannot be in the future');
      });

      it('should validate passport number format', () => {
        const invalidPassenger: PassengerInfo = {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          passportNumber: 'invalid-passport',
        };

        const errors = bookingService.validatePassengerInfo(invalidPassenger);
        expect(errors).toContain('Passport number can only contain uppercase letters and numbers');
      });

      it('should validate known traveler number format', () => {
        const invalidPassenger: PassengerInfo = {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          knownTravelerNumber: 'ABC123',
        };

        const errors = bookingService.validatePassengerInfo(invalidPassenger);
        expect(errors).toContain('Known Traveler Number can only contain numbers');
      });
    });

    describe('validatePaymentMethod', () => {
      it('should validate valid credit card payment', () => {
        const errors = bookingService.validatePaymentMethod(mockPaymentMethod);
        expect(errors).toHaveLength(0);
      });

      it('should validate required payment type', () => {
        const invalidPayment = { ...mockPaymentMethod, type: '' as any };
        const errors = bookingService.validatePaymentMethod(invalidPayment);
        expect(errors).toContain('Payment method type is required');
      });

      it('should validate credit card information', () => {
        const invalidPayment: PaymentMethod = {
          type: 'credit_card',
          totalAmount: 299.99,
          currency: 'USD',
          creditCard: {
            last4: '123', // Invalid - should be 4 digits
            brand: 'visa',
            expiryMonth: 13, // Invalid month
            expiryYear: 2020, // Past year
            holderName: '',
          },
        };

        const errors = bookingService.validatePaymentMethod(invalidPayment);
        expect(errors).toContain('Cardholder name is required');
        expect(errors).toContain('Invalid card number');
        expect(errors).toContain('Invalid expiry month');
        expect(errors).toContain('Invalid expiry year');
      });

      it('should validate points payment', () => {
        const pointsPayment: PaymentMethod = {
          type: 'points',
          totalAmount: 0,
          currency: 'USD',
          pointsUsed: {
            program: '',
            points: 0,
          },
        };

        const errors = bookingService.validatePaymentMethod(pointsPayment);
        expect(errors).toContain('Reward program is required');
        expect(errors).toContain('Points amount must be greater than 0');
      });

      it('should validate total amount and currency', () => {
        const invalidPayment: PaymentMethod = {
          type: 'credit_card',
          totalAmount: -100,
          currency: 'US', // Invalid currency code
          creditCard: mockPaymentMethod.creditCard,
        };

        const errors = bookingService.validatePaymentMethod(invalidPayment);
        expect(errors).toContain('Total amount must be greater than or equal to 0');
        expect(errors).toContain('Valid currency code is required');
      });
    });

    describe('validateBookingForm', () => {
      it('should validate complete booking form', () => {
        const validForm = {
          passengers: [mockPassenger],
          paymentMethod: mockPaymentMethod,
          contactEmail: 'john@example.com',
          contactPhone: '+1-555-123-4567',
        };

        const errors = bookingService.validateBookingForm(validForm);
        expect(errors).toHaveLength(0);
      });

      it('should validate required passengers', () => {
        const invalidForm = {
          passengers: [],
          paymentMethod: mockPaymentMethod,
          contactEmail: 'john@example.com',
        };

        const errors = bookingService.validateBookingForm(invalidForm);
        expect(errors).toContain('At least one passenger is required');
      });

      it('should validate contact information', () => {
        const invalidForm = {
          passengers: [mockPassenger],
          paymentMethod: mockPaymentMethod,
          contactEmail: 'invalid-email',
          contactPhone: 'invalid-phone',
        };

        const errors = bookingService.validateBookingForm(invalidForm);
        expect(errors).toContain('Invalid email address');
        expect(errors).toContain('Invalid phone number');
      });
    });
  });

  describe('Authentication Headers', () => {
    it('should include auth token when available', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await bookingService.getBooking('booking-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should work without auth token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await bookingService.getBooking('booking-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });
});