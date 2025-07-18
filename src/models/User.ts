import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { config } from '../config';

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  passportNumber?: string;
}

export interface TravelPreferences {
  preferredAirlines: string[];
  preferredAirports: string[];
  seatPreference?: 'aisle' | 'window' | 'middle';
  mealPreference?: string;
  maxLayovers: number;
  preferredCabinClass: 'economy' | 'premium' | 'business' | 'first';
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  preferences?: TravelPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresIn: string;
}

export class UserModel {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async create(userData: CreateUserData): Promise<User> {
    const { email, password, firstName, lastName, phoneNumber } = userData;
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, phone_number, created_at, updated_at
    `;

    const values = [email, passwordHash, firstName, lastName, phoneNumber];
    const result = await this.db.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      email: row.email,
      passwordHash,
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        phoneNumber: row.phone_number,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, phone_number, 
             date_of_birth, passport_number, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;

    const result = await this.db.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        phoneNumber: row.phone_number,
        dateOfBirth: row.date_of_birth,
        passportNumber: row.passport_number,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, phone_number, 
             date_of_birth, passport_number, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        phoneNumber: row.phone_number,
        dateOfBirth: row.date_of_birth,
        passportNumber: row.passport_number,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateProfile(id: string, profileData: Partial<UserProfile>): Promise<User | null> {
    const { firstName, lastName, phoneNumber, dateOfBirth, passportNumber } = profileData;
    
    const query = `
      UPDATE users 
      SET first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          phone_number = COALESCE($4, phone_number),
          date_of_birth = COALESCE($5, date_of_birth),
          passport_number = COALESCE($6, passport_number),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, phone_number, 
                date_of_birth, passport_number, created_at, updated_at
    `;

    const values = [id, firstName, lastName, phoneNumber, dateOfBirth, passportNumber];
    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: '', // Don't return password hash
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        phoneNumber: row.phone_number,
        dateOfBirth: row.date_of_birth,
        passportNumber: row.passport_number,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  generateAuthToken(user: User): AuthToken {
    const payload = {
      id: user.id,
      email: user.email,
    };

    const secret = config.jwt.secret as string;
    const expiresIn = config.jwt.expiresIn as string;

    const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

    return {
      token,
      expiresIn: expiresIn,
    };
  }

  verifyAuthToken(token: string): any {
    try {
      const secret = config.jwt.secret as string;
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Helper method to get user without password hash for API responses
  toPublicUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
}