"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const Booking_1 = require("../models/Booking");
class BookingService {
    constructor(database) {
        this.bookingModel = new Booking_1.BookingModel(database);
    }
    async createBooking(bookingData) {
        try {
            const validation = this.validateBookingData(bookingData);
            if (!validation.isValid) {
                throw new Error(`Booking validation failed: ${validation.errors.join(', ')}`);
            }
            const sanitizedData = this.sanitizeBookingData(bookingData);
            const bookingWithConfirmation = await this.bookingModel.createBooking(sanitizedData);
            const confirmationCode = this.generateConfirmationCode();
            const updatedBooking = await this.bookingModel.updateBooking(bookingWithConfirmation.id, {
                confirmationCode
            });
            return updatedBooking || bookingWithConfirmation;
        }
        catch (error) {
            throw new Error(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getBooking(bookingId) {
        try {
            if (!this.isValidUUID(bookingId)) {
                throw new Error('Invalid booking ID format');
            }
            return await this.bookingModel.getBooking(bookingId);
        }
        catch (error) {
            throw new Error(`Failed to get booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getBookingByConfirmationCode(confirmationCode) {
        try {
            if (!this.isValidConfirmationCode(confirmationCode)) {
                throw new Error('Invalid confirmation code format');
            }
            return await this.bookingModel.getBookingByConfirmationCode(confirmationCode.toUpperCase());
        }
        catch (error) {
            throw new Error(`Failed to get booking by confirmation code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async updateBooking(bookingId, updateData) {
        try {
            if (!this.isValidUUID(bookingId)) {
                throw new Error('Invalid booking ID format');
            }
            const currentBooking = await this.bookingModel.getBooking(bookingId);
            if (!currentBooking) {
                throw new Error('Booking not found');
            }
            if (updateData.status && !this.isValidStatusTransition(currentBooking.status, updateData.status)) {
                throw new Error(`Invalid status transition from ${currentBooking.status} to ${updateData.status}`);
            }
            const sanitizedData = this.sanitizeUpdateData(updateData);
            return await this.bookingModel.updateBooking(bookingId, sanitizedData);
        }
        catch (error) {
            throw new Error(`Failed to update booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getUserBookings(userId, limit = 20, offset = 0) {
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
        }
        catch (error) {
            throw new Error(`Failed to get user bookings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getBookingsByStatus(status, limit = 50) {
        try {
            if (limit < 1 || limit > 100) {
                throw new Error('Limit must be between 1 and 100');
            }
            return await this.bookingModel.getBookingsByStatus(status, limit);
        }
        catch (error) {
            throw new Error(`Failed to get bookings by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async cancelBooking(bookingId, _reason) {
        try {
            const booking = await this.bookingModel.getBooking(bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }
            if (!this.canCancelBooking(booking)) {
                throw new Error(`Booking cannot be cancelled in ${booking.status} status`);
            }
            return await this.bookingModel.updateBooking(bookingId, {
                status: 'cancelled'
            });
        }
        catch (error) {
            throw new Error(`Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getBookingWorkflowState(booking) {
        const completedSteps = [];
        let currentStep = 'flight_selection';
        let nextStep;
        let canProceed = false;
        const requiredFields = [];
        if (booking.flightDetails) {
            completedSteps.push('flight_selection');
            currentStep = 'passenger_info';
        }
        else {
            requiredFields.push('flightDetails');
        }
        if (booking.passengers && booking.passengers.length > 0) {
            const hasValidPassengers = booking.passengers.every(p => p.firstName && p.lastName && p.dateOfBirth);
            if (hasValidPassengers) {
                completedSteps.push('passenger_info');
                currentStep = 'payment';
            }
            else {
                requiredFields.push('passengers');
            }
        }
        else {
            requiredFields.push('passengers');
        }
        if (booking.paymentMethod && booking.status !== 'pending') {
            completedSteps.push('payment');
            currentStep = 'confirmation';
        }
        else if (currentStep === 'payment') {
            requiredFields.push('paymentMethod');
        }
        if (booking.confirmationCode && (booking.status === 'confirmed' || booking.status === 'ticketed')) {
            completedSteps.push('confirmation');
            currentStep = 'completed';
        }
        else if (currentStep === 'confirmation') {
            requiredFields.push('confirmationCode');
        }
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
    async checkAvailability(_flightDetails) {
        try {
            const isAvailable = Math.random() > 0.1;
            if (!isAvailable) {
                return {
                    available: false,
                    reason: 'Flight is no longer available',
                    alternativeOptions: []
                };
            }
            const priceChanged = Math.random() > 0.8;
            if (priceChanged) {
                return {
                    available: true,
                    reason: 'Price has changed since last search'
                };
            }
            return {
                available: true
            };
        }
        catch (error) {
            return {
                available: false,
                reason: `Availability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    validateBookingData(bookingData) {
        const errors = [];
        const warnings = [];
        if (!this.isValidUUID(bookingData.userId)) {
            errors.push('Invalid user ID format');
        }
        if (!bookingData.flightDetails || !bookingData.flightDetails.id) {
            errors.push('Flight details are required');
        }
        if (!bookingData.passengers || bookingData.passengers.length === 0) {
            errors.push('At least one passenger is required');
        }
        else if (bookingData.passengers.length > 9) {
            errors.push('Maximum 9 passengers allowed');
        }
        const travelDate = new Date(bookingData.travelDate);
        const now = new Date();
        if (travelDate <= now) {
            errors.push('Travel date must be in the future');
        }
        if (!bookingData.totalCost || bookingData.totalCost.totalCash < 0) {
            errors.push('Valid cost breakdown is required');
        }
        if (bookingData.passengers) {
            const hasMinors = bookingData.passengers.some(p => {
                const age = this.calculateAge(p.dateOfBirth);
                return age < 18;
            });
            if (hasMinors) {
                warnings.push('Booking includes minor passengers - additional documentation may be required');
            }
            const hasInternationalTravel = bookingData.flightDetails.route?.some(segment => segment.origin.length === 3 && segment.destination.length === 3 &&
                segment.origin !== segment.destination);
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
    isValidStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['ticketed', 'cancelled'],
            'ticketed': ['completed', 'cancelled'],
            'cancelled': [],
            'completed': []
        };
        return validTransitions[currentStatus]?.includes(newStatus) || false;
    }
    canCancelBooking(booking) {
        if (booking.status === 'cancelled' || booking.status === 'completed') {
            return false;
        }
        const now = new Date();
        if (booking.travelDate <= now) {
            return false;
        }
        return true;
    }
    generateConfirmationCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    calculateAge(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    sanitizeBookingData(bookingData) {
        return {
            ...bookingData,
            passengers: bookingData.passengers.map(passenger => {
                const sanitized = {
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
    sanitizeUpdateData(updateData) {
        const sanitized = { ...updateData };
        if (sanitized.confirmationCode) {
            sanitized.confirmationCode = sanitized.confirmationCode.toUpperCase().trim();
        }
        if (sanitized.passengers) {
            sanitized.passengers = sanitized.passengers.map(passenger => {
                const sanitizedPassenger = {
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
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    isValidConfirmationCode(code) {
        return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
    }
}
exports.BookingService = BookingService;
//# sourceMappingURL=BookingService.js.map