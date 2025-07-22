import { Pool } from 'pg';

export interface TravelPreferences {
  id?: string;
  userId: string;
  preferredAirlines: string[];
  preferredAirports: string[];
  seatPreference?: 'aisle' | 'window' | 'middle';
  mealPreference?: string;
  maxLayovers: number;
  preferredCabinClass: 'economy' | 'premium' | 'business' | 'first';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTravelPreferencesData {
  userId: string;
  preferredAirlines?: string[];
  preferredAirports?: string[];
  seatPreference?: 'aisle' | 'window' | 'middle';
  mealPreference?: string;
  maxLayovers?: number;
  preferredCabinClass?: 'economy' | 'premium' | 'business' | 'first';
}

export interface UpdateTravelPreferencesData {
  preferredAirlines?: string[];
  preferredAirports?: string[];
  seatPreference?: 'aisle' | 'window' | 'middle';
  mealPreference?: string;
  maxLayovers?: number;
  preferredCabinClass?: 'economy' | 'premium' | 'business' | 'first';
}

export class TravelPreferencesModel {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async create(preferencesData: CreateTravelPreferencesData): Promise<TravelPreferences> {
    const {
      userId,
      preferredAirlines = [],
      preferredAirports = [],
      seatPreference,
      mealPreference,
      maxLayovers = 2,
      preferredCabinClass = 'economy'
    } = preferencesData;

    const query = `
      INSERT INTO travel_preferences (
        user_id, preferred_airlines, preferred_airports, seat_preference,
        meal_preference, max_layovers, preferred_cabin_class
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, preferred_airlines, preferred_airports, seat_preference,
                meal_preference, max_layovers, preferred_cabin_class, created_at, updated_at
    `;

    const values = [
      userId,
      preferredAirlines,
      preferredAirports,
      seatPreference,
      mealPreference,
      maxLayovers,
      preferredCabinClass
    ];

    const result = await this.db.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      preferredAirlines: row.preferred_airlines || [],
      preferredAirports: row.preferred_airports || [],
      seatPreference: row.seat_preference,
      mealPreference: row.meal_preference,
      maxLayovers: row.max_layovers,
      preferredCabinClass: row.preferred_cabin_class,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByUserId(userId: string): Promise<TravelPreferences | null> {
    const query = `
      SELECT id, user_id, preferred_airlines, preferred_airports, seat_preference,
             meal_preference, max_layovers, preferred_cabin_class, created_at, updated_at
      FROM travel_preferences
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      preferredAirlines: row.preferred_airlines || [],
      preferredAirports: row.preferred_airports || [],
      seatPreference: row.seat_preference,
      mealPreference: row.meal_preference,
      maxLayovers: row.max_layovers,
      preferredCabinClass: row.preferred_cabin_class,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async update(userId: string, updateData: UpdateTravelPreferencesData): Promise<TravelPreferences | null> {
    const {
      preferredAirlines,
      preferredAirports,
      seatPreference,
      mealPreference,
      maxLayovers,
      preferredCabinClass
    } = updateData;

    const query = `
      UPDATE travel_preferences
      SET preferred_airlines = COALESCE($2, preferred_airlines),
          preferred_airports = COALESCE($3, preferred_airports),
          seat_preference = COALESCE($4, seat_preference),
          meal_preference = COALESCE($5, meal_preference),
          max_layovers = COALESCE($6, max_layovers),
          preferred_cabin_class = COALESCE($7, preferred_cabin_class),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING id, user_id, preferred_airlines, preferred_airports, seat_preference,
                meal_preference, max_layovers, preferred_cabin_class, created_at, updated_at
    `;

    const values = [
      userId,
      preferredAirlines,
      preferredAirports,
      seatPreference,
      mealPreference,
      maxLayovers,
      preferredCabinClass
    ];

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      preferredAirlines: row.preferred_airlines || [],
      preferredAirports: row.preferred_airports || [],
      seatPreference: row.seat_preference,
      mealPreference: row.meal_preference,
      maxLayovers: row.max_layovers,
      preferredCabinClass: row.preferred_cabin_class,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async delete(userId: string): Promise<boolean> {
    const query = 'DELETE FROM travel_preferences WHERE user_id = $1';
    const result = await this.db.query(query, [userId]);
    return result.rowCount > 0;
  }

  async upsert(preferencesData: CreateTravelPreferencesData): Promise<TravelPreferences> {
    const existing = await this.findByUserId(preferencesData.userId);
    
    if (existing) {
      const updated = await this.update(preferencesData.userId, preferencesData);
      return updated!;
    } else {
      return await this.create(preferencesData);
    }
  }
}