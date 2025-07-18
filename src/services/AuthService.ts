import { UserModel, CreateUserData, LoginCredentials, User, AuthToken } from '../models/User';
import { Pool } from 'pg';

export class AuthService {
  private userModel: UserModel;

  constructor(database: Pool) {
    this.userModel = new UserModel(database);
  }

  async register(userData: CreateUserData): Promise<{ user: Omit<User, 'passwordHash'>; token: AuthToken }> {
    // Check if user already exists
    const existingUser = await this.userModel.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = await this.userModel.create(userData);
    
    // Generate auth token
    const token = this.userModel.generateAuthToken(user);

    return {
      user: this.userModel.toPublicUser(user),
      token,
    };
  }

  async login(credentials: LoginCredentials): Promise<{ user: Omit<User, 'passwordHash'>; token: AuthToken }> {
    const { email, password } = credentials;

    // Find user by email
    const user = await this.userModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.userModel.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate auth token
    const token = this.userModel.generateAuthToken(user);

    return {
      user: this.userModel.toPublicUser(user),
      token,
    };
  }

  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userModel.findById(id);
    if (!user) {
      return null;
    }
    return this.userModel.toPublicUser(user);
  }

  async updateUserProfile(id: string, profileData: any): Promise<Omit<User, 'passwordHash'> | null> {
    const updatedUser = await this.userModel.updateProfile(id, profileData);
    if (!updatedUser) {
      return null;
    }
    return this.userModel.toPublicUser(updatedUser);
  }

  verifyToken(token: string): any {
    return this.userModel.verifyAuthToken(token);
  }
}