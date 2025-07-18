import { CreateUserData, LoginCredentials, User, AuthToken } from '../models/User';
import { Pool } from 'pg';
export declare class AuthService {
    private userModel;
    constructor(database: Pool);
    register(userData: CreateUserData): Promise<{
        user: Omit<User, 'passwordHash'>;
        token: AuthToken;
    }>;
    login(credentials: LoginCredentials): Promise<{
        user: Omit<User, 'passwordHash'>;
        token: AuthToken;
    }>;
    getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null>;
    updateUserProfile(id: string, profileData: any): Promise<Omit<User, 'passwordHash'> | null>;
    verifyToken(token: string): any;
}
//# sourceMappingURL=AuthService.d.ts.map