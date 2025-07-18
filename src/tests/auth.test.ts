import { UserModel, CreateUserData } from '../models/User';
import { AuthService } from '../services/AuthService';
import { validateRegister, validateLogin, validateUpdateProfile } from '../validation/authValidation';

// Mock database
const mockDb = {
  query: jest.fn(),
} as any;

describe('User Model', () => {
  let userModel: UserModel;

  beforeEach(() => {
    userModel = new UserModel(mockDb);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockResult = {
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone_number: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await userModel.create(userData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'test@example.com',
          expect.any(String), // hashed password
          'John',
          'Doe',
          undefined,
        ])
      );

      expect(result.email).toBe('test@example.com');
      expect(result.profile.firstName).toBe('John');
      expect(result.profile.lastName).toBe('Doe');
      expect(result.passwordHash).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockResult = {
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          password_hash: 'hashed-password',
          first_name: 'John',
          last_name: 'Doe',
          phone_number: null,
          date_of_birth: null,
          passport_number: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await userModel.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(result?.profile.firstName).toBe('John');
    });

    it('should return null when user not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await userModel.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await require('bcrypt').hash(password, 12);

      const result = await userModel.verifyPassword(password, hashedPassword);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await require('bcrypt').hash(password, 12);

      const result = await userModel.verifyPassword(wrongPassword, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('generateAuthToken', () => {
    it('should generate valid JWT token', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        profile: {},
        createdAt: new Date(),
        updated_at: new Date(),
      } as any;

      const result = userModel.generateAuthToken(user);

      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBeDefined();
      expect(typeof result.token).toBe('string');
    });
  });
});

describe('Auth Service', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockDb);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
      };

      // Mock findByEmail to return null (user doesn't exist)
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock create user
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: null,
          phone_number: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      const result = await authService.register(userData);

      expect(result.user.email).toBe('test@example.com');
      expect(result.token.token).toBeDefined();
    });

    it('should throw error if user already exists', async () => {
      const userData: CreateUserData = {
        email: 'existing@example.com',
        password: 'TestPassword123!',
      };

      // Mock findByEmail to return existing user
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 'user-123',
          email: 'existing@example.com',
          password_hash: 'hashed-password',
          first_name: null,
          last_name: null,
          phone_number: null,
          date_of_birth: null,
          passport_number: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      await expect(authService.register(userData)).rejects.toThrow('User with this email already exists');
    });
  });
});

describe('Validation', () => {
  describe('validateRegister', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const { error } = validateRegister(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
      };

      const { error } = validateRegister(invalidData);
      expect(error).toBeDefined();
      expect(error?.details?.[0]?.message).toContain('valid email');
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
      };

      const { error } = validateRegister(invalidData);
      expect(error).toBeDefined();
      expect(error?.details?.[0]?.message).toContain('8 characters');
    });
  });

  describe('validateLogin', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'any-password',
      };

      const { error } = validateLogin(validData);
      expect(error).toBeUndefined();
    });

    it('should require email and password', () => {
      const invalidData = {};

      const { error } = validateLogin(invalidData);
      expect(error).toBeDefined();
      expect(error?.details).toHaveLength(2);
    });
  });

  describe('validateUpdateProfile', () => {
    it('should validate correct profile data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        dateOfBirth: '1990-01-01',
      };

      const { error } = validateUpdateProfile(validData);
      expect(error).toBeUndefined();
    });

    it('should allow empty optional fields', () => {
      const validData = {
        firstName: 'John',
      };

      const { error } = validateUpdateProfile(validData);
      expect(error).toBeUndefined();
    });

    it('should reject future birth date', () => {
      const invalidData = {
        dateOfBirth: '2030-01-01',
      };

      const { error } = validateUpdateProfile(invalidData);
      expect(error).toBeDefined();
      expect(error?.details?.[0]?.message).toContain('future');
    });
  });
});