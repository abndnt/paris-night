"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModel = exports.UpdateBookingSchema = exports.CreateBookingSchema = exports.CostBreakdownSchema = exports.PaymentInfoSchema = exports.PassengerInfoSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.PassengerInfoSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(1).max(50).required()
        .pattern(/^[a-zA-Z\s\-']+$/)
        .messages({
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),
    lastName: joi_1.default.string().min(1).max(50).required()
        .pattern(/^[a-zA-Z\s\-']+$/)
        .messages({
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),
    dateOfBirth: joi_1.default.date().max('now').required()
        .messages({
        'date.max': 'Date of birth cannot be in the future'
    }),
    passportNumber: joi_1.default.string().min(6).max(20).optional()
        .pattern(/^[A-Z0-9]+$/)
        .messages({
        'string.pattern.base': 'Passport number can only contain uppercase letters and numbers'
    }),
    knownTravelerNumber: joi_1.default.string().min(8).max(15).optional()
        .pattern(/^[0-9]+$/)
        .messages({
        'string.pattern.base': 'Known Traveler Number can only contain numbers'
    }),
    seatPreference: joi_1.default.string().valid('aisle', 'window', 'middle').optional(),
    mealPreference: joi_1.default.string().max(50).optional(),
    specialRequests: joi_1.default.array().items(joi_1.default.string().max(100)).max(5).optional()
});
exports.PaymentInfoSchema = joi_1.default.object({
    method: joi_1.default.string().valid('credit_card', 'points', 'mixed').required(),
    creditCard: joi_1.default.when('method', {
        is: joi_1.default.valid('credit_card', 'mixed'),
        then: joi_1.default.object({
            last4: joi_1.default.string().length(4).pattern(/^[0-9]{4}$/).required(),
            brand: joi_1.default.string().valid('visa', 'mastercard', 'amex', 'discover').required(),
            expiryMonth: joi_1.default.number().integer().min(1).max(12).required(),
            expiryYear: joi_1.default.number().integer().min(new Date().getFullYear()).required()
        }).required(),
        otherwise: joi_1.default.optional()
    }),
    pointsUsed: joi_1.default.when('method', {
        is: joi_1.default.valid('points', 'mixed'),
        then: joi_1.default.object({
            program: joi_1.default.string().min(1).max(50).required(),
            points: joi_1.default.number().integer().min(1).required(),
            cashComponent: joi_1.default.number().min(0).optional()
        }).required(),
        otherwise: joi_1.default.optional()
    }),
    totalAmount: joi_1.default.number().min(0).required(),
    currency: joi_1.default.string().length(3).uppercase().required()
});
exports.CostBreakdownSchema = joi_1.default.object({
    baseFare: joi_1.default.number().min(0).required(),
    taxes: joi_1.default.number().min(0).required(),
    fees: joi_1.default.number().min(0).required(),
    pointsValue: joi_1.default.number().min(0).optional(),
    totalCash: joi_1.default.number().min(0).required(),
    totalPoints: joi_1.default.number().integer().min(0).optional(),
    currency: joi_1.default.string().length(3).uppercase().required()
});
exports.CreateBookingSchema = joi_1.default.object({
    userId: joi_1.default.string().uuid().required(),
    searchId: joi_1.default.string().uuid().optional(),
    flightDetails: joi_1.default.object().required(),
    passengers: joi_1.default.array().items(exports.PassengerInfoSchema).min(1).max(9).required(),
    paymentMethod: exports.PaymentInfoSchema.optional(),
    totalCost: exports.CostBreakdownSchema.required(),
    travelDate: joi_1.default.date().min('now').required()
        .messages({
        'date.min': 'Travel date must be in the future'
    })
});
exports.UpdateBookingSchema = joi_1.default.object({
    confirmationCode: joi_1.default.string().min(6).max(20).optional()
        .pattern(/^[A-Z0-9]+$/)
        .messages({
        'string.pattern.base': 'Confirmation code can only contain uppercase letters and numbers'
    }),
    paymentMethod: exports.PaymentInfoSchema.optional(),
    status: joi_1.default.string().valid('pending', 'confirmed', 'ticketed', 'cancelled', 'completed').optional(),
    passengers: joi_1.default.array().items(exports.PassengerInfoSchema).min(1).max(9).optional()
});
class BookingModel {
    constructor(database) {
        this.db = database;
    }
    async createBooking(bookingData) {
        const { error, value } = exports.CreateBookingSchema.validate(bookingData);
        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
        }
        const query = `
      INSERT INTO bookings (
        user_id, search_id, flight_details, passengers, payment_method, 
        total_cost, status, travel_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, search_id, confirmation_code, flight_details, 
                passengers, payment_method, total_cost, status, travel_date, 
                created_at, updated_at
    `;
        const values = [
            value.userId,
            value.searchId || null,
            JSON.stringify(value.flightDetails),
            JSON.stringify(value.passengers),
            value.paymentMethod ? JSON.stringify(value.paymentMethod) : null,
            JSON.stringify(value.totalCost),
            'pending',
            value.travelDate
        ];
        const result = await this.db.query(query, values);
        const row = result.rows[0];
        return this.mapRowToBooking(row);
    }
    async getBooking(bookingId) {
        const query = `
      SELECT id, user_id, search_id, confirmation_code, flight_details, 
             passengers, payment_method, total_cost, status, travel_date, 
             created_at, updated_at
      FROM bookings 
      WHERE id = $1
    `;
        const result = await this.db.query(query, [bookingId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToBooking(result.rows[0]);
    }
    async getBookingByConfirmationCode(confirmationCode) {
        const query = `
      SELECT id, user_id, search_id, confirmation_code, flight_details, 
             passengers, payment_method, total_cost, status, travel_date, 
             created_at, updated_at
      FROM bookings 
      WHERE confirmation_code = $1
    `;
        const result = await this.db.query(query, [confirmationCode]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToBooking(result.rows[0]);
    }
    async updateBooking(bookingId, updateData) {
        const { error, value } = exports.UpdateBookingSchema.validate(updateData);
        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
        }
        const setParts = [];
        const values = [];
        let paramIndex = 1;
        if (value.confirmationCode !== undefined) {
            setParts.push(`confirmation_code = $${paramIndex}`);
            values.push(value.confirmationCode);
            paramIndex++;
        }
        if (value.paymentMethod !== undefined) {
            setParts.push(`payment_method = $${paramIndex}`);
            values.push(JSON.stringify(value.paymentMethod));
            paramIndex++;
        }
        if (value.status !== undefined) {
            setParts.push(`status = $${paramIndex}`);
            values.push(value.status);
            paramIndex++;
        }
        if (value.passengers !== undefined) {
            setParts.push(`passengers = $${paramIndex}`);
            values.push(JSON.stringify(value.passengers));
            paramIndex++;
        }
        if (setParts.length === 0) {
            throw new Error('No valid fields to update');
        }
        values.push(bookingId);
        const query = `
      UPDATE bookings 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, user_id, search_id, confirmation_code, flight_details, 
                passengers, payment_method, total_cost, status, travel_date, 
                created_at, updated_at
    `;
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToBooking(result.rows[0]);
    }
    async getUserBookings(userId, limit = 20, offset = 0) {
        const query = `
      SELECT id, user_id, search_id, confirmation_code, flight_details, 
             passengers, payment_method, total_cost, status, travel_date, 
             created_at, updated_at
      FROM bookings 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
        const result = await this.db.query(query, [userId, limit, offset]);
        return result.rows.map(row => this.mapRowToBooking(row));
    }
    async getBookingsByStatus(status, limit = 50) {
        const query = `
      SELECT id, user_id, search_id, confirmation_code, flight_details, 
             passengers, payment_method, total_cost, status, travel_date, 
             created_at, updated_at
      FROM bookings 
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
        const result = await this.db.query(query, [status, limit]);
        return result.rows.map(row => this.mapRowToBooking(row));
    }
    async deleteBooking(bookingId) {
        const query = `DELETE FROM bookings WHERE id = $1`;
        const result = await this.db.query(query, [bookingId]);
        return (result.rowCount || 0) > 0;
    }
    mapRowToBooking(row) {
        return {
            id: row.id,
            userId: row.user_id,
            searchId: row.search_id,
            confirmationCode: row.confirmation_code,
            flightDetails: row.flight_details,
            passengers: row.passengers,
            paymentMethod: row.payment_method,
            totalCost: row.total_cost,
            status: row.status,
            travelDate: new Date(row.travel_date),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}
exports.BookingModel = BookingModel;
//# sourceMappingURL=Booking.js.map