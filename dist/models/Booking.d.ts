import { Pool } from 'pg';
import Joi from 'joi';
import { FlightResult } from './FlightSearch';
export interface PassengerInfo {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    passportNumber?: string;
    knownTravelerNumber?: string;
    seatPreference?: 'aisle' | 'window' | 'middle';
    mealPreference?: string;
    specialRequests?: string[];
}
export interface PaymentInfo {
    method: 'credit_card' | 'points' | 'mixed';
    creditCard?: {
        last4: string;
        brand: string;
        expiryMonth: number;
        expiryYear: number;
    };
    pointsUsed?: {
        program: string;
        points: number;
        cashComponent?: number;
    };
    totalAmount: number;
    currency: string;
}
export interface CostBreakdown {
    baseFare: number;
    taxes: number;
    fees: number;
    pointsValue?: number;
    totalCash: number;
    totalPoints?: number;
    currency: string;
}
export type BookingStatus = 'pending' | 'confirmed' | 'ticketed' | 'cancelled' | 'completed';
export interface Booking {
    id: string;
    userId: string;
    searchId?: string;
    confirmationCode?: string;
    flightDetails: FlightResult;
    passengers: PassengerInfo[];
    paymentMethod?: PaymentInfo;
    totalCost: CostBreakdown;
    status: BookingStatus;
    travelDate: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateBookingData {
    userId: string;
    searchId?: string;
    flightDetails: FlightResult;
    passengers: PassengerInfo[];
    paymentMethod?: PaymentInfo;
    totalCost: CostBreakdown;
    travelDate: Date;
}
export interface UpdateBookingData {
    confirmationCode?: string;
    paymentMethod?: PaymentInfo;
    status?: BookingStatus;
    passengers?: PassengerInfo[];
}
export declare const PassengerInfoSchema: Joi.ObjectSchema<any>;
export declare const PaymentInfoSchema: Joi.ObjectSchema<any>;
export declare const CostBreakdownSchema: Joi.ObjectSchema<any>;
export declare const CreateBookingSchema: Joi.ObjectSchema<any>;
export declare const UpdateBookingSchema: Joi.ObjectSchema<any>;
export declare class BookingModel {
    private db;
    constructor(database: Pool);
    createBooking(bookingData: CreateBookingData): Promise<Booking>;
    getBooking(bookingId: string): Promise<Booking | null>;
    getBookingByConfirmationCode(confirmationCode: string): Promise<Booking | null>;
    updateBooking(bookingId: string, updateData: UpdateBookingData): Promise<Booking | null>;
    getUserBookings(userId: string, limit?: number, offset?: number): Promise<Booking[]>;
    getBookingsByStatus(status: BookingStatus, limit?: number): Promise<Booking[]>;
    deleteBooking(bookingId: string): Promise<boolean>;
    private mapRowToBooking;
}
//# sourceMappingURL=Booking.d.ts.map