import { Pool } from 'pg';
import { 
  BookingModel, 
  Booking, 
  CreateBookingData, 
  UpdateBookingData,
  BookingStatus
} from '../models/Booking';
import { FlightResult } from '../models/FlightSearch';

export interface BookingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BookingWorkflowState {
  currentStep: 'flight_selection' | 'passenger_info' | 'payment' | 'confirmation' | 'completed';
  completedSteps: string[];
  nextStep: string | undefined;
  canProceed: boolean;
  requiredFields: string[];
}

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: string;
  alternativeOptions?: FlightResult[];
}

export class BookingService {
  private bookingModel: BookingModel;

  constructor(database: Pool) {
    this.bookingModel = new BookingModel(database);
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: CreateBookingData): Promise<Booking> {
    try {
      // Validate booking data
      const validation = this.validateBookingData(bookingData);
      if (!validation.isValid) {
        throw new Error(`Booking validation failed: ${validation.errors.join(', ')}`);
      }

      // Sanitize booking data
      const sanitizedData = this.sanitizeBookingData(bookingData);

      // Generate confirmation code if not provided
      const bookingWithConfirmation = await this.bookingModel.createBooking(sanitizedData);
      
      // Generate and update confirmation code
      const confirmationCode = this.generateConfirmationCode();
      const updatedBooking = await this.bookingModel.updateBooking(bookingWithConfirmation.id, {
        confirmationCode
      });

      return updatedBooking || bookingWithConfirmation;
    } catch (error) {
      throw new Error(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a booking by ID
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    try {
      if (!this.isValidUUID(bookingId)) {
        throw new Error('Invalid booking ID format');
      }

      return await this.bookingModel.getBooking(bookingId);
    } catch (error) {
      throw new Error(`Failed to get booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a booking by confirmation code
   */
  async getBookingByConfirmationCode(confirmationCode: string): Promise<Booking | null> {
    try {
      if (!this.isValidConfirmationCode(confirmationCode)) {
        throw new Error('Invalid confirmation code format');
      }

      return await this.bookingModel.getBookingByConfirmationCode(confirmationCode.toUpperCase());
    } catch (error) {
      throw new Error(`Failed to get booking by confirmation code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a booking
   */
  async updateBooking(bookingId: string, updateData: UpdateBookingData): Promise<Booking | null> {
    try {
      if (!this.isValidUUID(bookingId)) {
        throw new Error('Invalid booking ID format');
      }

      // Get current booking to validate state transitions
      const currentBooking = await this.bookingModel.getBooking(bookingId);
      if (!currentBooking) {
        throw new Error('Booking not found');
      }

      // Validate status transition if status is being updated
      if (updateData.status && !this.isValidStatusTransition(currentBooking.status, updateData.status)) {
        throw new Error(`Invalid status transition from ${currentBooking.status} to ${updateData.status}`);
      }

      // Sanitize update data
      const sanitizedData = this.sanitizeUpdateData(updateData);

      return await this.bookingModel.updateBooking(bookingId, sanitizedData);
    } catch (error) {
      throw new Error(`Failed to update booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user bookings
   */
  async getUserBookings(userId: string, limit: number = 20, offset: number = 0): Promise<Booking[]> {
    try {
      if (!this.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      if (offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      return await this.bookingModel.getUserBookings(userId, limit, offset);
    } catch (error) {
      throw new Error(`Failed to get user bookings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get bookings by status
   */
  async getBookingsByStatus(status: BookingStatus, limit: number = 50): Promise<Booking[]> {
    try {
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      return await this.bookingModel.getBookingsByStatus(status, limit);
    } catch (error) {
      throw new Error(`Failed to get bookings by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, _reason?: string): Promise<Booking | null> {
    try {
      const booking = await this.bookingModel.getBooking(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check if booking can be cancelled
      if (!this.canCancelBooking(booking)) {
        throw new Error(`Booking cannot be cancelled in ${booking.status} status`);
      }

      return await this.bookingModel.updateBooking(bookingId, {
        status: 'cancelled'
      });
    } catch (error) {
      throw new Error(`Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get booking workflow state
   */
  getBookingWorkflowState(booking: Booking): BookingWorkflowState {
    const completedSteps: string[] = [];
    let currentStep: BookingWorkflowState['currentStep'] = 'flight_selection';
    let nextStep: string | undefined;
    let canProceed = false;
    const requiredFields: string[] = [];

    // Flight selection step
    if (booking.flightDetails) {
      completedSteps.push('flight_selection');
      currentStep = 'passenger_info';
    } else {
      requiredFields.push('flightDetails');
    }

    // Passenger info step
    if (booking.passengers && booking.passengers.length > 0) {
      const hasValidPassengers = booking.passengers.every(p => 
        p.firstName && p.lastName && p.dateOfBirth
      );
      if (hasValidPassengers) {
        completedSteps.push('passenger_info');
        currentStep = 'payment';
      } else {
        requiredFields.push('passengers');
      }
    } else {
      requiredFields.push('passengers');
    }

    // Payment step
    if (booking.paymentMethod && booking.status !== 'pending') {
      completedSteps.push('payment');
      currentStep = 'confirmation';
    } else if (currentStep === 'payment') {
      requiredFields.push('paymentMethod');
    }

    // Confirmation step
    if (booking.confirmationCode && (booking.status === 'confirmed' || booking.status === 'ticketed')) {
      completedSteps.push('confirmation');
      currentStep = 'completed';
    } else if (currentStep === 'confirmation') {
      requiredFields.push('confirmationCode');
    }

    // Determine next step and if can proceed
    switch (currentStep) {
      case 'flight_selection':
        nextStep = 'passenger_info';
        canProceed = !!booking.flightDetails;
        break;
      case 'passenger_info':
        nextStep = 'payment';
        canProceed = booking.passengers && booking.passengers.length > 0;
        break;
      case 'payment':
        nextStep = 'confirmation';
        canProceed = !!booking.paymentMethod;
        break;
      case 'confirmation':
        nextStep = 'completed';
        canProceed = !!booking.confirmationCode;
        break;
      case 'completed':
        canProceed = true;
        break;
    }

    return {
      currentStep,
      completedSteps,
      nextStep,
      canProceed,
      requiredFields
    };
  }

  /**
   * Check flight availability
   */
  async checkAvailability(_flightDetails: FlightResult): Promise<AvailabilityCheckResult> {
    try {
      // This is a mock implementation - in a real system, this would call airline APIs
      // to verify current availability
      
      // Simulate availability check
      const isAvailable = Math.random() > 0.1; // 90% availability rate for testing
      
      if (!isAvailable) {
        return {
          available: false,
          reason: 'Flight is no longer available',
          alternativeOptions: [] // Would contain similar flights
        };
      }

      // Check if price has changed (mock)
      const priceChanged = Math.random() > 0.8; // 20% chance of price change
      if (priceChanged) {
        return {
          available: true,
          reason: 'Price has changed since last search'
        };
      }

      return {
        available: true
      };
    } catch (error) {
      return {
        available: false,
        reason: `Availability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate booking data
   */
  private validateBookingData(bookingData: CreateBookingData): BookingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate user ID
    if (!this.isValidUUID(bookingData.userId)) {
      errors.push('Invalid user ID format');
    }

    // Validate flight details
    if (!bookingData.flightDetails || !bookingData.flightDetails.id) {
      errors.push('Flight details are required');
    }

    // Validate passengers
    if (!bookingData.passengers || bookingData.passengers.length === 0) {
      errors.push('At least one passenger is required');
    } else if (bookingData.passengers.length > 9) {
      errors.push('Maximum 9 passengers allowed');
    }

    // Validate travel date
    const travelDate = new Date(bookingData.travelDate);
    const now = new Date();
    if (travelDate <= now) {
      errors.push('Travel date must be in the future');
    }

    // Validate cost breakdown
    if (!bookingData.totalCost || bookingData.totalCost.totalCash < 0) {
      errors.push('Valid cost breakdown is required');
    }

    // Check for potential issues
    if (bookingData.passengers) {
      const hasMinors = bookingData.passengers.some(p => {
        const age = this.calculateAge(p.dateOfBirth);
        return age < 18;
      });

      if (hasMinors) {
        warnings.push('Booking includes minor passengers - additional documentation may be required');
      }

      const hasInternationalTravel = bookingData.flightDetails.route?.some(segment => 
        segment.origin.length === 3 && segment.destination.length === 3 &&
        segment.origin !== segment.destination
      );

      if (hasInternationalTravel) {
        const missingPassports = bookingData.passengers.filter(p => !p.passportNumber);
        if (missingPassports.length > 0) {
          warnings.push('International travel detected - passport numbers recommended for all passengers');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate status transitions
   */
  private isValidStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): boolean {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['ticketed', 'cancelled'],
      'ticketed': ['completed', 'cancelled'],
      'cancelled': [], // Cannot transition from cancelled
      'completed': [] // Cannot transition from completed
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Check if booking can be cancelled
   */
  private canCancelBooking(booking: Booking): boolean {
    // Cannot cancel already cancelled or completed bookings
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return false;
    }

    // Check if travel date has passed
    const now = new Date();
    if (booking.travelDate <= now) {
      return false;
    }

    return true;
  }

  /**
   * Generate confirmation code
   */
  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Sanitize booking data
   */
  private sanitizeBookingData(bookingData: CreateBookingData): CreateBookingData {
    return {
      ...bookingData,
      passengers: bookingData.passengers.map(passenger => {
        const sanitized: any = {
          ...passenger,
          firstName: passenger.firstName.trim(),
          lastName: passenger.lastName.trim()
        };
        
        if (passenger.passportNumber) {
          sanitized.passportNumber = passenger.passportNumber.toUpperCase().trim();
        }
        
        if (passenger.knownTravelerNumber) {
          sanitized.knownTravelerNumber = passenger.knownTravelerNumber.trim();
        }
        
        if (passenger.specialRequests) {
          const filtered = passenger.specialRequests.map(req => req.trim()).filter(req => req.length > 0);
          if (filtered.length > 0) {
            sanitized.specialRequests = filtered;
          }
        }
        
        return sanitized;
      })
    };
  }

  /**
   * Sanitize update data
   */
  private sanitizeUpdateData(updateData: UpdateBookingData): UpdateBookingData {
    const sanitized: UpdateBookingData = { ...updateData };

    if (sanitized.confirmationCode) {
      sanitized.confirmationCode = sanitized.confirmationCode.toUpperCase().trim();
    }

    if (sanitized.passengers) {
      sanitized.passengers = sanitized.passengers.map(passenger => {
        const sanitizedPassenger: any = {
          ...passenger,
          firstName: passenger.firstName.trim(),
          lastName: passenger.lastName.trim()
        };
        
        if (passenger.passportNumber) {
          sanitizedPassenger.passportNumber = passenger.passportNumber.toUpperCase().trim();
        }
        
        if (passenger.knownTravelerNumber) {
          sanitizedPassenger.knownTravelerNumber = passenger.knownTravelerNumber.trim();
        }
        
        if (passenger.specialRequests) {
          const filtered = passenger.specialRequests.map(req => req.trim()).filter(req => req.length > 0);
          if (filtered.length > 0) {
            sanitizedPassenger.specialRequests = filtered;
          }
        }
        
        return sanitizedPassenger;
      });
    }

    return sanitized;
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate confirmation code format
   */
  private isValidConfirmationCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
  }
}