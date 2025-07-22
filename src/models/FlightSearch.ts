import { Pool } from 'pg';
import * as Joi from 'joi';

// Core interfaces for flight search functionality
export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

export interface SearchCriteria {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  passengers: PassengerCount;
  cabinClass: 'economy' | 'premium' | 'business' | 'first';
  flexible: boolean;
}

export interface FlightSegment {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: number; // in minutes
  aircraft?: string;
  operatingAirline?: string;
}

export interface PricingInfo {
  cashPrice: number;
  currency: string;
  pointsOptions: PointsOption[];
  taxes: number;
  fees: number;
  totalPrice: number;
}

export interface PointsOption {
  program: string;
  pointsRequired: number;
  cashComponent?: number;
  transferRatio?: number;
  bestValue: boolean;
}

export interface AvailabilityInfo {
  availableSeats: number;
  bookingClass: string;
  fareBasis: string;
  restrictions?: string[];
}

export interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  route: FlightSegment[];
  pricing: PricingInfo;
  availability: AvailabilityInfo;
  duration: number; // total journey time in minutes
  layovers: number;
  layoverDuration?: number; // total layover time in minutes
  score?: number; // relevance/quality score
}

export interface FlightSearch {
  id: string;
  userId?: string;
  searchCriteria: SearchCriteria;
  results: FlightResult[];
  status: 'pending' | 'completed' | 'error';
  createdAt: Date;
  expiresAt: Date;
}

// Data transfer objects for API
export interface CreateFlightSearchData {
  userId?: string;
  searchCriteria: SearchCriteria;
}

export interface UpdateFlightSearchData {
  results?: FlightResult[];
  status?: 'pending' | 'completed' | 'error';
}

// Validation schemas using Joi
export const PassengerCountSchema = Joi.object({
  adults: Joi.number().integer().min(1).max(9).required(),
  children: Joi.number().integer().min(0).max(8).default(0),
  infants: Joi.number().integer().min(0).max(2).default(0)
});

export const SearchCriteriaSchema = Joi.object({
  origin: Joi.string().length(3).uppercase().required()
    .pattern(/^[A-Z]{3}$/)
    .messages({
      'string.pattern.base': 'Origin must be a valid 3-letter airport code'
    }),
  destination: Joi.string().length(3).uppercase().required()
    .pattern(/^[A-Z]{3}$/)
    .messages({
      'string.pattern.base': 'Destination must be a valid 3-letter airport code'
    }),
  departureDate: Joi.date().min('now').required()
    .messages({
      'date.min': 'Departure date must be in the future'
    }),
  returnDate: Joi.date().min(Joi.ref('departureDate')).optional()
    .messages({
      'date.min': 'Return date must be after departure date'
    }),
  passengers: PassengerCountSchema.required(),
  cabinClass: Joi.string().valid('economy', 'premium', 'business', 'first').default('economy'),
  flexible: Joi.boolean().default(false)
});

export const CreateFlightSearchSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  searchCriteria: SearchCriteriaSchema.required()
});

export const UpdateFlightSearchSchema = Joi.object({
  results: Joi.array().items(Joi.object()).optional(),
  status: Joi.string().valid('pending', 'completed', 'error').optional()
});

// Database model class
export class FlightSearchModel {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async createSearch(searchData: CreateFlightSearchData): Promise<FlightSearch> {
    // Validate input data
    const { error, value } = CreateFlightSearchSchema.validate(searchData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]!.message}`);
    }

    const query = `
      INSERT INTO flight_searches (
        user_id, origin, destination, departure_date, return_date, 
        passengers, cabin_class, flexible, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, user_id, origin, destination, departure_date, return_date,
                passengers, cabin_class, flexible, status, results, created_at, expires_at
    `;

    const values = [
      value.userId || null,
      value.searchCriteria.origin,
      value.searchCriteria.destination,
      value.searchCriteria.departureDate,
      value.searchCriteria.returnDate || null,
      JSON.stringify(value.searchCriteria.passengers),
      value.searchCriteria.cabinClass,
      value.searchCriteria.flexible,
      'pending'
    ];

    const result = await this.db.query(query, values);
    const row = result.rows[0];

    return this.mapRowToFlightSearch(row);
  }

  async getSearch(searchId: string): Promise<FlightSearch | null> {
    const query = `
      SELECT id, user_id, origin, destination, departure_date, return_date,
             passengers, cabin_class, flexible, status, results, created_at, expires_at
      FROM flight_searches 
      WHERE id = $1
    `;

    const result = await this.db.query(query, [searchId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFlightSearch(result.rows[0]);
  }

  async updateSearch(searchId: string, updateData: UpdateFlightSearchData): Promise<FlightSearch | null> {
    // Validate input data
    const { error, value } = UpdateFlightSearchSchema.validate(updateData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]!.message}`);
    }

    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (value.results !== undefined) {
      setParts.push(`results = $${paramIndex}`);
      values.push(JSON.stringify(value.results));
      paramIndex++;
    }

    if (value.status !== undefined) {
      setParts.push(`status = $${paramIndex}`);
      values.push(value.status);
      paramIndex++;
    }

    if (setParts.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(searchId);

    const query = `
      UPDATE flight_searches 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, user_id, origin, destination, departure_date, return_date,
                passengers, cabin_class, flexible, status, results, created_at, expires_at
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFlightSearch(result.rows[0]);
  }

  async getUserSearches(userId: string, limit: number = 20, offset: number = 0): Promise<FlightSearch[]> {
    const query = `
      SELECT id, user_id, origin, destination, departure_date, return_date,
             passengers, cabin_class, flexible, status, results, created_at, expires_at
      FROM flight_searches 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [userId, limit, offset]);
    
    return result.rows.map(row => this.mapRowToFlightSearch(row));
  }

  async getRecentSearches(limit: number = 50): Promise<FlightSearch[]> {
    const query = `
      SELECT id, user_id, origin, destination, departure_date, return_date,
             passengers, cabin_class, flexible, status, results, created_at, expires_at
      FROM flight_searches 
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    
    return result.rows.map(row => this.mapRowToFlightSearch(row));
  }

  async deleteSearch(searchId: string): Promise<boolean> {
    const query = `DELETE FROM flight_searches WHERE id = $1`;
    const result = await this.db.query(query, [searchId]);
    return (result.rowCount || 0) > 0;
  }

  async deleteExpiredSearches(): Promise<number> {
    const query = `DELETE FROM flight_searches WHERE expires_at < CURRENT_TIMESTAMP`;
    const result = await this.db.query(query);
    return result.rowCount || 0;
  }

  private mapRowToFlightSearch(row: any): FlightSearch {
    return {
      id: row.id,
      userId: row.user_id,
      searchCriteria: {
        origin: row.origin,
        destination: row.destination,
        departureDate: new Date(row.departure_date),
        ...(row.return_date && { returnDate: new Date(row.return_date) }),
        passengers: row.passengers,
        cabinClass: row.cabin_class,
        flexible: row.flexible
      },
      results: row.results || [],
      status: row.status,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at)
    };
  }
}