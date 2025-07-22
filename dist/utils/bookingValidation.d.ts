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
export declare class BookingValidator {
    static validatePassengers(passengers: PassengerInfo[]): ValidationResult;
    static validatePayment(paymentInfo: PaymentInfo): ValidationResult;
    static validateCostBreakdown(costBreakdown: CostBreakdown): ValidationResult;
    static validateFlightAvailability(flightDetails: FlightResult): ValidationResult;
    private static calculateAge;
}
export declare function validateCompleteBooking(passengers: PassengerInfo[], paymentInfo: PaymentInfo, costBreakdown: CostBreakdown, flightDetails: FlightResult): ValidationResult;
//# sourceMappingURL=bookingValidation.d.ts.map