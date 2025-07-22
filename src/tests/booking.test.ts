import { Pool } from 'pg';
import { BookingModel, Booking, CreateBookingData, UpdateBookingData, BookingStatus } from '../models/Booking';
import { BookingService } from '../services/BookingService';
import { BookingConfirmationService } from '../services/BookingConfirmationService';
import { FlightResult } from '../models/FlightSearch';

// Mock database pool
const mockDb = {
  query: jest.fn()
} as unknown as Pool;

// Mock flight result for testing
const mockFlightResult: FlightResult = {
  id: 'flight-123',
  airline: 'AA',
  flightNumber: 'AA123',
  route: [
    {
      airline: 'AA',
      flightNumber: 'AA123',
      origin: 'JFK',
      destination: 'LAX',
      departureTime: new Date('2025-12-01T10:00:00Z'),
      arrivalTime: new Date('2025-12-01T13:00:00Z'),
      duration: 360
    }
  ],
  pricing: {
    cashPrice: 500,
    currency: 'USD',
    pointsOptions: [],
    taxes: 50,
    fees: 25,
    totalPrice: 575
  },
  availability: {
    availableSeats: 10,
    bookingClass: 'Y',
    fareBasis: 'Y26'
  },
  duration: 360,
  layovers: 0
};

// Mock booking data
const mockCreateBookingData: CreateBookingData = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  searchId: '123e4567-e89b-12d3-a456-426614174001',
  flightDetails: mockFlightResult,
  passengers: [
    {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      passportNumber: 'A12345678'
    }
  ],
  totalCost: {
    baseFare: 500,
    taxes: 50,
    fees: 25,
    totalCash: 575,
    currency: 'USD'
  },
  travelDate: new Date('2025-12-01')
};

describe('BookingModel', () => {
  let bookingModel: BookingModel;

  beforeEach(() => {
    bookingModel = new BookingModel(mockDb);
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      const mockRow = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        user_id: mockCreateBookingData.userId,
        search_id: mockCreateBookingData.searchId,
        confirmation_code: null,
        flight_details: mockCreateBookingData.flightDetails,
        passengers: mockCreateBookingData.passengers,
        payment_method: null,
        total_cost: mockCreateBookingData.totalCost,
        status: 'pending',
        travel_date: mockCreateBookingData.travelDate,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

      const result = await bookingModel.createBooking(mockCreateBookingData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockCreateBookingData.userId);
      expect(result.status).toBe('pending');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bookings'),
        expect.any(Array)
      );
    });

    it('should throw error for invalid booking data', async () => {
      const invalidData = {
        ...mockCreateBookingData,
        userId: 'invalid-uuid'
      };

      await expect(bookingModel.createBooking(invalidData)).rejects.toThrow('Validation error');
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = {
        ...mockCreateBookingData,
        passengers: []
      };

      await expect(bookingModel.createBooking(invalidData)).rejects.toThrow('Validation error');
    });
  });

  describe('getBooking', () => {
    it('should retrieve a booking by ID', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const mockRow = {
        id: bookingId,
        user_id: mockCreateBookingData.userId,
        search_id: mockCreateBookingData.searchId,
        confirmation_code: 'ABC123',
        flight_details: mockCreateBookingData.flightDetails,
        passengers: mockCreateBookingData.passengers,
        payment_method: null,
        total_cost: mockCreateBookingData.totalCost,
        status: 'confirmed',
        travel_date: mockCreateBookingData.travelDate,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

      const result = await bookingModel.getBooking(bookingId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(bookingId);
      expect(result!.confirmationCode).toBe('ABC123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [bookingId]
      );
    });

    it('should return null for non-existent booking', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await bookingModel.getBooking('123e4567-e89b-12d3-a456-426614174999');

      expect(result).toBeNull();
    });
  });

  describe('updateBooking', () => {
    it('should update booking status', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const updateData: UpdateBookingData = {
        status: 'confirmed',
        confirmationCode: 'ABC123'
      };

      const mockRow = {
        id: bookingId,
        user_id: mockCreateBookingData.userId,
        search_id: mockCreateBookingData.searchId,
        confirmation_code: 'ABC123',
        flight_details: mockCreateBookingData.flightDetails,
        passengers: mockCreateBookingData.passengers,
        payment_method: null,
        total_cost: mockCreateBookingData.totalCost,
        status: 'confirmed',
        travel_date: mockCreateBookingData.travelDate,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

      const result = await bookingModel.updateBooking(bookingId, updateData);

      expect(result).toBeDefined();
      expect(result!.status).toBe('confirmed');
      expect(result!.confirmationCode).toBe('ABC123');
    });

    it('should throw error for empty update data', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(bookingModel.updateBooking(bookingId, {})).rejects.toThrow('No valid fields to update');
    });
  });
});

describe('BookingService', () => {
  let bookingService: BookingService;

  beforeEach(() => {
    bookingService = new BookingService(mockDb);
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should create booking with validation', async () => {
      const mockRow = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        user_id: mockCreateBookingData.userId,
        search_id: mockCreateBookingData.searchId,
        confirmation_code: null,
        flight_details: mockCreateBookingData.flightDetails,
        passengers: mockCreateBookingData.passengers,
        payment_method: null,
        total_cost: mockCreateBookingData.totalCost,
        status: 'pending',
        travel_date: mockCreateBookingData.travelDate,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock the create call
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockRow] }) // Create booking
        .mockResolvedValueOnce({ rows: [{ ...mockRow, confirmation_code: 'ABC123' }] }); // Update with confirmation code

      const result = await bookingService.createBooking(mockCreateBookingData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockCreateBookingData.userId);
      expect(mockDb.query).toHaveBeenCalledTimes(2); // Create + update confirmation code
    });

    it('should throw error for invalid user ID', async () => {
      const invalidData = {
        ...mockCreateBookingData,
        userId: 'invalid-uuid'
      };

      await expect(bookingService.createBooking(invalidData)).rejects.toThrow('Booking validation failed');
    });

    it('should throw error for past travel date', async () => {
      const invalidData = {
        ...mockCreateBookingData,
        travelDate: new Date('2020-01-01')
      };

      await expect(bookingService.createBooking(invalidData)).rejects.toThrow('Travel date must be in the future');
    });
  });

  describe('getBookingWorkflowState', () => {
    it('should return correct workflow state for pending booking', () => {
      const booking: Booking = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'pending',
        travelDate: mockCreateBookingData.travelDate,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const workflowState = bookingService.getBookingWorkflowState(booking);

      expect(workflowState.currentStep).toBe('payment');
      expect(workflowState.completedSteps).toContain('flight_selection');
      expect(workflowState.completedSteps).toContain('passenger_info');
      expect(workflowState.nextStep).toBe('confirmation');
      expect(workflowState.requiredFields).toContain('paymentMethod');
    });

    it('should return correct workflow state for confirmed booking', () => {
      const booking: Booking = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        paymentMethod: {
          method: 'credit_card',
          totalAmount: 575,
          currency: 'USD'
        },
        totalCost: mockCreateBookingData.totalCost,
        status: 'confirmed',
        confirmationCode: 'ABC123',
        travelDate: mockCreateBookingData.travelDate,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const workflowState = bookingService.getBookingWorkflowState(booking);

      expect(workflowState.currentStep).toBe('completed');
      expect(workflowState.completedSteps).toContain('confirmation');
      expect(workflowState.canProceed).toBe(true);
    });
  });

  describe('checkAvailability', () => {
    it('should return availability result', async () => {
      const result = await bookingService.checkAvailability(mockFlightResult);

      expect(result).toBeDefined();
      expect(typeof result.available).toBe('boolean');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking successfully', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const mockBooking: Booking = {
        id: bookingId,
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'confirmed',
        confirmationCode: 'ABC123',
        travelDate: new Date('2025-12-01'), // Future date
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCancelledBooking = { ...mockBooking, status: 'cancelled' as BookingStatus };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockBooking] }) // Get booking
        .mockResolvedValueOnce({ rows: [mockCancelledBooking] }); // Update booking

      const result = await bookingService.cancelBooking(bookingId);

      expect(result).toBeDefined();
      expect(result!.status).toBe('cancelled');
    });

    it('should throw error for non-existent booking', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(bookingService.cancelBooking('123e4567-e89b-12d3-a456-426614174999'))
        .rejects.toThrow('Booking not found');
    });

    it('should throw error for already cancelled booking', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const mockBooking: Booking = {
        id: bookingId,
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'cancelled',
        confirmationCode: 'ABC123',
        travelDate: new Date('2024-12-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockBooking] });

      await expect(bookingService.cancelBooking(bookingId))
        .rejects.toThrow('Booking cannot be cancelled in cancelled status');
    });
  });

  describe('status transitions', () => {
    it('should allow valid status transitions', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const mockBooking: Booking = {
        id: bookingId,
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'pending',
        travelDate: new Date('2024-12-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedBooking = { ...mockBooking, status: 'confirmed' as BookingStatus };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockBooking] }) // Get current booking
        .mockResolvedValueOnce({ rows: [mockUpdatedBooking] }); // Update booking

      const result = await bookingService.updateBooking(bookingId, { status: 'confirmed' });

      expect(result).toBeDefined();
      expect(result!.status).toBe('confirmed');
    });

    it('should reject invalid status transitions', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const mockBooking: Booking = {
        id: bookingId,
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'cancelled',
        travelDate: new Date('2025-12-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockBooking] });

      await expect(bookingService.updateBooking(bookingId, { status: 'confirmed' }))
        .rejects.toThrow('Invalid status transition from cancelled to confirmed');
    });
  });
});

describe('BookingConfirmationService', () => {
  let bookingService: BookingService;
  let confirmationService: BookingConfirmationService;

  beforeEach(() => {
    bookingService = new BookingService(mockDb);
    confirmationService = new BookingConfirmationService(bookingService);
    jest.clearAllMocks();
  });

  describe('confirmBooking', () => {
    it('should confirm a pending booking', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const mockPendingBooking: Booking = {
        id: bookingId,
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'pending',
        travelDate: new Date('2025-12-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockConfirmedBooking = { 
        ...mockPendingBooking, 
        status: 'confirmed' as BookingStatus,
        confirmationCode: 'ABC123'
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockPendingBooking] }) // Get booking
        .mockResolvedValueOnce({ rows: [mockConfirmedBooking] }); // Update booking

      const result = await confirmationService.confirmBooking(bookingId);

      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
      expect(result.confirmationCode).toBe('ABC123');
      expect(result.itinerary).toBeDefined();
      expect(result.nextSteps).toContain('Your booking is confirmed!');
    });

    it('should throw error for non-pending booking', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const mockConfirmedBooking: Booking = {
        id: bookingId,
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'confirmed',
        confirmationCode: 'ABC123',
        travelDate: new Date('2025-12-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockConfirmedBooking] });

      await expect(confirmationService.confirmBooking(bookingId))
        .rejects.toThrow('Cannot confirm booking with status: confirmed');
    });
  });

  describe('trackBooking', () => {
    it('should return tracking information', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const mockBooking: Booking = {
        id: bookingId,
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'confirmed',
        confirmationCode: 'ABC123',
        travelDate: new Date('2025-12-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockBooking] });

      const result = await confirmationService.trackBooking(bookingId);

      expect(result).toBeDefined();
      expect(result.bookingId).toBe(bookingId);
      expect(result.currentStatus).toBe('confirmed');
      expect(result.statusHistory).toBeDefined();
      expect(result.timeline).toBeDefined();
      expect(result.alerts).toBeDefined();
      expect(result.nextActions).toBeDefined();
    });

    it('should generate appropriate alerts for upcoming travel', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174002';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockBooking: Booking = {
        id: bookingId,
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'ticketed',
        confirmationCode: 'ABC123',
        travelDate: tomorrow,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockBooking] });

      const result = await confirmationService.trackBooking(bookingId);

      expect(result.alerts.some(alert => alert.message.includes('tomorrow'))).toBe(true);
      expect(result.nextActions.some(action => action.type === 'check_in')).toBe(true);
    });
  });

  describe('trackByConfirmationCode', () => {
    it('should track booking by confirmation code', async () => {
      const confirmationCode = 'ABC123';
      const mockBooking: Booking = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        userId: mockCreateBookingData.userId,
        flightDetails: mockFlightResult,
        passengers: mockCreateBookingData.passengers,
        totalCost: mockCreateBookingData.totalCost,
        status: 'confirmed',
        confirmationCode,
        travelDate: new Date('2025-12-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockBooking] });

      const result = await confirmationService.trackByConfirmationCode(confirmationCode);

      expect(result).toBeDefined();
      expect(result!.bookingId).toBe(mockBooking.id);
      expect(result!.currentStatus).toBe('confirmed');
    });

    it('should return null for invalid confirmation code', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await confirmationService.trackByConfirmationCode('INVALID');

      expect(result).toBeNull();
    });
  });
});