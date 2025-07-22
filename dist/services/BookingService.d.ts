import { Pool } from 'pg';
import { Booking, CreateBookingData, UpdateBookingData, BookingStatus } from '../models/Booking';
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
export declare class BookingService {
    private bookingModel;
    constructor(database: Pool);
    createBooking(bookingData: CreateBookingData): Promise<Booking>;
    getBooking(bookingId: string): Promise<Booking | null>;
    getBookingByConfirmationCode(confirmationCode: string): Promise<Booking | null>;
    updateBooking(bookingId: string, updateData: UpdateBookingData): Promise<Booking | null>;
    getUserBookings(userId: string, limit?: number, offset?: number): Promise<Booking[]>;
    getBookingsByStatus(status: BookingStatus, limit?: number): Promise<Booking[]>;
    cancelBooking(bookingId: string, _reason?: string): Promise<Booking | null>;
    getBookingWorkflowState(booking: Booking): BookingWorkflowState;
    checkAvailability(_flightDetails: FlightResult): Promise<AvailabilityCheckResult>;
    private validateBookingData;
    private isValidStatusTransition;
    private canCancelBooking;
    private generateConfirmationCode;
    private calculateAge;
    private sanitizeBookingData;
    private sanitizeUpdateData;
    private isValidUUID;
    private isValidConfirmationCode;
}
//# sourceMappingURL=BookingService.d.ts.map