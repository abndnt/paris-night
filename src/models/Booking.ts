import { Pool } from 'pg';
import Joi from 'joi';
import { FlightResult } from './FlightSearch';

// Core interfaces for booking functionality
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

// Data transfer objects for API
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

// Validation schemas using Joi
export const PassengerInfoSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required()
    .pattern(/^[a-zA-Z\s\-']+$/)
    .messages({
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  lastName: Joi.string().min(1).max(50).required()
    .pattern(/^[a-zA-Z\s\-']+$/)
    .messages({
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  dateOfBirth: Joi.date().max('now').required()
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
  passportNumber: Joi.string().min(6).max(20).optional()
    .pattern(/^[A-Z0-9]+$/)
    .messages({
      'string.pattern.base': 'Passport number can only contain uppercase letters and numbers'
    }),
  knownTravelerNumber: Joi.string().min(8).max(15).optional()
    .pattern(/^[0-9]+$/)
    .messages({
      'string.pattern.base': 'Known Traveler Number can only contain numbers'
    }),
  seatPreference: Joi.string().valid('aisle', 'window', 'middle').optional(),
  mealPreference: Joi.string().max(50).optional(),
  specialRequests: Joi.array().items(Joi.string().max(100)).max(5).optional()
});

export const PaymentInfoSchema = Joi.object({
  method: Joi.string().valid('credit_card', 'points', 'mixed').required(),
  creditCard: Joi.when('method', {
    is: Joi.valid('credit_card', 'mixed'),
    then: Joi.object({
      last4: Joi.string().length(4).pattern(/^[0-9]{4}$/).required(),
      brand: Joi.string().valid('visa', 'mastercard', 'amex', 'discover').required(),
      expiryMonth: Joi.number().integer().min(1).max(12).required(),
      expiryYear: Joi.number().integer().min(new Date().getFullYear()).required()
    }).required(),
    otherwise: Joi.optional()
  }),
  pointsUsed: Joi.when('method', {
    is: Joi.valid('points', 'mixed'),
    then: Joi.object({
      program: Joi.string().min(1).max(50).required(),
      points: Joi.number().integer().min(1).required(),
      cashComponent: Joi.number().min(0).optional()
    }).required(),
    otherwise: Joi.optional()
  }),
  totalAmount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().required()
});

export const CostBreakdownSchema = Joi.object({
  baseFare: Joi.number().min(0).required(),
  taxes: Joi.number().min(0).required(),
  fees: Joi.number().min(0).required(),
  pointsValue: Joi.number().min(0).optional(),
  totalCash: Joi.number().min(0).required(),
  totalPoints: Joi.number().integer().min(0).optional(),
  currency: Joi.string().length(3).uppercase().required()
});

export const CreateBookingSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  searchId: Joi.string().uuid().optional(),
  flightDetails: Joi.object().required(), // FlightResult validation would be complex, keeping simple for now
  passengers: Joi.array().items(PassengerInfoSchema).min(1).max(9).required(),
  paymentMethod: PaymentInfoSchema.optional(),
  totalCost: CostBreakdownSchema.required(),
  travelDate: Joi.date().min('now').required()
    .messages({
      'date.min': 'Travel date must be in the future'
    })
});

export const UpdateBookingSchema = Joi.object({
  confirmationCode: Joi.string().min(6).max(20).optional()
    .pattern(/^[A-Z0-9]+$/)
    .messages({
      'string.pattern.base': 'Confirmation code can only contain uppercase letters and numbers'
    }),
  paymentMethod: PaymentInfoSchema.optional(),
  status: Joi.string().valid('pending', 'confirmed', 'ticketed', 'cancelled', 'completed').optional(),
  passengers: Joi.array().items(PassengerInfoSchema).min(1).max(9).optional()
});

// Database model class
export class BookingModel {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async createBooking(bookingData: CreateBookingData): Promise<Booking> {
    // Validate input data
    const { error, value } = CreateBookingSchema.validate(bookingData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]!.message}`);
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

  async getBooking(bookingId: string): Promise<Booking | null> {
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

  async getBookingByConfirmationCode(confirmationCode: string): Promise<Booking | null> {
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

  async updateBooking(bookingId: string, updateData: UpdateBookingData): Promise<Booking | null> {
    // Validate input data
    const { error, value } = UpdateBookingSchema.validate(updateData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]!.message}`);
    }

    const setParts: string[] = [];
    const values: any[] = [];
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

  async getUserBookings(userId: string, limit: number = 20, offset: number = 0): Promise<Booking[]> {
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

  async getBookingsByStatus(status: BookingStatus, limit: number = 50): Promise<Booking[]> {
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

  async deleteBooking(bookingId: string): Promise<boolean> {
    const query = `DELETE FROM bookings WHERE id = $1`;
    const result = await this.db.query(query, [bookingId]);
    return (result.rowCount || 0) > 0;
  }

  private mapRowToBooking(row: any): Booking {
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