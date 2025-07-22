"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingConfirmationService = void 0;
class BookingConfirmationService {
    constructor(bookingService) {
        this.bookingService = bookingService;
    }
    async confirmBooking(bookingId, confirmationMethod = 'automatic', externalReference, notes) {
        try {
            const booking = await this.bookingService.getBooking(bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }
            if (booking.status !== 'pending') {
                throw new Error(`Cannot confirm booking with status: ${booking.status}`);
            }
            const updatedBooking = await this.bookingService.updateBooking(bookingId, {
                status: 'confirmed'
            });
            if (!updatedBooking) {
                throw new Error('Failed to update booking status');
            }
            const confirmationDetails = {
                confirmedAt: new Date(),
                confirmationMethod,
                externalReference,
                notes
            };
            const itinerary = this.buildItinerary(updatedBooking);
            const nextSteps = this.getNextSteps(updatedBooking);
            return {
                bookingId: updatedBooking.id,
                confirmationCode: updatedBooking.confirmationCode,
                status: updatedBooking.status,
                confirmationDetails,
                itinerary,
                nextSteps
            };
        }
        catch (error) {
            throw new Error(`Failed to confirm booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getBookingConfirmation(bookingId) {
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
                    confirmationMethod: 'automatic',
                    externalReference: undefined,
                    notes: undefined
                },
                itinerary,
                nextSteps
            };
        }
        catch (error) {
            throw new Error(`Failed to get booking confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async trackBooking(bookingId) {
        try {
            const booking = await this.bookingService.getBooking(bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }
            const statusHistory = this.buildStatusHistory(booking);
            const timeline = this.buildTimeline(booking);
            const alerts = this.generateAlerts(booking);
            const nextActions = this.getNextActions(booking);
            return {
                bookingId: booking.id,
                currentStatus: booking.status,
                statusHistory,
                timeline,
                alerts,
                nextActions
            };
        }
        catch (error) {
            throw new Error(`Failed to track booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async trackByConfirmationCode(confirmationCode) {
        try {
            const booking = await this.bookingService.getBookingByConfirmationCode(confirmationCode);
            if (!booking) {
                return null;
            }
            return await this.trackBooking(booking.id);
        }
        catch (error) {
            throw new Error(`Failed to track booking by confirmation code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async updateBookingStatus(bookingId, newStatus, _reason, _updatedBy, _notes) {
        try {
            const updatedBooking = await this.bookingService.updateBooking(bookingId, {
                status: newStatus
            });
            if (!updatedBooking) {
                throw new Error('Failed to update booking');
            }
            return await this.trackBooking(bookingId);
        }
        catch (error) {
            throw new Error(`Failed to update booking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    buildItinerary(booking) {
        const flightDetails = booking.flightDetails;
        const passengers = booking.passengers.map(passenger => ({
            name: `${passenger.firstName} ${passenger.lastName}`,
            seatAssignment: undefined,
            ticketNumber: undefined
        }));
        const flights = flightDetails.route.map(segment => ({
            flightNumber: segment.flightNumber,
            airline: segment.airline,
            departure: {
                airport: segment.origin,
                time: new Date(segment.departureTime),
                terminal: undefined,
                gate: undefined
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
        const layovers = [];
        for (let i = 0; i < flights.length - 1; i++) {
            const currentFlight = flights[i];
            const nextFlight = flights[i + 1];
            if (currentFlight.arrival.airport === nextFlight.departure.airport) {
                const layoverDuration = nextFlight.departure.time.getTime() - currentFlight.arrival.time.getTime();
                layovers.push({
                    airport: currentFlight.arrival.airport,
                    duration: Math.floor(layoverDuration / (1000 * 60))
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
    getNextSteps(booking) {
        const steps = [];
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
        const daysUntilTravel = Math.ceil((booking.travelDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilTravel <= 1 && booking.status === 'ticketed') {
            steps.push('Check-in is now available online or at the airport');
        }
        if (daysUntilTravel <= 7 && booking.status === 'ticketed') {
            steps.push('Consider selecting your seats if not already done');
        }
        return steps;
    }
    buildStatusHistory(booking) {
        const history = [
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
    buildTimeline(booking) {
        const timeline = [
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
    generateAlerts(booking) {
        const alerts = [];
        const now = new Date();
        const daysUntilTravel = Math.ceil((booking.travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
        if (booking.status === 'pending') {
            alerts.push({
                type: 'warning',
                message: 'Payment is required to confirm your booking.',
                timestamp: now,
                actionRequired: true,
                resolved: false
            });
        }
        const hasInternationalSegment = booking.flightDetails.route.some(segment => segment.origin.length === 3 && segment.destination.length === 3 &&
            segment.origin !== segment.destination);
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
    getNextActions(booking) {
        const actions = [];
        const now = new Date();
        const daysUntilTravel = Math.ceil((booking.travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
                dueDate: new Date(booking.travelDate.getTime() - 2 * 60 * 60 * 1000),
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
        const hasInternationalSegment = booking.flightDetails.route.some(segment => segment.origin.length === 3 && segment.destination.length === 3 &&
            segment.origin !== segment.destination);
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
exports.BookingConfirmationService = BookingConfirmationService;
//# sourceMappingURL=BookingConfirmationService.js.map