import { PassengerInfo, PaymentInfo, CostBreakdown } from '../models/Booking';
import { FlightResult } from '../models/FlightSearch';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class BookingValidator {
  /**
   * Validate passenger information
   */
  static validatePassengers(passengers: PassengerInfo[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!passengers || passengers.length === 0) {
      errors.push({
        field: 'passengers',
        message: 'At least one passenger is required',
        code: 'PASSENGERS_REQUIRED'
      });
      return { isValid: false, errors, warnings };
    }

    if (passengers.length > 9) {
      errors.push({
        field: 'passengers',
        message: 'Maximum 9 passengers allowed per booking',
        code: 'TOO_MANY_PASSENGERS'
      });
    }

    passengers.forEach((passenger, index) => {
      const fieldPrefix = `passengers[${index}]`;

      // Validate required fields
      if (!passenger.firstName || passenger.firstName.trim().length === 0) {
        errors.push({
          field: `${fieldPrefix}.firstName`,
          message: 'First name is required',
          code: 'FIRST_NAME_REQUIRED'
        });
      }

      if (!passenger.lastName || passenger.lastName.trim().length === 0) {
        errors.push({
          field: `${fieldPrefix}.lastName`,
          message: 'Last name is required',
          code: 'LAST_NAME_REQUIRED'
        });
      }

      if (!passenger.dateOfBirth) {
        errors.push({
          field: `${fieldPrefix}.dateOfBirth`,
          message: 'Date of birth is required',
          code: 'DOB_REQUIRED'
        });
      } else {
        // Validate date of birth
        const dob = new Date(passenger.dateOfBirth);
        const now = new Date();
        
        if (dob >= now) {
          errors.push({
            field: `${fieldPrefix}.dateOfBirth`,
            message: 'Date of birth cannot be in the future',
            code: 'INVALID_DOB'
          });
        }

        const age = this.calculateAge(dob);
        if (age > 120) {
          warnings.push({
            field: `${fieldPrefix}.dateOfBirth`,
            message: 'Passenger age seems unusually high',
            code: 'UNUSUAL_AGE'
          });
        }

        if (age < 2 && !passenger.specialRequests?.includes('infant')) {
          warnings.push({
            field: `${fieldPrefix}.specialRequests`,
            message: 'Infant passenger detected - consider adding infant special request',
            code: 'INFANT_DETECTED'
          });
        }
      }

      // Validate name format
      if (passenger.firstName && !/^[a-zA-Z\s\-']+$/.test(passenger.firstName)) {
        errors.push({
          field: `${fieldPrefix}.firstName`,
          message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
          code: 'INVALID_NAME_FORMAT'
        });
      }

      if (passenger.lastName && !/^[a-zA-Z\s\-']+$/.test(passenger.lastName)) {
        errors.push({
          field: `${fieldPrefix}.lastName`,
          message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
          code: 'INVALID_NAME_FORMAT'
        });
      }

      // Validate passport number format if provided
      if (passenger.passportNumber && !/^[A-Z0-9]{6,20}$/.test(passenger.passportNumber)) {
        errors.push({
          field: `${fieldPrefix}.passportNumber`,
          message: 'Passport number must be 6-20 characters and contain only uppercase letters and numbers',
          code: 'INVALID_PASSPORT_FORMAT'
        });
      }

      // Validate Known Traveler Number if provided
      if (passenger.knownTravelerNumber && !/^[0-9]{8,15}$/.test(passenger.knownTravelerNumber)) {
        errors.push({
          field: `${fieldPrefix}.knownTravelerNumber`,
          message: 'Known Traveler Number must be 8-15 digits',
          code: 'INVALID_KTN_FORMAT'
        });
      }

      // Validate special requests
      if (passenger.specialRequests && passenger.specialRequests.length > 5) {
        warnings.push({
          field: `${fieldPrefix}.specialRequests`,
          message: 'Too many special requests may affect booking processing',
          code: 'TOO_MANY_REQUESTS'
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate payment information
   */
  static validatePayment(paymentInfo: PaymentInfo): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!paymentInfo) {
      errors.push({
        field: 'paymentMethod',
        message: 'Payment information is required',
        code: 'PAYMENT_REQUIRED'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate payment method
    if (!['credit_card', 'points', 'mixed'].includes(paymentInfo.method)) {
      errors.push({
        field: 'paymentMethod.method',
        message: 'Invalid payment method',
        code: 'INVALID_PAYMENT_METHOD'
      });
    }

    // Validate credit card information
    if (paymentInfo.method === 'credit_card' || paymentInfo.method === 'mixed') {
      if (!paymentInfo.creditCard) {
        errors.push({
          field: 'paymentMethod.creditCard',
          message: 'Credit card information is required',
          code: 'CREDIT_CARD_REQUIRED'
        });
      } else {
        const cc = paymentInfo.creditCard;

        if (!cc.last4 || !/^[0-9]{4}$/.test(cc.last4)) {
          errors.push({
            field: 'paymentMethod.creditCard.last4',
            message: 'Last 4 digits must be exactly 4 numbers',
            code: 'INVALID_CARD_LAST4'
          });
        }

        if (!['visa', 'mastercard', 'amex', 'discover'].includes(cc.brand)) {
          errors.push({
            field: 'paymentMethod.creditCard.brand',
            message: 'Invalid credit card brand',
            code: 'INVALID_CARD_BRAND'
          });
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        if (cc.expiryYear < currentYear || (cc.expiryYear === currentYear && cc.expiryMonth < currentMonth)) {
          errors.push({
            field: 'paymentMethod.creditCard.expiry',
            message: 'Credit card has expired',
            code: 'CARD_EXPIRED'
          });
        }

        if (cc.expiryMonth < 1 || cc.expiryMonth > 12) {
          errors.push({
            field: 'paymentMethod.creditCard.expiryMonth',
            message: 'Invalid expiry month',
            code: 'INVALID_EXPIRY_MONTH'
          });
        }
      }
    }

    // Validate points information
    if (paymentInfo.method === 'points' || paymentInfo.method === 'mixed') {
      if (!paymentInfo.pointsUsed) {
        errors.push({
          field: 'paymentMethod.pointsUsed',
          message: 'Points information is required',
          code: 'POINTS_REQUIRED'
        });
      } else {
        const points = paymentInfo.pointsUsed;

        if (!points.program || points.program.trim().length === 0) {
          errors.push({
            field: 'paymentMethod.pointsUsed.program',
            message: 'Reward program is required',
            code: 'PROGRAM_REQUIRED'
          });
        }

        if (!points.points || points.points <= 0) {
          errors.push({
            field: 'paymentMethod.pointsUsed.points',
            message: 'Points amount must be greater than 0',
            code: 'INVALID_POINTS_AMOUNT'
          });
        }

        if (points.cashComponent !== undefined && points.cashComponent < 0) {
          errors.push({
            field: 'paymentMethod.pointsUsed.cashComponent',
            message: 'Cash component cannot be negative',
            code: 'INVALID_CASH_COMPONENT'
          });
        }
      }
    }

    // Validate total amount
    if (paymentInfo.totalAmount < 0) {
      errors.push({
        field: 'paymentMethod.totalAmount',
        message: 'Total amount cannot be negative',
        code: 'INVALID_TOTAL_AMOUNT'
      });
    }

    // Validate currency
    if (!paymentInfo.currency || !/^[A-Z]{3}$/.test(paymentInfo.currency)) {
      errors.push({
        field: 'paymentMethod.currency',
        message: 'Currency must be a valid 3-letter code',
        code: 'INVALID_CURRENCY'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate cost breakdown
   */
  static validateCostBreakdown(costBreakdown: CostBreakdown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!costBreakdown) {
      errors.push({
        field: 'totalCost',
        message: 'Cost breakdown is required',
        code: 'COST_BREAKDOWN_REQUIRED'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate individual components
    if (costBreakdown.baseFare < 0) {
      errors.push({
        field: 'totalCost.baseFare',
        message: 'Base fare cannot be negative',
        code: 'INVALID_BASE_FARE'
      });
    }

    if (costBreakdown.taxes < 0) {
      errors.push({
        field: 'totalCost.taxes',
        message: 'Taxes cannot be negative',
        code: 'INVALID_TAXES'
      });
    }

    if (costBreakdown.fees < 0) {
      errors.push({
        field: 'totalCost.fees',
        message: 'Fees cannot be negative',
        code: 'INVALID_FEES'
      });
    }

    if (costBreakdown.totalCash < 0) {
      errors.push({
        field: 'totalCost.totalCash',
        message: 'Total cash cannot be negative',
        code: 'INVALID_TOTAL_CASH'
      });
    }

    if (costBreakdown.totalPoints !== undefined && costBreakdown.totalPoints < 0) {
      errors.push({
        field: 'totalCost.totalPoints',
        message: 'Total points cannot be negative',
        code: 'INVALID_TOTAL_POINTS'
      });
    }

    // Validate currency
    if (!costBreakdown.currency || !/^[A-Z]{3}$/.test(costBreakdown.currency)) {
      errors.push({
        field: 'totalCost.currency',
        message: 'Currency must be a valid 3-letter code',
        code: 'INVALID_CURRENCY'
      });
    }

    // Validate total calculation
    const calculatedTotal = costBreakdown.baseFare + costBreakdown.taxes + costBreakdown.fees;
    const tolerance = 0.01; // Allow for small rounding differences

    if (Math.abs(calculatedTotal - costBreakdown.totalCash) > tolerance) {
      warnings.push({
        field: 'totalCost.totalCash',
        message: 'Total cash does not match sum of components',
        code: 'TOTAL_MISMATCH'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate flight availability
   */
  static validateFlightAvailability(flightDetails: FlightResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!flightDetails) {
      errors.push({
        field: 'flightDetails',
        message: 'Flight details are required',
        code: 'FLIGHT_DETAILS_REQUIRED'
      });
      return { isValid: false, errors, warnings };
    }

    // Check if flight is in the past
    if (flightDetails.route && flightDetails.route.length > 0) {
      const departureTime = new Date(flightDetails.route[0]!.departureTime);
      const now = new Date();

      if (departureTime <= now) {
        errors.push({
          field: 'flightDetails.route[0].departureTime',
          message: 'Flight departure time has passed',
          code: 'FLIGHT_DEPARTED'
        });
      }

      // Check if departure is too far in the future (more than 1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (departureTime > oneYearFromNow) {
        warnings.push({
          field: 'flightDetails.route[0].departureTime',
          message: 'Flight departure is more than 1 year in the future',
          code: 'DISTANT_DEPARTURE'
        });
      }
    }

    // Check availability
    if (flightDetails.availability && flightDetails.availability.availableSeats <= 0) {
      errors.push({
        field: 'flightDetails.availability.availableSeats',
        message: 'No seats available on this flight',
        code: 'NO_SEATS_AVAILABLE'
      });
    }

    if (flightDetails.availability && flightDetails.availability.availableSeats < 4) {
      warnings.push({
        field: 'flightDetails.availability.availableSeats',
        message: 'Limited seats available',
        code: 'LIMITED_AVAILABILITY'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate age from date of birth
   */
  private static calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}

/**
 * Comprehensive booking validation
 */
export function validateCompleteBooking(
  passengers: PassengerInfo[],
  paymentInfo: PaymentInfo,
  costBreakdown: CostBreakdown,
  flightDetails: FlightResult
): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // Validate each component
  const passengerValidation = BookingValidator.validatePassengers(passengers);
  const paymentValidation = BookingValidator.validatePayment(paymentInfo);
  const costValidation = BookingValidator.validateCostBreakdown(costBreakdown);
  const flightValidation = BookingValidator.validateFlightAvailability(flightDetails);

  // Combine all errors and warnings
  allErrors.push(...passengerValidation.errors);
  allErrors.push(...paymentValidation.errors);
  allErrors.push(...costValidation.errors);
  allErrors.push(...flightValidation.errors);

  allWarnings.push(...passengerValidation.warnings);
  allWarnings.push(...paymentValidation.warnings);
  allWarnings.push(...costValidation.warnings);
  allWarnings.push(...flightValidation.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}