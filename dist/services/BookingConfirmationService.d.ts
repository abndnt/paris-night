import { BookingStatus } from '../models/Booking';
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
export declare class BookingConfirmationService {
    private bookingService;
    constructor(bookingService: BookingService);
    confirmBooking(bookingId: string, confirmationMethod?: 'automatic' | 'manual' | 'api', externalReference?: string, notes?: string): Promise<BookingConfirmation>;
    getBookingConfirmation(bookingId: string): Promise<BookingConfirmation | null>;
    trackBooking(bookingId: string): Promise<BookingTrackingInfo>;
    trackByConfirmationCode(confirmationCode: string): Promise<BookingTrackingInfo | null>;
    updateBookingStatus(bookingId: string, newStatus: BookingStatus, _reason?: string, _updatedBy?: string, _notes?: string): Promise<BookingTrackingInfo>;
    private buildItinerary;
    private getNextSteps;
    private buildStatusHistory;
    private buildTimeline;
    private generateAlerts;
    private getNextActions;
}
//# sourceMappingURL=BookingConfirmationService.d.ts.map