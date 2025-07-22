"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightSearchModel = exports.UpdateFlightSearchSchema = exports.CreateFlightSearchSchema = exports.SearchCriteriaSchema = exports.PassengerCountSchema = void 0;
const Joi = __importStar(require("joi"));
exports.PassengerCountSchema = Joi.object({
    adults: Joi.number().integer().min(1).max(9).required(),
    children: Joi.number().integer().min(0).max(8).default(0),
    infants: Joi.number().integer().min(0).max(2).default(0)
});
exports.SearchCriteriaSchema = Joi.object({
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
    passengers: exports.PassengerCountSchema.required(),
    cabinClass: Joi.string().valid('economy', 'premium', 'business', 'first').default('economy'),
    flexible: Joi.boolean().default(false)
});
exports.CreateFlightSearchSchema = Joi.object({
    userId: Joi.string().uuid().optional(),
    searchCriteria: exports.SearchCriteriaSchema.required()
});
exports.UpdateFlightSearchSchema = Joi.object({
    results: Joi.array().items(Joi.object()).optional(),
    status: Joi.string().valid('pending', 'completed', 'error').optional()
});
class FlightSearchModel {
    constructor(database) {
        this.db = database;
    }
    async createSearch(searchData) {
        const { error, value } = exports.CreateFlightSearchSchema.validate(searchData);
        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
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
    async getSearch(searchId) {
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
    async updateSearch(searchId, updateData) {
        const { error, value } = exports.UpdateFlightSearchSchema.validate(updateData);
        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
        }
        const setParts = [];
        const values = [];
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
    async getUserSearches(userId, limit = 20, offset = 0) {
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
    async getRecentSearches(limit = 50) {
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
    async deleteSearch(searchId) {
        const query = `DELETE FROM flight_searches WHERE id = $1`;
        const result = await this.db.query(query, [searchId]);
        return (result.rowCount || 0) > 0;
    }
    async deleteExpiredSearches() {
        const query = `DELETE FROM flight_searches WHERE expires_at < CURRENT_TIMESTAMP`;
        const result = await this.db.query(query);
        return result.rowCount || 0;
    }
    mapRowToFlightSearch(row) {
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
exports.FlightSearchModel = FlightSearchModel;
//# sourceMappingURL=FlightSearch.js.map