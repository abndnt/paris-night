import { Pool } from 'pg';
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
export declare class UserModel {
    private db;
    constructor(database: Pool);
    create(userData: CreateUserData): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    updateProfile(id: string, profileData: Partial<UserProfile>): Promise<User | null>;
    verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    generateAuthToken(user: User): AuthToken;
    verifyAuthToken(token: string): any;
    toPublicUser(user: User): Omit<User, 'passwordHash'>;
}
//# sourceMappingURL=User.d.ts.map