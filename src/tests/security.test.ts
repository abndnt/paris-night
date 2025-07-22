import request from 'supertest';
import { createApp } from '../utils/app';
import { Pool } from 'pg';
import { config } from '../config';
import { hashPassword } from '../utils/security';

// Mock database
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

// Mock Redis client
jest.mock('../config/database', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    lPush: jest.fn(),
    expire: jest.fn(),
  },
  database: {},
}));

// Create test app
const app = createApp(mockDb);

describe('Security Features', () => {
  describe('Security Headers', () => {
    it('should set security headers on responses', async () => {
      const response = await request(app).get('/api');
      
      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers).toHaveProperty('referrer-policy');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should apply rate limiting to endpoints', async () => {
      // Mock Redis client to simulate rate limit exceeded
      const { redisClient } = require('../config/database');
      redisClient.get.mockResolvedValue('100'); // Simulate 100 requests already made
      
      const response = await request(app).get('/api');
      
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
    });
  });
  
  describe('Input Validation', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
    });
    
    it('should reject invalid input', async () => {
      // Mock auth middleware
      jest.mock('../middleware/authMiddleware', () => ({
        authMiddleware: (_req: any, _res: any, next: Function) => next(),
      }));
      
      const response = await request(app)
        .post('/api/gdpr/consent')
        .send({
          // Missing required fields
          marketing: true,
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should sanitize input to prevent XSS', async () => {
      // This would typically be tested with a specific endpoint that echoes input
      // For now, we'll just test the sanitization function directly
      const { sanitizeInput } = require('../utils/security');
      
      const input = {
        name: '<script>alert("XSS")</script>John',
        description: 'Normal text',
        tags: ['<img src="x" onerror="alert(1)">', 'normal tag'],
      };
      
      const sanitized = sanitizeInput(input);
      
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.tags[0]).not.toContain('onerror');
    });
  });
  
  describe('Password Security', () => {
    it('should securely hash passwords', () => {
      const password = 'SecurePassword123!';
      const hashedPassword = hashPassword(password);
      
      // Check that hash includes salt (format: salt:hash)
      expect(hashedPassword).toContain(':');
      
      // Check that hash is not the same as the original password
      expect(hashedPassword).not.toEqual(password);
      
      // Check that hash is sufficiently long
      expect(hashedPassword.length).toBeGreaterThan(64);
    });
    
    it('should verify passwords correctly', () => {
      const { verifyPassword } = require('../utils/security');
      const password = 'SecurePassword123!';
      const hashedPassword = hashPassword(password);
      
      // Correct password should verify
      expect(verifyPassword(password, hashedPassword)).toBe(true);
      
      // Incorrect password should not verify
      expect(verifyPassword('WrongPassword123!', hashedPassword)).toBe(false);
    });
  });
  
  describe('GDPR Compliance', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Mock auth middleware
      jest.mock('../middleware/authMiddleware', () => ({
        authMiddleware: (req: any, _res: any, next: Function) => {
          req.user = { id: 'test-user-id', email: 'test@example.com' };
          next();
        },
      }));
      
      // Mock Redis client
      const { redisClient } = require('../config/database');
      redisClient.get.mockResolvedValue(null);
      redisClient.set.mockResolvedValue('OK');
      redisClient.setEx.mockResolvedValue('OK');
      redisClient.lPush.mockResolvedValue(1);
      redisClient.expire.mockResolvedValue(1);
    });
    
    it('should handle data export requests', async () => {
      // Mock GdprService
      jest.mock('../services/GdprService', () => ({
        gdprService: {
          exportUserData: jest.fn().mockResolvedValue({ userData: { id: 'test-user-id' } }),
        },
      }));
      
      const response = await request(app)
        .get('/api/gdpr/data')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
    
    it('should handle data deletion requests', async () => {
      // Mock GdprService
      jest.mock('../services/GdprService', () => ({
        gdprService: {
          deleteUserData: jest.fn().mockResolvedValue({ success: true, message: 'Data deleted' }),
        },
      }));
      
      const response = await request(app)
        .delete('/api/gdpr/data')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
    
    it('should handle consent management', async () => {
      // Mock GdprService
      jest.mock('../services/GdprService', () => ({
        gdprService: {
          updateUserConsent: jest.fn().mockResolvedValue({
            termsAndConditions: true,
            privacyPolicy: true,
            marketing: false,
          }),
        },
      }));
      
      const response = await request(app)
        .put('/api/gdpr/consent')
        .set('Authorization', 'Bearer test-token')
        .send({
          termsAndConditions: true,
          privacyPolicy: true,
          marketing: false,
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('termsAndConditions', true);
    });
  });
  
  describe('Suspicious Request Detection', () => {
    it('should block suspicious requests', async () => {
      const response = await request(app)
        .get('/api?eval=alert(1)')
        .set('User-Agent', 'Suspicious Bot');
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'SUSPICIOUS_REQUEST');
    });
  });
});