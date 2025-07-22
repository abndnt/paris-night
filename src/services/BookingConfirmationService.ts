import { Booking, BookingStatus } from '../models/Booking';
import { BookingService } from './BookingService';

export interface BookingConfirmation {
  bookingId: string;
  confirmationCode: string;
  status: BookingStatus;
  confirmationDetails: {
    confirmedAt: Date;
    confirmationMethod: 'automatic' | 'manual' | 'api';
    externalReference: string | undefined;
    notes: string | undefined;
  };
  itinerary: BookingItinerary;
  nextSteps: string[];
}

export interface BookingItinerary {
  passengers: {
    name: string;
    seatAssignment: string | undefined;
    ticketNumber: string | undefined;
  }[];
  flights: {
    flightNumber: string;
    airline: string;
    departure: {
      airport: string;
      time: Date;
      terminal: string | undefined;
      gate: string | undefined;
    };
    arrival: {
      airport: string;
      time: Date;
      terminal: string | undefined;
      gate: string | undefined;
    };
    duration: number;
    aircraft: string | undefined;
  }[];
  totalDuration: number;
  layovers: {
    airport: string;
    duration: number;
  }[];
}

export interface BookingTrackingInfo {
  bookingId: string;
  currentStatus: BookingStatus;
  statusHistory: BookingStatusUpdate[];
  timeline: BookingTimelineEvent[];
  alerts: BookingAlert[];
  nextActions: BookingAction[];
}

export interface BookingStatusUpdate {
  status: BookingStatus;
  timestamp: Date;
  reason?: string;
  updatedBy?: string;
  notes?: string;
}

export interface BookingTimelineEvent {
  type: 'created' | 'confirmed' | 'ticketed' | 'checked_in' | 'departed' | 'arrived' | 'cancelled';
  timestamp: Date;
  description: string;
  details?: any;
}

export interface BookingAlert {
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  actionRequired: boolean;
  resolved: boolean;
}

export interface BookingAction {
  type: 'check_in' | 'seat_selection' | 'payment_required' | 'document_upload';
  description: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  url?: string;
}

export class BookingConfirmationService {
  private bookingService: BookingService;

  constructor(bookingService: BookingService) {
    this.bookingService = bookingService;
  }

  /**
   * Confirm a booking
   */
  async confirmBooking(
    bookingId: string, 
    confirmationMethod: 'automatic' | 'manual' | 'api' = 'automatic',
    externalReference?: string,
    notes?: string
  ): Promise<BookingConfirmation> {
    try {
      // Get the current booking
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Validate that booking can be confirmed
      if (booking.status !== 'pending') {
        throw new Error(`Cannot confirm booking with status: ${booking.status}`);
      }

      // Update booking status to confirmed
      const updatedBooking = await this.bookingService.updateBooking(bookingId, {
        status: 'confirmed'
      });

      if (!updatedBooking) {
        throw new Error('Failed to update booking status');
      }

      // Generate confirmation details
      const confirmationDetails = {
        confirmedAt: new Date(),
        confirmationMethod,
        externalReference,
        notes
      };

      // Build itinerary
      const itinerary = this.buildItinerary(updatedBooking);

      // Determine next steps
      const nextSteps = this.getNextSteps(updatedBooking);

      return {
        bookingId: updatedBooking.id,
        confirmationCode: updatedBooking.confirmationCode!,
        status: updatedBooking.status,
        confirmationDetails,
        itinerary,
        nextSteps
      };
    } catch (error) {
      throw new Error(`Failed to confirm booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get booking confirmation details
   */
  async getBookingConfirmation(bookingId: string): Promise<BookingConfirmation | null> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking || !booking.confirmationCode) {
        return null;
      }

      const itinerary = this.buildItinerary(booking);
      const nextSteps = this.getNextSteps(booking);

      return {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        status: booking.status,
        confirmationDetails: {
          confirmedAt: booking.updatedAt,
          confirmationMethod: 'automatic', // Default, would be stored in real implementation
          externalReference: undefined,
          notes: undefined
        },
        itinerary,
        nextSteps
      };
    } catch (error) {
      throw new Error(`Failed to get booking confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track booking status and progress
   */
  async trackBooking(bookingId: string): Promise<BookingTrackingInfo> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Build status history (in real implementation, this would come from database)
      const statusHistory = this.buildStatusHistory(booking);

      // Build timeline
      const timeline = this.buildTimeline(booking);

      // Generate alerts
      const alerts = this.generateAlerts(booking);

      // Determine next actions
      const nextActions = this.getNextActions(booking);

      return {
        bookingId: booking.id,
        currentStatus: booking.status,
        statusHistory,
        timeline,
        alerts,
        nextActions
      };
    } catch (error) {
      throw new Error(`Failed to track booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get booking by confirmation code
   */
  async trackByConfirmationCode(confirmationCode: string): Promise<BookingTrackingInfo | null> {
    try {
      const booking = await this.bookingService.getBookingByConfirmationCode(confirmationCode);
      if (!booking) {
        return null;
      }

      return await this.trackBooking(booking.id);
    } catch (error) {
      throw new Error(`Failed to track booking by confirmation code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update booking status with tracking
   */
  async updateBookingStatus(
    bookingId: string, 
    newStatus: BookingStatus, 
    _reason?: string,
    _updatedBy?: string,
    _notes?: string
  ): Promise<BookingTrackingInfo> {
    try {
      // Update the booking
      const updatedBooking = await this.bookingService.updateBooking(bookingId, {
        status: newStatus
      });

      if (!updatedBooking) {
        throw new Error('Failed to update booking');
      }

      // In a real implementation, we would store the status update details
      // For now, we'll return the tracking info
      return await this.trackBooking(bookingId);
    } catch (error) {
      throw new Error(`Failed to update booking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build itinerary from booking
   */
  private buildItinerary(booking: Booking): BookingItinerary {
    const flightDetails = booking.flightDetails;
    
    // Build passenger list
    const passengers = booking.passengers.map(passenger => ({
      name: `${passenger.firstName} ${passenger.lastName}`,
      seatAssignment: undefined, // Would be populated after seat selection
      ticketNumber: undefined // Would be populated after ticketing
    }));

    // Build flight list
    const flights = flightDetails.route.map(segment => ({
      flightNumber: segment.flightNumber,
      airline: segment.airline,
      departure: {
        airport: segment.origin,
        time: new Date(segment.departureTime),
        terminal: undefined, // Would be populated from airline data
        gate: undefined // Would be populated closer to departure
      },
      arrival: {
        airport: segment.destination,
        time: new Date(segment.arrivalTime),
        terminal: undefined,
        gate: undefined
      },
      duration: segment.duration,
      aircraft: segment.aircraft
    }));

    // Calculate layovers
    const layovers: { airport: string; duration: number }[] = [];
    for (let i = 0; i < flights.length - 1; i++) {
      const currentFlight = flights[i]!;
      const nextFlight = flights[i + 1]!;
      
      if (currentFlight.arrival.airport === nextFlight.departure.airport) {
        const layoverDuration = nextFlight.departure.time.getTime() - currentFlight.arrival.time.getTime();
        layovers.push({
          airport: currentFlight.arrival.airport,
          duration: Math.floor(layoverDuration / (1000 * 60)) // Convert to minutes
        });
      }
    }

    return {
      passengers,
      flights,
      totalDuration: flightDetails.duration,
      layovers
    };
  }

  /**
   * Get next steps for booking
   */
  private getNextSteps(booking: Booking): string[] {
    const steps: string[] = [];

    switch (booking.status) {
      case 'pending':
        steps.push('Complete payment to confirm your booking');
        break;
      case 'confirmed':
        steps.push('Your booking is confirmed! You will receive tickets shortly.');
        steps.push('Check-in will be available 24 hours before departure');
        break;
      case 'ticketed':
        steps.push('Your tickets have been issued');
        steps.push('Check-in online 24 hours before departure');
        steps.push('Arrive at the airport at least 2 hours before domestic flights, 3 hours before international flights');
        break;
      case 'completed':
        steps.push('Your trip is complete. Thank you for flying with us!');
        break;
      case 'cancelled':
        steps.push('Your booking has been cancelled');
        if (booking.paymentMethod) {
          steps.push('Refund processing may take 5-10 business days');
        }
        break;
    }

    // Add travel date specific steps
    const daysUntilTravel = Math.ceil((booking.travelDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilTravel <= 1 && booking.status === 'ticketed') {
      steps.push('Check-in is now available online or at the airport');
    }

    if (daysUntilTravel <= 7 && booking.status === 'ticketed') {
      steps.push('Consider selecting your seats if not already done');
    }

    return steps;
  }

  /**
   * Build status history
   */
  private buildStatusHistory(booking: Booking): BookingStatusUpdate[] {
    // In a real implementation, this would come from a status_updates table
    const history: BookingStatusUpdate[] = [
      {
        status: 'pending',
        timestamp: booking.createdAt,
        reason: 'Booking created'
      }
    ];

    if (booking.status !== 'pending') {
      history.push({
        status: booking.status,
        timestamp: booking.updatedAt,
        reason: `Booking ${booking.status}`
      });
    }

    return history;
  }

  /**
   * Build timeline
   */
  private buildTimeline(booking: Booking): BookingTimelineEvent[] {
    const timeline: BookingTimelineEvent[] = [
      {
        type: 'created',
        timestamp: booking.createdAt,
        description: 'Booking created'
      }
    ];

    if (booking.status === 'confirmed' || booking.status === 'ticketed' || booking.status === 'completed') {
      timeline.push({
        type: 'confirmed',
        timestamp: booking.updatedAt,
        description: 'Booking confirmed'
      });
    }

    if (booking.status === 'ticketed' || booking.status === 'completed') {
      timeline.push({
        type: 'ticketed',
        timestamp: booking.updatedAt,
        description: 'Tickets issued'
      });
    }

    if (booking.status === 'cancelled') {
      timeline.push({
        type: 'cancelled',
        timestamp: booking.updatedAt,
        description: 'Booking cancelled'
      });
    }

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Generate alerts for booking
   */
  private generateAlerts(booking: Booking): BookingAlert[] {
    const alerts: BookingAlert[] = [];
    const now = new Date();
    const daysUntilTravel = Math.ceil((booking.travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Travel date alerts
    if (daysUntilTravel <= 1 && booking.status === 'ticketed') {
      alerts.push({
        type: 'info',
        message: 'Your flight is tomorrow! Don\'t forget to check in.',
        timestamp: now,
        actionRequired: true,
        resolved: false
      });
    }

    if (daysUntilTravel <= 0 && booking.status !== 'completed' && booking.status !== 'cancelled') {
      alerts.push({
        type: 'warning',
        message: 'Your travel date has passed. Please contact support if you need assistance.',
        timestamp: now,
        actionRequired: true,
        resolved: false
      });
    }

    // Status-specific alerts
    if (booking.status === 'pending') {
      alerts.push({
        type: 'warning',
        message: 'Payment is required to confirm your booking.',
        timestamp: now,
        actionRequired: true,
        resolved: false
      });
    }

    // International travel alerts
    const hasInternationalSegment = booking.flightDetails.route.some(segment => 
      segment.origin.length === 3 && segment.destination.length === 3 &&
      segment.origin !== segment.destination
    );

    if (hasInternationalSegment) {
      const missingPassports = booking.passengers.filter(p => !p.passportNumber);
      if (missingPassports.length > 0) {
        alerts.push({
          type: 'warning',
          message: `${missingPassports.length} passenger(s) missing passport information for international travel.`,
          timestamp: now,
          actionRequired: true,
          resolved: false
        });
      }
    }

    return alerts;
  }

  /**
   * Get next actions for booking
   */
  private getNextActions(booking: Booking): BookingAction[] {
    const actions: BookingAction[] = [];
    const now = new Date();
    const daysUntilTravel = Math.ceil((booking.travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Status-based actions
    if (booking.status === 'pending') {
      actions.push({
        type: 'payment_required',
        description: 'Complete payment to confirm your booking',
        priority: 'high'
      });
    }

    if (booking.status === 'ticketed' && daysUntilTravel <= 1) {
      actions.push({
        type: 'check_in',
        description: 'Check in for your flight',
        dueDate: new Date(booking.travelDate.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
        priority: 'high'
      });
    }

    if (booking.status === 'ticketed' && daysUntilTravel <= 7) {
      actions.push({
        type: 'seat_selection',
        description: 'Select your seats',
        priority: 'medium'
      });
    }

    // Document requirements
    const hasInternationalSegment = booking.flightDetails.route.some(segment => 
      segment.origin.length === 3 && segment.destination.length === 3 &&
      segment.origin !== segment.destination
    );

    if (hasInternationalSegment) {
      const missingPassports = booking.passengers.filter(p => !p.passportNumber);
      if (missingPassports.length > 0) {
        actions.push({
          type: 'document_upload',
          description: 'Upload passport information for international travel',
          priority: 'high'
        });
      }
    }

    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}