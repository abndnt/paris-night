import { BookingValidator, validateCompleteBooking } from '../utils/bookingValidation';
import { PassengerInfo, PaymentInfo, CostBreakdown } from '../models/Booking';
import { FlightResult } from '../models/FlightSearch';

// Mock data for testing
const validPassenger: PassengerInfo = {
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: new Date('1990-01-01'),
  passportNumber: 'A12345678',
  knownTravelerNumber: '123456789',
  seatPreference: 'aisle'
};

const validPaymentInfo: PaymentInfo = {
  method: 'credit_card',
  creditCard: {
    last4: '1234',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2025
  },
  totalAmount: 575,
  currency: 'USD'
};

const validCostBreakdown: CostBreakdown = {
  baseFare: 500,
  taxes: 50,
  fees: 25,
  totalCash: 575,
  currency: 'USD'
};

const validFlightResult: FlightResult = {
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

describe('BookingValidator', () => {
  describe('validatePassengers', () => {
    it('should validate valid passengers', () => {
      const result = BookingValidator.validatePassengers([validPassenger]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty passenger list', () => {
      const result = BookingValidator.validatePassengers([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers',
          code: 'PASSENGERS_REQUIRED'
        })
      );
    });

    it('should reject too many passengers', () => {
      const passengers = Array(10).fill(validPassenger);
      const result = BookingValidator.validatePassengers(passengers);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers',
          code: 'TOO_MANY_PASSENGERS'
        })
      );
    });

    it('should reject missing required fields', () => {
      const invalidPassenger = {
        ...validPassenger,
        firstName: '',
        lastName: ''
      };

      const result = BookingValidator.validatePassengers([invalidPassenger]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].firstName',
          code: 'FIRST_NAME_REQUIRED'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].lastName',
          code: 'LAST_NAME_REQUIRED'
        })
      );
    });

    it('should reject invalid name format', () => {
      const invalidPassenger = {
        ...validPassenger,
        firstName: 'John123',
        lastName: 'Doe@'
      };

      const result = BookingValidator.validatePassengers([invalidPassenger]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].firstName',
          code: 'INVALID_NAME_FORMAT'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].lastName',
          code: 'INVALID_NAME_FORMAT'
        })
      );
    });

    it('should reject future date of birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidPassenger = {
        ...validPassenger,
        dateOfBirth: futureDate
      };

      const result = BookingValidator.validatePassengers([invalidPassenger]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].dateOfBirth',
          code: 'INVALID_DOB'
        })
      );
    });

    it('should reject invalid passport format', () => {
      const invalidPassenger = {
        ...validPassenger,
        passportNumber: 'invalid-passport'
      };

      const result = BookingValidator.validatePassengers([invalidPassenger]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].passportNumber',
          code: 'INVALID_PASSPORT_FORMAT'
        })
      );
    });

    it('should reject invalid KTN format', () => {
      const invalidPassenger = {
        ...validPassenger,
        knownTravelerNumber: '123'
      };

      const result = BookingValidator.validatePassengers([invalidPassenger]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].knownTravelerNumber',
          code: 'INVALID_KTN_FORMAT'
        })
      );
    });

    it('should warn about infant passengers', () => {
      const infantPassenger = {
        ...validPassenger,
        dateOfBirth: new Date('2023-01-01') // 1 year old
      };

      const result = BookingValidator.validatePassengers([infantPassenger]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].specialRequests',
          code: 'INFANT_DETECTED'
        })
      );
    });

    it('should warn about too many special requests', () => {
      const passengerWithManyRequests = {
        ...validPassenger,
        specialRequests: ['req1', 'req2', 'req3', 'req4', 'req5', 'req6']
      };

      const result = BookingValidator.validatePassengers([passengerWithManyRequests]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'passengers[0].specialRequests',
          code: 'TOO_MANY_REQUESTS'
        })
      );
    });
  });

  describe('validatePayment', () => {
    it('should validate valid credit card payment', () => {
      const result = BookingValidator.validatePayment(validPaymentInfo);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid points payment', () => {
      const pointsPayment: PaymentInfo = {
        method: 'points',
        pointsUsed: {
          program: 'Chase Ultimate Rewards',
          points: 57500,
          cashComponent: 0
        },
        totalAmount: 0,
        currency: 'USD'
      };

      const result = BookingValidator.validatePayment(pointsPayment);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid mixed payment', () => {
      const mixedPayment: PaymentInfo = {
        method: 'mixed',
        creditCard: {
          last4: '1234',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025
        },
        pointsUsed: {
          program: 'Chase Ultimate Rewards',
          points: 25000,
          cashComponent: 250
        },
        totalAmount: 575,
        currency: 'USD'
      };

      const result = BookingValidator.validatePayment(mixedPayment);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing payment info', () => {
      const result = BookingValidator.validatePayment(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod',
          code: 'PAYMENT_REQUIRED'
        })
      );
    });

    it('should reject invalid payment method', () => {
      const invalidPayment = {
        ...validPaymentInfo,
        method: 'invalid' as any
      };

      const result = BookingValidator.validatePayment(invalidPayment);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.method',
          code: 'INVALID_PAYMENT_METHOD'
        })
      );
    });

    it('should reject missing credit card for credit card payment', () => {
      const invalidPayment = {
        method: 'credit_card' as const,
        totalAmount: 575,
        currency: 'USD'
      };

      const result = BookingValidator.validatePayment(invalidPayment as PaymentInfo);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.creditCard',
          code: 'CREDIT_CARD_REQUIRED'
        })
      );
    });

    it('should reject expired credit card', () => {
      const expiredPayment: PaymentInfo = {
        ...validPaymentInfo,
        creditCard: {
          last4: '1234',
          brand: 'visa',
          expiryMonth: 1,
          expiryYear: 2020
        }
      };

      const result = BookingValidator.validatePayment(expiredPayment);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.creditCard.expiry',
          code: 'CARD_EXPIRED'
        })
      );
    });

    it('should reject invalid card details', () => {
      const invalidPayment: PaymentInfo = {
        ...validPaymentInfo,
        creditCard: {
          last4: '123', // Too short
          brand: 'invalid' as any,
          expiryMonth: 13, // Invalid month
          expiryYear: 2025
        }
      };

      const result = BookingValidator.validatePayment(invalidPayment);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.creditCard.last4',
          code: 'INVALID_CARD_LAST4'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.creditCard.brand',
          code: 'INVALID_CARD_BRAND'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.creditCard.expiryMonth',
          code: 'INVALID_EXPIRY_MONTH'
        })
      );
    });

    it('should reject missing points info for points payment', () => {
      const invalidPayment: PaymentInfo = {
        method: 'points',
        totalAmount: 0,
        currency: 'USD'
      };

      const result = BookingValidator.validatePayment(invalidPayment);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.pointsUsed',
          code: 'POINTS_REQUIRED'
        })
      );
    });

    it('should reject invalid points details', () => {
      const invalidPayment: PaymentInfo = {
        method: 'points',
        pointsUsed: {
          program: '', // Empty program
          points: 0, // Zero points
          cashComponent: -10 // Negative cash
        },
        totalAmount: 0,
        currency: 'USD'
      };

      const result = BookingValidator.validatePayment(invalidPayment);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.pointsUsed.program',
          code: 'PROGRAM_REQUIRED'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.pointsUsed.points',
          code: 'INVALID_POINTS_AMOUNT'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.pointsUsed.cashComponent',
          code: 'INVALID_CASH_COMPONENT'
        })
      );
    });

    it('should reject negative total amount', () => {
      const invalidPayment = {
        ...validPaymentInfo,
        totalAmount: -100
      };

      const result = BookingValidator.validatePayment(invalidPayment);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.totalAmount',
          code: 'INVALID_TOTAL_AMOUNT'
        })
      );
    });

    it('should reject invalid currency', () => {
      const invalidPayment = {
        ...validPaymentInfo,
        currency: 'INVALID'
      };

      const result = BookingValidator.validatePayment(invalidPayment);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentMethod.currency',
          code: 'INVALID_CURRENCY'
        })
      );
    });
  });

  describe('validateCostBreakdown', () => {
    it('should validate valid cost breakdown', () => {
      const result = BookingValidator.validateCostBreakdown(validCostBreakdown);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing cost breakdown', () => {
      const result = BookingValidator.validateCostBreakdown(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'totalCost',
          code: 'COST_BREAKDOWN_REQUIRED'
        })
      );
    });

    it('should reject negative values', () => {
      const invalidCost: CostBreakdown = {
        baseFare: -100,
        taxes: -10,
        fees: -5,
        totalCash: -115,
        totalPoints: -1000,
        currency: 'USD'
      };

      const result = BookingValidator.validateCostBreakdown(invalidCost);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'totalCost.baseFare',
          code: 'INVALID_BASE_FARE'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'totalCost.taxes',
          code: 'INVALID_TAXES'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'totalCost.fees',
          code: 'INVALID_FEES'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'totalCost.totalCash',
          code: 'INVALID_TOTAL_CASH'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'totalCost.totalPoints',
          code: 'INVALID_TOTAL_POINTS'
        })
      );
    });

    it('should reject invalid currency', () => {
      const invalidCost = {
        ...validCostBreakdown,
        currency: 'INVALID'
      };

      const result = BookingValidator.validateCostBreakdown(invalidCost);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'totalCost.currency',
          code: 'INVALID_CURRENCY'
        })
      );
    });

    it('should warn about total mismatch', () => {
      const mismatchedCost: CostBreakdown = {
        baseFare: 500,
        taxes: 50,
        fees: 25,
        totalCash: 600, // Should be 575
        currency: 'USD'
      };

      const result = BookingValidator.validateCostBreakdown(mismatchedCost);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'totalCost.totalCash',
          code: 'TOTAL_MISMATCH'
        })
      );
    });
  });

  describe('validateFlightAvailability', () => {
    it('should validate valid flight', () => {
      const result = BookingValidator.validateFlightAvailability(validFlightResult);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing flight details', () => {
      const result = BookingValidator.validateFlightAvailability(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'flightDetails',
          code: 'FLIGHT_DETAILS_REQUIRED'
        })
      );
    });

    it('should reject departed flights', () => {
      const pastFlight: FlightResult = {
        ...validFlightResult,
        route: [
          {
            ...validFlightResult.route[0]!,
            departureTime: new Date('2020-01-01T10:00:00Z')
          }
        ]
      };

      const result = BookingValidator.validateFlightAvailability(pastFlight);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'flightDetails.route[0].departureTime',
          code: 'FLIGHT_DEPARTED'
        })
      );
    });

    it('should reject flights with no available seats', () => {
      const noSeatsFlight: FlightResult = {
        ...validFlightResult,
        availability: {
          ...validFlightResult.availability,
          availableSeats: 0
        }
      };

      const result = BookingValidator.validateFlightAvailability(noSeatsFlight);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'flightDetails.availability.availableSeats',
          code: 'NO_SEATS_AVAILABLE'
        })
      );
    });

    it('should warn about limited availability', () => {
      const limitedFlight: FlightResult = {
        ...validFlightResult,
        availability: {
          ...validFlightResult.availability,
          availableSeats: 2
        }
      };

      const result = BookingValidator.validateFlightAvailability(limitedFlight);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'flightDetails.availability.availableSeats',
          code: 'LIMITED_AVAILABILITY'
        })
      );
    });

    it('should warn about distant departure', () => {
      const distantFuture = new Date();
      distantFuture.setFullYear(distantFuture.getFullYear() + 2);

      const distantFlight: FlightResult = {
        ...validFlightResult,
        route: [
          {
            ...validFlightResult.route[0]!,
            departureTime: distantFuture
          }
        ]
      };

      const result = BookingValidator.validateFlightAvailability(distantFlight);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'flightDetails.route[0].departureTime',
          code: 'DISTANT_DEPARTURE'
        })
      );
    });
  });

  describe('validateCompleteBooking', () => {
    it('should validate complete valid booking', () => {
      const result = validateCompleteBooking(
        [validPassenger],
        validPaymentInfo,
        validCostBreakdown,
        validFlightResult
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should combine errors from all validators', () => {
      const invalidPassengers: PassengerInfo[] = [];
      const invalidPayment = null as any;
      const invalidCost = null as any;
      const invalidFlight = null as any;

      const result = validateCompleteBooking(
        invalidPassengers,
        invalidPayment,
        invalidCost,
        invalidFlight
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should have errors from all validators
      expect(result.errors.some(e => e.code === 'PASSENGERS_REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.code === 'PAYMENT_REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.code === 'COST_BREAKDOWN_REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.code === 'FLIGHT_DETAILS_REQUIRED')).toBe(true);
    });

    it('should combine warnings from all validators', () => {
      const infantPassenger: PassengerInfo = {
        ...validPassenger,
        dateOfBirth: new Date('2023-01-01')
      };

      const limitedFlight: FlightResult = {
        ...validFlightResult,
        availability: {
          ...validFlightResult.availability,
          availableSeats: 2
        }
      };

      const result = validateCompleteBooking(
        [infantPassenger],
        validPaymentInfo,
        validCostBreakdown,
        limitedFlight
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.code === 'INFANT_DETECTED')).toBe(true);
      expect(result.warnings.some(w => w.code === 'LIMITED_AVAILABILITY')).toBe(true);
    });
  });
});